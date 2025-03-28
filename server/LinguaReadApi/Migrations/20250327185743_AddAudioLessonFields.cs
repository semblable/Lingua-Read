using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LinguaReadApi.Migrations
{
    /// <inheritdoc />
    public partial class AddAudioLessonFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Books_Languages_LanguageId1",
                table: "Books");

            migrationBuilder.DropIndex(
                name: "IX_Books_LanguageId1",
                table: "Books");

            migrationBuilder.DropColumn(
                name: "CompletedAt",
                table: "Texts");

            migrationBuilder.DropColumn(
                name: "LastReadAt",
                table: "Texts");

            migrationBuilder.DropColumn(
                name: "CompletedAt",
                table: "Books");

            migrationBuilder.DropColumn(
                name: "LanguageId1",
                table: "Books");

            migrationBuilder.RenameColumn(
                name: "IsCompleted",
                table: "Texts",
                newName: "IsAudioLesson");

            migrationBuilder.AddColumn<string>(
                name: "AudioFilePath",
                table: "Texts",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SrtContent",
                table: "Texts",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AudioFilePath",
                table: "Texts");

            migrationBuilder.DropColumn(
                name: "SrtContent",
                table: "Texts");

            migrationBuilder.RenameColumn(
                name: "IsAudioLesson",
                table: "Texts",
                newName: "IsCompleted");

            migrationBuilder.AddColumn<DateTime>(
                name: "CompletedAt",
                table: "Texts",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "LastReadAt",
                table: "Texts",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "CompletedAt",
                table: "Books",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "LanguageId1",
                table: "Books",
                type: "integer",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Books_LanguageId1",
                table: "Books",
                column: "LanguageId1");

            migrationBuilder.AddForeignKey(
                name: "FK_Books_Languages_LanguageId1",
                table: "Books",
                column: "LanguageId1",
                principalTable: "Languages",
                principalColumn: "LanguageId");
        }
    }
}
