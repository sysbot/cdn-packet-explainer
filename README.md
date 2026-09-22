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
- The illustrated return path is symmetric and routed; direct server return is an alternative design.

## License

MIT, preserving the upstream project's license.
