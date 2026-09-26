<script>
	import { onMount, tick } from 'svelte';
	import {
		ANYCAST_GATEWAY,
		POP_PREFIX,
		VIP,
		buildControlPlaneSteps,
		buildPacketSteps,
		compareMembership,
		echoProbes,
		flows,
		hosts
	} from '$lib/scenario.js';
	import Topology from '$lib/Topology.svelte';
	import PacketInspector from '$lib/PacketInspector.svelte';
	import ProtocolCases from '$lib/ProtocolCases.svelte';

	let mode = 'packet';
	let stepIndex = 0;
	let flowId = flows[0].id;
	let echoProbe = 0;
	let unavailableHostIds = [];
	let comparison = null;
	let playing = false;
	let playbackTimer;
	let pace = 6000;
	let workspace;

	$: selectedFlow = flows.find((candidate) => candidate.id === flowId) || flows[0];
	$: flow =
		selectedFlow.id === 'echo' ? { ...selectedFlow, icmp: echoProbes[echoProbe] } : selectedFlow;
	$: scenario = buildPacketSteps(flow, unavailableHostIds);
	$: health = scenario.health;
	$: steps = mode === 'packet' ? scenario.steps : buildControlPlaneSteps(unavailableHostIds);
	$: if (stepIndex >= steps.length) stepIndex = steps.length - 1;
	$: currentStep = steps[stepIndex];
	$: chapters = [...new Set(steps.map((step) => step.chapter))];

	async function revealStep() {
		await tick();
		if (window.matchMedia('(max-width: 900px)').matches)
			workspace?.scrollIntoView({ block: 'start', behavior: 'instant' });
	}
	function goToStep(index) {
		stopPlayback();
		stepIndex = Math.max(0, Math.min(steps.length - 1, index));
		revealStep();
	}
	function setMode(nextMode) {
		mode = nextMode;
		goToStep(0);
	}
	function changeFlow() {
		comparison = null;
		goToStep(0);
	}
	function togglePlayback() {
		if (playing) return stopPlayback();
		if (stepIndex === steps.length - 1) stepIndex = 0;
		playing = true;
		playbackTimer = window.setInterval(() => {
			if (stepIndex < steps.length - 1) stepIndex += 1;
			if (stepIndex === steps.length - 1) stopPlayback();
			revealStep();
		}, pace);
	}
	function stopPlayback() {
		playing = false;
		if (playbackTimer) window.clearInterval(playbackTimer);
		playbackTimer = undefined;
	}
	function toggleHost(hostId) {
		const next = unavailableHostIds.includes(hostId)
			? unavailableHostIds.filter((id) => id !== hostId)
			: [...unavailableHostIds, hostId];
		comparison = {
			...compareMembership(flow, unavailableHostIds, next),
			action: `${hosts.find((host) => host.id === hostId).name} ${next.includes(hostId) ? 'withdrawn' : 'restored'}`
		};
		unavailableHostIds = next;
		stopPlayback();
	}
	function resetFailures() {
		unavailableHostIds = [];
		comparison = null;
		stopPlayback();
		stepIndex = 0;
	}

	onMount(() => {
		const handleKey = (event) => {
			if (
				event.altKey ||
				event.ctrlKey ||
				event.metaKey ||
				(event.target instanceof Element &&
					event.target.closest(
						'a, button, input, select, textarea, summary, [contenteditable="true"]'
					))
			)
				return;
			if (['ArrowRight', 'ArrowLeft', ' '].includes(event.key)) event.preventDefault();
			if (event.key === 'ArrowRight') goToStep(stepIndex + 1);
			if (event.key === 'ArrowLeft') goToStep(stepIndex - 1);
			if (event.key === ' ') togglePlayback();
		};
		window.addEventListener('keydown', handleKey);
		return () => {
			window.removeEventListener('keydown', handleKey);
			stopPlayback();
		};
	});
</script>

