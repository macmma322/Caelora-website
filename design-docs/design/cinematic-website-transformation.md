# Cinematic website transformation

## Direction

Caelora is presented as an illustrated expedition: a valley becomes wilderness, wilderness becomes
hearth, the quieter wild gives way to a creature study, and the atlas returns agency to the visitor.
The page's idea is: **existing Caelora material becomes a traveller's field journal, with the world
revealed through distance, weather and the things a player can carry.**

The direction sheet was dealt with the Design Taste Frontend skill (`name-as-monument`, seed
`561278802`). Its large-name treatment was redrawn for the existing approved wordmark and the current
hero because the website already has a production identity that must remain recognizable. The live
thing is the natural-scroll journey and the optional interactive cloak study.

## Asset decisions

The public site uses committed, optimized concept derivatives already documented in
`packages/shared-assets/README.md`. A single website-specific GLB derivative was added:

| Asset        | Source master                                                        | Website derivative                                                | Verification                                                |
| ------------ | -------------------------------------------------------------------- | ----------------------------------------------------------------- | ----------------------------------------------------------- |
| Travel cloak | `D:/Caelora/art/equipment/travel_cloak/exports/EQP_Travel_Cloak.glb` | `apps/web/public/models/caelora-travel-cloak.glb` (175,048 bytes) | source copied read-only; SHA-256 `AFD265E2A5FC565CC4DC4...` |

The cloak is static in the source export, so the presenter rotates it by pointer drag and does not
claim animation. Wolf, falcon, wing, village and ruin sources were audited with Blender but were not
copied into the site: the existing static derivatives give a stronger loading/performance tradeoff,
and the larger sources need a deliberate web optimization pass before public use.

`scripts/audit-cinematic-assets.py` reads source `.blend` files without saving them and records meshes,
triangles, armatures, clips and images. `artifacts/cinematic/asset-audit.json` is local evidence and
is intentionally ignored by Git.

## Motion and accessibility

The 3D presenter is one shared optional canvas, with low-power rendering, a capped pixel ratio,
resize/visibility cleanup, pointer and keyboard-independent fallback copy, and a WebGL failure state.
The existing scroll choreography remains native and keeps its reduced-motion, mobile and no-script
fallbacks. No audio or autoplay media was introduced.

## Verification

`scripts/measure-cinematic.mjs` records three cold-cache runs at 1440×900 and 390×844 under lab
network/CPU proxies. It reports LCP proxy, CLS, resource transfer bytes and overflow, and writes
screenshots. These are local lab measurements, not field Core Web Vitals; INP is not measured.
