export const VIP = '203.0.113.42/32';
export const POP_PREFIX = '203.0.113.0/24';
export const ANYCAST_GATEWAY = {
	ip: '192.0.2.10',
	mac: '02:00:5e:10:00:01'
};

const HOST_GATEWAY_MAC = '02:00:5e:20:00:01';

export const flows = [
	{
		id: 'video',
		label: 'Video segment',
		source: '198.51.100.27:53144',
		destination: '203.0.113.42:443',
		protocol: 'TCP',
		description: 'A long-lived HTTPS object request'
	},
	{
		id: 'api',
		label: 'API request',
		source: '198.51.100.91:42018',
		destination: '203.0.113.42:443',
		protocol: 'TCP',
		description: 'A short HTTPS API request'
	},
	{
		id: 'quic',
		label: 'QUIC stream',
		source: '198.51.100.145:61222',
		destination: '203.0.113.42:443',
		protocol: 'UDP',
		description: 'An HTTP/3 connection over QUIC'
	},
	{
		id: 'echo',
		label: 'ICMP Echo',
		source: '198.51.100.56',
		destination: '203.0.113.42',
		protocol: 'ICMP',
		icmp: { identifier: 1001, sequence: 7 },
		description: 'An ICMP Echo Request to the shared VIP'
	}
];

export const echoProbes = [
	{ identifier: 1001, sequence: 7 },
	{ identifier: 2002, sequence: 8 }
];

export const hosts = [
	{
		id: 'cache-a',
		name: 'Cache A',
		leaf: 'leaf-a',
		leafName: 'Service leaf A',
		asn: 65101,
		nextHop: '10.20.1.11',
		mac: '02:42:ac:14:01:0b',
		port: 'et-0/0/21',
		label: 30111,
		color: '#2dd4bf'
	},
	{
		id: 'cache-b',
		name: 'Cache B',
		leaf: 'leaf-a',
		leafName: 'Service leaf A',
		asn: 65102,
		nextHop: '10.20.1.12',
		mac: '02:42:ac:14:01:0c',
		port: 'et-0/0/22',
		label: 30112,
		color: '#60a5fa'
	},
	{
		id: 'cache-c',
		name: 'Cache C',
		leaf: 'leaf-b',
		leafName: 'Service leaf B',
		asn: 65103,
		nextHop: '10.20.2.13',
		mac: '02:42:ac:14:02:0d',
		port: 'et-0/0/23',
		label: 30213,
		color: '#f59e0b'
	}
];

export const topologyNodes = [
	{ id: 'client', label: 'Client', sublabel: '198.51.100.0/24', x: 64, y: 195, kind: 'endpoint' },
	{ id: 'transit', label: 'Transit router', sublabel: 'AS 64500', x: 236, y: 195, kind: 'router' },
	{ id: 'border', label: 'Border PE', sublabel: 'AS 65000', x: 420, y: 195, kind: 'router' },
	{ id: 'core', label: 'MPLS core', sublabel: 'label switched', x: 594, y: 195, kind: 'core' },
	{
		id: 'leaf-a',
		label: 'Service leaf A',
		sublabel: 'anycast gateway',
		x: 760,
		y: 120,
		kind: 'switch'
	},
	{
		id: 'leaf-b',
		label: 'Service leaf B',
		sublabel: 'same IP + MAC',
		x: 760,
		y: 270,
		kind: 'switch'
	},
	{ id: 'cache-a', label: 'Cache A', sublabel: 'AS 65101', x: 990, y: 60, kind: 'host' },
	{ id: 'cache-b', label: 'Cache B', sublabel: 'AS 65102', x: 990, y: 170, kind: 'host' },
	{ id: 'cache-c', label: 'Cache C', sublabel: 'AS 65103', x: 990, y: 290, kind: 'host' },
	{
		id: 'rr',
		label: 'Route reflector',
		sublabel: 'EVPN + IPv4',
		x: 594,
		y: 360,
		kind: 'control'
	}
];

export const topologyLinks = [
	{ id: 'client-transit', from: 'client', to: 'transit', label: 'IP' },
	{ id: 'transit-border', from: 'transit', to: 'border', label: 'transit VLAN 120' },
	{ id: 'border-core', from: 'border', to: 'core', label: 'MPLS' },
	{ id: 'core-leaf-a', from: 'core', to: 'leaf-a', label: 'EVPN EVI 1200' },
	{ id: 'core-leaf-b', from: 'core', to: 'leaf-b', label: 'EVPN EVI 1200' },
	{ id: 'leaf-a-cache-a', from: 'leaf-a', to: 'cache-a', label: 'eBGP' },
	{ id: 'leaf-a-cache-b', from: 'leaf-a', to: 'cache-b', label: 'eBGP' },
	{ id: 'leaf-b-cache-c', from: 'leaf-b', to: 'cache-c', label: 'eBGP' },
	{ id: 'rr-border', from: 'rr', to: 'border', label: 'EVPN', control: true },
	{ id: 'rr-leaf-a', from: 'rr', to: 'leaf-a', label: 'EVPN + IPv4', control: true },
	{ id: 'rr-leaf-b', from: 'rr', to: 'leaf-b', label: 'EVPN + IPv4', control: true }
];

export const serviceLeaves = [
	{ id: 'leaf-a', name: 'Service leaf A', transportLabel: 16032, serviceLabel: 24012 },
	{ id: 'leaf-b', name: 'Service leaf B', transportLabel: 16044, serviceLabel: 24013 }
];

