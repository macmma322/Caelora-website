# M3.5 verification and final report

## Status

IMPLEMENTED: public cinematic expedition, shared semantic tokens, responsive navigation, genuine independent depth planes, continuous wilderness-to-hearth camera transition, monumental dragon study, vellum atlas spread, player-freedom statement, accessible gallery and honest founding journal. User-supplied canonical 3D source models now contribute optimized wolf/falcon studio renders. Angular guest/account/security surfaces share the visual language and loaded body font.

VERIFIED: six requested browser widths; gallery/menu/keyboard/focus; static reduced-motion and no-script reading; real account sign-in, protected routes, notification updates, MFA provisioning/activation/recovery sign-in; trusted HTTPS/CSRF/CORS/revocation regression; 81 real PostgreSQL .NET cases. Exact final build/check totals and performance are recorded below after final execution.

BLOCKED: independently verified commercial redistribution rights for concept artwork and Meshy source studies are not available. Final layered forest/settlement/dragon environment plates are missing. This limits publication/art direction completeness; it does not prevent a locally usable implementation.

NOT STARTED: public deployment/push (explicitly excluded), raw high-density interactive 3D delivery, production GLB retopology/LOD/texture budgets, physical iOS/Android and cross-browser/assistive-technology certification. Field INP is unavailable. No new backend, Identity, database migration or Unity gameplay work was done.

## Git and boundaries

Starting branch: feature/m3-security-and-reliability. Starting HEAD: b4254d682947138875f83676d7772fffcfe6f082, clean. Working branch: feature/m3-5-premium-design-system. The M3 checkpoint remains an ancestor; no reset/rebase/push/deployment. Final commit HEAD is returned in the completion response (a commit cannot embed its own hash). Coherent local commits cover audit/direction, tokens, public composition, motion/model studies, account refinement and final QA.

All tracked edits are in D:/Caelora-website. Game and source-asset paths were read only. Background Blender loaded packed models, changed a temporary in-memory scene and wrote PNGs beneath ignored website artifacts; no source .blend save operation is present. No raw models/textures were copied into the web build.

## Skills applied and provenance

Installed Impeccable context/teach, brand, shape reference, audit/independent critique, heuristics/cognitive-load, adapt and polish guidance were read and applied. The full user brief and existing repository product documents resolve inputs; this was general implementation, not an unconfirmed craft invocation. Three composition studies are retained under artifacts/m3-5/directions/three-compositions.png. Existing artwork resolves the image gate; no fabricated image probes were substituted for game art.

The critique's explicit requirement triggered two isolated review agents: design review and official deterministic detection. Baseline expert critique 27/40; first redesign 29/40 before its three concrete findings were corrected. These are qualitative checkpoints, not a final quality certification. Automated findings are separately reported. No third-party install scripts/global changes were used. Official impeccable 4.5.2 ran via npm exec with ignore-scripts; Lighthouse 13.5.0 / axe 4.14.0 were installed only in ignored local tooling.

Emil's installed emil-design-eng guidance governs purpose, custom easing, short controls, transform/opacity, cancellation, keyboard and reduced motion. Standalone animation/mobile/break-ui skills were not installed; official emilkowalski/skills provenance and available commands were inspected, and the installed main skill supplied the applicable principles. Astro guidance preserves static HTML/external scripts and avoids framework/hydration overhead. Blender and asset-optimization skills guided offline model rendering, silhouette/packed-texture inspection and delivery budgets.

Official upstream references: https://github.com/pbakaus/impeccable and https://github.com/emilkowalski/skills. Font catalog/license verification: https://fonts.google.com/specimen/Cinzel and the included OFL files. Browser automation uses the existing bundled Playwright/system Chrome, not a production dependency.

## What changed and why

The initial M3 site was coherent but brochure-like: tiny mobile metadata, repeated valley compositions, a disconnected grey dragon rectangle, one entrance animation and an overly sparse/duplicated account shell. Direction chosen: the illustrated expedition, over a parchment-led folio and specimen-led archive.

The result varies panorama, editorial ledger, authentic model studies, creature plate, atlas spread, quiet freedom statement and media archive. The headline invites habitation; no mandatory hero/campaign is implied. The camera advances through one concept rather than pretending that reused art depicts multiple implemented locations. Public CTAs name actual available destinations. Accounts use a compact guest form, a restrained signed-in rail, 16px inputs, full-border notices, long-value wrapping and explicit final destructive wording.

