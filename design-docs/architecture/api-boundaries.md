# API boundaries and contracts

## Implemented HTTP surface

| Method/path          | Meaning                                               | Status / data                                                               |
| -------------------- | ----------------------------------------------------- | --------------------------------------------------------------------------- |
| GET /api/v1/platform | Public platform capability contract                   | `contractVersion: "1"`, stage foundation; accounts/purchases/launcher false |
| GET /health/live     | Process accepts requests                              | 200; no dependency work                                                     |
| GET /health/ready    | Enabled dependencies usable and EF migrations applied | 200 or 503; sanitized component names/status and enabled flags              |
| GET /openapi/v1.json | Generated transport specification                     | Development/Testing only; not public in production                          |

No account, login, administrative, entitlement, payment, download or ownership-verification endpoint exists. Tests assert representative sensitive paths return 404. Existing Angular account routes display public unavailability information only.

Path-based major versions (`/api/v1`) make breaking changes explicit. Additive fields may be introduced within a major version when old consumers tolerate them. The first TypeScript client validates the minimal response at runtime. Future generated clients must be reviewed against OpenAPI, version-pinned and compatibility-tested; generated transport DTOs must not become domain models. Keep launcher/API and Unity simulation contract versions independent.

## Future authorization contracts (not implemented)

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

Current CORS permits only configured origins, GET and explicit headers; credentials are not enabled. Before browser session APIs exist, deliberately add credentialed exact-origin CORS, secure cookie settings and CSRF middleware together. CORS does not prevent server-to-server attacks and is not authentication.

Global fixed-window limits bound application requests by remote IP; health endpoints bypass application rate limits and must be ingress-restricted. No untrusted forwarded headers are enabled. Before scaling, replace or augment process-local rate limits with shared edge/distributed limits. Return sanitized ProblemDetails with trace IDs; no raw connection strings or exception messages in responses.
