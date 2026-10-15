using Caelora.Platform.Api.Accounts;
using Caelora.Platform.Api.Infrastructure;
using Caelora.Platform.Api.Notifications;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Xunit;

namespace Caelora.Platform.Api.Tests;

public sealed class OutboxTests(IdentityDatabase database) : IClassFixture<IdentityDatabase>
{
    private static async Task<(Guid User, Guid Job)> Seed(IdentityFactory factory)
    {
        using var scope = factory.Services.CreateScope(); var services = scope.ServiceProvider;
        var db = services.GetRequiredService<PlatformDbContext>();
        // Only this fixture's generated disposable test DB; no developer tables are reset.
        await db.OutboxMessages.ExecuteDeleteAsync();
        var user = new PlatformUser { Id = Guid.NewGuid(), UserName = Guid.NewGuid().ToString("N"), Email = Guid.NewGuid().ToString("N") + "@caelora.test", DisplayName = "Outbox Test", CreatedAt = DateTimeOffset.UtcNow };
        Assert.True((await services.GetRequiredService<UserManager<PlatformUser>>().CreateAsync(user)).Succeeded);
        services.GetRequiredService<NotificationWriter>().Enqueue(user, "VerifyEmail", "test:" + user.Id, "https://localhost/verify-email#token=scoped-test-only-proof");
        await db.SaveChangesAsync(); return (user.Id, (await db.OutboxMessages.SingleAsync()).Id);
    }
    [PostgresFact]
    public async Task PayloadIsProtectedAndScrubbedAfterSuccessfulProcessing()
    {
        using var factory = database.Create(); var (_, id) = await Seed(factory);
        using var scope = factory.Services.CreateScope(); var db = scope.ServiceProvider.GetRequiredService<PlatformDbContext>();
        var before = await db.OutboxMessages.AsNoTracking().SingleAsync(x => x.Id == id);
        Assert.DoesNotContain("scoped-test-only-proof", before.ProtectedPayload); Assert.DoesNotContain("caelora.test", before.ProtectedPayload);
        Assert.True(await scope.ServiceProvider.GetRequiredService<OutboxProcessor>().ProcessOne());
        var after = await db.OutboxMessages.AsNoTracking().SingleAsync(x => x.Id == id);
        Assert.Equal("Delivered", after.State); Assert.Empty(after.ProtectedPayload); Assert.NotNull(after.CompletedAt);
        var mail = Assert.Single(factory.Mail.Messages); Assert.Contains("scoped-test-only-proof", mail.Body); Assert.NotNull(mail.HtmlBody);
    }
    [PostgresFact]
    public async Task SecurityStateAndOutboxRollBackTogether()
    {
        using var factory = database.Create(); var (uid, _) = await Seed(factory);
        using var scope = factory.Services.CreateScope(); var db = scope.ServiceProvider.GetRequiredService<PlatformDbContext>();
        Guid eventId;
        await using (var transaction = await db.Database.BeginTransactionAsync())
        {
            var user = await db.Users.SingleAsync(x => x.Id == uid);
            scope.ServiceProvider.GetRequiredService<NotificationWriter>().Security(user, "MfaEnabled"); await db.SaveChangesAsync();
            eventId = db.SecurityEvents.Local.Single().Id;
            await transaction.RollbackAsync();
        }
        db.ChangeTracker.Clear();
        Assert.False(await db.SecurityEvents.AnyAsync(x => x.Id == eventId)); Assert.False(await db.Notifications.AnyAsync(x => x.SecurityEventId == eventId));
        Assert.False(await db.OutboxMessages.AnyAsync(x => x.IdempotencyKey == "security:" + eventId));
    }
    [PostgresFact]
    public async Task DuplicateLinkEnqueueIsIdempotentAndDatabaseRejectsDuplicateKeys()
    {
        using var factory = database.Create(); var (uid, _) = await Seed(factory);
        using var scope = factory.Services.CreateScope(); var db = scope.ServiceProvider.GetRequiredService<PlatformDbContext>();
        var writer = scope.ServiceProvider.GetRequiredService<NotificationWriter>(); var user = await db.Users.SingleAsync(x => x.Id == uid); var key = "same:" + uid;
        await writer.AccountLink(user, false, key); await writer.AccountLink(user, false, key); await db.SaveChangesAsync();
        await writer.AccountLink(user, false, key); await db.SaveChangesAsync();
        Assert.Equal(1, await db.OutboxMessages.CountAsync(x => x.IdempotencyKey == key));
        writer.Enqueue(user, "SecurityActivity", key);
        await Assert.ThrowsAsync<DbUpdateException>(() => db.SaveChangesAsync());
    }
    [PostgresFact]
    public async Task TransientFailuresBackOffAndRecoverWithoutRegistrationRetry()
    {
        using var factory = database.Create(); var (_, id) = await Seed(factory);
        using var failing = factory.WithWebHostBuilder(builder => builder.ConfigureServices(services => { services.RemoveAll<IIdentityMailSender>(); services.AddSingleton<IIdentityMailSender>(new FailingSender()); }));
        using (var scope = failing.Services.CreateScope())
        {
            Assert.True(await scope.ServiceProvider.GetRequiredService<OutboxProcessor>().ProcessOne());
            var db = scope.ServiceProvider.GetRequiredService<PlatformDbContext>(); var job = await db.OutboxMessages.SingleAsync(x => x.Id == id);
            Assert.Equal("Retry", job.State); Assert.Equal(1, job.Attempts); Assert.True(job.NextAttemptAt > DateTimeOffset.UtcNow); Assert.Equal("TransientDeliveryFailure", job.LastFailure);
            await db.OutboxMessages.Where(x => x.Id == id).ExecuteUpdateAsync(update => update.SetProperty(x => x.NextAttemptAt, DateTimeOffset.UtcNow.AddSeconds(-1)));
        }
        using var restarted = database.Create(); using var healthy = restarted.Services.CreateScope();
        Assert.True(await healthy.ServiceProvider.GetRequiredService<OutboxProcessor>().ProcessOne());
        Assert.Equal("Delivered", (await healthy.ServiceProvider.GetRequiredService<PlatformDbContext>().OutboxMessages.SingleAsync(x => x.Id == id)).State);
    }
    [PostgresFact]
    public async Task PermanentPayloadFailureDeadLettersAndExpiredRetryIsRejected()
    {
        using var factory = database.Create(); var (_, id) = await Seed(factory);
        using var scope = factory.Services.CreateScope(); var db = scope.ServiceProvider.GetRequiredService<PlatformDbContext>(); var processor = scope.ServiceProvider.GetRequiredService<OutboxProcessor>();
        await db.OutboxMessages.Where(x => x.Id == id).ExecuteUpdateAsync(update => update.SetProperty(x => x.ProtectedPayload, "corrupt-protected-content"));
        await processor.ProcessOne(); var job = await db.OutboxMessages.AsNoTracking().SingleAsync(x => x.Id == id);
        Assert.Equal("Dead", job.State); Assert.Equal("PayloadProtectionFailed", job.LastFailure); Assert.Empty(factory.Mail.Messages);
        Assert.Equal(1, await processor.Retry(id, CancellationToken.None));
        await db.OutboxMessages.Where(x => x.Id == id).ExecuteUpdateAsync(update => update.SetProperty(x => x.State, "Dead").SetProperty(x => x.ExpiresAt, DateTimeOffset.UtcNow.AddMinutes(-1)));
        Assert.Equal(0, await processor.Retry(id, CancellationToken.None));
    }
    [PostgresFact]
    public async Task ExpiredWorkIsScrubbedWithoutDelivery()
    {
        using var factory = database.Create(); var (_, id) = await Seed(factory);
        using var scope = factory.Services.CreateScope(); var db = scope.ServiceProvider.GetRequiredService<PlatformDbContext>();
        await db.OutboxMessages.Where(x => x.Id == id).ExecuteUpdateAsync(update => update.SetProperty(x => x.ExpiresAt, DateTimeOffset.UtcNow.AddMinutes(-1)));
        Assert.False(await scope.ServiceProvider.GetRequiredService<OutboxProcessor>().ProcessOne());
        var job = await db.OutboxMessages.SingleAsync(x => x.Id == id); Assert.Equal("Expired", job.State); Assert.Empty(job.ProtectedPayload); Assert.Empty(factory.Mail.Messages);
    }
    [PostgresFact]
    public async Task AbandonedClaimIsRecoveredByANewProcessor()
    {
        using var factory = database.Create(); var (_, id) = await Seed(factory);
        using (var scope = factory.Services.CreateScope())
            await scope.ServiceProvider.GetRequiredService<PlatformDbContext>().OutboxMessages.Where(x => x.Id == id).ExecuteUpdateAsync(update => update.SetProperty(x => x.State, "Processing").SetProperty(x => x.ClaimId, Guid.NewGuid()).SetProperty(x => x.ClaimUntil, DateTimeOffset.UtcNow.AddSeconds(-1)).SetProperty(x => x.Attempts, 1));
        using var restarted = database.Create(); using var next = restarted.Services.CreateScope();
        Assert.True(await next.ServiceProvider.GetRequiredService<OutboxProcessor>().ProcessOne());
        var row = await next.ServiceProvider.GetRequiredService<PlatformDbContext>().OutboxMessages.SingleAsync(x => x.Id == id); Assert.Equal("Delivered", row.State); Assert.Equal(2, row.Attempts);
    }
    [PostgresFact]
    public async Task ConcurrentWorkersCannotClaimTheSameLiveLease()
    {
        using var factory = database.Create(); await Seed(factory); var transport = new BlockingSender();
        using var concurrent = factory.WithWebHostBuilder(builder => builder.ConfigureServices(services => { services.RemoveAll<IIdentityMailSender>(); services.AddSingleton<IIdentityMailSender>(transport); }));
        using var first = concurrent.Services.CreateScope(); using var second = concurrent.Services.CreateScope();
        var pending = first.ServiceProvider.GetRequiredService<OutboxProcessor>().ProcessOne();
        await transport.Started.Task.WaitAsync(TimeSpan.FromSeconds(5));
        Assert.False(await second.ServiceProvider.GetRequiredService<OutboxProcessor>().ProcessOne());
        transport.Release.SetResult(); Assert.True(await pending); Assert.Equal(1, transport.Calls);
    }
    [PostgresFact]
    public async Task AttemptsAreBoundedAndOperatorRetryIsExplicit()
    {
        using var factory = database.Create(); var (_, id) = await Seed(factory);
        using var failing = factory.WithWebHostBuilder(builder => builder.ConfigureServices(services =>
        { services.RemoveAll<IIdentityMailSender>(); services.AddSingleton<IIdentityMailSender>(new FailingSender()); services.Configure<DeliveryOptions>(o => o.MaxAttempts = 1); }));
        using var scope = failing.Services.CreateScope(); var processor = scope.ServiceProvider.GetRequiredService<OutboxProcessor>(); var db = scope.ServiceProvider.GetRequiredService<PlatformDbContext>();
        await processor.ProcessOne(); Assert.Equal("Dead", (await db.OutboxMessages.AsNoTracking().SingleAsync(x => x.Id == id)).State);
        Assert.False(await processor.ProcessOne()); Assert.Equal(1, await processor.Retry(id, CancellationToken.None));
    }
    [PostgresFact]
    public async Task RetentionIsBoundedAndPreservesCurrentSecurityState()
    {
        using var factory = database.Create(); var (uid, _) = await Seed(factory);
        using var cleanupHost = factory.WithWebHostBuilder(builder => builder.ConfigureServices(services => services.Configure<DeliveryOptions>(o => o.CleanupBatchSize = 1)));
        using var scope = cleanupHost.Services.CreateScope(); var db = scope.ServiceProvider.GetRequiredService<PlatformDbContext>(); var now = DateTimeOffset.UtcNow;
        for (var i = 0; i < 2; i++)
        {
            db.BrowserSessions.Add(new BrowserSession { Id = Guid.NewGuid(), UserId = uid, CreatedAt = now.AddDays(-30), LastSeenAt = now.AddDays(-30), ExpiresAt = now.AddDays(-29) });
            db.SecurityEvents.Add(new SecurityEvent { Id = Guid.NewGuid(), UserId = uid, Kind = "RetentionTest", OccurredAt = now.AddDays(-190) });
            db.Notifications.Add(new AccountNotification { Id = Guid.NewGuid(), UserId = uid, Title = "Old event", Summary = "Test", CreatedAt = now.AddDays(-100) });
        }
        var active = new BrowserSession { Id = Guid.NewGuid(), UserId = uid, CreatedAt = now, LastSeenAt = now, ExpiresAt = now.AddHours(12) }; db.BrowserSessions.Add(active); await db.SaveChangesAsync();
        await scope.ServiceProvider.GetRequiredService<RetentionCleanup>().Run();
        Assert.Equal(1, await db.BrowserSessions.CountAsync(x => x.UserId == uid && x.ExpiresAt < now)); Assert.True(await db.BrowserSessions.AnyAsync(x => x.Id == active.Id));
        Assert.Equal(1, await db.SecurityEvents.CountAsync(x => x.UserId == uid)); Assert.Equal(1, await db.Notifications.CountAsync(x => x.UserId == uid));
    }
    private sealed class FailingSender : IIdentityMailSender { public Task SendAsync(IdentityMail mail, CancellationToken token) => throw new IOException("Never log this sensitive provider error or URL"); }
    private sealed class BlockingSender : IIdentityMailSender
    {
        public TaskCompletionSource Started { get; } = new(TaskCreationOptions.RunContinuationsAsynchronously);
        public TaskCompletionSource Release { get; } = new(TaskCreationOptions.RunContinuationsAsynchronously);
        public int Calls;
        public async Task SendAsync(IdentityMail mail, CancellationToken token) { Interlocked.Increment(ref Calls); Started.SetResult(); await Release.Task.WaitAsync(token); }
    }
}
