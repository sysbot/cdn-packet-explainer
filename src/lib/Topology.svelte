<script>
	import { topologyLinks, topologyNodes } from './scenario.js';
	export let step;
	export let mode;
	export let unavailableHostIds = [];
	export let ingress;
	export let selected;

	const positions = {
		client: [16, 26],
		transit: [188, 26],
		border: [360, 26],
		core: [360, 144],
		'leaf-a': [188, 144],
		'leaf-b': [550, 144],
		'cache-a': [16, 270],
		'cache-b': [188, 270],
		'cache-c': [550, 270],
		rr: [16, 144]
	};
	const names = Object.fromEntries(topologyNodes.map((node) => [node.id, node.label]));
	$: control = mode === 'control' || step.traversals.some((leg) => leg.kind === 'control');
	$: activeNodes = new Set(step.activeNodes);
	$: legs = new Map(step.traversals.map((leg) => [leg.id, leg]));
	$: focusedNodes =
		step.traversals.length && !control
			? [step.traversals[0].from, ...step.traversals.map((leg) => leg.to)]
			: [...new Set(step.activeNodes)];
	$: overview = selected
		? [
				'client',
				'transit',
				'border',
				'core',
				ingress.id,
				...(ingress.id !== selected.leaf ? ['core', selected.leaf] : []),
				selected.id
			]
		: ['client', 'transit'];
	$: if (step.direction === 'Return' && selected)
		overview = [selected.id, selected.leaf, 'core', 'border', 'transit', 'client'];

	function path(fromId, toId) {
		const [fx, fy] = positions[fromId];
		const [tx, ty] = positions[toId];
		if (fromId === 'rr' && toId === 'leaf-b') {
			return `M ${fx + 66} ${fy + 50} C ${fx + 66} 248, ${tx + 66} 248, ${tx + 66} ${ty + 50}`;
		}
		if (fromId === 'rr' && toId === 'border') {
			return `M ${fx + 66} ${fy} C ${fx + 66} 100, ${tx + 66} 120, ${tx + 66} ${ty + 50}`;
		}
		const dx = tx - fx;
		const dy = ty - fy;
		const trim = Math.min(66 / Math.abs(dx), 25 / Math.abs(dy));
		return `M ${fx + 66 + dx * trim} ${fy + 25 + dy * trim} L ${tx + 66 - dx * trim} ${ty + 25 - dy * trim}`;
	}
</script>

<div class="topology-view">
	<div class="panel-heading">
		<h2>{control ? 'Control dependencies' : `${step.direction} path`}</h2>
		<span class="eyebrow" class:danger={['Dropped', 'No response'].includes(step.outcome)}
			>{mode === 'control' ? 'CONVERGED SNAPSHOT' : step.outcome}</span
		>
	</div>
	<svg
		class="topology"
		viewBox="0 0 720 340"
		role="img"
		aria-label={`${step.title}. ${focusedNodes.map((id) => names[id]).join(control ? ', ' : ' → ')}`}
	>
		<defs>
			<marker
				id="path-arrow"
				viewBox="0 0 10 10"
				refX="9"
				refY="5"
				markerWidth="7"
				markerHeight="7"
				orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="#52e5d5" /></marker
			>
			<marker
				id="control-arrow"
				viewBox="0 0 10 10"
				refX="9"
				refY="5"
				markerWidth="7"
				markerHeight="7"
				orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="#df79ff" /></marker
			>
		</defs>
		{#each topologyLinks.filter((link) => !link.control || control) as link}
			{@const leg = legs.get(link.id)}
			<path
				class="network-link"
				class:active={!!leg}
				class:control-link={control}
				data-link={link.id}
				data-from={leg?.from || link.from}
				data-to={leg?.to || link.to}
				d={path(leg?.from || link.from, leg?.to || link.to)}
				marker-end={leg ? `url(#${control ? 'control-arrow' : 'path-arrow'})` : undefined}
			/>
		{/each}
		{#each topologyNodes.filter((node) => node.id !== 'rr' || control) as node}
			<g
				class="network-node"
				class:active={activeNodes.has(node.id)}
				class:failed={unavailableHostIds.includes(node.id)}
				transform={`translate(${positions[node.id][0]}, ${positions[node.id][1]})`}
			>
				<rect width="132" height="50" rx="7" />
				<text x="66" y="21" text-anchor="middle">{node.label}</text>
				<text class="node-note" x="66" y="39" text-anchor="middle"
					>{unavailableHostIds.includes(node.id) ? 'WITHDRAWN ×' : node.sublabel}</text
				>
			</g>
		{/each}
	</svg>
	<div class="focused-path" aria-label="Current hop">
		<p class="eyebrow">{control ? 'STATE AT' : 'CURRENT TRAVERSAL'}</p>
		<div class="hop-route">
			{#each focusedNodes as id, index}
				{#if index > 0}<span aria-hidden="true">{control ? '·' : '→'}</span>{/if}
				<strong>{names[id]}</strong>
			{/each}
		</div>
		<p>{step.observation || step.summary}</p>
	</div>
	<div class="path-overview" aria-label="Path overview">
		<span class="eyebrow"
			>{control ? 'CONTROL PLANE' : `${step.direction.toUpperCase()} OVERVIEW`}</span
		>
		{#if control}
			<p>BGP membership → EVPN/ARP resolution → installed forwarding state</p>
		{:else}
			<p>
				{#each overview as id, index}{#if index > 0}<span aria-hidden="true"> → </span>{/if}<span
						class:current={activeNodes.has(id)}>{names[id]}</span
					>{/each}{#if !selected}
					· route withdrawn{/if}
			</p>
		{/if}
	</div>
	<p class="map-legend">
		Map: {control
			? 'dashed arrows = control dependencies (not packet motion)'
			: 'solid arrows = current packet direction'} · × = withdrawn host
	</p>
</div>
