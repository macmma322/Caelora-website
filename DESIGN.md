# Design

## Direction

One valley, endless beginnings: the illustrated-expedition identity (voxel landscape, weathered bronze, evergreen dark) with each act set in a different art-directed detail of the one valley master, cool-to-warm temperature shifts and an honest development-status vocabulary. Current direction: design-docs/design/design-evolution-direction.md (history: caelora-visual-direction.md). Account pages share colour, type and controls in a calm product register; Caelora Studio (admin) is the dense register: design-docs/design/caelora-studio-architecture.md.

## System

Source of truth is packages/design-tokens/tokens.css and base.css. Semantic OKLCH ink/deep/surface/raised, paper/muted/faint, bronze action, danger/success/warning, temperature roles (mist, ember, charcoal, dusk) and status roles. Shared `.status-tag` (concept, model, development, planned, unavailable, available) is the content-integrity vocabulary in all three apps. No neon or decorative glass. Cinzel (self-hosted, @font-face in base.css, files in each app's public/fonts) is inscriptional display; EB Garamond is editorial prose (17–19 px on the public site); `--font-ui` (system UI stack, no download) carries labels, captions, controls, forms and admin density. Official transparent wordmark remains an image.

Fluid type and spacing. Content width 1320px, desktop gutters 48px, small-screen gutters 20px. 45rem navigation/mobile transition; 60rem tablet layout; 75rem compact desktop. 48px actions, 44px utility controls, 16px form inputs. Captions minimum 12px; public body 17px+, portal body 16px. Focus outline uses accent-hover, 2px with 5px offset. Border radius 2px/4px.

## Motion

100ms press, 160ms feedback, 240ms gallery/nav, 700ms entrance reveals (armed only by script), 1100ms one-time dragon reveal, slow ember flicker paused off-screen. Custom ease-out cubic-bezier(0.23,1,0.32,1). Natural scroll, no sticky scenes; CSS scroll-timeline depth on the hero and wilderness band with a bounded JS fallback. Static reduced-motion/mobile/no-script states. 3D studies are poster-first and load WebGL only on request. History: design-docs/design/m3-5-motion-system.md.

## Implementation

Static Astro components, external CSS/TypeScript and native disclosure/dialog. No animation framework. Media registry: apps/web/src/data/media.ts; journal: Markdown content collection in apps/web/src/content/journal (index, entry pages and RSS read from it). Shared form/status rules are maintained in base.css and apps/portal.css. Existing identity/API logic is authoritative; the portal reads /api/v1/platform before enabling account forms. No public release date, pricing, purchase CTA, fake community link, waitlist or invented gameplay art.
