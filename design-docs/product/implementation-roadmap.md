# Implementation roadmap

## Milestone 1 — this repository

Static Astro landing/journal/information/404, shared CSS tokens, Angular informational shells, public runtime configuration, small versioned API, typed options, health/readiness, EF baseline, Redis readiness, bootstrap, Compose, container definition, local tests and CI definitions. Verification records distinguish code built from integrations actually run. No live remote, deployment, identity or commerce.

## Milestone 2 — identity and demonstrable account security

Implement ASP.NET Core Identity + PostgreSQL migrations, verified email through a real sandbox provider, secure cookies, CSRF, session revocation, recovery, audit logging and rate-limit policies. Introduce one useful account flow with server authorization and end-to-end tests before adding profile decoration. Select a maintained OIDC provider/server strategy for native PKCE flows rather than building one from scratch. Decide operational hosting, actual origins, secret/key storage, publisher/legal ownership and art rights before any public launch.

Acceptance: registration/verification/sign-in/sign-out/recovery operate with sandbox infrastructure; session revocation actually invalidates credentials; sensitive data is inaccessible on direct API calls; error paths, CSRF and cross-account access are tested. Do not spend this milestone on badges, chat, cosmetic roles or a large component library.

## Milestone 3 — entitlement proof before sales

Design source grants and provider event idempotency. Implement Steam linking/ticket/ownership validation using real developer setup and test identities. Implement Stripe test-mode checkout and signed lifecycle webhooks, with refund/chargeback/reconciliation tests. Ensure a second valid ownership source survives revocation of the first. Review terms/support/refunds, retention and abuse response before activating live commerce.

## Milestone 4 — native launcher and distribution

C#/Avalonia native client, browser PKCE authorization, protected refresh storage, signed update manifest, verified artifacts, channel separation, download integrity/resume, rollback/recovery and revoked-session behavior. Use API transport contracts; do not import web frameworks into Unity simulation.

## Milestone 5 — gameplay policy

Atomic online lease acquisition, expiry/heartbeat/fencing, conflict review/notifications and server admission contracts. Define bounded offline single-player authorization and its unavoidable disconnected revocation window. Test network partitions and legitimate recovery; no automatic permanent bans based on concurrent devices/IP location.

## Later, only with demand

Optional world backups, quotas and safe object lifecycle; multiplayer discovery/moderation; community/profile features; scaling by measured bottlenecks. Separate deployments may evolve without a repository rewrite. Kubernetes, service meshes, Kafka, microservices and broad administrative consoles are not current priorities.