function fnv1a(value) {
	let hash = 0x811c9dc5;
	for (let index = 0; index < value.length; index += 1) {
		hash ^= value.charCodeAt(index);
		hash = Math.imul(hash, 0x01000193);
	}
	return hash >>> 0;
}

export function flowHashKey(flow) {
	return flow.protocol === 'ICMP'
		? `${flow.protocol}|${flow.source}|${flow.destination}|echo-id:${flow.icmp.identifier}`
		: `${flow.protocol}|${flow.source}|${flow.destination}`;
}

export function selectHost(flow, unavailableHostIds = []) {
	const unavailable = new Set(unavailableHostIds);
	const candidates = hosts.filter((host) => !unavailable.has(host.id));
	if (candidates.length === 0) return null;

	const flowKey = flowHashKey(flow);
	return candidates.reduce((winner, host) => {
		const score = fnv1a(`${flowKey}|${host.id}`);
		return !winner || score > winner.score ? { host, score } : winner;
	}, null).host;
}

export function selectIngressLeaf(flow) {
	const flowKey = flowHashKey(flow);
	return serviceLeaves[fnv1a(`${flowKey}|transit-gateway`) % serviceLeaves.length];
}

// Failure experiments are fully converged snapshots, not propagation timelines.
export function serviceState(unavailableHostIds = []) {
	const eligible = hosts.filter((host) => !unavailableHostIds.includes(host.id));
	return {
		eligible,
		status:
			eligible.length === hosts.length ? 'Ready' : eligible.length ? 'Degraded' : 'Unavailable',
		aggregate: eligible.length ? 'advertised' : 'withdrawn'
	};
}

export function membershipSnapshot(flow, unavailableHostIds = []) {
	return {
		...serviceState(unavailableHostIds),
		selected: selectHost(flow, unavailableHostIds),
		ingress: selectIngressLeaf(flow),
		prefix: POP_PREFIX,
		mac: ANYCAST_GATEWAY.mac
	};
}

export function compareMembership(flow, beforeIds, afterIds) {
	const before = membershipSnapshot(flow, beforeIds);
	const after = membershipSnapshot(flow, afterIds);
	return {
		flow: flow.label,
		before,
		after,
		result: !after.selected
			? 'Unavailable: no eligible host for new selection'
			: before.selected?.id === after.selected.id
				? `Pinned: ${after.selected.name} still wins the ECMP selection`
				: before.selected
					? `Remapped: ${before.selected.name} → ${after.selected.name} for a new selection (established ownership not inferred)`
					: `Restored: ${after.selected.name} serves the flow`
	};
}

export function packetChanges(previous, packet) {
	if (!packet) return [];
	if (!previous) return ['Initial snapshot'];
	return ['mpls', 'ethernet', 'ip', 'transport', 'icmp'].flatMap((layer) => {
		if (layer === 'mpls') {
			return JSON.stringify(previous.mpls) === JSON.stringify(packet.mpls) ? [] : ['MPLS stack'];
		}
		if (!packet[layer]) return [];
		return Object.keys(packet[layer])
			.filter((field) => previous[layer]?.[field] !== packet[layer][field])
			.map((field) => `${layer}.${field}`);
	});
}

function basePacket(flow) {
	return {
		ethernet: { source: 'client gateway', destination: 'next hop unresolved', vlan: 'none' },
		mpls: [],
		ip: { source: flow.source.split(':')[0], destination: '203.0.113.42', ttl: 58 },
		...(flow.protocol === 'ICMP'
			? { icmp: { type: 8, code: 0, ...flow.icmp } }
			: { transport: { protocol: flow.protocol, ports: `${flow.source.split(':')[1]} → 443` } })
	};
}

