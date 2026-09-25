import test from 'node:test';
import assert from 'node:assert/strict';

import {
	ANYCAST_GATEWAY,
	buildControlPlaneSteps,
	buildPacketSteps,
	compareMembership,
	flows,
	hosts,
	selectHost,
	selectIngressLeaf,
	serviceLeaves
} from '../src/lib/scenario.js';

test('rendezvous hashing selects one healthy host deterministically', () => {
	const first = selectHost(flows[0]);
	const second = selectHost(flows[0]);

	assert.ok(first);
	assert.equal(first.id, second.id);
	assert.ok(hosts.some((host) => host.id === first.id));
});

test('withdrawing the selected host remaps the flow to a healthy host', () => {
	const original = selectHost(flows[1]);
	const remapped = selectHost(flows[1], [original.id]);

	assert.ok(remapped);
	assert.notEqual(remapped.id, original.id);
	assert.ok(![original.id].includes(remapped.id));
});

test('transit L2 ingress selection is deterministic and independent of host ECMP', () => {
	const first = selectIngressLeaf(flows[0]);
	const second = selectIngressLeaf(flows[0]);

	assert.equal(first.id, second.id);
	assert.ok(serviceLeaves.some((leaf) => leaf.id === first.id));
	assert.ok(flows.some((flow) => selectIngressLeaf(flow).id !== selectHost(flow).leaf));
});

test('a remote host winner traverses the fabric only after host selection', () => {
	const remoteFlow = flows.find((flow) => selectIngressLeaf(flow).id !== selectHost(flow).leaf);
	const scenario = buildPacketSteps(remoteFlow);
	const transportToIngress = scenario.steps.find((step) => step.id === 'mpls-push');
	const transportToHostLeaf = scenario.steps.find((step) => step.id === 'fabric-forward');

	assert.ok(remoteFlow);
	assert.notEqual(scenario.ingress.id, scenario.selected.leaf);
	assert.match(transportToIngress.summary, new RegExp(scenario.ingress.name));
	assert.equal(transportToHostLeaf.packet.mpls.length, 2);
	assert.match(transportToHostLeaf.detail, /consequence of the earlier host ECMP result/i);
});

test('a local host winner needs no second MPLS traversal', () => {
	const localFlow = flows.find((flow) => selectIngressLeaf(flow).id === selectHost(flow).leaf);
	const scenario = buildPacketSteps(localFlow);
	const transportToHostLeaf = scenario.steps.find((step) => step.id === 'fabric-forward');

	assert.ok(localFlow);
	assert.equal(transportToHostLeaf.packet.mpls.length, 0);
	assert.match(transportToHostLeaf.detail, /No second fabric traversal/i);
});

test('displayed BGP paths exclude the receiving AS', () => {
	const scenario = buildPacketSteps(flows[0]);
	const transitRoute = scenario.steps.find((step) => step.id === 'transit-bgp').routes[0];

	assert.equal(transitRoute.path, '65000');
	for (const route of scenario.hostRoutes) {
		assert.doesNotMatch(route.path, /^65000 /);
	}
});

test('control-plane routes and aggregate track host withdrawals', () => {
	const unavailable = hosts.map((host) => host.id);
	const steps = buildControlPlaneSteps(unavailable);
	const advertisements = steps.find((step) => step.id === 'vip-advertisements');
	const aggregate = steps.find((step) => step.id === 'aggregate');

	assert.ok(advertisements.routes.every((route) => route.state === 'withdrawn'));
	assert.equal(aggregate.routes[0].state, 'withdrawn');
	assert.match(aggregate.summary, /withdrawn because no cache/i);
});

test('withdrawing every host produces an explicit no-route path', () => {
	const unavailable = hosts.map((host) => host.id);
	const scenario = buildPacketSteps(flows[2], unavailable);
	const ecmpStep = scenario.steps.find((step) => step.id === 'ecmp');

	assert.equal(scenario.selected, null);
	assert.match(ecmpStep.title, /No host/i);
	assert.ok(ecmpStep.lookup.includes('ECMP width 0'));
});

test('transit-facing gateway MAC remains stable across host failures', () => {
	const baseline = buildPacketSteps(flows[0], []);
	const degraded = buildPacketSteps(flows[0], [hosts[0].id, hosts[1].id]);
	const baselineStep = baseline.steps.find((step) => step.id === 'single-mac');
	const degradedStep = degraded.steps.find((step) => step.id === 'single-mac');

	assert.equal(baselineStep.packet.ethernet.destination, ANYCAST_GATEWAY.mac);
	assert.equal(degradedStep.packet.ethernet.destination, ANYCAST_GATEWAY.mac);
});

