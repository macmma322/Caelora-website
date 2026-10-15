# Notification inbox and transactional email outbox

M3 uses the same PostgreSQL database and modular API. Account changes enqueue protected email snapshots alongside state changes. SMTP is outside the request transaction. A process-local hosted worker claims durable work; no extra service, Redis queue or SignalR dependency is introduced.

## Stored contracts

OutboxMessages contains UUID, account FK, type/channel, protected serialized recipient/template/action snapshot, unique idempotency key, state, creation/next-attempt/expiry timestamps, attempt count, claim UUID/deadline, sanitized failure code and completion time. Type/channel/state/failure/idempotency strings are bounded. State/due and expiry indexes support processing and cleanup. The entire sensitive snapshot is Data Protection encrypted; safe metadata has no address, URL, password or OTP.

AccountNotification is separate from immutable SecurityEvent evidence: UUID, account FK, category, severity, bounded title/summary, creation/read timestamps and optional event FK. Event deletion sets the link null. A unique nullable event index prevents two inbox items for one event. User/date/UUID and user/read indexes support history. Inbox payloads contain safe explanatory copy only.

Registration and password reset use explicit transactions, as do MFA and session-security changes. Repeated resend/reset requests use a per-account/minute idempotency key under the account lock. Notification event delivery keys derive from the immutable event UUID. The unique outbox key is the final database enforcement; do not blindly regenerate IDs when replaying a failed application operation.

## Worker state machine

Pending/Retry due work, or expired Processing claims, are selected with `FOR UPDATE SKIP LOCKED` inside one UPDATE/RETURNING claim statement. Attempts increment at claim time. One message is sent per processor call. Default claim lease is 120 seconds, send timeout fifteen seconds; configuration requires the lease to be at least three send timeouts. Immediately before SMTP the processor verifies ownership and sufficient lease time. Successful/failure updates are conditional on its claim UUID. A stale owner cannot overwrite a later claim's result.

Transient errors enter Retry with exponential delay starting at five seconds, capped at thirty minutes plus zero–five seconds jitter. Default maximum six attempts. Invalid protected payload/JSON, authentication failures and SMTP 5xx are permanent Dead; operator review is required. Other send errors retry within the bound. Shutdown cancellation leaves Processing durable; a later process can reclaim after the deadline. Exhausted abandoned claims become Dead. Expired work becomes Expired and cannot be replayed.

Successful delivery clears the sensitive payload immediately. Verification/reset work expires thirty minutes after generation; security mail expires after one day. Cleanup scrubs expired failed payloads even while retaining safe metadata. No password or reusable MFA secret is emailed.

This is **at-least-once delivery**. A crash after SMTP acceptance but before the delivered update can cause duplicate mail. PostgreSQL idempotency prevents duplicate work creation, not duplicate provider acceptance. Lease fencing and timeouts prevent ordinary concurrent sends; a process suspended beyond its lease after its final check is still part of this uncertainty. Exactly-once delivery requires provider idempotency, which SMTP does not supply here.

## Inbox and delivery behavior

GET `/api/v1/me/notifications?page=1` returns twenty rows ordered by created time and UUID, total and unread counts. Pages are bounded 1–10000; offset pagination can shift under concurrent arrivals. POST `/me/notifications/read` marks an owned `notificationId` or `all=true`; repeated reads are idempotent. Every query filters immutable user ID. The shell fetches unread count and the inbox refreshes after actions; it is not a real-time push channel.

Sign-in creates audit/inbox evidence. Email occurs only for the first/new coarse descriptor, plus password changed, MFA enabled/disabled, replaced recovery codes and sessions revoked. Profile refreshes and IP changes do not email. Coarse descriptors deliberately trade accurate device recognition for minimal collection. No marketing/preferences subsystem is justified yet; security mail remains mandatory.

MailKit implements IIdentityMailSender. Local Mailpit uses loopback SMTP; production SMTP requires credentials and certificate-verified STARTTLS. Templates are branded lightweight HTML with plain-text alternatives, descriptive actions and encoded variable content. Mailbox/client rendering beyond Mailpit still needs staging checks.

Operator CLI reports state counts plus up to twenty failed/retry message UUIDs and safe fields. Retry accepts one explicit Dead/nonexpired UUID, resets attempt count, and preserves original expiry. There is no player-facing delivery dashboard or privileged retry HTTP endpoint. See [recovery](../deployment/operational-recovery.md).
