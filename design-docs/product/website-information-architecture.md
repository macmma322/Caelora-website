# Public website information architecture

The site introduces a world in development. It is not a storefront or a disguised signup funnel. Exploration and development reading are the two actions available now.

| Area                     | Content / action                                                            | Truthfulness constraint                                                 |
| ------------------------ | --------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Cinematic hero           | Name, world-first promise, Explore Caelora / Development journal            | In-development label; concept art identified                            |
| Introduction             | Player agency and optional lore                                             | Explain the vision, not released features                               |
| Landscape feature        | Atmospheric exploration composition                                         | Reused valley art is not presented as a second gameplay location        |
| Building/survival        | First pillar of player life                                                 | Intended direction, not completeness claim                              |
| Creatures                | Second pillar + dragon study                                                | Concept label, no combat/taming capability claims                       |
| Villages/guilds/kingdoms | Third pillar                                                                | Player nations explicitly longer-term                                   |
| Freedom                  | Short statement about choosing a rhythm                                     | No mandatory chosen-one campaign                                        |
| Journal preview          | One actual founding editorial                                               | Real local article; no invented milestones or old posts                 |
| Media                    | Valley, dragon and atlas studies; originals open as optimized media         | Concepts, not screenshots/footage                                       |
| Footer                   | Development, project information, community/support status, legal readiness | No empty anchors, fake external channels or invented publisher identity |

Routes: `/`, `/journal/foundation/`, `/project-information/`, `/404.html`. Navigation fragments target real sections. The account portal link is omitted unless PUBLIC_ACCOUNT_URL is explicitly configured. No Steam link, purchase button, signup form, analytics script, external font request, release date, price, player count or award is invented.

Image replacements preserve the same slots, aspect ratios, alt text requirements and responsive source strategy. The existing hero concept is reused deliberately instead of inventing multiple landscapes. A clean approved official logo/sigil was not found; typography and a simple provisional compass ornament establish a restrained web identity. Approve/replace these when official brand files exist.

SEO: canonical/social origins from validated build configuration; title/description/social image, sitemap, environment-dependent robots, branded 404. Staging/development robots disallow indexing. No game release structured data or review schema until real facts exist. Legal/status pages avoid asserting a finished compliance policy.