export function buildPacketSteps(flow, unavailableHostIds = []) {
	const selected = selectHost(flow, unavailableHostIds);
	const ingress = selectIngressLeaf(flow);
	const selectedLeaf = serviceLeaves.find((leaf) => leaf.id === selected?.leaf);
	const remoteSelection = Boolean(selected && ingress.id !== selected.leaf);
	const packet = basePacket(flow);
	const resolvedPacket = {
		...packet,
		ethernet: { source: '00:aa:00:00:64:50', destination: ANYCAST_GATEWAY.mac, vlan: '120' }
	};
	const health = serviceState(unavailableHostIds);
	const hostRoutes = hosts.map((host) => ({
		prefix: VIP,
		path: `${host.asn}`,
		nextHop: host.nextHop,
		state: unavailableHostIds.includes(host.id) ? 'withdrawn' : 'active',
		selected: selected?.id === host.id
	}));

	const steps = [
		{
			id: 'client-send',
			phase: 'DATA PLANE',
			layer: 'L3/L4',
			title: 'Client sends to the CDN VIP',
			summary: `${flow.description} targets ${flow.destination}. The client does not know which POP host will serve it.`,
			detail:
				'DNS or anycast policy has already selected this POP prefix. The packet begins as an ordinary IP flow.',
			activeNodes: ['client'],
			activeLinks: [],
			packet,
			lookup: [
				'Destination 203.0.113.42',
				'Protocol ' + flow.protocol,
				flow.protocol === 'ICMP' ? 'Echo type 8/code 0 · no ports' : 'No server identity in packet'
			]
		},
		{
			id: 'transit-bgp',
			phase: 'CONTROL → DATA',
			layer: 'BGP / L3',
			title: 'Transit selects the POP advertisement',
			summary: `AS 64500 resolves ${POP_PREFIX} to the POP border through eBGP.`,
			detail:
				'The public aggregate remains stable even while individual cache-host /32 routes change inside the POP.',
			activeNodes: ['client', 'transit'],
			activeLinks: ['client-transit'],
			packet,
			routes: [{ prefix: POP_PREFIX, path: '65000', nextHop: ANYCAST_GATEWAY.ip, state: 'best' }],
			lookup: [
				'Longest prefix: 203.0.113.0/24',
				'Best path: AS 65000',
				`Next hop: ${ANYCAST_GATEWAY.ip}`
			]
		},
		{
			id: 'single-mac',
			phase: 'DATA PLANE',
			layer: 'ARP / L2',
			title: 'One gateway MAC hides the host pool',
			summary: `ARP resolves ${ANYCAST_GATEWAY.ip} to ${ANYCAST_GATEWAY.mac}.`,
			detail:
				'Both service leaves own this anycast gateway identity. Transit sees one stable adjacency, never the cache-host MAC addresses.',
			activeNodes: ['transit', 'border'],
			activeLinks: ['transit-border'],
			packet: {
				...packet,
				ethernet: { source: '00:aa:00:00:64:50', destination: ANYCAST_GATEWAY.mac, vlan: '120' }
			},
			lookup: [
				`ARP ${ANYCAST_GATEWAY.ip}`,
				`Resolved ${ANYCAST_GATEWAY.mac}`,
				'Adjacency stays stable during host churn'
			]
		},
		{
			id: 'evpn-classify',
			phase: 'DATA PLANE',
			layer: 'L2 / EVPN',
			title: 'Border PE classifies the transit VLAN',
			summary: 'VLAN 120 maps to EVPN EVI 1200, preserving the complete transit Ethernet frame.',
			detail:
				'The PE is transporting Layer 2 here. It does not choose a cache host and does not rewrite the inner source or destination MAC.',
			activeNodes: ['border'],
			activeLinks: ['transit-border'],
			packet: {
				...packet,
				ethernet: { source: '00:aa:00:00:64:50', destination: ANYCAST_GATEWAY.mac, vlan: '120' }
			},
			lookup: ['VLAN 120 → EVI 1200', 'Bridge domain: transit-handoff', 'Inner frame unchanged']
		},
		{
			id: 'mpls-push',
			phase: 'DATA PLANE',
			layer: 'MPLS',
			title: `MPLS carries the frame to ${ingress.name}`,
			summary: `The border resolves the shared gateway MAC to equal-cost EVPN next hops, hashes this inner flow to ${ingress.name}, then pushes transport and service labels.`,
			detail:
				'This EVPN choice selects an ingress gateway, not a cache host. Host selection happens later, after the leaf routes the packet.',
			activeNodes: ['border', 'core'],
			activeLinks: ['border-core'],
			packet: {
				...packet,
				ethernet: { source: '00:aa:00:00:64:50', destination: ANYCAST_GATEWAY.mac, vlan: '120' },
				mpls: [
					{ label: ingress.transportLabel, role: 'transport', ttl: 63 },
					{ label: ingress.serviceLabel, role: 'EVPN service', ttl: 63 }
				]
			},
			lookup: [
				`Gateway-MAC ECMP → ${ingress.name}`,
				`Outer label ${ingress.transportLabel} → ${ingress.name}`,
				`Inner label ${ingress.serviceLabel} → EVI 1200`,
				'Payload: original Ethernet frame'
			]
		},
		{
			id: 'label-swap',
			phase: 'DATA PLANE',
			layer: 'MPLS',
			title: 'The core switches labels, not hosts',
			summary:
				'A P router swaps only the outer transport label. It never inspects the VIP or server pool.',
			detail: 'This clean separation keeps the fabric independent of CDN application state.',
			activeNodes: ['core', ingress.id],
			activeLinks: [`core-${ingress.id}`],
			packet: {
				...packet,
				ethernet: { source: '00:aa:00:00:64:50', destination: ANYCAST_GATEWAY.mac, vlan: '120' },
				mpls: [
					{ label: ingress.transportLabel + 1000, role: 'transport (swapped)', ttl: 62 },
					{ label: ingress.serviceLabel, role: 'EVPN service', ttl: 63 }
				]
			},
			lookup: [
				`LFIB ${ingress.transportLabel} → ${ingress.transportLabel + 1000}`,
				`Forward toward ${ingress.name}`,
				'No IP lookup in core'
			]
		},
		{
			id: 'leaf-decap',
			phase: 'DATA PLANE',
			layer: 'MPLS → L2',
			title: 'Service leaf restores the transit frame',
			summary: `${ingress.name} pops both labels and recovers the frame addressed to the shared gateway MAC.`,
			detail:
				'The single MAC causes the frame to enter the distributed Layer 3 gateway on either service leaf.',
			activeNodes: ['core', ingress.id],
			activeLinks: [`core-${ingress.id}`],
			packet: {
				...packet,
				ethernet: { source: '00:aa:00:00:64:50', destination: ANYCAST_GATEWAY.mac, vlan: '120' },
				mpls: []
			},
			lookup: [
				'Pop transport label',
				'Pop EVI service label',
				`Destination MAC is local anycast ${ANYCAST_GATEWAY.mac}`
			]
		},
		{
			id: 'host-bgp',
			phase: 'CONTROL → DATA',
			layer: 'BGP / L3',
			title: 'Host BGP creates the ECMP service route',
			summary: selected
				? `${hosts.length - unavailableHostIds.length} active hosts advertise the same ${VIP}; multipath keeps all equal paths.`
				: `Every host path for ${VIP} is withdrawn.`,
			detail:
				'Each cache announces the service VIP from its own ASN. BFD and BGP withdrawal remove failed hosts without changing the transit-facing MAC or public aggregate.',
			activeNodes: [
				'rr',
				'leaf-a',
				'leaf-b',
				...hosts.filter((host) => !unavailableHostIds.includes(host.id)).map((host) => host.id)
			],
			activeLinks: [
				'rr-leaf-a',
				'rr-leaf-b',
				...hosts
					.filter((host) => !unavailableHostIds.includes(host.id))
					.map((host) => `${host.leaf}-${host.id}`)
			],
			packet: resolvedPacket,
			routes: hostRoutes,
			lookup: selected
				? [
						'Longest prefix: 203.0.113.42/32',
						'BGP multipath: enabled',
						`${hosts.length - unavailableHostIds.length} usable next hops`
					]
				: ['No usable /32 next hop', 'Fail closed', 'Public aggregate can be withdrawn by policy']
		},
		{
			id: 'recursive-resolution',
			phase: 'CONTROL → DATA',
			layer: 'L3 → L2',
			title: 'BGP next hops resolve into local or remote adjacencies',
			summary: selected
				? `${ingress.name} resolves ${selected.nextHop} to ${selected.mac} on ${selected.leafName}.`
				: 'There is no live adjacency to resolve.',
			detail:
				'This is the dynamic L3-to-L2 mapping: a service route selects an IP next hop, then EVPN/ARP state supplies the host MAC, owning leaf, port, and remote service label when needed.',
			activeNodes: selected
				? [ingress.id, selected.leaf, selected.id, 'rr']
				: ['leaf-a', 'leaf-b', 'rr'],
			activeLinks: selected
				? [`${selected.leaf}-${selected.id}`, `rr-${selected.leaf}`]
				: ['rr-leaf-a', 'rr-leaf-b'],
			packet: resolvedPacket,
			routes: hostRoutes,
			lookup: selected
				? [
						`BGP next hop ${selected.nextHop}`,
						`Neighbor/EVPN MAC ${selected.mac}`,
						`Egress ${selected.port}`
					]
				: ['Resolution failed', 'No forwarding adjacency', 'Packet is discarded']
		},
		{
			id: 'ecmp',
			phase: 'DATA PLANE',
			layer: 'L3 ECMP',
			title: selected ? `${ingress.name} ECMP selects ${selected.name}` : 'No host is available',
			summary: selected
				? flow.protocol === 'ICMP'
					? `This illustrative hash uses source IP, VIP, ICMP protocol, and Echo identifier to choose ${selected.name}. It is deterministic for those inputs, not random per packet.`
					: `A rendezvous hash of the five-tuple maps this flow to ${selected.name}; only new flow selections owned by a failed host move. Established connection ownership requires separate steering.`
				: 'The forwarding set is empty, so the switch drops the packet rather than guessing.',
			detail:
				'BGP supplies the eligible next-hop set. The ASIC hash performs per-flow selection. MPLS is only the transport to the correct leaf.',
			activeNodes: selected ? [ingress.id, selected.id] : ['leaf-a', 'leaf-b'],
			activeLinks: [],
			packet: resolvedPacket,
			routes: hostRoutes,
			lookup: selected
				? [
						flow.protocol === 'ICMP'
							? 'Illustrative hash: IPs + protocol + Echo identifier (not sequence)'
							: `Hash key ${flow.protocol} + addresses + ports`,
						`Winner ${selected.name}`,
						flow.protocol === 'ICMP'
							? 'Different identifiers may pick a different answering cache; hardware varies'
							: 'A stable ECMP winner alone does not migrate a connection'
					]
				: ['ECMP width 0', 'Drop reason: no-service-next-hop', 'Health policy may withdraw /24']
		},
		{
			id: 'fabric-forward',
			phase: 'DATA PLANE',
			layer: remoteSelection ? 'L2 / EVPN-MPLS' : 'L2',
			title: selected
				? remoteSelection
					? `The host adjacency crosses to ${selected.leafName}`
					: `${selected.name} is local to ${ingress.name}`
				: 'No host adjacency is available',
			summary: selected
				? remoteSelection
					? `${ingress.name} routes once, rewrites the frame for ${selected.name}, and uses a host-segment EVPN service to reach ${selected.leafName}.`
					: `${ingress.name} can emit the routed frame directly toward ${selected.name}.`
				: 'The ingress leaf has no usable adjacency and drops the packet.',
			detail: remoteSelection
				? 'This second fabric traversal is a consequence of the earlier host ECMP result. MPLS carries the chosen remote adjacency; it does not choose it.'
				: 'No second fabric traversal is needed when the ECMP winner is attached to the ingress leaf.',
			activeNodes: selected
				? remoteSelection
					? [ingress.id, 'core', selected.leaf, selected.id]
					: [ingress.id, selected.id]
				: [ingress.id],
			activeLinks: selected
				? remoteSelection
					? [`core-${ingress.id}`, `core-${selected.leaf}`]
					: [`${ingress.id}-${selected.id}`]
				: [],
			packet: selected
				? {
						...packet,
						ethernet: {
							source: HOST_GATEWAY_MAC,
							destination: selected.mac,
							vlan: selected.leaf === 'leaf-a' ? '201' : '202'
						},
						mpls: remoteSelection
							? [
									{
										label: selectedLeaf.transportLabel,
										role: 'transport to host leaf',
										ttl: 63
									},
									{ label: selected.label, role: 'host adjacency', ttl: 63 }
								]
							: [],
						ip: { ...packet.ip, ttl: 57 }
					}
				: packet,
			lookup: selected
				? remoteSelection
					? [
							`Host owner: ${selected.leafName}`,
							`Transport label: ${selectedLeaf.transportLabel}`,
							`Adjacency label: ${selected.label}`
						]
					: [
							`Host owner: ${ingress.name}`,
							`Local port: ${selected.port}`,
							'No fabric label needed'
						]
				: ['No adjacency', 'Increment drop counter', 'Do not flood unknown service traffic']
		},
		{
			id: 'mac-rewrite',
			phase: 'DATA PLANE',
			layer: 'L3 → L2',
			title: selected
				? `${selected.leafName} emits the host-facing frame`
				: 'Packet is dropped at the service leaf',
			summary: selected
				? `The routed frame reaches ${selected.mac} on ${selected.port}; the destination IP is still 203.0.113.42.`
				: 'No destination MAC can be installed without a live BGP next hop.',
			detail:
				'The routing decision occurred once at the ingress leaf. The owning leaf now delivers the resulting Ethernet frame to the selected host.',
			activeNodes: selected ? [selected.leaf, selected.id] : ['leaf-a', 'leaf-b'],
			activeLinks: selected ? [`${selected.leaf}-${selected.id}`] : [],
			packet: selected
				? {
						...packet,
						ethernet: {
							source: HOST_GATEWAY_MAC,
							destination: selected.mac,
							vlan: selected.leaf === 'leaf-a' ? '201' : '202'
						},
						ip: { ...packet.ip, ttl: 57 }
					}
				: packet,
			lookup: selected
				? [
						`Route ${VIP} → ${selected.nextHop}`,
						`DMAC already rewritten to ${selected.mac}`,
						'TTL remains 57 after the ingress routing decision'
					]
				: ['No adjacency', 'Increment drop counter', 'Do not flood unknown service traffic']
		},
		{
			id: 'host-accept',
			phase: 'DATA PLANE',
			layer: 'HOST',
			title: selected
				? `${selected.name} accepts the VIP on loopback`
				: 'Request never reaches a host',
			summary: selected
				? flow.protocol === 'ICMP'
					? `${selected.name} answers this Echo Request for the shared VIP. No other cache's TCP socket state is needed.`
					: `${selected.name} owns 203.0.113.42/32 as a service loopback and terminates the request.`
				: 'All host advertisements are withdrawn.',
			detail:
				flow.protocol === 'ICMP'
					? 'Echo is independent per request. Another identifier or a changed healthy set can choose a different cache; no TCP socket moves.'
					: 'The same VIP can exist on every cache because the hosts advertise it rather than bridging it together. QUIC uses UDP but still has connection ownership; UDP transport does not imply session migration.',
			activeNodes: selected ? [selected.id] : [],
			activeLinks: [],
			packet: selected
				? {
						...packet,
						ethernet: {
							source: HOST_GATEWAY_MAC,
							destination: selected.mac,
							vlan: selected.leaf === 'leaf-a' ? '201' : '202'
						},
						ip: { ...packet.ip, ttl: 57 }
					}
				: packet,
			lookup: selected
				? [
						'VIP bound to loopback',
						'Weak-host/service policy accepts packet',
						flow.protocol === 'ICMP'
							? 'Cache generates Echo Reply; no TCP state needed'
							: 'Application serves object'
					]
				: [
						'No application selected',
						'Request fails visibly',
						'Control plane triggers withdrawal policy'
					]
		},
		{
			id: 'return',
			phase: 'DATA PLANE',
			layer: 'L3 / BGP',
			title: selected
				? flow.protocol === 'ICMP'
					? 'Echo Reply returns from the VIP'
					: 'Return traffic keeps the VIP as source'
				: 'No return packet is generated',
			summary: selected
				? flow.protocol === 'ICMP'
					? `${selected.name} replies from 203.0.113.42 with the same identifier ${flow.icmp.identifier} and sequence ${flow.icmp.sequence}; the sender matches the reply.`
					: `${selected.name} sends a response sourced from 203.0.113.42. The leaf routes it back through the POP and transit.`
				: 'The client times out because the service has no live next hop.',
			detail:
				'The response is routed through the owning leaf and the same POP transit handoff. A remote-host request need not retrace its original ingress leaf. The headers shown are observed at border egress toward transit, not at every hop in this return overview.',
			activeNodes: selected
				? [selected.id, selected.leaf, 'core', 'border', 'transit', 'client']
				: ['client'],
			activeLinks: selected
				? [
						`${selected.leaf}-${selected.id}`,
						selected.leaf === 'leaf-b' ? 'core-leaf-b' : 'core-leaf-a',
						'border-core',
						'transit-border',
						'client-transit'
					]
				: [],
			packet: selected
				? {
						ethernet: {
							source: ANYCAST_GATEWAY.mac,
							destination: '00:aa:00:00:64:50',
							vlan: '120'
						},
						mpls: [],
						ip: { source: '203.0.113.42', destination: flow.source.split(':')[0], ttl: 58 },
						...(flow.protocol === 'ICMP'
							? { icmp: { type: 0, code: 0, ...flow.icmp } }
							: {
									transport: {
										protocol: flow.protocol,
										ports: `443 → ${flow.source.split(':')[1]}`
									}
								})
					}
				: packet,
			lookup: selected
				? [
						'Source remains CDN VIP',
						'Default route learned from leaf',
						'Transit forwards to client prefix'
					]
				: ['No response', 'Client retransmits', 'Operational alarm fires']
		}
	];

	const chapters = [
		'Arrival',
		'Arrival',
		'Arrival',
		'Transport',
		'Transport',
		'Transport',
		'Transport',
		'Host selection',
		'Host selection',
		'Host selection',
		'Delivery',
		'Delivery',
		'Delivery',
		'Return'
	];
	const observations = [
		'Client-side IP flow · initial link unresolved',
		'Transit route lookup · before ARP',
		'Transit → border · resolved VLAN 120 frame',
		'Border ingress · original transit frame',
		'Border → core · inside fabric encapsulation',
		`Core → ${ingress.name} · after label swap`,
		`${ingress.name} · after decapsulation`,
		`${ingress.name} · before service-route lookup`,
		`${ingress.name} · before adjacency selection`,
		`${ingress.name} · before routing rewrite`,
		`${ingress.name} egress · after routing rewrite`,
		`${selected?.leafName} → ${selected?.name} · host-facing frame`,
		`${selected?.name} ingress · delivered request`,
		'Border → transit · response snapshot (not every return hop)'
	];
	const enriched = steps.map((step, index) => {
		const control = step.phase === 'CONTROL → DATA' && step.id !== 'transit-bgp';
		const traversals = step.activeLinks.map((id) => {
			const link = topologyLinks.find((candidate) => candidate.id === id);
			const reverse =
				step.id === 'return' ||
				(step.id === 'fabric-forward' && remoteSelection && id === `core-${ingress.id}`) ||
				(control && link.to.startsWith('cache-'));
			return {
				id,
				from: reverse ? link.to : link.from,
				to: reverse ? link.from : link.to,
				kind: control ? 'control' : 'data'
			};
		});
		return {
			...step,
			chapter: chapters[index],
			observation: observations[index],
			outcome:
				step.id === 'return' ? 'Response' : step.id === 'host-accept' ? 'Delivered' : 'In flight',
			direction: step.id === 'return' ? 'Return' : 'Forward',
			traversals,
			changes: packetChanges(steps[index - 1]?.packet, step.packet)
		};
	});
	if (!selected) {
		// The /24 is already withdrawn. Do not animate a new request through the POP.
		return {
			selected,
			ingress,
			health,
			hostRoutes,
			steps: [
				{
					...enriched[0],
					summary: 'The client attempts a request to the VIP, but this POP has no healthy cache.',
					outcome: 'Attempted'
				},
				{
					...enriched[1],
					title: 'Transit has no route to this POP',
					summary: `${POP_PREFIX} is withdrawn. In this reference model, transit drops the request; no alternate POP is modeled.`,
					detail:
						'This is a converged snapshot. No withdrawal delay or stale in-flight packet is simulated.',
					outcome: 'Dropped',
					observation: 'Transit · discarded before ARP or POP forwarding',
					routes: [
						{ prefix: POP_PREFIX, path: '65000', nextHop: ANYCAST_GATEWAY.ip, state: 'withdrawn' }
					],
					lookup: [
						'Aggregate condition: no healthy cache',
						'No alternate route modeled',
						'No POP traversal'
					]
				},
				{
					...enriched[9],
					title: 'No host is available',
					chapter: 'Host selection',
					summary:
						'The service next-hop set is empty. No packet entered the POP and no response is generated.',
					detail:
						'A stale packet reaching a leaf would also fail closed. Restore a cache to advertise the aggregate again.',
					packet: null,
					changes: [],
					traversals: [],
					outcome: 'No response',
					observation: 'Service FIB · converged state, no packet snapshot',
					lookup: ['ECMP width 0', 'Public aggregate withdrawn', 'No response']
				}
			]
		};
	}
	return { selected, ingress, health, steps: enriched, hostRoutes };
}

