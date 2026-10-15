# Design

## Direction

The illustrated expedition: authentic voxel landscape, weathered bronze, evergreen margins and a warm atlas interlude. Public composition and scene storyboard: design-docs/design/caelora-visual-direction.md. Operational account pages share color, type and controls but preserve a calm reading layout.

## System

Source of truth is packages/design-tokens/tokens.css and base.css. Semantic OKLCH ink/deep/surface/raised, paper/muted/faint, bronze action, danger/success/warning and vellum roles. No neon or decorative glass. Cinzel is inscriptional display; Manrope is self-hosted body/UI across Astro and Angular. Official transparent wordmark remains an image.

Fluid type and spacing. Content width 1320px, desktop gutters 48px, small-screen gutters 20px. 45rem navigation/mobile transition; 60rem tablet layout. 48px actions, 44px utility controls, 16px form inputs. Captions minimum 11px; ordinary body 16px. Focus outline uses accent-hover, 2px with 5px offset. Border radius 2px/4px.

## Motion

100ms press, 160ms feedback, 240ms gallery/nav, 700ms occasional art entrance. Custom ease-out cubic-bezier(0.23,1,0.32,1). Natural scroll, one selective sticky scene, independently transformed layers. Static reduced-motion/mobile/no-script states. Full specification: design-docs/design/m3-5-motion-system.md.

## Implementation

Static Astro components, external CSS/TypeScript and native disclosure/dialog. No animation framework. Shared form/status rules are maintained in base.css and apps/portal.css. Existing identity/API logic is authoritative. No public release date, pricing, purchase CTA, fake community link or invented gameplay art.
