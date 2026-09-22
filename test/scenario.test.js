import test from 'node:test';
import assert from 'node:assert/strict';

import {
	ANYCAST_GATEWAY,
	buildControlPlaneSteps,
	buildPacketSteps,
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
