using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace Caelora.Platform.Api.Infrastructure;

public sealed class PlatformDbContextFactory : IDesignTimeDbContextFactory<PlatformDbContext>
{
    public PlatformDbContext CreateDbContext(string[] args)
    {
        var connection = Environment.GetEnvironmentVariable("CAELORA_EF_CONNECTION")
            ?? throw new InvalidOperationException("Set CAELORA_EF_CONNECTION for explicit design-time migration operations. No runtime/local fallback is used.");
        return new PlatformDbContext(new DbContextOptionsBuilder<PlatformDbContext>().UseNpgsql(connection).Options);
    }
}
