# Design evolution: One valley, endless beginnings

Date: 2026-11-12 · Branch: `feature/design-evolution` · Base: `main` dddb517 · Supersedes the page structure (not the identity) of [caelora-visual-direction.md](caelora-visual-direction.md).

## Audit summary (baseline, production build dddb517)

| Priority | Finding                                                                                                                                                                                                                                  |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P1       | The same 1672 px valley image carries the hero, both "journey" chapters, the journal cover and the gallery lead. The 190 svh sticky journey only zooms that flat image, which reads as stretched rather than as depth.                   |
| P1       | The page explains a philosophy ("what if", "no destiny") three times but never says plainly what a player does. There is no systems overview and no development-status vocabulary.                                                       |
| P1       | Calls to action loop back into the same page; the journal has one hard-coded entry and no index; there is no way to follow development.                                                                                                  |
| P1       | The account portal points at the website origin because no API is deployed; every form submits into a 404 and reports a generic failure. Visitors are not told that accounts are not open.                                               |
| P2       | The 3D cloak study initialises WebGL as soon as it nears the viewport, keeps a requestAnimationFrame loop running while off-screen, and under reduced motion the turn buttons change nothing (no render is scheduled).                   |
| P2       | Two competing focal points in the hero (centred wordmark and lower-left headline). 11 px uppercase Garamond eyebrows and 12 px captions are hard to read. Body Garamond at 16 px has a small x-height.                                   |
| P2       | Project information still says nothing is publicly deployed, and the founding note says registration is unavailable; both are now inaccurate in different directions.                                                                    |
| P3       | site.css has accumulated late overrides (repeated `.eyebrow`, `.hero-brand`, `.bonds` blocks), which makes the cascade hard to reason about. The atlas still shows interface tabs (Map, Equipment, Backpack…) that imply a finished HUD. |

## Direction

Keep the illustrated-expedition identity (Cinzel inscriptions, weathered bronze, evergreen dark, the valley) and make the page do more work:

1. **One valley, many places.** The only presentation-grade environment master is the 3840×2160 valley painting that is also the game's main-menu plate. Instead of re-showing the whole painting, each act uses a different art-directed detail of it at native resolution: snow peaks and mist (wilderness), a brazier among crates and a banner (first home), the lamplit riverside village (living world), the castle above the falls (kingdoms). The reuse is deliberate and stated: every scene is literally a place inside one valley. Captions say "Detail of the valley environment concept".
2. **Concrete before poetic.** A systems folio — Build your place, Find your path, A world with its own life, Beyond the ordinary — follows the hero, each with a status tag. The poetic lines stay, once each.
3. **Honest status vocabulary**, shared by all three apps: _Concept art_, _3D model study_, _In development_ (being built in the Unity prototype, not publicly playable), _Planned_ (long-term intention). No "gameplay" label is used because no presentation-grade captures exist yet.
4. **Real next actions only.** Primary "Explore the world", secondary "See development progress" (journal index), "Follow development" via an RSS feed that needs no data collection. No community link, waitlist, testing sign-up or purchase button is shown because none exists.
5. **Temperature as narrative.** Cool mist-teal for the wilderness, warm umber and ember for the hearth, near-black charcoal for the dragon, dusk gold for kingdoms. Section backgrounds carry the transition; no new imagery is invented.

## Acts (home page)

| Act              | Content                                                                          | Media / treatment                                                               |
| ---------------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| I Arrival        | Wordmark, "A world to call your own.", one-sentence pitch, two CTAs, status line | Full valley, gentle CSS scroll-timeline depth with separate SVG pine foreground |
| II One valley    | Four systems with status tags and legend                                         | Four small details of the valley + dragon study                                 |
| III Wilderness   | Exploration                                                                      | Cinematic 2.7:1 band of peaks and mist, pines as a separate foreground layer    |
| IV First home    | Gather, craft, build, return                                                     | Portrait hearth detail, ember light; travel-cloak 3D study ("things you carry") |
| V Living world   | Villagers, settlements, wildlife                                                 | Lamplit village detail; wolf and falcon model studies                           |
| VI Extraordinary | Dragons, wings and gliding                                                       | Dragon study on a dark stage with a radial studio light, one-time reveal        |
| VII Freedom      | Wander, build, survive, trade, explore, join; nations later                      | Castle detail under a dusk gradient                                             |
| VIII Studio      | Journal entries from a content collection, status board                          | Entry covers; RSS                                                               |
| IX Community     | Honest "not open yet" plus how to follow                                         | Typographic                                                                     |
| X Closing        | "Somewhere in the valley, a fire is waiting."                                    | Ember glow and pine silhouette; no repeated hero copy                           |

