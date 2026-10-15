# M3 operational recovery

Use restricted operator access. Player-facing endpoints do not accept delivery retries or key repair. Preserve PostgreSQL data, Mailpit state, local settings and key files; never reset them to clear an error. Diagnostic output must omit raw exceptions, payloads, action fragments and credentials.

## Delivery outage or worker crash

Account state/outbox commit together. SMTP failure does not undo an accepted registration. Inspect sanitized worker logs and outbox counts/due ages. Database readiness alone does not prove mail delivery. Configure external monitoring for oldest due work, Dead counts, worker errors and successful delivery latency before public launch; M3 provides CLI/log evidence, not an installed alerting service.

With the correct environment and secret configuration loaded:

```powershell
$env:ASPNETCORE_ENVIRONMENT = 'Development'
dotnet run --project services/platform-api -c Release --no-build -- --outbox-status
# Review one safe UUID from status, repair provider/key cause, then explicitly retry it:
dotnet run --project services/platform-api -c Release --no-build -- --outbox-retry=<message-uuid>
```

Status prints state/failure counts and at most twenty Dead/Retry rows with UUID/type/attempts/due/expiry/sanitized failure. It never prints payload or recipient. Retry returns affected count; zero means not eligible (already handled, not Dead, expired or scrubbed). It does not extend action-token lifetime. For expired verification/reset mail, use the ordinary generic resend/recovery flow after delivery recovers. Never replay all historical work or mutate payloads in SQL.

Pending/Retry work resumes when the worker returns. A crashed Processing lease becomes reclaimable after its deadline; attempts remain bounded. Successful SMTP followed by a database/process failure can duplicate delivery. Do not promise recipients exactly one email. Hosted-worker exceptions are caught with a sanitized failure type and a bounded poll delay; transient database recovery requires no queue recreation. Controlled integration transports verify transient/permanent failures, stalled claims, restart recovery, two concurrent processors and payload scrubbing.

## PostgreSQL or API unavailable

`/health/live` means process liveness. `/health/ready` reports dependency readiness with no connection details. PostgreSQL outage returns unavailable readiness and authentication fails closed; the API does not fabricate account state. Restore database connectivity and verify readiness plus an actual account read/outbox progression. Do not restart or reset unrelated PostgreSQL installations. Native M3 uses the separate loopback cluster on 55432, not the pre-existing system service on 5432.

For an API restart, retain the same database, environment application name and keyring. Sessions should survive until their absolute expiry or revocation. M2/M3 tests replay a valid cookie in a fresh host and after normal key rotation. Revoked/expired/stamp-invalid sessions must remain rejected. A request already executing at revocation can complete; its next authentication check fails.

## Key persistence and recovery

The application discriminator is `Caelora.Platform.Identity/<environment>`. Development Windows keys use current-user DPAPI. Copying those XML files to a different machine/user is insufficient: preserve the relevant Windows identity/profile recovery mechanism. Testing/Development on non-Windows does not configure at-rest encryption; do not promote that mode to public deployment.

Staging/Production require an explicit persistent key directory and PFX encryption certificate/private key/password. Restrict database/key/certificate access to the service identity; inject secrets through deployment providers. For replicas, mount the same key repository with appropriate locking semantics and use the same environment/application discriminator and certificate on each API. Keep the database shared as well. This topology is documented, not tested on separate hosts here.

Framework keys rotate normally while older keys remain available for decryption. Back up all non-revoked keys, certificate/private key and secret recovery references together with the database, separately access-controlled and encrypted. Do not remove old keys merely because the default key changed: MFA secrets and queued snapshots may still reference them. Key-wrapping certificate rotation needs an explicit migration/overlap strategy; M3 currently loads one certificate and does not implement an old-certificate decryption chain.

Native Windows startup and certificate-export helpers restrict generated connection/config/key paths to the current user, SYSTEM and Administrators. This preserves contents; it does not secure arbitrary custom paths, network shares or off-machine backup destinations. Review those ACLs with the actual deployment identity.

Startup protect/unprotect probe rejects unavailable/invalid repositories. Tests cover a directory replaced by a file, malformed key XML, and decrypting previous state using copied test key files. These do not guarantee detection of every missing historical key: a new empty ring can generate a valid new key while losing old state. Monitor key inventory and backup integrity separately.

If damaged, stop affected instances, preserve forensic copies, restore the correct complete keyring/certificate/private-key access and original configuration, then test previous ciphertext/session decryption before resuming. Regenerating keys will not repair old MFA/outbox values. If historical keys are irrecoverable, encrypted state is irrecoverable; follow an approved incident/account-recovery policy rather than disable MFA globally.

## Retention

Worker cleanup runs every five minutes with at most the configured batch per table (default 100). Expired MFA challenges and OTP proofs are deleted. Expired/revoked sessions have fourteen-day grace; security records default 180 days; inbox ninety days; outbox metadata fourteen days after expiry. Sensitive delivered payloads are cleared immediately; expired failed payloads are scrubbed before metadata retention ends. Processing work is finalized/reclaimed before metadata deletion. Active sessions are preserved; event deletion only nulls optional inbox event links.

These are engineering defaults, **not legally approved retention periods**. Review audit needs, player privacy, account deletion, litigation holds, backup expiry and jurisdiction before public use. There is no global account-deletion or legal-hold workflow in M3.

## Backup restoration evidence

```powershell
pwsh -NoProfile -File scripts/verify-local-recovery.ps1
```

The script creates two internally named disposable PostgreSQL databases, migrates one, inserts a synthetic security event, performs native pg_dump/pg_restore and verifies the restored record. It drops only those generated database names under a strict naming guard and never reads/resets the developer database. Ignored evidence is in artifacts/m3/backup-restore.log plus the synthetic dump. This verifies schema/data restoration mechanics, not production RPO/RTO or disaster recovery. Before release, rehearse encrypted database + key/certificate recovery on an isolated target, validate old MFA/outbox/session data, and obtain measured recovery objectives.

Docker's existing inference-manager startup failure remains a blocker. No factory reset, socket deletion or volume deletion was performed. Continue native PostgreSQL/Mailpit; Compose syntax validation is not a container runtime test.