export const controlPlaneSteps = [
	{
		id: 'underlay',
		phase: 'UNDERLAY',
		layer: 'IGP + MPLS',
		title: 'Build loopback reachability and transport labels',
		summary:
			'The POP IGP reaches every PE and service leaf loopback. LDP or segment routing programs transport labels.',
		detail:
			'This plane knows infrastructure addresses only. It does not know CDN VIPs or host MACs.',
		activeNodes: ['border', 'core', 'leaf-a', 'leaf-b'],
		activeLinks: ['border-core', 'core-leaf-a', 'core-leaf-b'],
		lookup: [
			'10.255.0.11/32 → label 16032',
			'10.255.0.12/32 → label 16044',
			'Fast reroute protects fabric links'
		]
	},
	{
		id: 'evpn',
		phase: 'OVERLAY',
		layer: 'MP-BGP EVPN',
		title: 'Signal the transit Layer 2 service',
		summary:
			'Border and service leaves import EVI 1200 and exchange EVPN Ethernet A-D and MAC/IP routes.',
		detail:
			'The control plane replaces data-plane flooding with explicit reachability and service labels.',
		activeNodes: ['rr', 'border', 'leaf-a', 'leaf-b'],
		activeLinks: ['rr-border', 'rr-leaf-a', 'rr-leaf-b'],
		lookup: ['Route target 65000:1200', 'Border service label 24012', 'All-active service leaves']
	},
	{
		id: 'gateway',
		phase: 'OVERLAY',
		layer: 'EVPN / ARP',
		title: 'Install one distributed gateway identity',
		summary: `Both leaves advertise ${ANYCAST_GATEWAY.ip} and ${ANYCAST_GATEWAY.mac}.`,
		detail:
			'The identical gateway IP and MAC let the border ECMP the Layer 2 frame to either ingress leaf while transit maintains one neighbor entry. This choice is independent of cache-host ECMP.',
		activeNodes: ['transit', 'border', 'leaf-a', 'leaf-b'],
		activeLinks: ['transit-border', 'border-core', 'core-leaf-a', 'core-leaf-b'],
		lookup: [
			`Gateway IP ${ANYCAST_GATEWAY.ip}`,
			`Anycast MAC ${ANYCAST_GATEWAY.mac}`,
			'ARP suppression can answer consistently'
		]
	},
	{
		id: 'host-sessions',
		phase: 'SERVICE CONTROL',
		layer: 'eBGP + BFD',
		title: 'Each cache forms BGP with its service leaf',
		summary:
			'Caches use distinct private ASNs and advertise service reachability only while healthy.',
		detail:
			'BFD detects link or host failure quickly. Application health can gate route advertisement separately.',
		activeNodes: ['leaf-a', 'leaf-b', 'cache-a', 'cache-b', 'cache-c'],
		activeLinks: ['leaf-a-cache-a', 'leaf-a-cache-b', 'leaf-b-cache-c'],
		lookup: [
			'Cache A: AS 65101 Established',
			'Cache B: AS 65102 Established',
			'Cache C: AS 65103 Established'
		]
	},
	{
		id: 'vip-advertisements',
		phase: 'SERVICE CONTROL',
		layer: 'BGP',
		title: 'All healthy caches advertise the same VIP',
		summary: `Three equal BGP paths exist for ${VIP}.`,
		detail:
			'The VIP is a routed loopback, not a shared bridged address. Duplicate ownership is intentional and scoped by routing.',
		activeNodes: ['leaf-a', 'leaf-b', 'cache-a', 'cache-b', 'cache-c'],
		activeLinks: ['leaf-a-cache-a', 'leaf-a-cache-b', 'leaf-b-cache-c'],
		routes: hosts.map((host) => ({
			prefix: VIP,
			path: `${host.asn}`,
			nextHop: host.nextHop,
			state: 'active'
		})),
		lookup: ['Same NLRI from three peers', 'Preserve multiple paths', 'Do not bridge host VIPs']
	},
	{
		id: 'route-reflection',
		phase: 'SERVICE CONTROL',
		layer: 'MP-BGP',
		title: 'The route reflector distributes host paths',
		summary: 'Service leaves learn the complete host membership without a full mesh.',
		detail:
			'Add-Path must preserve more than one route. The leaves also need mixed eBGP/iBGP multipath plus multipath-relax, or an equivalent route-normalization design, so local and remote host paths can share one ECMP set. The border imports EVPN routes for the Layer 2 handoff, but not these VIP routes.',
		activeNodes: ['rr', 'leaf-a', 'leaf-b'],
		activeLinks: ['rr-leaf-a', 'rr-leaf-b'],
		routes: hosts.map((host) => ({
			prefix: VIP,
			path: `${host.asn}`,
			nextHop: host.nextHop,
			state: 'reflected'
		})),
		lookup: [
			'Mixed eBGP/iBGP multipath accepts local + remote paths',
			'Multipath-relax accepts distinct host ASNs',
			'Next-hop identity remains per host',
			'Communities carry health and site policy'
		]
	},
	{
		id: 'resolution',
		phase: 'SERVICE CONTROL',
		layer: 'L3 → L2',
		title: 'Resolve every BGP next hop to forwarding state',
		summary:
			'ARP/ND or EVPN MAC/IP routes bind each host next hop to a MAC, leaf, port, and label.',
		detail: 'A BGP route is not usable until recursive resolution reaches an installed adjacency.',
		activeNodes: ['rr', 'leaf-a', 'leaf-b', 'cache-a', 'cache-b', 'cache-c'],
		activeLinks: ['rr-leaf-a', 'rr-leaf-b', 'leaf-a-cache-a', 'leaf-a-cache-b', 'leaf-b-cache-c'],
		lookup: hosts.map((host) => `${host.nextHop} → ${host.mac} / ${host.port}`)
	},
	{
		id: 'aggregate',
		phase: 'EXTERNAL BGP',
		layer: 'eBGP',
		title: 'Advertise a stable POP aggregate to transit',
		summary: `${POP_PREFIX} is announced only while policy confirms that the POP can serve traffic.`,
		detail:
			'Internal /32 churn stays inside the POP. A separate health threshold controls whether the public aggregate remains advertised.',
		activeNodes: ['transit', 'border', 'rr'],
		activeLinks: ['transit-border', 'rr-border'],
		routes: [
			{ prefix: POP_PREFIX, path: '65000', nextHop: ANYCAST_GATEWAY.ip, state: 'advertised' }
		],
		lookup: [
			'Aggregate condition: at least one healthy cache',
			'MED/local-pref express POP policy',
			'Transit sees no individual host routes'
		]
	},
	{
		id: 'steady-state',
		phase: 'CONVERGED',
		layer: 'ALL PLANES',
		title: 'The POP is ready for packet forwarding',
		summary:
			'One public prefix and one transit-facing MAC front a dynamic pool of routed cache hosts.',
		detail:
			'BGP manages membership, EVPN maps identities, MPLS carries the Layer 2 handoff to an ingress leaf, and that leaf independently selects a host by resilient ECMP.',
		activeNodes: topologyNodes.map((node) => node.id),
		activeLinks: topologyLinks.map((link) => link.id),
		lookup: [
			'External: stable /24',
			'Transit adjacency: one IP + MAC',
			'Internal: three active /32 next hops'
		]
	}
];