The full archive moves to `/media/` (all studies, labelled, with the existing accessible viewer). The journal gets `/journal/` and `/journal/<slug>/` from a typed content collection, so new entries need one Markdown file.

## Typography

Cinzel stays for display and the wordmark context. EB Garamond stays for editorial prose, raised to 17–18 px with 1.7 leading on the public site. A system UI stack (`--font-ui`: Segoe UI Variable/Segoe UI, system-ui, Roboto, Helvetica, Arial) now carries labels, eyebrows, captions, status tags, form controls and dense admin text: zero download, high legibility at 12–14 px. Minimum caption size 12 px.

## Motion

CSS first. Scroll-timeline depth on the hero and wilderness band (desktop, motion allowed), one-time entrance reveals via IntersectionObserver that are only armed after the script runs (no-JS and failure states show everything), a 700 ms dragon reveal, a slow ember flicker limited to the hearth glow and paused off-screen. No sticky scroll scene, no scroll hijacking, no animation library. Reduced motion removes parallax, reveals and flicker entirely.

## 3D showcase

`ModelShowcase` becomes data-driven (model, poster, title, status, camera). It shows a static poster first; Three.js and the GLB load only when the visitor presses "Inspect in 3D". Rotate (drag, arrows, buttons), bounded zoom (wheel, +/−), reset, render-on-demand (no idle loop), off-screen pause, WebGL failure keeps the poster. Only the travel cloak has a web-ready GLB; wolf/falcon/dragon sources are multi-million-triangle masters and remain image studies until optimized derivatives exist.

## Account and admin

The account portal reads the existing `/api/v1/platform` contract before showing forms. If the platform is unreachable or `accountsAvailable` is false, the auth pages explain that account services are not open yet and disable submission; nothing is faked. Desktop auth pages become a split layout with a restrained hearth detail; mobile is form-first. The admin app is renamed Caelora Studio on its restricted screen and gains shared page-header, status and empty-state primitives. Future Studio navigation is documented in [caelora-studio-architecture.md](caelora-studio-architecture.md), not rendered as tools.

## Revision 2 (2026-11-12): the valley is the navigation

Feedback on revision 1: competent but "nothing special", and the story should be pages, not sections. Revision 2 keeps the identity, the status vocabulary and the honesty rules, and changes the structure and the signature interaction.

- **Home is the painting.** The full 3840×2160 plate fills the screen under a dusk veil. On fine pointers a pool of lantern light follows the cursor (CSS `@property` transition on two custom properties, rAF-throttled). Five lit markers sit on real places: the peaks, the fire, the village, the castle and the falcon. On phones the plate becomes a swipeable panorama that opens on the traveller, with the intro above it.
- **Choosing a place zooms into it.** Four places' heroes are exact crops of the plate. The home map carries a hidden copy of each crop at its true position with a matching `view-transition-name`, so a cross-document view transition (CSS-only `@view-transition`) morphs that region of the painting into the next page's hero. Browsers without support navigate normally; reduced motion disables the transition.
- **Five place pages**, each with its own temperature and centrepiece:

  | Page         | Temperature | Centrepiece                                                     |
  | ------------ | ----------- | --------------------------------------------------------------- |
  | `/wilds/`    | mist        | field notes and a numbered atlas key linked to marks on the map |
  | `/hearth/`   | ember       | rising embers, a gather–craft–build–return ritual, the 3D cloak |
  | `/village/`  | evergreen   | a daybook coloured by the hour                                  |
  | `/bestiary/` | charcoal    | the dragon stage, specimen plates and "Wings. Real ones."       |
  | `/kingdoms/` | dusk        | a wall of verbs and a heraldic guild → kingdom → nation ladder  |

  Every place page ends with a status ledger and a mini map of the valley (current place lit) with previous/next.

- **Navigation:** The valley · Places ▾ · Journal · Media · Community. `/community/` is its own page.
- Map geometry (pins and crop zones) lives in `styles/valley.css` because the CSP forbids inline styles; place content lives in `src/data/places.ts`.
