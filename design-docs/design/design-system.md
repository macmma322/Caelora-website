# M3.5 shared design system

Source of truth: packages/design-tokens/tokens.css. Shared primitives: packages/design-tokens/base.css. Public composition: apps/web/src/styles/site.css. Operational layout: apps/portal.css. Root DESIGN.md is the short design context; visual direction and motion specification live alongside this document.

| Role                       | Implementation                    | Use                                                    |
| -------------------------- | --------------------------------- | ------------------------------------------------------ |
| ink / deep                 | OKLCH 19% / 15%, hue173           | World margins and footer                               |
| surface / raised           | 23% / 29%, hue166/163             | Operational grouping and hover                         |
| paper / muted / faint      | 93% / 77% / 67%                   | Primary, secondary and quiet metadata                  |
| accent / hover             | 77% / 86%, warm bronze            | Actions, navigation, chapter emphasis                  |
| vellum / vellum-ink        | 87% / 28%                         | Cartographic interlude, independent dark readable text |
| danger / success / warning | Semantic warm red / green / ochre | Real operational state, never decoration               |
| line / bronze-line         | Low contrast grouping strokes     | Full borders, no thick accent side stripes             |
| overlay / scrim / clear    | Semantic tinted opacity roles     | Local scene readability, not glass panels              |

Cinzel variable weights 400–900 is delivered as self-hosted Latin/Latin-extended WOFF2 from fontsource-variable/cinzel5.3.0, with its SIL OFL included. Latin font transfer is 25,904 bytes, compared with the former125,468-byte full TTF. Extended glyphs load by unicode-range; English is the current language. Cyrillic display support is not claimed. Manrope Latin 400/600 is imported once through shared base.css, including Angular. System fallback covers unavailable glyphs; localization requires a proper font/language review.

Use the official Caelora wordmark image, never typed substitute. Responsive hero and navigation WebP derivatives preserve original design and alpha. Source original derivatives remain recorded; priority-assets and derivatives manifests contain hashes, sizes, crops and recipes. Brand derivative quality was inspected in real screenshots.

Fluid scene/title scales, normal body16px, UI14px, metadata11–12px. A metadata role never replaces the readable game description or an action label. Public content width 1320px with 48px desktop/20px small-screen gutters. Collapse navigation at 45rem and simplify cinematic scenes below 60rem. Forms use 16px fields to avoid mobile autozoom. Core action targets 48–52px; utilities 44px; inline prose links keep normal reading flow.

Buttons: .button (bronze), .button.secondary (quiet outline), .danger-action (semantic destructive text). Inputs have labels, focus, invalid and associated error states. .alert.error and .alert.success use separate semantic surfaces and full borders; .notice groups status without simulating account data. Focus is a 2px accent-hover outline with 5px offset. Example live implementations: public gallery, account auth-page.html, security-page.html and notifications-page.ts.

Dialogs are native <dialog>, with labelled heading,44px controls and focus restoration. Gallery is for artwork enlargement; security confirmation is for existing destructive operations, with action-specific final wording. No component framework is added. Operational pages have no marketing parallax. Long names/email/identifiers wrap; grid children use minmax(0,1fr) and min-width:0.

Shared shadows apply only to native dialog/mobile menu. Corners remain2px / 4px. Motion values and fallbacks: m3-5-motion-system.md. Automated accessibility findings and remaining limitations: ../audits/m3-5-verification.md. This system documents implemented behavior, not formal certification.
