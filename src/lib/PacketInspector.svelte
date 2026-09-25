<script>
	export let step;
	const changeNames = {
		'ethernet.source': 'source MAC',
		'ethernet.destination': 'destination MAC',
		'ethernet.vlan': 'VLAN',
		'ip.source': 'source IP',
		'ip.destination': 'destination IP',
		'ip.ttl': 'IP TTL',
		'transport.ports': 'ports'
	};
	$: packet = step.packet;
	$: layers = packet
		? [
				...packet.mpls.map((label, index) => ({
					name: `MPLS ${index === 0 ? 'transport' : 'service'} · ${label.role}`,
					kind: 'mpls',
					fields: [
						{ name: 'Label', value: label.label, key: 'MPLS stack' },
						{ name: 'TTL', value: label.ttl, key: 'MPLS stack' }
					]
				})),
				{
					name: packet.mpls.length ? 'Inner Ethernet' : 'Ethernet',
					kind: 'ethernet',
					fields: [
						{ name: 'Source MAC', value: packet.ethernet.source, key: 'ethernet.source' },
						{
							name: 'Destination MAC',
							value: packet.ethernet.destination,
							key: 'ethernet.destination'
						},
						{ name: 'VLAN', value: packet.ethernet.vlan, key: 'ethernet.vlan' }
					]
				},
				{
					name: 'IP',
					kind: 'ip',
					fields: [
						{ name: 'Source IP', value: packet.ip.source, key: 'ip.source' },
						{ name: 'Destination IP', value: packet.ip.destination, key: 'ip.destination' },
						{ name: 'TTL', value: packet.ip.ttl, key: 'ip.ttl' }
					]
				},
				{
					name: packet.transport.protocol,
					kind: 'transport',
					fields: [
						{
							name: 'Source → destination port',
							value: packet.transport.ports,
							key: 'transport.ports'
						}
					]
				}
			]
		: [];
</script>

<section class="packet-inspector" aria-label="Packet inspector">
	<div class="panel-heading">
		<h3>Packet headers</h3>
		<span class="outcome" class:danger={['Dropped', 'No response'].includes(step.outcome)}
			>{step.outcome}</span
		>
	</div>
	<p class="observation">{step.observation}</p>
	{#if packet}
		<div class="packet-summary" aria-label="Packet summary">
			<span>{packet.transport.protocol} · {packet.transport.ports}</span>
			<strong>{packet.ip.source} → {packet.ip.destination}</strong>
		</div>
		<p class="invariant">
			{step.direction === 'Return'
				? 'Response: IP addresses and ports reverse. This snapshot is at the transit handoff.'
				: 'Forward invariant: source IP, destination VIP, and transport tuple stay unchanged.'}
		</p>
		<p class="change-note">
			<strong>Changed vs previous step:</strong>
			{step.changes.length
				? step.changes.map((key) => changeNames[key] || key).join(', ')
				: 'No header changes'}
		</p>
		{#if packet.mpls.length}<p class="encapsulation-note">
				Outer fabric link header omitted (not modeled). Stack below is outer → inner.
			</p>{/if}
		<div class="packet-stack">
			{#each layers as layer}
				<div class="header-layer {layer.kind}">
					<h4>{layer.name}</h4>
					<dl>
						{#each layer.fields as field}<div class:changed={step.changes.includes(field.key)}>
								<dt>
									{field.name}{#if step.changes.includes(field.key)}
										<span aria-label="changed">Δ</span>{/if}
								</dt>
								<dd>{field.value}</dd>
							</div>{/each}
					</dl>
				</div>
			{/each}
		</div>
	{:else}
		<p class="empty-state">No packet to inspect. Restore a host to resume the packet walk.</p>
	{/if}
</section>
