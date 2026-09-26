# CDN Packet Path Explainer

An interactive, vendor-neutral explanation of how a packet crosses a CDN point of presence where:

- the public prefix is advertised to transit with eBGP;
- an EVPN-MPLS service carries the transit Layer 2 handoff to service leaves;
- transit resolves one stable anycast gateway MAC;
- cache hosts advertise the same service VIP to their leaves with eBGP;
- recursive next-hop resolution maps Layer 3 host routes to Layer 2 MAC/port adjacencies; and
- resilient ECMP selects a healthy host per flow.

The project is a fork of [Polo Club's Transformer Explainer](https://github.com/poloclub/transformer-explainer). It reuses the original project's progressive-disclosure teaching pattern, but the application and networking scenario are a clean implementation.

## Run locally

```bash
npm install
npm run dev
```

## Verify

```bash
npm test
npm run check
npm run lint
npm run build
```

## Architecture assumptions

This is a reference design, not a claim about one vendor's exact implementation:

- MP-BGP EVPN signals the Layer 2 service and MAC/IP reachability.
- MPLS provides transport and service labels.
- Service leaves share an anycast gateway IP and MAC toward transit.
- Hosts originate the service `/32` only while healthy.
- BGP multipath preserves all usable host next hops.
- ARP/ND or EVPN state recursively resolves each next hop into forwarding adjacency state.
- The leaf ASIC, not MPLS, hashes each flow across the active host set.
- The border resolves the shared gateway MAC to equal-cost EVPN next hops, then uses inner-flow entropy to select an ingress leaf. If that leaf selects a host attached to the other leaf, an EVPN-MPLS host adjacency carries the already-routed frame across the fabric.
- Distinct host ASNs require route-reflector Add-Path plus mixed eBGP/iBGP multipath and multipath-relax, or an equivalent route-normalization design, at the leaves. The border imports EVPN routes but not host VIP routes.
- The illustrated return path is routed through the owning leaf and the same POP transit handoff. Remote-host requests need not retrace their original ingress leaf. The response header snapshot is observed at border egress toward transit.

## Learning workspace

- Step manually through labeled chapters, or use optional 6/10-second demo playback.
- Read the active traversal, packet observation point, changed fields, and current
  VIP → next-hop → resolved MAC/leaf/port/label mapping together.
- Mobile automatically reveals the current hop and a compact path overview.
- Withdraw or restore hosts to compare membership and per-flow selection. Failure
  views are converged snapshots: the public aggregate is withdrawn at zero healthy
  hosts, and the packet walk explains the transit drop instead of forwarding into
  an unavailable POP. Reset restores the healthy baseline and clears the comparison.
- Select ICMP Echo to inspect type/code, identifier, and sequence without fabricated
  TCP ports. Try two Echo identifiers and observe deterministic illustrative ECMP.
- Compare a quoted-flow ICMP PMTU error delivered to its original connection owner
  versus an unrelated cache. Walk through planned TCP drain, host forwarding,
  dependencies, and conditional withdrawal separately from hard failure.

The maintenance handover is a conceptual educational state machine. Actual
iptables/remote forwarding rules, reply path, and VIP-preserving behavior are not
specified; established TCP or QUIC application state is not migrated by ECMP.

See [implementation notes](IMPLEMENTATION_NOTES.md) for model choices and the
repeatable browser acceptance checks.

## License

MIT, preserving the upstream project's license.
