using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;

namespace Caelora.Platform.Api.Infrastructure.Migrations;

[DbContext(typeof(PlatformDbContext))]
public sealed class PlatformDbContextModelSnapshot : ModelSnapshot
{
    protected override void BuildModel(ModelBuilder modelBuilder) => modelBuilder.HasDefaultSchema("platform");
}
