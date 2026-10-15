# Caelora web design foundation

Source of truth: `packages/design-tokens/tokens.css`; common interaction states in base.css. Reused by Astro and both Angular builds. No component-library framework or game HUD assets.

| Role                  | Value / intended use                                           |
| --------------------- | -------------------------------------------------------------- |
| Ink / deepest surface | #0d1c1d / #0a1517; forest-charcoal foundation                  |
| Surface / raised      | #162b29 / #203a35; distinguish grouping without repeated cards |
| Paper                 | #eee7d8; primary text                                          |
| Muted                 | #b6c1b8; readable secondary paragraphs                         |
| Accent / hover        | #d6b27a / #edcca0; bronze-ochre actions and landmarks          |
| On-accent             | #182221; button text                                           |
| Divider               | #40514a; grouping lines, not primary text                      |
| Danger                | #f0aaa0; inline error state                                    |

Public headings use locally licensed variable Cinzel. Body uses self-hosted Manrope from its pinned font package, with Segoe UI/system fallback. Account/admin operational headings use sans-serif for readable security flows. Display sizes are fluid; editorial titles range 2–3.5rem, body 1rem, notes 0.75–0.875rem. Small uppercase eyebrows are decorative metadata, never the only explanation of an action.

Spacing uses 4/8/12/16/24/32/48/64/96px tokens. Content width is 1264px with 48px desktop gutters and 20px mobile gutters. Radii are restrained at 2px/5px. Layering uses deep/normal/raised surfaces; only navigation requires stacking. Avoid neon, gaming-purple glows, excessive gradients and a repeated grid of sales cards.

Breakpoints: shared container mobile 40rem, public navigation/editorial collapse 45rem, tablet 60rem; large-desktop composition 100rem. Literal media-query values correspond to documented tokens because CSS variables do not work in media conditions. All asymmetric layouts collapse to a single column on mobile. Minimum button targets are 48px; mobile menu links have generous vertical padding. Navigation supports keyboard focus, native disclosure semantics and Escape focus restoration. Skip links and visible focus rings are mandatory.

Buttons provide hover/active/disabled states; secondary actions retain readable borders. Inputs provide normal/focus/invalid states, with labels above and associated errors below. Account forms use real API responses; alerts distinguish errors, success and pending activity. Runtime-config bootstrap and API connection checks have visible loading/error/retry states and live announcements where relevant.

Motion uses 160/280ms hover transitions and a single 850ms hero entrance using transform/opacity. Reduced-motion disables transitions and smooth scrolling. No scroll hijacking, autoplay film, audio or continuous decorative animation. Icons should be simple geometric SVGs using consistent stroke widths. Header, hero and footer use the actual production Caelora wordmark and its compass O. The provisional browser favicon remains separate.

Artwork: optimized WebP variants, explicit intrinsic size, high-priority hero, lazy decoding/loading below fold. Informative images require contextual alt text. Background overlays prioritize text readability. Browser/a11y checks are recorded separately; token selection alone does not certify WCAG compliance.
