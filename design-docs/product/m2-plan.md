# M2 execution plan

Baseline: `e373f571b90fbb945e0e0d811dc66233c91417ba`, branch `feature/platform-foundation-v1`, clean working tree. M1 reports, ADR-001, configuration contract, tokens, asset provenance and API/database infrastructure reviewed. Baseline `npm run verify` passed on 2026-10-15; log is local `artifacts/m2-baseline-verification.log`.

## Workstreams and integration

Use `feature/m2-integration` for this common plan, then isolated `feature/m2a-website-visual-refinement` and `feature/m2b-identity-foundation` worktrees. Each starts from the common planning commit. Implement and verify each; merge into integration only after its checks pass. Keep the M1 branch intact until the integrated result passes. Git worktrees are created against the website repository explicitly; the chat's original project is the separate Unity repository, so a tool that implicitly targets that project would be inappropriate. No game/reference code is modified and no remote is added.

## M2A: observed weaknesses and actions

Actual rendered baseline inspected at 1920×1080, 1440×900, 768×1024 and 390×844. Screenshots are local under `artifacts/m2/before`; full-page captures need images scrolled into view before claiming all lazy content is loaded.

1. The typed wordmark and generic star do not use Caelora's real identity. Use the documented transparent production wordmark/compass-O found in `D:/Caelora-menu/docs/design/reference/production/caelora-logo.webp`, preserving aspect and originals.
2. Hero typography covers the traveller and competes with the landscape. Give branding a defined clear area and restore visual space around the valley/castle.
3. The dark overlay suppresses the warm settlement lighting. Localize contrast behind text rather than flattening the whole composition.
4. Mobile is a long stack with weak action grouping and little brand presence. Design a distinct mobile framing and concise, consistent action pair.
5. Large repeated serif headings feel uniform rather than hierarchical. Reserve display typography for landmarks; improve paragraph measure and metadata scale.
6. The same valley appears repeatedly with similar framing. Use one clear cinematic introduction and deliberate detail/composition changes, explicitly captioned as concepts.
7. Gameplay pillars are mostly text in one list. Give exploration, building/survival, creatures and settlements distinct editorial treatments without claiming completed gameplay.
8. Gallery crops cut artwork and bare image navigation loses site context. Use considerate aspect ratios and an accessible dialog with captions, keyboard navigation and focus return.
9. Repeated large dark gaps and abrupt section bands make the page feel long and static. Tighten rhythm, vary layout and use restrained transitions/entrance motion with reduced-motion support.
10. Header/footer lack a useful account destination and clear project navigation. Use configurable account links, a structured footer and real journal destinations; no invented business details or posts.

Verify all four requested viewports, keyboard menu/gallery behavior, reduced motion, no overflow, loaded assets, types/build, CSP compatibility and M1 regressions. Reuse/refine the existing shared tokens. No external stock or unrelated generated branding.

## M2B: implementation sequence

1. Establish disposable real PostgreSQL and local email capture. PostgreSQL 18.6 is installed; create a separate Caelora-owned loopback cluster/port without touching the existing service/databases. Mailpit can run as a local pinned official binary or Compose service.
2. Add ASP.NET Core Identity with immutable Guid IDs, verified email, framework token providers and durable browser sessions/audit events. Generate explicit PostgreSQL migrations. No speculative commerce/device tables.
3. Implement registration, confirmation/resend, cookie login/logout, password recovery/reset, authenticated profile read/update and a truthful browser-session overview.
4. Enforce secure HttpOnly cookies, exact allowed origins, framework antiforgery on mutations, generic account-discovery responses, password/lockout/rate policies and durable session validation/revocation. No browser token storage. Production configuration and key persistence fail closed.
5. Build Angular reactive forms with validation/loading/errors and real API calls. Authentication guards improve navigation; API authorization remains authoritative.
6. Run database-backed integration tests, actual Mailpit verification/reset delivery and browser flows. Record blocked Docker/container execution separately from passing native PostgreSQL tests.
7. Document precise current/future data contracts and update configuration/run commands. Test integrated visual/account changes before final commits/merge.

## Docker finding

Selected context: desktop-linux. Docker Desktop 4.85.0 backend log reports startup failure: inference-manager unix socket `dockerInference` could not be removed/accessed, with invalid filename/directory/volume syntax. The daemon failure predates the rejected timed diagnostic wrapper. No factory reset, socket deletion, context/security change or repeated policy-rejected command is attempted. Compose syntax can be verified without the engine; actual container execution remains blocked until a healthy engine is available. Native PostgreSQL provides a genuine independent database validation path.

## Acceptance and scope

Keep IMPLEMENTED, DOCUMENTED, BLOCKED and NOT STARTED distinct. M2 requires actual local registration, email confirmation, login/logout, password reset, profile authorization, CSRF/rate behavior and persistent PostgreSQL schema verification. No EF InMemory substitution, fake email success, Steam/payment/DRM implementation, public deployment, remote push or changes to other projects.
