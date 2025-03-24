using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LinguaReadApi.Migrations
{
    /// <inheritdoc />
    public partial class AddUserLoginAndSettings : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Words_Users_UserId1",
                table: "Words");

            migrationBuilder.DropIndex(
                name: "IX_Words_UserId1",
                table: "Words");

            migrationBuilder.DropColumn(
                name: "UserId1",
                table: "Words");

            migrationBuilder.AlterColumn<string>(
                name: "Email",
                table: "Users",
                type: "character varying(100)",
                maxLength: 100,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "text");

            migrationBuilder.AddColumn<DateTime>(
                name: "LastLogin",
                table: "Users",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Username",
                table: "Users",
                type: "character varying(100)",
                maxLength: 100,
                nullable: false,
                defaultValue: "");

            migrationBuilder.CreateTable(
                name: "UserSettings",
                columns: table => new
                {
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    Theme = table.Column<string>(type: "text", nullable: false),
                    TextSize = table.Column<int>(type: "integer", nullable: false),
                    TextFont = table.Column<string>(type: "text", nullable: false),
                    AutoTranslateWords = table.Column<bool>(type: "boolean", nullable: false),
                    HighlightKnownWords = table.Column<bool>(type: "boolean", nullable: false),
                    DefaultLanguageId = table.Column<int>(type: "integer", nullable: false),
                    AutoAdvanceToNextLesson = table.Column<bool>(type: "boolean", nullable: false),
                    ShowProgressStats = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UserSettings", x => x.UserId);
                    table.ForeignKey(
                        name: "FK_UserSettings_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "UserId",
                        onDelete: ReferentialAction.Cascade);
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "UserSettings");

            migrationBuilder.DropColumn(
                name: "LastLogin",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "Username",
                table: "Users");

            migrationBuilder.AddColumn<Guid>(
                name: "UserId1",
                table: "Words",
                type: "uuid",
                nullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "Email",
                table: "Users",
                type: "text",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(100)",
                oldMaxLength: 100);

            migrationBuilder.CreateIndex(
                name: "IX_Words_UserId1",
                table: "Words",
                column: "UserId1");

            migrationBuilder.AddForeignKey(
                name: "FK_Words_Users_UserId1",
                table: "Words",
                column: "UserId1",
                principalTable: "Users",
                principalColumn: "UserId");
        }
    }
}
