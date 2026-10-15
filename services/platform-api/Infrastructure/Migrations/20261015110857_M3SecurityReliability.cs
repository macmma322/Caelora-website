using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Caelora.Platform.Api.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class M3SecurityReliability : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Descriptor",
                schema: "platform",
                table: "BrowserSessions",
                type: "character varying(64)",
                maxLength: 64,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "LastSeenAt",
                schema: "platform",
                table: "BrowserSessions",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTimeOffset(new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified), new TimeSpan(0, 0, 0, 0, 0)));

            migrationBuilder.AddColumn<bool>(
                name: "MfaAuthenticated",
                schema: "platform",
                table: "BrowserSessions",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "ReauthenticatedAt",
                schema: "platform",
                table: "BrowserSessions",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.Sql("UPDATE platform.\"BrowserSessions\" SET \"Descriptor\"='Browser', \"LastSeenAt\"=\"CreatedAt\"");

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "EnrollmentExpiresAt",
                schema: "platform",
                table: "AspNetUsers",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "MfaChallenges",
                schema: "platform",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    SecretHash = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    StampHash = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    ExpiresAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    Attempts = table.Column<int>(type: "integer", nullable: false),
                    Consumed = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MfaChallenges", x => x.Id);
                    table.ForeignKey(
                        name: "FK_MfaChallenges_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalSchema: "platform",
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Notifications",
                schema: "platform",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    Category = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    Severity = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    Title = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    Summary = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    ReadAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    SecurityEventId = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Notifications", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Notifications_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalSchema: "platform",
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_Notifications_SecurityEvents_SecurityEventId",
                        column: x => x.SecurityEventId,
                        principalSchema: "platform",
                        principalTable: "SecurityEvents",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "OutboxMessages",
                schema: "platform",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    Type = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    Channel = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    ProtectedPayload = table.Column<string>(type: "text", nullable: false),
                    IdempotencyKey = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                    State = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    NextAttemptAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    Attempts = table.Column<int>(type: "integer", nullable: false),
                    ClaimId = table.Column<Guid>(type: "uuid", nullable: true),
                    ClaimUntil = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    LastFailure = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: true),
                    CompletedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    ExpiresAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_OutboxMessages", x => x.Id);
                    table.ForeignKey(
                        name: "FK_OutboxMessages_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalSchema: "platform",
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "TotpRedemptions",
                schema: "platform",
                columns: table => new
                {
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    Digest = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    ExpiresAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TotpRedemptions", x => new { x.UserId, x.Digest });
                    table.ForeignKey(
                        name: "FK_TotpRedemptions_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalSchema: "platform",
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_SecurityEvents_OccurredAt",
                schema: "platform",
                table: "SecurityEvents",
                column: "OccurredAt");

            migrationBuilder.CreateIndex(
                name: "IX_BrowserSessions_ExpiresAt",
                schema: "platform",
                table: "BrowserSessions",
                column: "ExpiresAt");

            migrationBuilder.CreateIndex(
                name: "IX_MfaChallenges_ExpiresAt",
                schema: "platform",
                table: "MfaChallenges",
                column: "ExpiresAt");

            migrationBuilder.CreateIndex(
                name: "IX_MfaChallenges_UserId",
                schema: "platform",
                table: "MfaChallenges",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_Notifications_SecurityEventId",
                schema: "platform",
                table: "Notifications",
                column: "SecurityEventId");

            migrationBuilder.CreateIndex(
                name: "IX_Notifications_UserId_CreatedAt_Id",
                schema: "platform",
                table: "Notifications",
                columns: new[] { "UserId", "CreatedAt", "Id" });

            migrationBuilder.CreateIndex(
                name: "IX_Notifications_UserId_ReadAt",
                schema: "platform",
                table: "Notifications",
                columns: new[] { "UserId", "ReadAt" });

            migrationBuilder.CreateIndex(
                name: "IX_OutboxMessages_ExpiresAt",
                schema: "platform",
                table: "OutboxMessages",
                column: "ExpiresAt");

            migrationBuilder.CreateIndex(
                name: "IX_OutboxMessages_IdempotencyKey",
                schema: "platform",
                table: "OutboxMessages",
                column: "IdempotencyKey",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_OutboxMessages_State_NextAttemptAt",
                schema: "platform",
                table: "OutboxMessages",
                columns: new[] { "State", "NextAttemptAt" });

            migrationBuilder.CreateIndex(
                name: "IX_OutboxMessages_UserId",
                schema: "platform",
                table: "OutboxMessages",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_TotpRedemptions_ExpiresAt",
                schema: "platform",
                table: "TotpRedemptions",
                column: "ExpiresAt");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "MfaChallenges",
                schema: "platform");

            migrationBuilder.DropTable(
                name: "Notifications",
                schema: "platform");

            migrationBuilder.DropTable(
                name: "OutboxMessages",
                schema: "platform");

            migrationBuilder.DropTable(
                name: "TotpRedemptions",
                schema: "platform");

            migrationBuilder.DropIndex(
                name: "IX_SecurityEvents_OccurredAt",
                schema: "platform",
                table: "SecurityEvents");

            migrationBuilder.DropIndex(
                name: "IX_BrowserSessions_ExpiresAt",
                schema: "platform",
                table: "BrowserSessions");

            migrationBuilder.DropColumn(
                name: "Descriptor",
                schema: "platform",
                table: "BrowserSessions");

            migrationBuilder.DropColumn(
                name: "LastSeenAt",
                schema: "platform",
                table: "BrowserSessions");

            migrationBuilder.DropColumn(
                name: "MfaAuthenticated",
                schema: "platform",
                table: "BrowserSessions");

            migrationBuilder.DropColumn(
                name: "ReauthenticatedAt",
                schema: "platform",
                table: "BrowserSessions");

            migrationBuilder.DropColumn(
                name: "EnrollmentExpiresAt",
                schema: "platform",
                table: "AspNetUsers");
        }
    }
}
