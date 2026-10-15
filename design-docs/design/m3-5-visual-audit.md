# M3.5 initial visual audit

Baseline: clean M3 HEAD b4254d682947138875f83676d7772fffcfe6f082. Real Chrome, Astro dev server and existing trusted local HTTPS Angular/API services. Before screenshots: artifacts/m3-5/before. Six full-page/hero captures: 1920x1080, 1440x900, 1280x800, 768x1024, 390x844 and 360x800. Capture routine incrementally scrolls first so lazy images are loaded; no missing-art inference from uncaptured lazy loading.

## Anti-pattern verdict

Coherent existing brand, not a cluster of neon SaaS cards. However, under-authored brochure rhythm misses the cinematic brief. Largest opportunity: make composition develop the environment rather than repeat it. Initial expert scores are qualitative, not accessibility certification.

| Dimension     | Initial score /4 | Evidence and impact                                                                                                                                  |
| ------------- | ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Accessibility | 3                | Semantic links, native menu/dialog and alt text exist; 27 text elements under 11px on desktop, 33 on mobile. Detail/status captions can be only 8px. |
| Performance   | 3                | Static Astro and optimized WebP; repeated full-size landscape; 125kB TTF preload; no actual scroll profiling yet.                                    |
| Responsive    | 3                | All six widths fit viewport; mobile information is too small and the 830px minimum hero extends beyond small screens.                                |
| Theming       | 2                | Shared palette exists, but many separate overlay values; Angular does not actually load Manrope.                                                     |
| Anti-patterns | 3                | No generic card grid; identical dark fields, repeated landscape and studio creature plate weaken specificity.                                        |
| Total         | 14/20            | Sound foundation, substantial composition work needed.                                                                                               |

## Findings

| Priority / area | Before                                                                                                    | Proposed after                                                                          | Why                                                             |
| --------------- | --------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| P1 typography   | Mobile disclosure/metadata around 8px                                                                     | Metadata >=11px, body >=16px, controls >=14px, stronger hierarchy                       | Small text makes development truthfulness difficult to read.    |
| P2 hero         | Wordmark, promise, description and two filled buttons compete on left half; dark overlay covers traveller | Landscape-led composition; smaller mark, stronger short promise and one filled action   | Leave the castle and world legible; fewer redundant statements. |
| P2 narrative    | Same valley is hero, world feature and gallery without development                                        | One layered valley-to-settlement transition; explicitly labelled detail crops           | Reuse is honest, but must advance narrative.                    |
| P2 creature     | Grey studio rectangle shown beside routine copy                                                           | Monumental creature plate, intentional edge framing and scale                           | Studio backdrop breaks environmental immersion.                 |
| P2 rhythm       | Long dark intervals and repeated split alignment                                                          | Panorama, narrow manifesto, warm detail, creature plate, atlas spread and gallery       | Give chapters distinct narrative roles.                         |
| P2 navigation   | Absolute header disappears during a long page                                                             | Compact persistent header, visible current chapter, native accessible mobile disclosure | Keep wayfinding available without blocking natural scrolling.   |
| P2 motion       | Only one hero entrance; no true scroll sequence                                                           | Three independently moving depth planes, one complete sticky transition                 | Core addendum requires composed motion beyond fades.            |
| P2 account      | Vast undifferentiated surface; system font differs; long values have weak wrapping                        | Compact editorial rail, loaded shared font, 16px fields and robust wrapping             | Clarity and efficiency, with no decorative security motion.     |
| P3 copy         | 'Follow the making' implies a subscription but opens one founding article                                 | Explicit 'Read the founding journal'                                                    | State the available action truthfully.                          |

## Functional baseline

Real synthetic local registration, queued Mailpit delivery, email confirmation and verified sign-in passed. Protected overview/profile/security/MFA preparation/notifications screens captured desktop and mobile. Credentials, cookies and future setup keys remain only in ignored private artifacts; no secrets in screenshots. Sign-in/register screenshots also retained. Initial account secure-session and configuration behavior is preserved. Existing native infra startup reported a Windows ACL privilege failure after confirming existing services; reused running services, did not change privilege or reset storage.

Gallery uses native dialog, arrows/Escape and focus restoration. Native mobile menu supports Escape and selection. Preserve direct media hrefs as no-script fallback. Later pass must exercise failures, empty states, slow API, long values and reduced motion. Independent Impeccable design and detector assessments are recorded separately when returned; do not mistake a lint detector for aesthetic judgment.
