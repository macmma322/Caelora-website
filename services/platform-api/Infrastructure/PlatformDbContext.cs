using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Caelora.Platform.Api.Accounts;
using Caelora.Platform.Api.Notifications;

namespace Caelora.Platform.Api.Infrastructure;

public sealed class PlatformDbContext(DbContextOptions<PlatformDbContext> options) : IdentityDbContext<PlatformUser, IdentityRole<Guid>, Guid>(options)
{
    public DbSet<BrowserSession> BrowserSessions => Set<BrowserSession>();
    public DbSet<SecurityEvent> SecurityEvents => Set<SecurityEvent>();
    public DbSet<OutboxMessage> OutboxMessages => Set<OutboxMessage>();
    public DbSet<AccountNotification> Notifications => Set<AccountNotification>();
    public DbSet<MfaChallenge> MfaChallenges => Set<MfaChallenge>();
    public DbSet<TotpRedemption> TotpRedemptions => Set<TotpRedemption>();
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        modelBuilder.HasDefaultSchema("platform");
        modelBuilder.Entity<MfaChallenge>(entity =>
        {
            entity.HasKey(x => x.Id);
            entity.Property(x => x.SecretHash).HasMaxLength(64);
            entity.Property(x => x.StampHash).HasMaxLength(64);
            entity.HasIndex(x => x.ExpiresAt);
            entity.HasOne<PlatformUser>().WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Cascade);
        });
        modelBuilder.Entity<TotpRedemption>(entity =>
        {
            entity.HasKey(x => new { x.UserId, x.Digest });
            entity.Property(x => x.Digest).HasMaxLength(64);
            entity.HasIndex(x => x.ExpiresAt);
            entity.HasOne<PlatformUser>().WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Cascade);
        });
        modelBuilder.Entity<OutboxMessage>(entity =>
        {
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Type).HasMaxLength(64);
            entity.Property(x => x.Channel).HasMaxLength(16);
            entity.Property(x => x.State).HasMaxLength(16);
            entity.Property(x => x.IdempotencyKey).HasMaxLength(128);
            entity.Property(x => x.LastFailure).HasMaxLength(64);
            entity.HasIndex(x => x.IdempotencyKey).IsUnique();
            entity.HasIndex(x => new { x.State, x.NextAttemptAt });
            entity.HasIndex(x => x.ExpiresAt);
            entity.HasOne<PlatformUser>().WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Cascade);
        });
        modelBuilder.Entity<AccountNotification>(entity =>
        {
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Category).HasMaxLength(32);
            entity.Property(x => x.Severity).HasMaxLength(16);
            entity.Property(x => x.Title).HasMaxLength(120);
            entity.Property(x => x.Summary).HasMaxLength(500);
            entity.HasIndex(x => new { x.UserId, x.CreatedAt, x.Id });
            entity.HasIndex(x => new { x.UserId, x.ReadAt });
            entity.HasIndex(x => x.SecurityEventId).IsUnique();
            entity.HasOne<PlatformUser>().WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Cascade);
            entity.HasOne<SecurityEvent>().WithMany().HasForeignKey(x => x.SecurityEventId).OnDelete(DeleteBehavior.SetNull);
        });
        modelBuilder.Entity<PlatformUser>(entity =>
        {
            entity.Property(user => user.DisplayName).HasMaxLength(40).IsRequired();
            entity.HasIndex(user => user.NormalizedEmail).IsUnique();
        });
        modelBuilder.Entity<BrowserSession>(entity =>
        {
            entity.HasKey(session => session.Id);
            entity.HasOne(session => session.User).WithMany().HasForeignKey(session => session.UserId).OnDelete(DeleteBehavior.Cascade);
            entity.HasIndex(session => new { session.UserId, session.ExpiresAt });
            entity.Property(session => session.Descriptor).HasMaxLength(64);
            entity.HasIndex(session => session.ExpiresAt);
        });
        modelBuilder.Entity<SecurityEvent>(entity =>
        {
            entity.HasKey(item => item.Id);
            entity.Property(item => item.Kind).HasMaxLength(64).IsRequired();
            entity.HasOne<PlatformUser>().WithMany().HasForeignKey(item => item.UserId).OnDelete(DeleteBehavior.SetNull);
            entity.HasIndex(item => new { item.UserId, item.OccurredAt });
            entity.HasIndex(item => item.OccurredAt);
        });
    }
}
