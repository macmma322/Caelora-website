# API boundaries and contracts

## Implemented HTTP surface

| Method/path          | Meaning                                               | Status / data                                                               |
| -------------------- | ----------------------------------------------------- | --------------------------------------------------------------------------- |
| GET /api/v1/platform | Public platform capability contract                   | `contractVersion: "1"`, stage foundation; accounts/purchases/launcher false |
| GET /health/live     | Process accepts requests                              | 200; no dependency work                                                     |
| GET /health/ready    | Enabled dependencies usable and EF migrations applied | 200 or 503; sanitized component names/status and enabled flags              |
| GET /openapi/v1.json | Generated transport specification                     | Development/Testing only; not public in production                          |

M2 adds the account endpoints below only when Accounts:Enabled is explicitly true. Administrative, entitlement, payment, download and ownership-verification endpoints remain absent; M1 regression tests still run with accounts disabled.

Path-based major versions (`/api/v1`) make breaking changes explicit. Additive fields may be introduced within a major version when old consumers tolerate them. The first TypeScript client validates the minimal response at runtime. Future generated clients must be reviewed against OpenAPI, version-pinned and compatibility-tested; generated transport DTOs must not become domain models. Keep launcher/API and Unity simulation contract versions independent.

## Future authorization contracts (account reads/profile/security overview now implemented; remaining operations future)

| Contract family           | Required server authority                             | Important conditions                                                                                   |
| ------------------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| /api/v1/me, profile       | Verified account browser session                      | Subject from authenticated server identity, never a request account ID                                 |
| security/sessions/devices | Account owner + step-up for sensitive changes         | Revocation, audit log, recovery path, CSRF token on mutations                                          |
| Steam link/unlink         | Authenticated account + verified external identity    | Fresh proof, uniqueness constraints, anti-CSRF binding; no client-supplied ownership assertion         |
| entitlements              | Authenticated subject or narrowly scoped server actor | Sources verified server-side; refunds/revocations reflected independently of linked identity           |
| launcher authorization    | OIDC/OAuth public native client + PKCE                | External browser, exact redirects, token audience/scope/lifetime, refresh rotation                     |
| gameplay leases           | Entitled account + authenticated device session       | Atomic slot acquisition, fencing, heartbeat, conflict challenge; separate from login session count     |
| admin operations          | Dedicated policy/capability + MFA/step-up             | Fail-closed server checks, narrow fields, audited changes; ingress and UI guards are additional layers |
| Stripe webhook            | Valid provider signature, not a browser session       | Raw body verification, event idempotency, transactional entitlement/outbox state                       |
| server discovery/backup   | Policy-specific authenticated actor                   | Quotas, object ownership, content constraints and abuse controls                                       |

The public capability endpoint retains GET-only non-credentialed CORS. M2 account endpoints have separate exact-account-origin credentialed CORS, secure browser cookies and antiforgery/origin validation for every mutation. CORS does not authenticate requests.

Global fixed-window limits bound application requests by remote IP; health endpoints bypass application rate limits and must be ingress-restricted. No untrusted forwarded headers are enabled. Before scaling, replace or augment process-local rate limits with shared edge/distributed limits. Return sanitized ProblemDetails with trace IDs; no raw connection strings or exception messages in responses.

## Implemented M2 account operations

All paths below are under `/api/v1`. Mutations require exact Origin plus the CSRF header/cookie pair. Sensitive auth mutations share the ten-per-minute limiter. JSON errors use ProblemDetails; accepted email requests are generic.

| Method / path                  | Authentication / response                                                                    |
| ------------------------------ | -------------------------------------------------------------------------------------------- |
| GET /auth/csrf                 | Anonymous or current browser; returns request token and sets antiforgery cookie.             |
| POST /auth/register            | Anonymous; email/password/displayName; generic 202, invalid input 400, delivery failure 503. |
| POST /auth/resend-verification | Anonymous; email; generic 202 or delivery failure 503.                                       |
| POST /auth/confirm-email       | Scoped userId/token proof; 200 or invalid/expired/replayed 400.                              |
| POST /auth/login               | Verified email/password; profile + cookie on 200, generic 401 otherwise.                     |
| POST /auth/logout              | Authenticated browser; durable revocation + cleared cookie, 204.                             |
| POST /auth/forgot-password     | Anonymous; email; generic 202 or delivery failure 503.                                       |
| POST /auth/reset-password      | Scoped userId/token/password proof; 200 and all browser sessions revoked, otherwise 400.     |
| GET /me                        | Authenticated current profile; 200 or 401.                                                   |
| PUT /me/profile                | Authenticated; displayName only, no subject ID accepted; 200/400/409.                        |
| GET /me/security               | Authenticated own active browser sessions and latest 20 events; 200/401.                     |

The immutable accountId is returned by the API. Profile operations infer the subject from authentication. [Identity decisions](../security/m2-identity.md) describe cookie, key and recovery semantics. These browser contracts must not be reused as launcher/gameplay authorization.
