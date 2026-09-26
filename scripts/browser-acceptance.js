// Run with gstack browse eval scripts/browser-acceptance.js against the built preview,
// then browse js 'await window.cdnAcceptance' to await and report the assertions.
// Repeat at 1440x900, 1280x800, and 390x844. No application state is injected.
window.cdnAcceptance = (async () => {
	let assertions = 0;
	const assert = (condition, message) => {
		if (!condition) throw new Error(message);
		assertions += 1;
	};
	const settle = async () => {
		await new Promise(requestAnimationFrame);
		await new Promise(requestAnimationFrame);
	};
	const select = async (selector, value) => {
		const element = document.querySelector(selector);
		element.value = String(value);
		element.dispatchEvent(new Event('change', { bubbles: true }));
		await settle();
	};
	const click = async (selector) => {
		document.querySelector(selector).click();
		await settle();
	};
	const visibleInViewport = (selector) => {
		const rect = document.querySelector(selector).getBoundingClientRect();
		return rect.width > 0 && rect.top >= 0 && rect.bottom <= innerHeight;
	};
	const text = (selector) => document.querySelector(selector)?.textContent || '';
	const reset = '.failure-panel .panel-heading button';
	const stepPicker = '[aria-label="Choose step"]';
	const hostButton = (name) => `[aria-label="${name} advertisement"]`;
	const checkLayout = () => {
		assert(document.documentElement.scrollWidth === innerWidth, 'No horizontal document overflow');
		assert(visibleInViewport('[aria-label="Next step"]'), 'Next stays in viewport');
		if (innerWidth <= 900) {
			assert(visibleInViewport('.focused-path'), 'Mobile active hop automatically revealed');
			assert(
				document.querySelector('.focused-path').getBoundingClientRect().top >=
					document.querySelector('.learning-nav').getBoundingClientRect().bottom,
				'Mobile active hop not occluded by sticky navigation'
			);
		} else {
			assert(visibleInViewport('.topology'), 'Desktop topology fits in first viewport');
			for (const label of document.querySelectorAll('.network-node text')) {
				const bounds = label.getBBox();
				assert(
					bounds.x >= 0 && bounds.x + bounds.width <= 132.5,
					`Topology label contained: ${label.textContent}`
				);
			}
			assert(
				visibleInViewport('.step-summary'),
				'Desktop concise explanation fits in first viewport'
			);
			if (document.querySelector('.packet-summary'))
				assert(
					visibleInViewport('.packet-summary'),
					'Desktop packet summary fits in first viewport'
				);
		}
	};

	await click(reset);
	await click('.mode-tabs button:first-child');
	assert(text('.demo-controls button') === 'Auto Play', 'Manual default');
	for (const flow of ['video', 'api', 'quic', 'echo']) {
		await select('.flow-select select', flow);
		assert(
			document.querySelector(stepPicker).options.length === 14,
			'Complete healthy packet walk'
		);
		let resolved;
		for (let index = 0; index < 14; index += 1) {
			await select(stepPicker, index);
			if (innerWidth > 900) window.scrollTo(0, 0);
			await settle();
			checkLayout();
			assert(
				document.querySelector('.chapters [aria-current="step"]'),
				'Accessible current chapter'
			);
			const ethernet = [...document.querySelectorAll('.header-layer.ethernet dd')]
				.map((field) => field.textContent)
				.join('|');
			if (index === 2) resolved = ethernet;
			if (index >= 6 && index <= 9) assert(ethernet === resolved, 'Resolved frame continuity');
			if (index === 4 || (flow === 'quic' && index === 10)) {
				const layers = [...document.querySelectorAll('.header-layer h4')].map(
					(el) => el.textContent
				);
				assert(
					layers[0].includes('MPLS transport') &&
						layers[1].includes('MPLS service') &&
						layers[2] === 'Inner Ethernet',
					'Correct outer-to-inner stack order'
				);
			}
			if (index === 10 && flow === 'quic') {
				assert(
					/Service leaf B.*MPLS core.*Service leaf A/.test(text('.hop-route')),
					'Mobile remote traversal includes both leaves and core'
				);
				assert(
					document.querySelector('[data-link="core-leaf-b"]').dataset.from === 'leaf-b',
					'Remote fabric first leg is leaf to core'
				);
			}
			if (index === 12)
				assert(text('.packet-inspector .outcome') === 'Delivered', 'Delivered status');
			if (index === 13) {
				assert(text('.packet-inspector .outcome') === 'Response', 'Response status');
				assert(
					document.querySelector('[data-link="client-transit"]').dataset.from === 'transit',
					'Reverse response arrows'
				);
				assert(
					text('.packet-summary').includes('203.0.113.42 → 198.51.100.'),
					'Response IP direction'
				);
			}
			if (flow === 'echo') {
				assert(
					!text('.packet-inspector').includes('Source → destination port'),
					'Echo has no port fields'
				);
				assert(
					text('.header-layer.icmp').includes('Identifier') &&
						text('.header-layer.icmp').includes('Sequence'),
					'Echo ICMP fields'
				);
				assert(
					text('.packet-summary').includes(
						index === 13 ? 'Reply · type 0/code 0' : 'Request · type 8/code 0'
					),
					'Correct ICMP type/code'
				);
			}
		}
	}
	await select('.flow-select select', 'echo');
	await select('[aria-label="Echo probe"]', 0);
	assert(text('.two-decisions').includes('Cache C'), 'Initial Echo identifier selects Cache C');
	await select('[aria-label="Echo probe"]', 1);
	assert(text('.two-decisions').includes('Cache A'), 'Another Echo identifier can select Cache A');
	assert(text('.packet-summary').includes('id 2002 · seq 8'), 'Alternate Echo probe visible');
	await click(hostButton('Cache A'));
	assert(
		!text('.two-decisions').includes('Cache A via VIP-route ECMP'),
		'Echo remaps after host withdrawal'
	);
	await click(reset);
	await click('[aria-label="Deliver ICMP error to cache"] button:nth-child(2)');
	assert(
		text('[aria-label="ICMP error feedback"] .case-result').includes(
			'does not automatically reach Cache A'
		),
		'Unrelated cache cannot consume PMTU feedback'
	);
	assert(
		text('[aria-label="ICMP error feedback"]').includes('53000') &&
			text('[aria-label="ICMP error feedback"]').includes('Normalized original connection'),
		'Quoted response direction normalized'
	);
	await click('[aria-label="Deliver ICMP error to cache"] button:first-child');
	assert(
		text('[aria-label="ICMP error feedback"] .case-result').includes('intended owner'),
		'Original owner receives feedback'
	);
	const maintenance = '[aria-label="TCP maintenance handover"]';
	const action = (index) => `${maintenance} .maintenance-actions button:nth-child(${index})`;
	await click(action(8));
	assert(
		text(maintenance).includes('Active') && text(maintenance).includes('Old: Cache A'),
		'Active A-owned connection'
	);
	await click(action(1));
	assert(
		text(maintenance).includes('Draining') &&
			text(maintenance).includes('Advertised · still reachable'),
		'Drain retains route'
	);
	assert(document.querySelector(action(7)).disabled, 'Cannot withdraw A during drain');
	await click(action(2));
	assert(
		text(maintenance).includes('New: Cache B') &&
			text(maintenance).includes('later ACK: Cache A → Cache B'),
		'New SYN and subsequent ACK stay B-owned via A'
	);
	assert(
		document.querySelector(action(6)).disabled,
		'Cannot assume A removal while B-owned connection depends on A'
	);
	await click(action(3));
	await click(action(4));
	assert(
		document.querySelector(action(7)).disabled,
		'Forwarding-only A cannot be withdrawn with B dependency'
	);
	await click(action(5));
	assert(document.querySelector(action(7)).disabled, 'Alternate steering still required');
	await click(action(6));
	assert(
		text(maintenance).includes('mechanism unspecified'),
		'Alternate steering explicitly conceptual'
	);
	assert(
		!document.querySelector(action(7)).disabled,
		'Withdrawal only enabled after all prerequisites'
	);
	await click(action(7));
	assert(
		text(maintenance).includes('Withdrawn') &&
			text(maintenance).includes('Cache A removed from set'),
		'Withdrawal removes A next hop'
	);
	await click(action(8));
	assert(
		text(maintenance).includes('Active') && document.querySelector(action(7)).disabled,
		'Maintenance reset returns active state'
	);

	await click('.mode-tabs button:nth-child(2)');
	for (let index = 0; index < 9; index += 1) {
		await select(stepPicker, index);
		if (innerWidth > 900) window.scrollTo(0, 0);
		await settle();
		checkLayout();
		assert(
			text('.topology-view').includes('CONVERGED SNAPSHOT'),
			'Control chapters explicitly show converged state'
		);
	}
	await click('.mode-tabs button:first-child');
	await select('.flow-select select', 'video');
	await click(hostButton('Cache A'));
	assert(
		text('.comparison-result').includes('Pinned: Cache B'),
		'Unrelated withdrawal stays pinned'
	);
	assert(
		document.querySelector(hostButton('Cache A')).getAttribute('aria-pressed') === 'false',
		'Withdrawn toggle state'
	);
	await click(reset);
	assert(!document.querySelector('.comparison'), 'Reset clears comparison');
	await click(hostButton('Cache B'));
	assert(text('.comparison-result').includes('Remapped: Cache B'), 'Selected withdrawal remaps');
	assert(
		text('.comparison').includes('External prefix advertisement and transit MAC unchanged'),
		'Stable edge comparison'
	);
	await click(hostButton('Cache B'));
	assert(text('.service-status').includes('Ready'), 'Restore all advertisements');
	assert(text('.comparison').includes('Cache B restored'), 'Restoration record');
	await select('.flow-select select', 'api');
	assert(!document.querySelector('.comparison'), 'Flow change clears stale comparison');
	for (const name of ['Cache A', 'Cache B', 'Cache C']) await click(hostButton(name));
	assert(text('.service-status').includes('Unavailable'), 'Zero-host global status');
	assert(text('.identity-strip').includes('withdrawn'), 'Zero-host aggregate withdrawn');
	assert(!document.querySelector('.adjacency.selected'), 'No selected adjacency when empty');
	await select(stepPicker, 1);
	assert(text('.packet-inspector .outcome') === 'Dropped', 'Converged transit drop');
	await select(stepPicker, 2);
	assert(!document.querySelector('.packet-stack'), 'No invented post-drop frame');
	assert(text('.packet-inspector .outcome') === 'No response', 'No response after drop');
	await click('.mode-tabs button:nth-child(2)');
	await select(stepPicker, 8);
	assert(text('.step-card h2') === 'The POP is unavailable', 'Control steady state unavailable');
	assert(
		!text('.step-card').includes('ready for packet forwarding'),
		'No contradictory ready message'
	);
	await click(hostButton('Cache A'));
	assert(text('.service-status').includes('Degraded'), 'Restoration from empty becomes degraded');
	assert(text('.comparison-result').includes('Restored: Cache A'), 'Restored flow result');
	await click(reset);
	assert(
		text('.service-status').includes('Ready') && !document.querySelector('.comparison'),
		'Healthy baseline reset'
	);
	await click('.mode-tabs button:first-child');
	await select('.flow-select select', 'quic');
	await select(stepPicker, 10);

	// Essential labels use their actual rendered foreground/background colors.
	const luminance = (rgb) =>
		rgb
			.map((v) => v / 255)
			.map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
			.reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0);
	const channels = (color) =>
		color
			.match(/[\d.]+/g)
			.slice(0, 3)
			.map(Number);
	let minContrast = Infinity;
	for (const element of document.querySelectorAll(
		'dt, dd, .host-switches small, .host-switches span, .observation, .caption, .step-summary, .packet-summary, .packet-summary span, .header-layer h4'
	)) {
		const style = getComputedStyle(element);
		let parent = element;
		while (parent.parentElement && getComputedStyle(parent).backgroundColor === 'rgba(0, 0, 0, 0)')
			parent = parent.parentElement;
		const foreground = luminance(channels(style.color));
		const background = luminance(channels(getComputedStyle(parent).backgroundColor));
		const ratio =
			(Math.max(foreground, background) + 0.05) / (Math.min(foreground, background) + 0.05);
		minContrast = Math.min(minContrast, ratio);
		assert(ratio >= 4.5, `Essential text contrast ${ratio}: ${element.textContent}`);
		assert(
			parseFloat(style.fontSize) >= 12,
			`Essential labels at least 12px: ${element.textContent}`
		);
	}
	window.scrollTo(0, 0);
	return {
		status: 'PASS',
		viewport: `${innerWidth}x${innerHeight}`,
		assertions,
		minEssentialContrast: Number(minContrast.toFixed(2)),
		packetSteps: 56,
		controlSteps: 9,
		failures: 'pinned/remapped/empty/restored/reset',
		protocolCases: 'ICMP Echo/error ownership and TCP maintenance dependencies'
	};
})();
