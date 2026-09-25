# Implementation Notes: CDN Packet Path Explainer

## Conservative choices

- The design uses EVPN-MPLS as the vendor-neutral mechanism for carrying the transit Layer 2 service into a pair of service leaves.
- The single transit-visible MAC is a distributed anycast gateway identity owned by both service leaves.
- Cache hosts advertise the same service `/32` with eBGP; BGP supplies candidate next hops and rendezvous hashing models resilient ECMP selection.
- Recursive next-hop resolution is shown as BGP next-hop IP to EVPN/ARP MAC, port, leaf, and optional label state.
- The border's EVPN ECMP choice of an ingress leaf is modeled independently from the ingress leaf's later ECMP choice of a cache host. A remote host winner causes a second, post-routing EVPN-MPLS traversal to the owning leaf.
- Distinct host ASNs require Add-Path at the route reflector plus mixed eBGP/iBGP multipath and multipath-relax, or an equivalent route-normalization design, at the service leaves. This lets locally learned eBGP paths and reflected remote iBGP paths share one ECMP set. The border imports the EVPN Layer 2 service but not the host VIP routes.
- The return path is routed through the owning leaf and the same POP transit handoff. It does not necessarily retrace the ingress leaf for remote-host requests. The header snapshot is at border egress toward transit; the topology summarizes the whole response path.

## Important distinction

MPLS transports the Layer 2 handoff to an ingress service leaf. It does not load-balance across cache hosts. Host selection happens after that leaf performs the VIP route lookup and hashes over BGP multipath next hops. If the winning host is attached to the other leaf, MPLS then carries the already-selected remote adjacency across the fabric.

## Revisit if adapting to production

- Choose exact EVPN route types and multihoming behavior for the target vendor.
- Define whether host health gates BGP advertisements directly or through a local agent.
- Define aggregate-withdraw thresholds and route-reflector Add-Path/multipath policy.
- Decide between symmetric return and direct server return.

## Design implementation · 2026-09-25

Plan: fix packet/state consistency, build the desktop and focused mobile workspace,
then verify failure comparisons, accessibility, and the built application.

- Resolved transit headers persist through the route lookup and ECMP steps. MPLS
  labels precede the inner Ethernet frame; unmodeled outer link headers are explicitly
  omitted. Changes are relative to the preceding lesson step, even when jumping.
- Failure views are **converged snapshots**. The aggregate policy is at least one
  healthy cache. With zero hosts, the 14-step healthy walk becomes a three-step
  attempt → transit drop → empty service FIB explanation. No alternate POP, stale
  packet, or withdrawal timing is simulated. This avoids depicting a packet inside
  a POP whose aggregate is already withdrawn.
- The mapping is a current-state selection preview, including in control-plane
  chapters. It does not imply a host has been selected by the earlier MPLS traversal.
- The desktop has a full topology with explicit arrows; mobile shows the current
  traversal and a compact overview. Step/mode changes reveal that panel automatically.
  The navigation remains sticky while reading or using the failure experiment.
- Withdrawal comparisons preserve both snapshots and the affected flow profile.
  They clear on flow change or Reset. Restoring a higher-ranked rendezvous candidate
  may reclaim flows; the interface states this separately from withdrawal stability.
- Diagrams use static directional arrows rather than continuous dash animation.
  Manual stepping is the default. Optional demo playback uses 6 or 10 seconds and
  stops on the final step; manual navigation and membership edits stop playback.
- Protocol-layer colors are scoped to the packet stack; topology selection is cyan,
  control dependencies are dashed purple, and withdrawn state includes text/× marks.
  Host identity is carried by name rather than another competing color scale.

## Browser verification recipe

After `npm run build`, start (or restart) `npm run preview -- --port 4178`.
Vite preview caches its build manifest, so restart it after rebuilding to avoid
validating stale chunks. Visit `/cdn-packet-explainer/` on the preview server.

With gstack browse, run at each target viewport:

```sh
browse viewport 1440x900 # also 1280x800 and 390x844
browse eval scripts/browser-acceptance.js
browse js 'await window.cdnAcceptance'
```

The second command starts the DOM-driven checks; the third awaits their result.
Do not treat blank output from `eval` as a pass. The checks exercise all profiles,
all packet/control steps, frame continuity, direction, layout, comparison states,
essential text contrast, and reset. Native keys, playback timing, screenshots,
console errors, and reduced-motion emulation are verified separately.

## Verification results · 2026-09-25

Observed in session `ses_f26a32229ffeIRNzTmSQGEIRHz`:

| Check                 | Result                                                                                                                                |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `npm test`            | PASS, 15 tests                                                                                                                        |
| `npm run check`       | PASS, 0 errors and 0 warnings                                                                                                         |
| `npm run lint`        | PASS, Prettier and ESLint                                                                                                             |
| `npm run build`       | PASS, static output with `/cdn-packet-explainer` base                                                                                 |
| Chromium 1440 × 900   | PASS, all 42 profile/packet combinations and 9 control steps; first-viewport topology, explanation, packet summary, and Next          |
| Chromium 1280 × 800   | PASS, same scenario/layout coverage                                                                                                   |
| Chromium 390 × 844    | PASS, every active hop automatically revealed, no document overflow                                                                   |
| Membership experiment | PASS, unrelated withdrawal stays pinned; selected withdrawal remaps; zero-host drop; restoration; reset and stale-comparison clearing |
| Native keyboard       | PASS, Space/Enter buttons and disclosure; select typeahead; focus ring; page arrow shortcut without intercepting focused controls     |
| Optional playback     | PASS, no 1.8-second advance; 6/10-second choices; explicit pause; final-step stop; stable live announcement during playback           |
| Reduced motion        | PASS in Chromium with `reducedMotion: 'reduce'`; zero animations; mobile reveal and native controls still work                        |
| Essential labels      | PASS, at least 12px; lowest sampled contrast 7.79:1; SVG node labels stay inside their boxes                                          |
| Browser console       | PASS, no application console errors                                                                                                   |

Desktop/mobile QUIC, packet-drop, control-plane-unavailable, and adjacency/withdrawal
screenshots were captured and visually inspected under `.gstack/` (ignored artifacts).
Evidence is attached to the [implementation thread](https://discord.com/channels/718962538599153715/1553078363160313959).

No unresolved design gaps were found within the requested scope. This verification
covers the deterministic educational model and Chromium at the specified viewports.
At implementation sign-off, verification was local and publication was a separate step.
