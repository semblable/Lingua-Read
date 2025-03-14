using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LinguaReadApi.Migrations
{
    /// <inheritdoc />
    public partial class AddBookStatisticsAndLastRead : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "KnownWords",
                table: "Books",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<DateTime>(
                name: "LastReadAt",
                table: "Books",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "LastReadPartId",
                table: "Books",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "LastReadTextId",
                table: "Books",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "LearningWords",
                table: "Books",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "TotalWords",
                table: "Books",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.CreateIndex(
                name: "IX_Books_LastReadTextId",
                table: "Books",
                column: "LastReadTextId");

            migrationBuilder.AddForeignKey(
                name: "FK_Books_Texts_LastReadTextId",
                table: "Books",
                column: "LastReadTextId",
                principalTable: "Texts",
                principalColumn: "TextId",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Books_Texts_LastReadTextId",
                table: "Books");

            migrationBuilder.DropIndex(
                name: "IX_Books_LastReadTextId",
                table: "Books");

            migrationBuilder.DropColumn(
                name: "KnownWords",
                table: "Books");

            migrationBuilder.DropColumn(
                name: "LastReadAt",
                table: "Books");

            migrationBuilder.DropColumn(
                name: "LastReadPartId",
                table: "Books");

            migrationBuilder.DropColumn(
                name: "LastReadTextId",
                table: "Books");

            migrationBuilder.DropColumn(
                name: "LearningWords",
                table: "Books");

            migrationBuilder.DropColumn(
                name: "TotalWords",
                table: "Books");
        }
    }
}