Independent final review found an early ghosted crossfade, a midpoint text gap and wrong active chapter. Final code uses one continuous camera, readable chapter change and journey-aware aria-current. The security confirmation now repeats the action name. No account protocol/state logic was replaced.

## Assets and rights

Existing valley, dragon and atlas studies and official transparent Caelora wordmark remain the foundation. Sources/rights limits: packages/shared-assets/README.md; exact transformations in asset-manifest.json, brand-manifest.json, m3-5-derivatives.json and m3-5-priority-assets.json. Cinzel Latin variable WOFF2 is 25,904 bytes; extended subset 14,540 bytes; original full TTF was 125,468 bytes. Manrope Latin 400/600 is bundled across Astro and Angular. SIL OFL files are retained. English/Latin support is verified; Cyrillic display support is not claimed.

New actual model sources: Falcon/Meshy_AI_Block_Falcon_1009091117_texture.blend (3,178,946 triangles) and Wolf/Meshy_AI_Blockfur_Wolf_1009090039_texture.blend (2,339,845 triangles), beneath D:/Caelora-source-assets/Bonds. Packed textures inspected. Blender 5.2.2 / Cycles, 24-sample transparent studio renders, inspected and reframed to retain extremities.640px WebP 46–49 KB each;960px 67–75 KB. Model manifest stores source SHA256 and output budgets. These are labelled model studies, not gameplay or implemented companion mechanics. Source license/provider-plan evidence remains unverified for public redistribution.

## Browser evidence

Ignored local evidence root: artifacts/m3-5.

