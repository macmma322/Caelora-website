using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Caelora.Platform.Api.Accounts;

namespace Caelora.Platform.Api.Infrastructure;

public sealed class PlatformDbContext(DbContextOptions<PlatformDbContext> options) : IdentityDbContext<PlatformUser, IdentityRole<Guid>, Guid>(options)
{
    public DbSet<BrowserSession> BrowserSessions => Set<BrowserSession>();
    public DbSet<SecurityEvent> SecurityEvents => Set<SecurityEvent>();
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        modelBuilder.HasDefaultSchema("platform");
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
        });
        modelBuilder.Entity<SecurityEvent>(entity =>
        {
            entity.HasKey(item => item.Id);
            entity.Property(item => item.Kind).HasMaxLength(64).IsRequired();
            entity.HasOne<PlatformUser>().WithMany().HasForeignKey(item => item.UserId).OnDelete(DeleteBehavior.SetNull);
            entity.HasIndex(item => new { item.UserId, item.OccurredAt });
        });
    }
}
