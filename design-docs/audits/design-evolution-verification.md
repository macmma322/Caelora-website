# Design evolution verification

Date: 2026-11-12 · Branch `feature/design-evolution` from `main` dddb517 · Direction: [design-evolution-direction.md](../design/design-evolution-direction.md)

Evidence labels follow the project convention: **built** (compiles/bundles), **tested** (automated checks), **browser-verified** (rendered and inspected in Chrome), **measured** (lab numbers). Nothing here was verified on a physical phone, Safari or Firefox, or against a live platform API.

## Repository checks — tested

All run from the worktree root after the final changes:

| Check                            | Result                                                                                       |
| -------------------------------- | -------------------------------------------------------------------------------------------- |
| `npm run format:check`           | Pass (also formats the pre-existing unformatted Railway recovery note on `main`)             |
| `npm run lint`                   | Pass, 0 warnings                                                                             |
| `npm run typecheck`              | Pass (astro check 0 errors/0 hints; api-client tsc)                                          |
| `npm test`                       | 17/17 pass, including a new test for platform failure classification (absent vs unreachable) |
| `npm run build`                  | Web, account and admin production builds pass                                                |
| `npm run test:site`              | Pass: 6 pages; every local link, fragment, srcset target and image attribute resolves        |
| `npm run test:repository`        | Pass                                                                                         |
| `npm run security:scan`          | Pass                                                                                         |
| `npm run build:api` / `test:api` | Pass; 42 passed, 39 environment-skipped (unchanged — no backend code was changed)            |
| `node scripts/verify-design.mjs` | Pass, 36 checks (rewritten for the new structure; see below)                                 |

`infra:validate` (Docker Compose) was not run; no infrastructure changed.

## Browser verification — browser-verified

