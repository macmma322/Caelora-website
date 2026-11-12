# Caelora Studio architecture

Date: 2026-11-12 · Branch: `feature/design-evolution` · Status: **planning document, nothing implemented**

> **Nothing here is implemented. Every module below requires audited, policy-protected API endpoints before any screen, route or navigation entry exists.** Today `apps/admin` renders one restricted-access page and no tools. Planned modules are never shown as navigation, buttons or fake data.

## Purpose

Caelora Studio is the internal operations surface for the people building Caelora: publishing development news, managing media, tracking the roadmap, supporting the community and watching platform health. It is the dense, efficient register of the platform; the account portal is the calm, immersive one. Both share tokens, the wordmark and the status vocabulary.

## Rules that apply to every module

1. **Server decides.** Authorization is enforced by the API on every request. The browser holds no role, flag or token that can grant access. A hidden route is not a permission.
2. **Verified, multi-factor identity.** Access needs a verified account, an enabled second factor and recent authentication for sensitive actions (the same re-authentication window the account portal already uses).
3. **Explicit policy.** Each capability (for example `journal.publish`, `players.view`) is granted by a named administrative policy. There is no implicit "admin sees everything".
4. **Audited.** Every write, and every read of personal data, produces an audit record (actor, capability, target, time, outcome). Audit records are append-only and are themselves readable only under policy.
5. **No invented data.** A module with no endpoint shows an honest empty or unavailable state, never sample rows.
6. **Least data.** Studio screens read the minimum fields they need. Personal data is masked by default and revealed per record, with an audit entry.

## Modules

| Module                  | Purpose                                                                                                              | Reads / writes                                                                                                                                                 | Required server-side policy                                                                                          | Audit requirement                                                                      |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| **Overview**            | One screen of what needs attention: drafts awaiting review, open community reports, health alerts.                   | Reads counts and links from the other modules. Writes nothing.                                                                                                 | Holds no capability of its own; each tile appears only if the viewer holds the underlying read capability.           | None beyond the underlying reads.                                                      |
| **Development Journal** | Draft, review and publish journal entries and the RSS feed.                                                          | Reads and writes entries (title, slug, status, body, cover media, publish time).                                                                               | `journal.read`, `journal.write`, `journal.publish` kept separate so authors cannot publish alone if policy says so.  | Record every create, edit, status change and publish with a diff reference.            |
| **Media Library**       | Store art and model studies with their honest status label (concept art, 3D model study, in development, planned).   | Reads and writes asset metadata (file, alt text, credit, status label, derivatives). Uploads go through a validated pipeline.                                  | `media.read`, `media.write`; deletion needs `media.delete` and refuses assets referenced by published content.       | Record uploads, label changes and deletions.                                           |
| **Roadmap**             | Maintain the public development status board.                                                                        | Reads and writes roadmap items (title, status, summary, order).                                                                                                | `roadmap.read`, `roadmap.write`, `roadmap.publish`.                                                                  | Record every status change, because it is a public claim.                              |
| **Community**           | Moderate any future community surface and handle reports.                                                            | Reads reports and moderation state; writes moderation actions and notes. Not built until a community surface exists.                                           | `community.review`, `community.moderate`; personal data under `players.view`.                                        | Record each action with reason and the content reference.                              |
| **Players & Access**    | Look up an account to support it: verification state, sessions, security events, future ownership and entitlements.  | Reads account summaries and security events; writes only narrow support actions (resend verification, end sessions). Never reads or sets passwords or secrets. | `players.view`, `players.support`; entitlement edits would need a separate `ownership.adjust` and a second approver. | Every read of an individual account and every action is recorded with a stated reason. |
| **Operational Health**  | Observe the platform: API availability, queue depth, error rate, mail delivery, build and deploy status.             | Reads metrics and status from existing monitoring. Writes nothing.                                                                                             | `health.read`.                                                                                                       | Reads are not audited; configuration is out of scope.                                  |
| **Audit History**       | Search and export the audit log.                                                                                     | Reads audit records only. No write or delete path exists in the API.                                                                                           | `audit.read`, stricter than other reads; export needs `audit.export`.                                                | Viewing and exporting audit history is itself audited.                                 |
| **Settings**            | Studio-level configuration: administrative policies and role assignments, feature flags such as `accountsAvailable`. | Reads and writes policy assignments and flags.                                                                                                                 | `policy.manage`; assignment changes require a second approver.                                                       | Record before and after values of every change.                                        |

## Sequence

1. Audit log and policy model in the API (no UI).
2. Authentication for Studio sessions, with MFA and recent-authentication checks.
3. Read-only Operational Health and Audit History.
4. Journal and Media Library, which replace file-based content for the public site.
5. Roadmap, then Players & Access, then Settings.
6. Community only when a community surface exists.

Each step ships with endpoint tests for allow, deny and audit-record behaviour before any UI is added.

## Design primitives (in `apps/portal.css`)

| Primitive           | Class                                                                               | State                                                     |
| ------------------- | ----------------------------------------------------------------------------------- | --------------------------------------------------------- |
| Page header         | `.page-header`, `.page-meta`, `.eyebrow`, `.lead`                                   | In use (account and Studio).                              |
| Status tag          | `.status-tag[data-status]` (shared, `packages/design-tokens/base.css`)              | In use.                                                   |
| Status panel        | `.status-panel[data-tone]` with `.status-line`                                      | In use (account availability).                            |
| Empty state         | `.empty-state`, `.is-compact`                                                       | In use (account).                                         |
| Loading placeholder | `.loading-block`, `.loading-bar` (static, no animation)                             | In use (account).                                         |
| Definition rows     | `.definition-rows` (shares rules with `.account-status-list`)                       | In use (Studio access requirements).                      |
| Data table          | `.data-table`, `.data-table-wrap`, `.is-numeric`                                    | **Defined, unused.** Dense, `--font-ui`, tabular figures. |
| Studio shell        | `.studio-header`, `.studio-brand`, `.studio-label`, `.studio-nav`, `.studio-layout` | In use. Navigation lists only what exists.                |

Typography in Studio: Cinzel for page titles only; `--font-ui` for everything else. Controls keep the 44 px minimum target.
