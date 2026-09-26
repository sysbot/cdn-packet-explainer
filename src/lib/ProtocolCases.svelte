<script>
	import {
		advanceMaintenance,
		initialMaintenance,
		maintenanceFlow,
		maintenanceIngress,
		maintenanceState,
		maintenanceTarget,
		normalizeQuotedFlow,
		pmtuQuote,
		resolveIcmpError
	} from './protocol-cases.js';

	let state = initialMaintenance;
	let errorReceiver = maintenanceIngress.id;
	$: snapshot = maintenanceState(state);
	$: feedback = resolveIcmpError(pmtuQuote, errorReceiver);
	function act(action) {
		state = advanceMaintenance(state, action);
	}
</script>

<section class="protocol-case-panel" aria-label="ICMP error feedback">
	<p class="eyebrow">ICMP ERROR · DISTINCT FROM ECHO</p>
	<h2>PMTU feedback belongs to the original flow</h2>
	<p>
		Echo Requests can be answered independently by any eligible VIP cache. An IPv4
		fragmentation-needed error (type 3/code 4) instead quotes a packet. The quoted packet here is a <strong
			>response</strong
		>, so normalize its direction before finding the connection owner.
	</p>
	<div class="case-grid">
		<div class="case-fact">
			<span>Quoted TCP packet · reverse direction</span><strong
				>{pmtuQuote.source} → {pmtuQuote.destination}</strong
			>
		</div>
		<div class="case-fact">
			<span>Normalized original connection</span><strong
				>{normalizeQuotedFlow(pmtuQuote).source} → {normalizeQuotedFlow(pmtuQuote)
					.destination}</strong
			>
		</div>
		<div class="case-fact">
			<span>Recorded application owner</span><strong
				>{feedback.owner.name} · not a fresh ECMP choice</strong
			>
		</div>
	</div>
	<div class="case-controls" role="group" aria-label="Deliver ICMP error to cache">
		<button
			aria-pressed={errorReceiver === maintenanceIngress.id}
			on:click={() => (errorReceiver = maintenanceIngress.id)}>Deliver error to Cache A</button
		>
		<button
			aria-pressed={errorReceiver === maintenanceTarget.id}
			on:click={() => (errorReceiver = maintenanceTarget.id)}>Deliver error to Cache B</button
		>
	</div>
	<p class="case-result" class:danger={!feedback.useful} role="status">
		{feedback.useful
			? 'Cache A owns this connection: quoted-flow feedback reaches the intended owner.'
			: 'Cache B is unrelated to this connection: useful PMTU feedback does not automatically reach Cache A.'}
	</p>
	<p class="caption">
		Educational ownership example, not a production ICMP steering rule. An explicit feedback-sharing
		or quote-aware forwarding mechanism could reach A. Do not assume the ASIC hashes quoted inner
		headers or that conntrack is shared. IPv6 Packet Too Big (type 2/code 0) has the same ownership
		question; this POP model does not define IPv6 addresses or forwarding.
	</p>
	<p class="case-references">
		References: <a href="https://www.rfc-editor.org/rfc/rfc792">ICMP quotes (RFC 792)</a> ·
		<a href="https://www.rfc-editor.org/rfc/rfc1191">IPv4 PMTU (RFC 1191)</a>
	</p>
</section>

