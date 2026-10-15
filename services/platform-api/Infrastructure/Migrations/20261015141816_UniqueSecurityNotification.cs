using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Caelora.Platform.Api.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class UniqueSecurityNotification : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Notifications_SecurityEventId",
                schema: "platform",
                table: "Notifications");

            migrationBuilder.CreateIndex(
                name: "IX_Notifications_SecurityEventId",
                schema: "platform",
                table: "Notifications",
                column: "SecurityEventId",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Notifications_SecurityEventId",
                schema: "platform",
                table: "Notifications");

            migrationBuilder.CreateIndex(
                name: "IX_Notifications_SecurityEventId",
                schema: "platform",
                table: "Notifications",
                column: "SecurityEventId");
        }
    }
}
