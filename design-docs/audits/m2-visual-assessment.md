# M2 visual assessment — 15 October 2026

The ten baseline weaknesses are recorded in [the execution plan](../product/m2-plan.md). Inspection used actual local Astro rendering before and after, not source-only assessment.

## Changes and effect

The typed provisional hero identity is replaced by the game's documented transparent wordmark, including its compass O and existing tagline. The valley is brighter around the settlement and dragon, while a localized shade preserves copy contrast. Hero copy is shorter, with two clear working destinations. Navigation and the footer use a compact derivative of the same logo. Account navigation appears when PUBLIC_ACCOUNT_URL is explicitly configured.

Editorial sections alternate expansive landscape, text-led building/survival/village pillars, uncropped creature study and quiet freedom statement. The journal retains the single genuine founding entry. No release date, patch notes or invented community link was added. The gallery preserves compositions and adds a native modal with previous/next, arrow keys, Escape and focus return. The page distinguishes concept art and development ambitions from available gameplay.

The single shared token system gained semantic success/error surfaces, form/alert/loading conventions and responsive section spacing. Both Angular and Astro consume it. Public navigation collapses at 45rem; portrait layouts stack without horizontal overflow. Reduced-motion disables the one-time entrance and transitions through the shared rule.

## Actual visual checks

Browser viewport/DOM dimensions were verified at 1920×1080, 1440×900, 768×1024 and 390×844. Each had no horizontal overflow. Before/after hero captures are stored under the primary checkout's ignored `artifacts/m2/before` and `artifacts/m2/after` as `home-1920.jpg`, `home-1440.jpg`, `home-768.jpg`, `home-390.jpg`. `home-full-1440.jpg` records the complete redesigned page. `gallery-mobile.jpg` records the modal.

The browser viewport control applies to the active inspection tab. Early stale-tab/clipped captures were replaced after creating a fresh tab and checking actual innerWidth/innerHeight. Captures use an explicit viewport clip; full-page captures exclude the browser's scrollbar gutter. These are browser screenshots, not generated mockups.

Desktop gallery navigation changed 1/3 to 2/3 using ArrowRight; Escape closed the modal and returned focus to its initiating link. Mobile disclosure opened; Escape closed it and focused its summary. Mobile testing found and fixed an aspect-ratio override that collapsed unloaded gallery images to zero height. After correction, mobile image boxes measured 188.5, 293.1 and 251.3 CSS pixels high and the creature modal opened normally.

## Limits

Composition and recognition are materially improved, but only three marketing concepts are available. The repeated valley is deliberate reuse with distinct framing, not new environment evidence. Actual gameplay images, settlement studies and publisher rights evidence remain needed for publication. This inspection is not a complete assistive-technology or WCAG certification. Reduced-motion is implemented in CSS; OS preference emulation is unavailable in this browser API, so that preference was not exercised at runtime.