Production build served by `scripts/serve-production.mjs` (web 4391, account 4392, admin 4393, account `apiBaseUrl` pointed at the web origin to reproduce production's missing API). Chrome via Playwright, full-page screenshots plus axe-core 4.14 at 1920×1080, 1440×900, 1024×768, 768×1024, 390×844, 320×640 and a tall 390×1200:

- Pages: `/`, `/journal/`, `/journal/foundation/`, `/media/`, `/project-information/`, account `/sign-in`, `/register`, `/forgot-password`, `/connection-error`, admin `/`.
- Horizontal overflow: none at any width. Broken images: none. Page errors: none.
- axe violations: **0** on every page and viewport. (Axe is evidence, not WCAG certification; contrast of text over imagery is not machine-checkable.)
- Reduced motion (`prefers-reduced-motion: reduce`): every `[data-reveal]` element fully visible, no parallax, no ember loop.
- JavaScript disabled: all content visible; the "Inspect in 3D" control is hidden because it cannot work; images, links and the archive still work (viewer links open the image).
- Mobile menu: opens, Escape closes and returns focus to the toggle, links close it. Viewer: opens, arrow keys move, Escape returns focus to the trigger.
- 3D study: no Three.js/GLTFLoader request before the visitor presses "Inspect in 3D"; after loading, zoom/turn/reset work, the canvas receives focus, and **0 animation frames** are requested once the view settles (measured over 1.5 s). Browser shortcuts (Ctrl/Cmd/Alt combinations) are not captured.
- Account availability (production-like): the platform probe and one automatic retry fail (CORS from a non-API origin, as in production), the page states "Account services can't be reached… it may not be open yet, or it may be briefly unavailable", and the form fieldset is disabled (`:disabled`, opacity 0.5). Console shows the expected blocked requests.

Screenshots and JSON reports live in the ignored `artifacts/design-evolution/` (`before/`, `after-final/`, `after-web/`, `after-account/`, `after-studio/`, `verify/`, and `compare-*.jpg` side-by-side sheets). Baseline (`before/`) was captured from the live Railway production build of `main`; it already had 0 axe violations and no overflow, so the gains are in hierarchy, clarity, honesty and performance rather than defect repair.

The signed-in account pages (overview, profile, security, notifications) were inspected by the portal implementer only with intercepted fixed JSON responses — **not** an end-to-end test. Real registration, sign-in, MFA, sessions and the CSRF handshake were not exercised; no platform API is deployed.

## Performance — measured

Lab script: Chrome, cache disabled, 3–5 runs, median LCP via PerformanceObserver, CLS accumulated while scrolling the whole page. Mobile profile: 390×844 @2x, 4× CPU slowdown, 9 Mbps / 60 ms RTT. "Before" is the live production site (adds real internet latency); "after" is the same production server running locally, so absolute numbers favour "after" slightly.

| Profile | Metric                         | Before (prod `main`)                  | After                             |
| ------- | ------------------------------ | ------------------------------------- | --------------------------------- |
| Desktop | LCP median                     | 344 ms                                | 180 ms                            |
| Desktop | CLS (full scroll)              | 0.001                                 | 0.000                             |
| Desktop | Bytes after full scroll        | 1,880 KiB                             | 1,356 KiB                         |
| Desktop | Script bytes after full scroll | 783 KiB (Three.js loaded on approach) | 13 KiB (Three.js only on request) |
| Mobile  | LCP median                     | 648 ms                                | 788 ms                            |
| Mobile  | CLS (full scroll)              | 0.023                                 | 0.010                             |
| Mobile  | Bytes after full scroll        | 779 KiB                               | 865 KiB                           |

Mobile LCP is now the hero paragraph (larger, more legible type) and waits for EB Garamond; an entrance fade that delayed it by ~300 ms was removed. Both values are far inside the 2.5 s target. INP was not measured (no lab interaction trace); interactions are limited to native links, `<details>`, `<dialog>` and the opt-in 3D view. Railway resource limits (1 vCPU, 2 GB, 1 replica) were not changed; the site remains static files.

## Independent review

A separate reviewer (not an author) reviewed the full diff and returned 3 major and 11 minor findings, no blockers. Fixed:

- Outage vs closed wording: the shared client now classifies failures (`absent`: 404, non-JSON, foreign contract; `unreachable`: network, CORS, timeout, 5xx, 429). The portal says "not open yet" only for `absent`/`accountsAvailable: false`, retries an unreachable platform once, keeps forms usable while checking, and words the unreachable state without claiming a cause.
- Availability gate could block a working deployment: documented in [configuration-contract.md](../architecture/configuration-contract.md) that `Platform__CorsOrigins` must include the account origin.
- 3D canvas and viewer no longer swallow Ctrl/Cmd/Alt shortcuts.
- Minor fixes: start control hidden without JavaScript, pinch distance uses both axes, bfcache-safe cleanup plus `webglcontextlost`, focus kept on failure, anchored verifier `alt` regex, dated status claims, present-tense living-world copy rephrased as intent, provenance wording ("main-menu version"), stale atlas references and the obsolete `verify-design.mjs`, raw OKLCH literals replaced with token mixes.

Accepted or deferred (minor): on small screens the account scene band is still announced as an `aside` and downloads a 480 px image; RSS has no `atom:link rel=self`; the Studio `access-denied` route title says "denied" while the page says "restricted"; the personal workstation paths in asset manifests follow the existing manifest convention.

## Not verified / limitations

- Physical devices, Safari, Firefox, screen readers.
- Any flow requiring the platform API (none is deployed).
- Commercial rights for the concept art remain unconfirmed (see [shared-assets README](../../packages/shared-assets/README.md)).
- Development-status tags on the home page (what is "In development" vs "Planned") come from the project's milestone record, not from a public build; confirm them before release.

## Revision 2 (valley navigation and place pages) — tested, browser-verified, measured

- `scripts/verify-design.mjs`: **78 checks pass**. These cover 11 pages × 7 viewports (no overflow, broken images or page errors), five map pins, the mobile menu, the viewer, lazy WebGL on `/hearth/`, and reduced motion and no-JS visibility.
- axe 4.14: **0 violations** on `/`, `/wilds/`, `/hearth/`, `/village/`, `/bestiary/`, `/kingdoms/` and `/community/` at 1440×900 and 390×844.
- View transitions (Chrome 157, headless): clicking the Village and Kingdoms pins produced `::view-transition-group(place-village)` and `::view-transition-group(place-kingdoms)` animations on the arriving page. In captured mid-flight frames, the chosen region lights in place and expands into the hero. Safari and Firefox were not tested (Firefox lacks cross-document view transitions and navigates normally).
- Home performance (same lab profile as above):
  - Desktop: LCP 204 ms median, CLS 0.000, 1,066 KiB after a full scroll.
  - Mobile: LCP 1,044 ms median, CLS 0.000, 931 KiB.
  - The full-plate hero (1920 px AVIF, 303 KiB) is heavier than the old hero. A smaller mobile derivative is a tuning option if field data ever approaches the 2.5 s target.