<section class="protocol-case-panel" aria-label="TCP maintenance handover">
	<p class="eyebrow">TCP MAINTENANCE · CONCEPTUAL MODEL</p>
	<h2>Drain Cache A without moving its TCP socket</h2>
	<p>
		Example connection {maintenanceFlow.source} → {maintenanceFlow.destination}: the ingress leaf
		selects <strong>Cache A</strong> for its original SYN. Ownership stays with A until that local connection
		finishes. This lab is separate from the flow selector and hard-failure withdrawal above.
	</p>
	<div class="case-grid maintenance-facts">
		<div class="case-fact"><span>Maintenance phase</span><strong>{state.phase}</strong></div>
		<div class="case-fact">
			<span>VIP route on Cache A</span><strong
				>{snapshot.advertised ? 'Advertised · still reachable' : 'Withdrawn'}</strong
			>
		</div>
		<div class="case-fact">
			<span>Leaf ECMP next hop</span><strong
				>{snapshot.ecmpNextHop?.name || 'Cache A removed from set'}</strong
			>
		</div>
		<div class="case-fact">
			<span>New connection admission</span><strong>{snapshot.newAdmission}</strong>
		</div>
		<div class="case-fact">
			<span>Forwarding node</span><strong
				>{snapshot.forwarder?.name ||
					(state.alternateSteering ? 'Assumed alternate path to B' : 'None at A')}</strong
			>
		</div>
		<div class="case-fact">
			<span>Established connection owners</span><strong
				>Old: {snapshot.localOwner?.name || 'Finished'} · New: {snapshot.redirectedOwner?.name ||
					'None yet'}</strong
			>
		</div>
	</div>
	{#if snapshot.redirectedPacket}<p class="case-route">
			New SYN: {snapshot.redirectedPacket.syn} · SYN retransmission: {snapshot.redirectedPacket
				.retransmission} · later ACK: {snapshot.redirectedPacket.ack}.
			<strong>Cache B owns the new connection throughout.</strong>
		</p>{/if}
	<div class="case-controls maintenance-actions">
		<button on:click={() => act('drain')} disabled={state.phase !== 'Active'}
			>1 · Begin drain</button
		>
		<button
			on:click={() => act('new-syn')}
			disabled={!['Draining', 'Forwarding-only'].includes(state.phase) ||
				state.alternateSteering ||
				state.forwardedConnection}>2 · New TCP SYN via A → B</button
		>
		<button
			on:click={() => act('finish-local')}
			disabled={state.phase !== 'Draining' || !state.localConnection}
			>3 · Finish old A connection</button
		>
		<button
			on:click={() => act('forwarding-only')}
			disabled={state.phase !== 'Draining' || state.localConnection}>4 · Forwarding-only</button
		>
		<button on:click={() => act('finish-forwarded')} disabled={!state.forwardedConnection}
			>5 · Finish B connection via A</button
		>
		<button
			on:click={() => act('assume-steering')}
			disabled={state.phase !== 'Forwarding-only' ||
				state.forwardedConnection ||
				state.alternateSteering}>6 · Assume alternate steering (model)</button
		>
		<button on:click={() => act('withdraw')} disabled={!snapshot.canWithdraw}>7 · Withdraw A</button
		>
		<button on:click={() => (state = initialMaintenance)} disabled={state === initialMaintenance}
			>Reset maintenance</button
		>
	</div>
	<p class="case-result" role="status">
		{snapshot.canWithdraw
			? 'No modeled A-owned or A-forwarded connections remain, and alternate steering is assumed. Withdrawal is conditional on actually proving that path and reply behavior.'
			: state.phase === 'Withdrawn'
				? 'Cache A withdrawn after both connection dependencies cleared and alternate steering was assumed.'
				: state.localConnection || state.forwardedConnection
					? 'Do not withdraw A: local and/or B-owned redirected connections still depend on it.'
					: 'Do not withdraw A yet: new arrivals still need a proven stable alternate path.'}
	</p>
	<p class="caption">
		Longer draining retains old-node capacity and delays maintenance. Forwarding reduces new
		application load on A but adds path overhead and A-dependent forwarding state. A new ECMP hash
		is not TCP state migration; redirecting an established connection to B without its state is
		disruptive. iptables is the intended implementation family, but remote-node forwarding could use
		DNAT, routing, tunneling, or a proxy; the literal REDIRECT target is local. Exact rules,
		conntrack behavior, return path, and preservation of client-facing VIP semantics are
		unspecified. “Assume alternate steering” changes this teaching model only; it verifies no real
		network configuration.
	</p>
	<p class="case-references">
		<a href="https://man7.org/linux/man-pages/man8/iptables-extensions.8.html"
			>Netfilter target reference</a
		>
	</p>
</section>
