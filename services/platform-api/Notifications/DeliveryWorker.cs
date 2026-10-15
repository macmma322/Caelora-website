using Caelora.Platform.Api.Accounts;
using Caelora.Platform.Api.Infrastructure;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace Caelora.Platform.Api.Notifications;

public sealed class DeliveryWorker(IServiceScopeFactory scopes, IOptions<AccountsOptions> accounts, IOptions<DeliveryOptions> options, ILogger<DeliveryWorker> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        if (!accounts.Value.Enabled || !options.Value.WorkerEnabled) return;
        var nextCleanup = DateTimeOffset.UtcNow;
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                using var scope = scopes.CreateScope();
                if (DateTimeOffset.UtcNow >= nextCleanup)
                {
                    await scope.ServiceProvider.GetRequiredService<RetentionCleanup>().Run(stoppingToken);
                    nextCleanup = DateTimeOffset.UtcNow.AddMinutes(5);
                }
                if (await scope.ServiceProvider.GetRequiredService<OutboxProcessor>().ProcessOne(stoppingToken)) continue;
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested) { break; }
            catch (Exception error) { logger.LogError("Delivery worker unavailable: {FailureType}; pending work remains durable", error.GetType().Name); }
            try { await Task.Delay(TimeSpan.FromSeconds(options.Value.PollSeconds), stoppingToken); }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested) { break; }
        }
    }
}

public sealed class RetentionCleanup(PlatformDbContext db, IOptions<DeliveryOptions> options, TimeProvider clock)
{
    public async Task Run(CancellationToken token = default)
    {
        var now = clock.GetUtcNow(); var o = options.Value; var batch = o.CleanupBatchSize;
        await db.MfaChallenges.Where(x => x.ExpiresAt < now).OrderBy(x => x.ExpiresAt).Take(batch).ExecuteDeleteAsync(token);
        await db.TotpRedemptions.Where(x => x.ExpiresAt < now).OrderBy(x => x.ExpiresAt).Take(batch).ExecuteDeleteAsync(token);
        await db.BrowserSessions.Where(x => x.ExpiresAt < now.AddDays(-o.SessionRetentionDays) || x.RevokedAt < now.AddDays(-o.SessionRetentionDays)).OrderBy(x => x.ExpiresAt).Take(batch).ExecuteDeleteAsync(token);
        await db.SecurityEvents.Where(x => x.OccurredAt < now.AddDays(-o.SecurityRetentionDays)).OrderBy(x => x.OccurredAt).Take(batch).ExecuteDeleteAsync(token);
        await db.Notifications.Where(x => x.CreatedAt < now.AddDays(-o.NotificationRetentionDays)).OrderBy(x => x.CreatedAt).Take(batch).ExecuteDeleteAsync(token);
        await db.OutboxMessages.Where(x => x.ExpiresAt < now.AddDays(-o.OutboxRetentionDays) && x.State != "Processing").OrderBy(x => x.ExpiresAt).Take(batch).ExecuteDeleteAsync(token);
        // Scrub expired dead-letter payloads even while their safe delivery metadata is retained.
        await db.OutboxMessages.Where(x => x.ExpiresAt < now && x.State != "Processing" && x.ProtectedPayload != "").OrderBy(x => x.ExpiresAt).Take(batch)
            .ExecuteUpdateAsync(update => update.SetProperty(x => x.ProtectedPayload, ""), token);
    }
}
