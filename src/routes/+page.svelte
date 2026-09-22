<script>
	import { onMount } from 'svelte';
	import {
		ANYCAST_GATEWAY,
		POP_PREFIX,
		VIP,
		buildControlPlaneSteps,
		buildPacketSteps,
		flows,
		hosts,
		topologyLinks,
		topologyNodes
	} from '$lib/scenario.js';

	let mode = 'packet';
	let stepIndex = 0;
	let flowId = flows[0].id;
	let unavailableHostIds = [];
	let playing = false;
	let playbackTimer;

	$: flow = flows.find((candidate) => candidate.id === flowId) || flows[0];
	$: packetScenario = buildPacketSteps(flow, unavailableHostIds);
	$: steps = mode === 'packet' ? packetScenario.steps : buildControlPlaneSteps(unavailableHostIds);
	$: if (stepIndex >= steps.length) stepIndex = steps.length - 1;
	$: currentStep = steps[stepIndex];
	$: activeNodes = new Set(currentStep.activeNodes || []);
	$: activeLinks = new Set(currentStep.activeLinks || []);
	$: selectedHost = packetScenario.selected;
	$: ingressLeaf = packetScenario.ingress;
	$: healthyCount = hosts.length - unavailableHostIds.length;

	const nodeMap = new Map(topologyNodes.map((node) => [node.id, node]));

	function setMode(nextMode) {
		mode = nextMode;
		stepIndex = 0;
		stopPlayback();
	}

	function moveStep(delta) {
		stepIndex = Math.max(0, Math.min(steps.length - 1, stepIndex + delta));
	}

	function togglePlayback() {
		if (playing) {
			stopPlayback();
			return;
		}
		playing = true;
		playbackTimer = window.setInterval(() => {
			if (stepIndex >= steps.length - 1) {
				stopPlayback();
				return;
			}
			stepIndex += 1;
		}, 1800);
	}

	function stopPlayback() {
		playing = false;
		if (playbackTimer) window.clearInterval(playbackTimer);
		playbackTimer = undefined;
	}

	function toggleHost(hostId) {
		unavailableHostIds = unavailableHostIds.includes(hostId)
			? unavailableHostIds.filter((id) => id !== hostId)
			: [...unavailableHostIds, hostId];
		stopPlayback();
	}

	function resetFailures() {
		unavailableHostIds = [];
	}

	function linkPath(link) {
		const from = nodeMap.get(link.from);
		const to = nodeMap.get(link.to);
		if (!from || !to) return '';
		if (link.control) {
			const controlY = Math.max(from.y, to.y) + 42;
			return `M ${from.x + 58} ${from.y + 24} C ${from.x + 58} ${controlY}, ${to.x + 58} ${controlY}, ${to.x + 58} ${to.y + 24}`;
		}
		return `M ${from.x + 58} ${from.y + 24} L ${to.x + 58} ${to.y + 24}`;
	}

	function midpoint(link) {
		const from = nodeMap.get(link.from);
		const to = nodeMap.get(link.to);
		return {
			x: ((from?.x || 0) + (to?.x || 0)) / 2 + 58,
			y: ((from?.y || 0) + (to?.y || 0)) / 2 + (link.control ? 48 : 10)
		};
	}

	function stateLabel(host, unavailableIds, selected) {
		if (unavailableIds.includes(host.id)) return 'WITHDRAWN';
		if (selected?.id === host.id) return 'HASH WINNER';
		return 'ECMP READY';
	}

	onMount(() => {
		const handleKey = (event) => {
			if (
				event.target instanceof Element &&
				event.target.closest('a, button, input, select, textarea, [contenteditable="true"]')
			)
				return;
			if (event.key === 'ArrowRight') moveStep(1);
			if (event.key === 'ArrowLeft') moveStep(-1);
			if (event.key === ' ') {
				event.preventDefault();
				togglePlayback();
			}
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
		content="Step through BGP control-plane convergence and packet forwarding in an MPLS-backed CDN point of presence."
	/>
</svelte:head>

<div class="app-shell">
	<header class="topbar">
		<div class="brand-lockup">
			<div class="brand-mark" aria-hidden="true"><span></span><span></span><span></span></div>
			<div>
				<p class="eyebrow">NETWORK SYSTEMS LAB</p>
				<h1>Packet Path Explainer</h1>
			</div>
		</div>
		<div class="topbar-status">
			<span class="status-dot"></span>
			<span>{healthyCount}/3 CACHE NODES ADVERTISING</span>
			<a href="https://github.com/sysbot/cdn-packet-explainer" target="_blank" rel="noreferrer"
				>SOURCE ↗</a
			>
		</div>
	</header>

	<main>
		<section class="hero-panel">
			<div class="hero-copy">
				<p class="kicker">CDN POP REFERENCE PATH / AS 65000</p>
				<h2>One MAC at transit.<br /><em>Many routed hosts behind it.</em></h2>
				<p class="hero-description">
					Follow a packet as BGP chooses the POP, EVPN-MPLS carries the transit Layer 2 service, and
					a service leaf resolves one VIP into a resilient ECMP pool of host adjacencies.
				</p>
			</div>
			<div class="identity-card">
				<div>
					<span>PUBLIC ROUTE</span>
					<strong>{POP_PREFIX}</strong>
				</div>
				<div>
					<span>SERVICE VIP</span>
					<strong>{VIP}</strong>
				</div>
				<div>
					<span>TRANSIT-FACING MAC</span>
					<strong>{ANYCAST_GATEWAY.mac}</strong>
				</div>
			</div>
		</section>

		<section class="control-rail" aria-label="Explainer controls">
			<div class="mode-tabs" role="group" aria-label="Explanation mode">
				<button
					class:active={mode === 'packet'}
					on:click={() => setMode('packet')}
					aria-pressed={mode === 'packet'}
				>
					<span>01</span> PACKET WALK
				</button>
				<button
					class:active={mode === 'control'}
					on:click={() => setMode('control')}
					aria-pressed={mode === 'control'}
				>
					<span>02</span> CONTROL PLANE
				</button>
			</div>

			<label class="flow-select">
				<span>FLOW PROFILE</span>
				<select bind:value={flowId} disabled={mode === 'control'} on:change={() => (stepIndex = 0)}>
					{#each flows as item}
						<option value={item.id}>{item.label} · {item.protocol}</option>
					{/each}
				</select>
			</label>

			<div class="transport-legend" aria-label="Layer legend">
				<span><i class="l2"></i>L2</span>
				<span><i class="l3"></i>L3/BGP</span>
				<span><i class="mpls"></i>MPLS</span>
				<span><i class="control"></i>CONTROL</span>
			</div>
		</section>

		<section class="topology-panel">
			<div class="panel-heading">
				<div>
					<p class="eyebrow">LIVE TOPOLOGY</p>
					<h3>{mode === 'packet' ? 'Forwarding path' : 'Route propagation'}</h3>
				</div>
				<div class="step-counter">
					STEP {String(stepIndex + 1).padStart(2, '0')} / {String(steps.length).padStart(2, '0')}
				</div>
			</div>

			<div class="topology-scroll">
				<svg
					class="topology"
					viewBox="0 0 1160 435"
					role="img"
					aria-label="CDN point of presence network topology"
				>
					<defs>
						<pattern id="grid" width="24" height="24" patternUnits="userSpaceOnUse">
							<path
								d="M 24 0 L 0 0 0 24"
								fill="none"
								stroke="rgba(148,163,184,.08)"
								stroke-width="1"
							/>
						</pattern>
						<filter id="glow">
							<feGaussianBlur stdDeviation="3" result="blur" />
							<feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
						</filter>
					</defs>
					<rect width="1160" height="435" fill="url(#grid)" />

					{#each topologyLinks as link}
						<g
							class:active={activeLinks.has(link.id)}
							class:control-link={link.control}
							class="link-group"
						>
							<path class="link-back" d={linkPath(link)} />
							<path class="link-front" d={linkPath(link)} />
							<text x={midpoint(link).x} y={midpoint(link).y}>{link.label}</text>
						</g>
					{/each}

					{#each topologyNodes as node}
						<g
							class="node-group {node.kind}"
							class:active={activeNodes.has(node.id)}
							class:failed={unavailableHostIds.includes(node.id)}
							transform={`translate(${node.x}, ${node.y})`}
						>
							<rect width="116" height="48" rx="8" />
							<circle cx="14" cy="14" r="4" />
							<text class="node-label" x="58" y="21" text-anchor="middle">{node.label}</text>
							<text class="node-sublabel" x="58" y="37" text-anchor="middle">{node.sublabel}</text>
							{#if unavailableHostIds.includes(node.id)}
								<path class="failure-mark" d="M 8 7 L 108 41 M 108 7 L 8 41" />
							{/if}
						</g>
					{/each}
				</svg>
			</div>

			<div class="step-strip">
				{#each steps as step, index}
					<button
						class:active={index === stepIndex}
						class:complete={index < stepIndex}
						on:click={() => {
							stepIndex = index;
							stopPlayback();
						}}
						aria-label={`Go to step ${index + 1}: ${step.title}`}
					>
						<span>{String(index + 1).padStart(2, '0')}</span>
					</button>
				{/each}
			</div>
		</section>

		<section class="explanation-grid">
			<article class="step-card">
				<div class="step-meta">
					<span>{currentStep.phase}</span>
					<span>{currentStep.layer}</span>
				</div>
				<h3>{currentStep.title}</h3>
				<p class="step-summary">{currentStep.summary}</p>
				<p class="step-detail">{currentStep.detail}</p>
				<div class="lookup-list">
					{#each currentStep.lookup || [] as item, index}
						<div><span>{index + 1}</span><code>{item}</code></div>
					{/each}
				</div>
				<div class="playback-controls">
					<button on:click={() => moveStep(-1)} disabled={stepIndex === 0}>← PREV</button>
					<button class="play" on:click={togglePlayback}>{playing ? 'PAUSE' : 'AUTO PLAY'}</button>
					<button on:click={() => moveStep(1)} disabled={stepIndex === steps.length - 1}
						>NEXT →</button
					>
				</div>
				<p class="keyboard-hint">Keyboard: ← → step · space play/pause</p>
			</article>

			{#if mode === 'packet'}
				<article class="packet-card">
					<div class="panel-heading compact">
						<div>
							<p class="eyebrow">PACKET INSPECTOR</p>
							<h3>Headers at this hop</h3>
						</div>
						<span class="packet-live"><i></i> IN FLIGHT</span>
					</div>

					<div class="packet-stack">
						<div class="header-layer ethernet">
							<span>ETHERNET</span>
							<dl>
								<div>
									<dt>SRC</dt>
									<dd>{currentStep.packet.ethernet.source}</dd>
								</div>
								<div>
									<dt>DST</dt>
									<dd>{currentStep.packet.ethernet.destination}</dd>
								</div>
								<div>
									<dt>VLAN</dt>
									<dd>{currentStep.packet.ethernet.vlan}</dd>
								</div>
							</dl>
						</div>

						{#if currentStep.packet.mpls?.length}
							{#each currentStep.packet.mpls as label}
								<div class="header-layer mpls-layer">
									<span>MPLS · {label.role}</span>
									<dl>
										<div>
											<dt>LABEL</dt>
											<dd>{label.label}</dd>
										</div>
										<div>
											<dt>TTL</dt>
											<dd>{label.ttl}</dd>
										</div>
									</dl>
								</div>
							{/each}
						{/if}

						<div class="header-layer ip-layer">
							<span>IP</span>
							<dl>
								<div>
									<dt>SRC</dt>
									<dd>{currentStep.packet.ip.source}</dd>
								</div>
								<div>
									<dt>DST</dt>
									<dd>{currentStep.packet.ip.destination}</dd>
								</div>
								<div>
									<dt>TTL</dt>
									<dd>{currentStep.packet.ip.ttl}</dd>
								</div>
							</dl>
						</div>

						<div class="header-layer transport-layer">
							<span>{currentStep.packet.transport.protocol}</span>
							<dl>
								<div>
									<dt>PORTS</dt>
									<dd>{currentStep.packet.transport.ports}</dd>
								</div>
							</dl>
						</div>
					</div>
				</article>
			{:else}
				<article class="concept-card">
					<p class="eyebrow">PLANE OWNERSHIP</p>
					<h3>What each protocol owns</h3>
					<div class="ownership-row">
						<span>BGP</span>
						<p>Which prefixes and host next hops are eligible.</p>
					</div>
					<div class="ownership-row">
						<span>EVPN</span>
						<p>Where MAC/IP identities and Layer 2 services live.</p>
					</div>
					<div class="ownership-row">
						<span>MPLS</span>
						<p>How the frame reaches an ingress leaf or a selected remote-host adjacency.</p>
					</div>
					<div class="ownership-row">
						<span>ECMP</span>
						<p>Which healthy host receives this exact flow.</p>
					</div>
					<div class="rule-box">
						MPLS does not pick the cache host. BGP supplies the set; the leaf ASIC hashes the flow.
					</div>
				</article>
			{/if}

			<aside class="failure-card">
				<div class="panel-heading compact">
					<div>
						<p class="eyebrow">FAILURE LAB</p>
						<h3>Withdraw a host</h3>
					</div>
					<button
						class="reset-button"
						on:click={resetFailures}
						disabled={!unavailableHostIds.length}>RESET</button
					>
				</div>
				<p class="failure-intro">
					Toggle a cache to withdraw its BGP path. The transit MAC and public aggregate remain
					unchanged while at least one host is healthy.
				</p>
				<div class="host-switches">
					{#each hosts as host}
						<button
							class:down={unavailableHostIds.includes(host.id)}
							class:selected={selectedHost?.id === host.id && !unavailableHostIds.includes(host.id)}
							on:click={() => toggleHost(host.id)}
						>
							<span class="host-dot" style={`--host-color:${host.color}`}></span>
							<span><strong>{host.name}</strong><small>{host.nextHop} · AS {host.asn}</small></span>
							<em>{stateLabel(host, unavailableHostIds, selectedHost)}</em>
						</button>
					{/each}
				</div>
				<div class="pool-result" class:empty={!selectedHost}>
					<span>CURRENT FLOW</span>
					<strong
						>{selectedHost
							? `${flow.label} → ${ingressLeaf.name} → ${selectedHost.name}`
							: 'NO HEALTHY NEXT HOP'}</strong
					>
					<small
						>{selectedHost
							? 'Rendezvous hash remains stable until membership changes.'
							: 'The packet is dropped and aggregate health policy should react.'}</small
					>
				</div>
			</aside>
		</section>

		{#if currentStep.routes?.length}
			<section class="route-panel">
				<div class="panel-heading">
					<div>
						<p class="eyebrow">ROUTING INFORMATION BASE</p>
						<h3>Routes relevant to this step</h3>
					</div>
					<span class="route-count"
						>{currentStep.routes.length} PATH{currentStep.routes.length === 1 ? '' : 'S'}</span
					>
				</div>
				<div class="route-table-wrap">
					<table>
						<thead
							><tr
								><th>Prefix</th><th>AS path</th><th>Next hop</th><th>Resolution</th><th>State</th
								></tr
							></thead
						>
						<tbody>
							{#each currentStep.routes as route}
								<tr class:selected={route.selected} class:withdrawn={route.state === 'withdrawn'}>
									<td>{route.prefix}</td>
									<td>{route.path}</td>
									<td>{route.nextHop}</td>
									<td
										>{hosts.find((host) => host.nextHop === route.nextHop)?.mac ||
											ANYCAST_GATEWAY.mac}</td
									>
									<td
										><span class="route-state">{route.selected ? 'HASH WINNER' : route.state}</span
										></td
									>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</section>
		{/if}

		<section class="mental-model">
			<div>
				<p class="eyebrow">THE MENTAL MODEL</p>
				<h3>Stable edge, dynamic interior</h3>
			</div>
			<div class="model-equation">
				<span>ONE PUBLIC PREFIX</span><b>+</b><span>ONE TRANSIT MAC</span><b>+</b><span
					>MANY BGP /32 PATHS</span
				><b>→</b><strong>RESILIENT HOST POOL</strong>
			</div>
			<p>
				The design keeps external routing and ARP stable while BGP changes the backend membership.
				EVPN-MPLS extends the handoff to an independently selected ingress leaf; recursive
				resolution turns host next-hop IPs into local or remote adjacencies; leaf ECMP maps each
				flow to one healthy cache.
			</p>
		</section>
	</main>

	<footer>
		<p>
			Vendor-neutral reference architecture. Exact EVPN route types, labels, and health policy vary
			by implementation.
		</p>
		<p>
			Forked from the progressive-disclosure interaction model of <a
				href="https://github.com/poloclub/transformer-explainer"
				target="_blank"
				rel="noreferrer">Transformer Explainer</a
			>.
		</p>
	</footer>
</div>
