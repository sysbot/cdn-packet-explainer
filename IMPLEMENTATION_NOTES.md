# Implementation Notes: CDN Packet Path Explainer

## Conservative choices

- The design uses EVPN-MPLS as the vendor-neutral mechanism for carrying the transit Layer 2 service into a pair of service leaves.
- The single transit-visible MAC is a distributed anycast gateway identity owned by both service leaves.
- Cache hosts advertise the same service `/32` with eBGP; BGP supplies candidate next hops and rendezvous hashing models resilient ECMP selection.
- Recursive next-hop resolution is shown as BGP next-hop IP to EVPN/ARP MAC, port, leaf, and optional label state.
- The border's EVPN ECMP choice of an ingress leaf is modeled independently from the ingress leaf's later ECMP choice of a cache host. A remote host winner causes a second, post-routing EVPN-MPLS traversal to the owning leaf.
- Distinct host ASNs require Add-Path at the route reflector plus mixed eBGP/iBGP multipath and multipath-relax, or an equivalent route-normalization design, at the service leaves. This lets locally learned eBGP paths and reflected remote iBGP paths share one ECMP set. The border imports the EVPN Layer 2 service but not the host VIP routes.
- The return path is symmetric routed forwarding. Direct server return is called out as an alternative rather than mixed into the primary walk.

## Important distinction

MPLS transports the Layer 2 handoff to an ingress service leaf. It does not load-balance across cache hosts. Host selection happens after that leaf performs the VIP route lookup and hashes over BGP multipath next hops. If the winning host is attached to the other leaf, MPLS then carries the already-selected remote adjacency across the fabric.

## Revisit if adapting to production

- Choose exact EVPN route types and multihoming behavior for the target vendor.
- Define whether host health gates BGP advertisements directly or through a local agent.
- Define aggregate-withdraw thresholds and route-reflector Add-Path/multipath policy.
- Decide between symmetric return and direct server return.
