using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LinguaReadApi.Migrations
{
    /// <inheritdoc />
    public partial class FixShadowProperties : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "UserId1",
                table: "Words",
                type: "uuid",
                nullable: true);

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

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
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
        }
    }
}
