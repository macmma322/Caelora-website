using Microsoft.EntityFrameworkCore;

namespace Caelora.Platform.Api.Infrastructure;

// No speculative account/payment entities. The baseline establishes schema ownership only.
public sealed class PlatformDbContext(DbContextOptions<PlatformDbContext> options) : DbContext(options)
{
    protected override void OnModelCreating(ModelBuilder modelBuilder) => modelBuilder.HasDefaultSchema("platform");
}