export function buildControlPlaneSteps(unavailableHostIds = []) {
	const unavailable = new Set(unavailableHostIds);
	const activeHosts = hosts.filter((host) => !unavailable.has(host.id));
	const activeHostLinks = activeHosts.map((host) => `${host.leaf}-${host.id}`);
	const hostRoutes = hosts.map((host) => ({
		prefix: VIP,
		path: `${host.asn}`,
		nextHop: host.nextHop,
		state: unavailable.has(host.id) ? 'withdrawn' : 'active'
	}));

	const steps = controlPlaneSteps.map((step) => {
		switch (step.id) {
			case 'host-sessions':
				return {
					...step,
					summary: `${activeHosts.length} of ${hosts.length} caches currently advertise service reachability.`,
					activeNodes: ['leaf-a', 'leaf-b', ...activeHosts.map((host) => host.id)],
					activeLinks: activeHostLinks,
					lookup: hosts.map(
						(host) =>
							`${host.name}: AS ${host.asn} ${unavailable.has(host.id) ? 'Withdrawn' : 'Established'}`
					)
				};
			case 'vip-advertisements':
				return {
					...step,
					summary: `${activeHosts.length} usable BGP path${activeHosts.length === 1 ? '' : 's'} exist for ${VIP}.`,
					activeNodes: ['leaf-a', 'leaf-b', ...activeHosts.map((host) => host.id)],
					activeLinks: activeHostLinks,
					routes: hostRoutes,
					lookup: [
						`${activeHosts.length} active advertisement${activeHosts.length === 1 ? '' : 's'}`,
						'Preserve multiple paths',
						'Do not bridge host VIPs'
					]
				};
			case 'route-reflection':
				return {
					...step,
					routes: hostRoutes.map((route) => ({
						...route,
						state: route.state === 'active' ? 'reflected' : route.state
					}))
				};
			case 'resolution':
				return {
					...step,
					activeNodes: ['rr', 'leaf-a', 'leaf-b', ...activeHosts.map((host) => host.id)],
					activeLinks: ['rr-leaf-a', 'rr-leaf-b', ...activeHostLinks],
					lookup: activeHosts.length
						? activeHosts.map((host) => `${host.nextHop} → ${host.mac} / ${host.port}`)
						: ['No host next hop resolves', 'Service FIB is empty', 'Packets fail closed']
				};
			case 'aggregate':
				return {
					...step,
					title: activeHosts.length ? step.title : 'Withdraw the POP aggregate from transit',
					summary: activeHosts.length
						? `${POP_PREFIX} remains advertised while ${activeHosts.length} cache${activeHosts.length === 1 ? '' : 's'} can serve traffic.`
						: `${POP_PREFIX} is withdrawn because no cache can serve traffic.`,
					routes: step.routes.map((route) => ({
						...route,
						state: activeHosts.length ? 'advertised' : 'withdrawn'
					})),
					lookup: [
						`Aggregate condition: ${activeHosts.length ? 'satisfied' : 'failed'}`,
						'MED/local-pref express POP policy',
						'Transit sees no individual host routes'
					]
				};
			case 'steady-state':
				return {
					...step,
					title: activeHosts.length
						? `The POP is ${serviceState(unavailableHostIds).status.toLowerCase()} for packet forwarding`
						: 'The POP is unavailable',
					summary: activeHosts.length
						? `One advertised public prefix and one transit-facing MAC front ${activeHosts.length} healthy cache${activeHosts.length === 1 ? '' : 's'}.`
						: 'No eligible host remains. The service FIB is empty and the public aggregate is withdrawn.',
					activeNodes: topologyNodes
						.filter((node) => !unavailable.has(node.id))
						.map((node) => node.id),
					activeLinks: topologyLinks
						.filter(
							(link) => !hosts.some((host) => unavailable.has(host.id) && link.to === host.id)
						)
						.map((link) => link.id),
					lookup: [
						`External: ${activeHosts.length ? 'stable /24' : 'aggregate withdrawn'}`,
						'Transit adjacency: one IP + MAC',
						`Internal: ${activeHosts.length} active /32 next hop${activeHosts.length === 1 ? '' : 's'}`
					]
				};
			default:
				return step;
		}
	});
	const chapters = [
		'Underlay',
		'Overlay',
		'Overlay',
		'Membership',
		'Membership',
		'Membership',
		'Resolution',
		'External BGP',
		'Converged'
	];
	return steps.map((step, index) => ({
		...step,
		chapter: chapters[index],
		direction: 'Control state',
		traversals: step.activeLinks.map((id) => {
			const link = topologyLinks.find((candidate) => candidate.id === id);
			const reverse = link.to.startsWith('cache-') || id === 'transit-border';
			return {
				id,
				from: reverse ? link.to : link.from,
				to: reverse ? link.from : link.to,
				kind: 'control'
			};
		})
	}));
}

export function hostForFlow(flowId, unavailableHostIds = []) {
	const flow = flows.find((candidate) => candidate.id === flowId) || flows[0];
	return selectHost(flow, unavailableHostIds);
}
