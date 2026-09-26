import { flows, hosts } from './scenario.js';

// One pinned connection in the educational example. ECMP selects A for its SYN;
// later connection ownership is stored, not recomputed from live BGP membership.
export const maintenanceFlow = {
	...flows[0],
	source: '198.51.100.27:53000'
};
export const maintenanceIngress = hosts[0];
export const maintenanceTarget = hosts[1];

export const initialMaintenance = {
	phase: 'Active',
	localConnection: true,
	forwardedConnection: false,
	alternateSteering: false
};

export function maintenanceState(state) {
	const advertised = state.phase !== 'Withdrawn';
	return {
		advertised,
		ecmpNextHop: advertised ? maintenanceIngress : null,
		forwarder: advertised && !state.alternateSteering ? maintenanceIngress : null,
		newAdmission:
			state.phase === 'Active'
				? 'Cache A accepts new TCP connections'
				: state.alternateSteering
					? 'Assumed alternate steering bypasses Cache A to Cache B (mechanism unspecified)'
					: state.phase === 'Withdrawn'
						? 'Cache A no longer receives new ECMP selections'
						: 'Cache A forwards new TCP connections to Cache B; no new A-owned sockets',
		localOwner: state.localConnection ? maintenanceIngress : null,
		redirectedOwner: state.forwardedConnection ? maintenanceTarget : null,
		redirectedPacket: state.forwardedConnection
			? { syn: 'Cache A → Cache B', retransmission: 'Cache A → Cache B', ack: 'Cache A → Cache B' }
			: null,
		canWithdraw:
			state.phase === 'Forwarding-only' &&
			!state.localConnection &&
			!state.forwardedConnection &&
			state.alternateSteering
	};
}

export function advanceMaintenance(state, action) {
	switch (action) {
		case 'drain':
			if (state.phase === 'Active') return { ...state, phase: 'Draining' };
			break;
		case 'new-syn':
			if (
				['Draining', 'Forwarding-only'].includes(state.phase) &&
				!state.alternateSteering &&
				!state.forwardedConnection
			)
				return { ...state, forwardedConnection: true };
			break;
		case 'finish-local':
			if (state.phase === 'Draining' && state.localConnection)
				return { ...state, localConnection: false };
			break;
		case 'forwarding-only':
			if (state.phase === 'Draining' && !state.localConnection)
				return { ...state, phase: 'Forwarding-only' };
			break;
		case 'finish-forwarded':
			if (state.forwardedConnection) return { ...state, forwardedConnection: false };
			break;
		case 'assume-steering':
			if (state.phase === 'Forwarding-only' && !state.forwardedConnection)
				return { ...state, alternateSteering: true };
			break;
		case 'withdraw':
			if (maintenanceState(state).canWithdraw) return { ...state, phase: 'Withdrawn' };
			break;
	}
	throw new Error(`Cannot ${action} while ${state.phase} has unresolved dependencies`);
}

// The quoted datagram is a response from A to the client. Normalize its direction
// before looking up the original connection. This does not assert ASIC behavior.
export const pmtuQuote = {
	protocol: 'TCP',
	source: '203.0.113.42:443',
	destination: maintenanceFlow.source
};

export function normalizeQuotedFlow(quote) {
	return quote.source.startsWith('203.0.113.42:')
		? { protocol: quote.protocol, source: quote.destination, destination: quote.source }
		: { ...quote };
}

export function resolveIcmpError(quote, receiverId) {
	const original = normalizeQuotedFlow(quote);
	const owner =
		original.protocol === maintenanceFlow.protocol &&
		original.source === maintenanceFlow.source &&
		original.destination === maintenanceFlow.destination
			? maintenanceIngress
			: null;
	return {
		original,
		owner,
		receiver: hosts.find((host) => host.id === receiverId),
		useful: Boolean(owner && owner.id === receiverId)
	};
}
