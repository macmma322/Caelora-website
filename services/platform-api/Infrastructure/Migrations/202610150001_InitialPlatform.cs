using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

namespace Caelora.Platform.Api.Infrastructure.Migrations;

[DbContext(typeof(PlatformDbContext))]
[Migration("202610150001_InitialPlatform")]
public sealed class InitialPlatform : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder) => migrationBuilder.EnsureSchema("platform");
    // Deliberately do not drop a shared schema during rollback. No application tables exist yet.
    protected override void Down(MigrationBuilder migrationBuilder) { }
    protected override void BuildTargetModel(ModelBuilder modelBuilder) => modelBuilder.HasDefaultSchema("platform");
}
