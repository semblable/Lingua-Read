using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace LinguaReadApi.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddUserLanguageStatistics : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "UserLanguageStatistics",
                columns: table => new
                {
                    UserLanguageStatisticsId = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    LanguageId = table.Column<int>(type: "integer", nullable: false),
                    TotalWordsRead = table.Column<long>(type: "bigint", nullable: false),
                    TotalTextsCompleted = table.Column<int>(type: "integer", nullable: false),
                    TotalBooksCompleted = table.Column<int>(type: "integer", nullable: false),
                    TotalSecondsListened = table.Column<long>(type: "bigint", nullable: false),
                    LastUpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UserLanguageStatistics", x => x.UserLanguageStatisticsId);
                    table.ForeignKey(
                        name: "FK_UserLanguageStatistics_Languages_LanguageId",
                        column: x => x.LanguageId,
                        principalTable: "Languages",
                        principalColumn: "LanguageId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_UserLanguageStatistics_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_UserLanguageStatistics_LanguageId",
                table: "UserLanguageStatistics",
                column: "LanguageId");

            migrationBuilder.CreateIndex(
                name: "IX_UserLanguageStatistics_UserId_LanguageId",
                table: "UserLanguageStatistics",
                columns: new[] { "UserId", "LanguageId" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "UserLanguageStatistics");
        }
    }
}