<svelte:head>
	<title>Packet Path Explainer | BGP, MPLS, and CDN Host Load Balancing</title>
	<meta
		name="description"
		content="Follow a packet from one transit MAC to a dynamically resolved cache host. Explore BGP, EVPN-MPLS, and resilient ECMP."
	/>
</svelte:head>

<header class="topbar">
	<div>
		<p class="eyebrow">NETWORK SYSTEMS LAB</p>
		<h1>Packet Path Explainer</h1>
	</div>
	<div
		class="service-status"
		class:degraded={health.status === 'Degraded'}
		class:danger={health.status === 'Unavailable'}
	>
		<span aria-hidden="true">●</span>
		{health.status} · {health.eligible.length}/3 hosts
	</div>
	<a href="https://github.com/sysbot/cdn-packet-explainer">Source ↗</a>
</header>

<main>
	<section class="intro" aria-label="Introduction">
		<h2>One MAC at transit. <span>Many routed hosts behind it.</span></h2>
		<p>Follow the frame, resolve the next hop, then change the host pool.</p>
	</section>
	<div class="identity-strip">
		<div><span>Public prefix · {health.aggregate}</span><strong>{POP_PREFIX}</strong></div>
		<div><span>Service VIP</span><strong>{VIP}</strong></div>
		<div><span>Transit MAC · stable identity</span><strong>{ANYCAST_GATEWAY.mac}</strong></div>
	</div>
	<section class="control-rail" aria-label="Explainer controls">
		<div class="mode-tabs" role="group" aria-label="Explanation mode">
			<button
				class:active={mode === 'packet'}
				aria-pressed={mode === 'packet'}
				on:click={() => setMode('packet')}>Packet walk</button
			>
			<button
				class:active={mode === 'control'}
				aria-pressed={mode === 'control'}
				on:click={() => setMode('control')}>Control plane</button
			>
		</div>
		<label class="flow-select"
			>Flow profile<select bind:value={flowId} on:change={changeFlow}
				>{#each flows as item}<option value={item.id}>{item.label} · {item.protocol}</option
					>{/each}</select
			></label
		>
		{#if flowId === 'echo'}
			<label class="flow-select echo-select"
				>Echo probe
				<select aria-label="Echo probe" bind:value={echoProbe} on:change={changeFlow}>
					{#each echoProbes as probe, index}<option value={index}
							>ID {probe.identifier} · seq {probe.sequence}</option
						>{/each}
				</select>
			</label>
		{/if}
		<span class="snapshot-label">Converged snapshot · manual by default</span>
	</section>

	<nav class="learning-nav" aria-label="Step controls">
		<div class="step-navigation">
			<button
				on:click={() => goToStep(stepIndex - 1)}
				disabled={stepIndex === 0}
				aria-label="Previous step">← Prev</button
			>
			<label class="step-picker"
				><span>Step {stepIndex + 1} / {steps.length} · {currentStep.chapter}</span><select
					aria-label="Choose step"
					value={stepIndex}
					on:change={(event) => goToStep(Number(event.currentTarget.value))}
					>{#each steps as step, index}<option value={index}>{index + 1}. {step.title}</option
						>{/each}</select
				></label
			>
			<button
				class="primary"
				on:click={() => goToStep(stepIndex + 1)}
				disabled={stepIndex === steps.length - 1}
				aria-label="Next step">Next →</button
			>
		</div>
		<div class="demo-controls">
			<button on:click={togglePlayback} aria-pressed={playing}
				>{playing ? 'Pause' : 'Auto Play'}</button
			><label
				>Demo pace<select aria-label="Demo pace" bind:value={pace} on:change={stopPlayback}
					><option value={6000}>6s / step</option><option value={10000}>10s / step</option></select
				></label
			>
		</div>
	</nav>
	<p class="sr-only" aria-live="polite" aria-atomic="true">
		{playing
			? 'Demo playing. Pause to read each step.'
			: `Step ${stepIndex + 1} of ${steps.length}. ${currentStep.title}. ${health.status}.`}
	</p>

	<section class="workspace" bind:this={workspace} aria-label="Learning workspace">
		<div class="topology-panel">
			<Topology
				step={currentStep}
				{mode}
				{unavailableHostIds}
				ingress={scenario.ingress}
				selected={scenario.selected}
			/>
			<nav class="chapters" aria-label="Lesson chapters">
				{#each chapters as chapter}<button
						class:active={chapter === currentStep.chapter}
						aria-current={chapter === currentStep.chapter ? 'step' : undefined}
						on:click={() => goToStep(steps.findIndex((step) => step.chapter === chapter))}
						>{chapter}</button
					>{/each}
			</nav>
			<div class="two-decisions">
				<p>
					<b>{scenario.selected ? '1 · Border chooses ingress' : '1 · No POP ingress'}</b><span
						>{scenario.selected
							? `${scenario.ingress.name} via gateway-MAC ECMP.`
							: '/24 withdrawn at transit.'}</span
					>
				</p>
				<p>
					<b>{scenario.selected ? '2 · Ingress chooses host' : '2 · No host next hop'}</b><span
						>{scenario.selected
							? `${scenario.selected.name} via VIP-route ECMP${flow.protocol === 'ICMP' ? ' (Echo ID)' : ''}.`
							: 'Empty next-hop set; service unavailable.'}</span
					>
				</p>
			</div>
			<p class="caption">
				{scenario.selected
					? 'Selection preview for this request. MPLS transports the choice; it never chooses the host or migrates a connection.'
					: 'The withdrawn aggregate prevents a new POP traversal. No alternate POP or propagation delay is simulated.'}
			</p>
		</div>
		<article class="step-card">
			<p class="eyebrow">{currentStep.chapter} · {currentStep.layer}</p>
			<h2>{currentStep.title}</h2>
			<p class="step-summary">{currentStep.summary}</p>
			<details class="protocol-details">
				<summary>Why this happens · protocol details</summary>
				<p>{currentStep.detail}</p>
				<ul>
					{#each currentStep.lookup || [] as item}<li>{item}</li>{/each}
				</ul>
			</details>
			{#if mode === 'packet'}<PacketInspector step={currentStep} />{:else}
				<div class="control-inspector">
					<h3>Installed state, after convergence</h3>
					<ul>
						{#each currentStep.lookup || [] as item}<li>{item}</li>{/each}
					</ul>
					<p>
						<strong>{health.status}</strong> · Aggregate {health.aggregate} · {health.eligible
							.length} eligible next hops.
					</p>
					<p class="caption">
						The chapters explain dependencies, not propagation timing. BGP supplies membership;
						EVPN/ARP resolves it; MPLS carries the frame.
					</p>
				</div>
			{/if}
		</article>
	</section>

	<section class="mapping-panel" aria-label="Route to adjacency mapping">
		<div class="panel-heading">
			<div>
				<p class="eyebrow">THE L3 → L2 LOOKUP</p>
				<h2>{VIP} → {health.eligible.length} eligible BGP next hops → resolved adjacencies</h2>
			</div>
			<span
				class="outcome"
				class:degraded={health.status === 'Degraded'}
				class:danger={health.status === 'Unavailable'}>{health.status}</span
			>
		</div>
		<p class="caption">
			From {scenario.ingress.name}: host next-hop IP → MAC + owner leaf + port + optional remote
			service label. Selection preview for {flow.label}; established TCP/QUIC ownership is separate.
		</p>
		<div class="adjacency-grid">
			{#each hosts as host}
				{@const down = unavailableHostIds.includes(host.id)}
				<article
					class="adjacency"
					class:selected={scenario.selected?.id === host.id}
					class:withdrawn={down}
				>
					<h3>
						{host.name}<span
							>{down
								? 'Withdrawn'
								: scenario.selected?.id === host.id
									? '✓ Selected adjacency'
									: 'Eligible'}</span
						>
					</h3>
					<dl>
						<div>
							<dt>BGP next hop · AS {host.asn}</dt>
							<dd>{host.nextHop}</dd>
						</div>
						{#if !down}<div>
								<dt>Resolved MAC</dt>
								<dd>{host.mac}</dd>
							</div>
							<div>
								<dt>Owner leaf · port</dt>
								<dd>{host.leafName} · {host.port}</dd>
							</div>
							<div>
								<dt>Service label</dt>
								<dd>
									{scenario.ingress.id === host.leaf
										? 'Local · no fabric label'
										: `${host.label} · remote adjacency`}
								</dd>
							</div>{:else}<div>
								<dt>Forwarding state</dt>
								<dd>Removed from eligible set. No usable adjacency.</dd>
							</div>{/if}
					</dl>
				</article>
			{/each}
		</div>
	</section>

	<section class="failure-panel" aria-label="Failure experiment">
		<div class="panel-heading">
			<div>
				<p class="eyebrow">FAILURE LAB · CONVERGED SNAPSHOT</p>
				<h2>Withdraw a host. Watch what changes.</h2>
			</div>
			<button on:click={resetFailures} disabled={!unavailableHostIds.length && !comparison}
				>Reset</button
			>
		</div>
		<p>
			Toggle service advertisements. The /24 stays advertised while at least one cache is healthy;
			at zero, it is withdrawn. Gateway identity stays configured. No propagation delay is
			simulated.
		</p>
		<div class="host-switches">
			{#each hosts as host}<button
					class:down={unavailableHostIds.includes(host.id)}
					aria-label={`${host.name} advertisement`}
					aria-pressed={!unavailableHostIds.includes(host.id)}
					on:click={() => toggleHost(host.id)}
					><strong>{host.name}</strong><span
						>{unavailableHostIds.includes(host.id)
							? 'Withdrawn · restore'
							: 'Advertising · withdraw'}</span
					><small>{host.nextHop} · AS {host.asn}</small></button
				>{/each}
		</div>
		{#if comparison}
			<div class="comparison" role="status" aria-live="polite">
				<h3>{comparison.action} · {comparison.flow}</h3>
				<p class="comparison-result">{comparison.result}</p>
				<div class="comparison-grid">
					{#each [{ label: 'Before', state: comparison.before }, { label: 'After', state: comparison.after }] as item}<div
						>
							<h4>{item.label}</h4>
							<dl>
								<div>
									<dt>VIP route membership</dt>
									<dd>{item.state.eligible.map((host) => host.name).join(', ') || 'Empty set'}</dd>
								</div>
								<div>
									<dt>Selected host</dt>
									<dd>{item.state.selected?.name || 'None'}</dd>
								</div>
								<div>
									<dt>Public prefix · {item.state.aggregate}</dt>
									<dd>{item.state.prefix}</dd>
								</div>
								<div>
									<dt>Transit MAC</dt>
									<dd>{item.state.mac}</dd>
								</div>
							</dl>
						</div>{/each}
				</div>
				<p class="caption">
					{comparison.after.aggregate === comparison.before.aggregate
						? 'External prefix advertisement and transit MAC unchanged.'
						: `Aggregate ${comparison.before.aggregate} → ${comparison.after.aggregate}; transit MAC identity unchanged.`}
					Ingress hash is independent of host membership. Restoring a higher-ranked host can reclaim new
					selections; established TCP/QUIC owners require separate steering.
				</p>
			</div>
		{:else}<p class="caption">
				Try withdrawing an unrelated host: this selection stays pinned. Withdraw the selected host:
				new ECMP choices can remap. Existing TCP/QUIC connections need ownership-aware steering; a
				changed hash does not migrate their state.
			</p>{/if}
	</section>
	<ProtocolCases />
	<p class="keyboard-hint">
		Keyboard: ← / → step · Space play / pause. Buttons and selects keep native keyboard behavior.
	</p>
</main>

<footer>
	<p>
		Vendor-neutral educational reference. Exact EVPN route types, labels, and health policy vary by
		implementation.
	</p>
	<p>
		Adapted from the progressive-disclosure model of <a
			href="https://github.com/poloclub/transformer-explainer">Transformer Explainer</a
		>. MIT license.
	</p>
</footer>
