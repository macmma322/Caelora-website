# Identity, entitlements and sessions

Status after M2: ASP.NET Core Identity accounts, verified email, browser cookies/sessions, recovery and basic security events are implemented. See [implemented identity decisions](m2-identity.md). Entitlements, external linking, trusted devices, launcher authorization, gameplay leases, payments, notifications and backups below remain future design; see [future contracts](../architecture/future-platform-contracts.md).

## Distinct concepts

| Concept                    | Meaning / authority                                                             | Must not be confused with                                   |
| -------------------------- | ------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| Caelora account            | Internal stable account ID; ASP.NET Core Identity owns credentials and recovery | A Steam ID or mutable display name                          |
| Linked Steam identity      | Verified external subject with a unique link to an account                      | Proof of current game ownership                             |
| Entitlement                | Server decision derived from verified ownership grants and revocations          | Logged-in browser or local boolean                          |
| Trusted device             | User-reviewed device record, revocable; weak hardware signals are contextual    | Unforgeable hardware identity or permission to play forever |
| Browser session            | Secure server-backed login, independently revocable                             | Gameplay concurrency slot                                   |
| Launcher session           | Native OAuth/OIDC token family and device context                               | Reusable embedded client secret                             |
| Active gameplay lease      | Bounded, atomically acquired authorization to run online gameplay under policy  | Every browser tab or launcher login                         |
| Multiplayer server session | Authoritative game-server connection and player admission                       | Global ownership authority                                  |

## Trust boundaries

Browsers, launcher binaries and Unity clients are untrusted public clients. They can be modified and cannot hold publisher secrets. All account/ownership/administrative decisions occur on trusted servers. PostgreSQL owns durable facts. Redis can coordinate short-lived state but is not an entitlement database. Steam and Stripe responses are external proofs whose issuer, application, timestamp and subject must be validated. A CDN or object-store URL is distribution, not authorization.

The admin origin and deployment identity are separate from account UI. An ingress access check is an additional layer; each server operation still requires an explicit policy/capability. A hidden menu or Angular guard never grants or protects a backend privilege.

## Accounts and browser authentication

Use ASP.NET Core Identity's maintained password and token mechanisms; do not invent password hashing, encryption protocols or identity tickets. Require verified email before sensitive actions. Use host-only Secure, HttpOnly session cookies, appropriate SameSite, bounded idle/absolute expiry and server-side revocation. Persist and protect Data Protection keys outside ephemeral containers; rotate keys without losing recovery history. Do not place bearer/refresh tokens in browser localStorage.

Implement CSRF protection for cookie-authenticated state changes, including linking identities and revoking sessions. Allow only configured credentialed CORS origins when those endpoints exist. Rate-limit sign-in, registration, password reset, recovery, challenges and device actions, with account and network dimensions and generic enumeration-resistant responses.

Add authenticator MFA and recovery codes first, then passkeys using a maintained WebAuthn/Identity integration with correct RP ID/origin policy. Require step-up for recovery changes, linking/unlinking, new trust grants and admin actions. Recovery must not become a weaker bypass around MFA. Revoke token families and active sessions as appropriate after recovery/password changes. Audit the result without logging secrets.

## Launcher authorization

Use a standards-based OIDC/OAuth authorization-code flow with PKCE through the system browser. Native clients are public clients; there is no safe embedded client secret. Use state/nonce, exact registered callbacks, a loopback redirect with loopback binding or a securely registered application redirect, short access-token lifetimes and rotated refresh-token families stored in the OS credential store. Require issuer, audience and scope validation on the API. Refresh reuse triggers revocation and account review.

The launcher remains a separately versioned C#/Avalonia executable. A validated public manifest supplies apiOrigin, updateOrigin and build channel. Update metadata and executable signatures need an independent signing/rotation design and rollback protection. Browser login completion is not permission to download arbitrary code. Do not share Unity game assemblies with web code or put server keys in either binary.

## Steam and direct ownership convergence

Store separate verified source grants keyed by account, product, provider and unique provider reference, with status, observation time and provider revision/event identifier. Derive the unified entitlement from active grants. An active Steam grant or direct-purchase grant may each confer the same product entitlement. Revoking one source must not remove another valid source's grant. Do not infer ownership from an identity link alone.

For Steam, verify the appropriate Steam authentication ticket on a secure backend and check ownership for the configured application. Do not trust Steam IDs supplied by the browser/game. Follow Steam's linking proof flow for website identity; enforce uniqueness and require recent account authentication before linking or unlinking. Publisher Web API keys stay on trusted infrastructure. Cache proof results with an explicit refresh/revocation policy; cached observations are not permanent ownership. Handle Steam family sharing/borrowed licenses deliberately before launch.