test('MPLS step preserves the inner transit frame', () => {
	const scenario = buildPacketSteps(flows[0]);
	const before = scenario.steps.find((step) => step.id === 'single-mac').packet;
	const encapsulated = scenario.steps.find((step) => step.id === 'mpls-push').packet;

	assert.equal(encapsulated.ethernet.source, before.ethernet.source);
	assert.equal(encapsulated.ethernet.destination, before.ethernet.destination);
	assert.equal(encapsulated.mpls.length, 2);
});

test('resolved transit headers persist through lookup and selection for every flow', () => {
	for (const flow of flows) {
		const { steps } = buildPacketSteps(flow);
		const resolved = steps.find((step) => step.id === 'single-mac').packet;
		for (const id of ['leaf-decap', 'host-bgp', 'recursive-resolution', 'ecmp']) {
			assert.deepEqual(steps.find((step) => step.id === id).packet, resolved, id);
		}
		const forward = steps.slice(0, -1);
		assert.ok(forward.every((step) => step.packet.ip.source === resolved.ip.source));
		assert.ok(forward.every((step) => step.packet.ip.destination === resolved.ip.destination));
		assert.ok(forward.every((step) => step.packet.transport.ports === resolved.transport.ports));
		assert.deepEqual(steps.find((step) => step.id === 'ecmp').changes, []);
		assert.ok(
			steps.find((step) => step.id === 'fabric-forward').changes.includes('ethernet.destination')
		);
	}
});

test('return traversals and response headers reverse the request direction', () => {
	for (const flow of flows) {
		const { steps, selected } = buildPacketSteps(flow);
		const response = steps.at(-1);
		assert.equal(response.direction, 'Return');
		assert.equal(response.outcome, 'Response');
		assert.deepEqual(
			response.traversals.map(({ from, to }) => [from, to]),
			[
				[selected.id, selected.leaf],
				[selected.leaf, 'core'],
				['core', 'border'],
				['border', 'transit'],
				['transit', 'client']
			]
		);
		assert.equal(response.packet.ip.source, '203.0.113.42');
		assert.equal(response.packet.ip.destination, flow.source.split(':')[0]);
		assert.match(response.observation, /Border → transit/);
		assert.ok(response.changes.includes('ip.source'));
	}
});

test('remote traversal starts leaf to core, then core to owning leaf', () => {
	const flow = flows.find((flow) => selectIngressLeaf(flow).id !== selectHost(flow).leaf);
	const { steps, ingress, selected } = buildPacketSteps(flow);
	assert.deepEqual(
		steps.find((step) => step.id === 'fabric-forward').traversals.map(({ from, to }) => [from, to]),
		[
			[ingress.id, 'core'],
			['core', selected.leaf]
		]
	);
});

test('all-hosts-down is a converged transit drop, never an in-flight POP packet', () => {
	const down = hosts.map((host) => host.id);
	const scenario = buildPacketSteps(flows[0], down);
	assert.equal(scenario.health.status, 'Unavailable');
	assert.equal(scenario.health.aggregate, 'withdrawn');
	assert.equal(scenario.health.eligible.length, 0);
	assert.ok(scenario.steps.every((step) => step.outcome !== 'In flight'));
	assert.ok(
		scenario.steps.flatMap((step) => step.traversals).every((leg) => leg.id === 'client-transit')
	);
	assert.equal(scenario.steps[1].outcome, 'Dropped');
	assert.equal(scenario.steps.at(-1).packet, null);
	const converged = buildControlPlaneSteps(down).at(-1);
	assert.match(converged.title, /unavailable/);
	assert.match(converged.summary, /aggregate is withdrawn/);
	assert.doesNotMatch(converged.title, /ready/);
});

test('withdrawal comparison distinguishes pinned, remapped, unavailable, and restored flows', () => {
	for (const flow of flows) {
		const winner = selectHost(flow);
		const unrelated = hosts.find((host) => host.id !== winner.id);
		const pinned = compareMembership(flow, [], [unrelated.id]);
		assert.match(pinned.result, /Pinned/);
		assert.equal(pinned.after.selected.id, winner.id);
		const remapped = compareMembership(flow, [], [winner.id]);
		assert.match(remapped.result, /Remapped/);
		assert.equal(remapped.before.eligible.length, 3);
		assert.equal(remapped.after.eligible.length, 2);
		assert.equal(remapped.after.prefix, remapped.before.prefix);
		assert.equal(remapped.after.mac, remapped.before.mac);
		assert.equal(remapped.after.aggregate, 'advertised');
		assert.equal(remapped.after.ingress.id, remapped.before.ingress.id);
		const down = hosts.map((host) => host.id);
		assert.match(compareMembership(flow, [], down).result, /Unavailable/);
		assert.match(compareMembership(flow, down, [unrelated.id]).result, /Restored/);
		assert.equal(compareMembership(flow, down, []).after.status, 'Ready');
	}
});
