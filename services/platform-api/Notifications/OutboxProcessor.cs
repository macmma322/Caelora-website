using System.Security.Cryptography;
using System.Text.Json;
using Caelora.Platform.Api.Accounts;
using Caelora.Platform.Api.Infrastructure;
using MailKit.Net.Smtp;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace Caelora.Platform.Api.Notifications;

public sealed class OutboxProcessor(PlatformDbContext db, IIdentityMailSender sender, IDataProtectionProvider protection, IOptions<DeliveryOptions> options, TimeProvider clock, ILogger<OutboxProcessor> logger)
{
    public async Task<bool> ProcessOne(CancellationToken cancellationToken = default)
    {
        var now = clock.GetUtcNow(); var o = options.Value; var claim = Guid.NewGuid(); var until = now.AddSeconds(o.LeaseSeconds);
        await db.OutboxMessages.Where(x => x.ExpiresAt <= now && (x.State == "Pending" || x.State == "Retry" || (x.State == "Processing" && x.ClaimUntil < now))).OrderBy(x => x.ExpiresAt).Take(o.CleanupBatchSize)
            .ExecuteUpdateAsync(update => update.SetProperty(x => x.State, "Expired").SetProperty(x => x.ProtectedPayload, "").SetProperty(x => x.ClaimId, (Guid?)null), cancellationToken);
        await db.OutboxMessages.Where(x => x.State == "Processing" && x.ClaimUntil < now && x.Attempts >= o.MaxAttempts).OrderBy(x => x.ClaimUntil).Take(o.CleanupBatchSize)
            .ExecuteUpdateAsync(update => update.SetProperty(x => x.State, "Dead").SetProperty(x => x.LastFailure, "ClaimAttemptsExhausted"), cancellationToken);
        var jobs = await db.OutboxMessages.FromSqlInterpolated($"""
            UPDATE platform."OutboxMessages" SET "State"='Processing', "ClaimId"={claim}, "ClaimUntil"={until}, "Attempts"="Attempts"+1
            WHERE "Id" IN (SELECT "Id" FROM platform."OutboxMessages"
              WHERE "ExpiresAt">{now} AND "Attempts"<{o.MaxAttempts} AND (("State" IN ('Pending','Retry') AND "NextAttemptAt"<={now}) OR ("State"='Processing' AND "ClaimUntil"<{now}))
              ORDER BY "NextAttemptAt", "CreatedAt" LIMIT 1 FOR UPDATE SKIP LOCKED)
            RETURNING *
            """).AsNoTracking().ToListAsync(cancellationToken);
        if (jobs.Count == 0) return false;
        var job = jobs[0];
        try
        {
            var mail = JsonSerializer.Deserialize<IdentityMail>(protection.CreateProtector(NotificationWriter.PayloadPurpose).Unprotect(job.ProtectedPayload)) ?? throw new JsonException();
            using var timeout = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
            timeout.CancelAfter(TimeSpan.FromSeconds(o.SendTimeoutSeconds));
            await sender.SendAsync(mail, timeout.Token);
            await db.OutboxMessages.Where(x => x.Id == job.Id && x.ClaimId == claim && x.State == "Processing")
                .ExecuteUpdateAsync(update => update.SetProperty(x => x.State, "Delivered").SetProperty(x => x.CompletedAt, clock.GetUtcNow())
                    .SetProperty(x => x.ProtectedPayload, "").SetProperty(x => x.LastFailure, (string?)null).SetProperty(x => x.ClaimId, (Guid?)null).SetProperty(x => x.ClaimUntil, (DateTimeOffset?)null), cancellationToken);
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested) { throw; }
        catch (Exception error)
        {
            var permanent = error is CryptographicException or JsonException or MailKit.Security.AuthenticationException || error is SmtpCommandException smtp && (int)smtp.StatusCode >= 500;
            var failure = error is CryptographicException ? "PayloadProtectionFailed" : permanent ? "PermanentDeliveryFailure" : "TransientDeliveryFailure";
            var state = permanent || job.Attempts >= o.MaxAttempts ? "Dead" : "Retry";
            var next = clock.GetUtcNow().AddSeconds(Math.Min(1800, 5 * Math.Pow(2, job.Attempts - 1)) + RandomNumberGenerator.GetInt32(0, 6));
            await db.OutboxMessages.Where(x => x.Id == job.Id && x.ClaimId == claim).ExecuteUpdateAsync(update => update.SetProperty(x => x.State, state)
                .SetProperty(x => x.NextAttemptAt, next).SetProperty(x => x.LastFailure, failure).SetProperty(x => x.ClaimId, (Guid?)null).SetProperty(x => x.ClaimUntil, (DateTimeOffset?)null), cancellationToken);
            logger.LogWarning("Outbox {MessageId} state {State}, failure {Failure}, attempt {Attempt}", job.Id, state, failure, job.Attempts);
        }
        return true;
    }
    public Task<int> Retry(Guid id, CancellationToken token) => db.OutboxMessages.Where(x => x.Id == id && x.State == "Dead" && x.ExpiresAt > clock.GetUtcNow() && x.ProtectedPayload != "")
        .ExecuteUpdateAsync(update => update.SetProperty(x => x.State, "Pending").SetProperty(x => x.Attempts, 0).SetProperty(x => x.NextAttemptAt, clock.GetUtcNow()).SetProperty(x => x.LastFailure, (string?)null), token);
}
