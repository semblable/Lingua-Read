using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace LinguaReadApi.Migrations
{
    /// <inheritdoc />
    public partial class AddUserActivityTable : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Words_Languages_LanguageId1",
                table: "Words");

            migrationBuilder.DropIndex(
                name: "IX_Words_LanguageId1",
                table: "Words");

            migrationBuilder.DropColumn(
                name: "LanguageId1",
                table: "Words");

            migrationBuilder.CreateTable(
                name: "UserActivities",
                columns: table => new
                {
                    ActivityId = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    LanguageId = table.Column<int>(type: "integer", nullable: false),
                    ActivityType = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    WordCount = table.Column<int>(type: "integer", nullable: false),
                    Timestamp = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UserActivities", x => x.ActivityId);
                    table.ForeignKey(
                        name: "FK_UserActivities_Languages_LanguageId",
                        column: x => x.LanguageId,
                        principalTable: "Languages",
                        principalColumn: "LanguageId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_UserActivities_LanguageId",
                table: "UserActivities",
                column: "LanguageId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "UserActivities");

            migrationBuilder.AddColumn<int>(
                name: "LanguageId1",
                table: "Words",
                type: "integer",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Words_LanguageId1",
                table: "Words",
                column: "LanguageId1");

            migrationBuilder.AddForeignKey(
                name: "FK_Words_Languages_LanguageId1",
                table: "Words",
                column: "LanguageId1",
                principalTable: "Languages",
                principalColumn: "LanguageId");
        }
    }
}