For direct purchase, use Stripe-hosted checkout when introduced. A browser success redirect is not a payment confirmation. Verify the webhook signature over original request bytes using the provider SDK, apply replay tolerance, enforce unique event IDs, and durably commit event processing with the entitlement transition. Do not assume delivery order. Read current provider state when events cannot establish an ordered transition. Acknowledge only after durable receipt/processing according to the retry design. Use an outbox for account/security notifications.

Refunds and chargebacks suspend/revoke the relevant direct grant according to a reviewed policy. Restored payments can restore that source grant without duplicating it. Keep transaction/audit evidence according to a documented retention policy. Do not take permanent punitive account action solely from a dispute signal. Commerce, tax and refund policies need review for the actual publisher/jurisdictions before launch.

## Simultaneous gameplay and offline single-player

Multiple browser and launcher sessions are allowed. A separate policy decides online gameplay slots per account/product. On online launch, acquire a lease atomically: a unique durable slot/transaction or a carefully specified Redis Lua transaction with expiry and monotonically increasing fencing. Never use check-then-set. Bind the lease to subject/product/session/device context and an expiry; heartbeat extends only the currently owned lease. Authoritative game servers reject stale fencing tokens. Design Redis failover behavior explicitly; durable state must prevent stale leases from creating unlimited online slots.

When two devices overlap, suspend or challenge the conflicting online session and let the holder review/replace it with fresh authentication. Notify the account holder through actual website/launcher/email channels when implemented. Provide recovery after a crash and explain the affected device/time. IP/geolocation changes are risk signals, not identity or conclusive sharing proof. Never automatically permanently ban an account for overlap.

Offline single-player may use a bounded signed authorization lease containing account pseudonym, product, device binding policy, issued/expiry timestamps, audience and key ID. Sign with a standard maintained signature format; ship only public verification keys. Define clock rollback, cached entitlement and recovery behavior before implementation. Offline clients cannot receive instant revocations or reliably enforce global simultaneous play. The business policy must accept that bounded window. Strict global concurrency and unrestricted disconnected play cannot both be guaranteed on untrusted client hardware. Local worlds must remain accessible under the reviewed recovery policy; do not turn a transient service failure into data loss.

## Threat scenarios and mitigations

| Scenario                                     | Boundary / response                                                                                                        |
| -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Attacker changes client ownership flag       | API ignores it; uses server source grants and verified subjects                                                            |
| Stolen Steam ticket / identity-link takeover | Validate issuer/application, freshness and target; bind linking challenge; require recent account proof; reject replay     |
| Replayed or reordered payment events         | Signature + timestamp, unique event ID, transactionally durable transitions and reconciliation                             |
| Cross-site browser request revokes sessions  | CSRF tokens, origin validation, SameSite cookie and correct credentialed CORS                                              |
| Stolen refresh token                         | OS protected storage, token-family rotation/reuse detection, session revocation and notification                           |
| Parallel lease acquisition race              | Atomic slot write and fencing; tests exercise contention and expiry                                                        |
| VPN, mobile network or shared household IP   | Contextual review; no automatic ownership loss or permanent bans                                                           |
| Compromised admin browser                    | Explicit least-privilege server capability, MFA/step-up, immutable audit evidence and ingress restriction                  |
| Client embeds publisher key                  | Prevent through architecture/scan; rotate exposed credentials and audit impact                                             |
| Dependency/config failure                    | Startup validation; sanitized 503 readiness; no fake healthy integration, no fallback to production-like local credentials |
| Malicious launcher update source             | Signed manifest/artifact verification, channel pinning, rollback policy and HTTPS allowlist                                |
| Forgotten world backup object                | Subject-scoped authorization, quotas, encryption, lifecycle/retention and deletion controls                                |

## Audit, notifications and privacy

Record security event type, actor/subject pseudonymous IDs, session/device reference, timestamp, outcome and trace ID. Limit IP/device/geolocation retention and access; do not invent exact retention durations before policy review. Separate immutable security evidence from user-editable activity summaries. Define deletion/export exceptions for necessary transaction/security records and document them. Recovery contact data and trust history require access controls and encryption at rest.

Website, launcher and email notification deliveries need idempotency and durable retry/outbox processing. No fake email sender is acceptable. Notifications must not disclose passwords, raw tokens or full recovery links to logs. Users need meaningful revocation controls, accessible suspicious-activity review and a legitimate account-recovery route.

Standards and provider references: [OAuth for native apps, RFC 8252](https://www.rfc-editor.org/info/rfc8252/), [Steam authentication and ownership](https://partner.steamgames.com/doc/features/auth), [Steam server ticket verification](https://partner.steamgames.com/doc/webapi/isteamuserauth), [Stripe webhook integration](https://docs.stripe.com/webhooks), [ASP.NET options validation](https://learn.microsoft.com/en-us/aspnet/core/fundamentals/configuration/options?view=aspnetcore-10.0). Recheck provider requirements at the implementation milestone.