| Evidence                                                     | Location                                                                                                                   |
| ------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------- |
| Baseline full-page and hero, all six sizes                   | before/home-{1920,1440,1280,768,390,360}.png and hero-*.png                                                                |
| Baseline account overview/profile/security/MFA/notifications | before/account-*-desktop.png and -mobile.png                                                                               |
| Three composition explorations                               | directions/three-compositions.png                                                                                          |
| Final full-page and hero, same six sizes                     | after/home-_.png and hero-_.png                                                                                            |
| Five exact cinematic phases                                  | after/journey-{0,0.25,0.5,0.75,1}.png                                                                                      |
| Section compositions including real models                   | after/*-desktop.png, bonds-section-mobile.png                                                                              |
| Static accessible storyboard                                 | after/reduced-motion-desktop.png, no-script-desktop.png                                                                    |
| Menu/gallery                                                 | after/mobile-menu.png, gallery-mobile.png                                                                                  |
| Account protected screens, both widths                       | after/account-*-desktop.png and -mobile.png                                                                                |
| MFA/recovery/confirmation/error                              | after/account-mfa-setup-masked.png, account-recovery-codes-masked.png, account-confirmation.png, account-network-error.png |
| Browser assertions                                           | after/browser-results.json, account-browser-results.json                                                                   |
| Actual scroll recording/trace                                | motion/scene-sequence.webm, chrome-trace.json, frame-metrics.json                                                          |
| Raw performance reports                                      | lighthouse-mobile-final.json, lighthouse-desktop-final.json                                                                |
| Automated/independent critique                               | before/detector*, after/detector*, after/independent-design-review.md                                                      |

MFA QR/setup/recovery values are masked in captured evidence. Synthetic credentials/cookies remain in ignored private test artifacts and are never printed. All six layouts fit their viewport. 720px and 320px reflow checks supplement the requested widths. Mobile/tablet use static scene flow. No-script links open complete artwork directly; JavaScript adds the native viewer. The desktop full-page capture cannot convey a sticky timeline; the five phase captures and recording are the evidence for its actual sequence.

## Functional and accessibility verification

Real browser registration, Mailpit delivery, email confirmation and sign-in established baseline. Final UI verification exercises inline auth errors, overview/profile/security/enrollment/inbox at 1440×900 and 390×844, native confirmation Cancel initial focus/Escape/focus return, real mark-all read, aborted network error, actual provisioning/activation, masked recovery-code screen, MFA challenge and recovery login. No mocked protected identity.

The HTTPS regression script passes trusted TLS, queued branded email, password reset and session revocation, host-only Secure/HttpOnly/SameSite cookie, exact credentialed CORS, missing-CSRF/wrong-Origin rejection, real TOTP activation/challenge, two recovery sessions, remote revocation, persisted notifications and logout. Evidence: https-regression.log.

Axe WCAG 2A/AA/2.1AA/2.2AA scan found zero violations in the checked public page and five protected account routes. Gallery Arrow/Escape/focus restoration and mobile disclosure selection/Escape pass. Labels, alt text, focus outlines and real error announcements are present. Lighthouse accessibility 100 is a lab result, not formal WCAG certification. Small tracked metadata remains a design choice; functional text is larger. Physical device and screen-reader testing remain required before publication.

## Performance and checks

Final measured values and root verification outcome are appended below. Testing uses local trusted HTTPS Chrome and the developer static host, which sends no-store and uncompressed text. No public CDN/cache or production SMTP is implied. Local robots intentionally blocks indexing; do not remove this to inflate an SEO score.

A 4-second scroll profile with 4× CPU throttle recorded 605 requestAnimationFrame intervals: mean 6.62ms, p95 11.2ms, maximum 27.8ms, no intervals over 34ms and zero observed long tasks. This is high-refresh headless lab cadence, not a physical-device FPS guarantee. The video/trace include actual geometry and image transformations. No field INP value is available; total blocking time is reported separately.

Earlier local performance iterations: first redesign mobile LCP 4.4s; responsive image/font/wordmark changes reduced it to 3.0s in a local run, with 93 performance, 100 accessibility, 100 best practices and 69 SEO. The 2.5s mobile LCP target was not yet met on the uncompressed developer host. Final values supersede this checkpoint below.

## Remaining weaknesses / next milestone

1. Supply clean separated environment plates: forest interior, warm cottage/settlement, clean valley background and dragon environment/alpha. Current authentic art is finite and the studio dragon backdrop is still visible.
2. Confirm artwork and Meshy redistribution rights before publication; collect actual dated gameplay captures. No further raw models need to enter the homepage bundle.
3. Re-measure with production-like compression/cache/CDN and a real slow mobile device; meet the 2.5s LCP target and obtain meaningful field INP when there is traffic.
4. If interactive 3D earns its place, commission web-specific retopology/LOD and compressed GLBs/textures, load only on request, and keep the current static poster. Raw 2–3M triangle masters are inappropriate for the default page.
5. Complete physical touch, Safari/Firefox, screen-reader, localization and publisher/legal review. The design is substantially authored; this report does not claim award-winning quality or publication readiness.

## Final execution results

| Lab profile | Performance | Accessibility | Best practices | SEO | LCP | CLS | TBT |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| mobile | 92 | 100 | 100 | 69 | 3.06s | 0.0214 | 0ms |
| desktop | 100 | 100 | 100 | 69 | 0.76s | 0.0001 | 0ms |

Lighthouse 13.5.0, local HTTPS/system Chrome, mobile simulation: 150ms RTT, 1,638.4Kbps throughput, 4x CPU; desktop preset: 40ms RTT, 10,240Kbps throughput, 1x CPU. Raw JSON includes exact Chrome/user-agent and trace settings. Mobile LCP remains above 2.5s: target NOT MET. CLS and accessibility targets pass these lab checks. SEO 69 is driven by the intentional non-public robots block. No claim of field INP or production delivery performance. Total public JavaScript is 6,158 raw bytes across three chunks; no hydration/animation framework.

The complete npm run verify passed: formatting, zero-warning ESLint, Astro/TypeScript, 16 Node tests (zero failures/skips), Astro plus both Angular builds, static-link/srcset validation, repository documentation links, locked Release .NET build (zero warnings/errors), 81 PostgreSQL-backed .NET tests (zero failures/skips), source secret patterns and Compose syntax. Total existing automated cases: 97. Evidence: artifacts/m3-5/final-verify.log. Existing API binaries were locked by the running developer service; verification used session-only UseArtifactsOutput=true and ArtifactsPath under ignored artifacts/m3-5/verify-dotnet, preserving the active service and its data. No project/backend configuration was changed.

Final follow-up checks: all six browser viewports, five scene phases, gallery arrows/Escape/focus, mobile menu, reduced-motion, no-script and 720/320px reflow pass on the final built HTTPS assets. Six additional public/guest axe scans report zero violations; the five protected-route axe scans also report zero. Gallery network failure displays the real error status and closes with Escape. Final screenshot inspection caught and restored responsive logo sizing after CSS cleanup; the six-view capture was repeated. Final static verifier checks four pages/161 local asset, srcset, link and fragment references; repository verifier checks 59 documentation links. Secret-pattern scan covers 224 source files.

Local review address: https://localhost:4445, with account destination supplied through build-only public environment configuration as https://localhost:4443. No deployment-specific source constant or committed .env was introduced. Default project configuration remains authoritative on future builds. Before publication: address artwork rights, missing separated environmental art, physical-device/browser coverage and the measured mobile LCP gap.
