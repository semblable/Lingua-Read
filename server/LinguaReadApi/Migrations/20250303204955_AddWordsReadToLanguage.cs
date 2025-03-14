using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LinguaReadApi.Migrations
{
    /// <inheritdoc />
    public partial class AddWordsReadToLanguage : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "LanguageId1",
                table: "Words",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "WordsRead",
                table: "Languages",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "LanguageId1",
                table: "Books",
                type: "integer",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Words_LanguageId1",
                table: "Words",
                column: "LanguageId1");

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

            migrationBuilder.AddForeignKey(
                name: "FK_Words_Languages_LanguageId1",
                table: "Words",
                column: "LanguageId1",
                principalTable: "Languages",
                principalColumn: "LanguageId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Books_Languages_LanguageId1",
                table: "Books");

            migrationBuilder.DropForeignKey(
                name: "FK_Words_Languages_LanguageId1",
                table: "Words");

            migrationBuilder.DropIndex(
                name: "IX_Words_LanguageId1",
                table: "Words");

            migrationBuilder.DropIndex(
                name: "IX_Books_LanguageId1",
                table: "Books");

            migrationBuilder.DropColumn(
                name: "LanguageId1",
                table: "Words");

            migrationBuilder.DropColumn(
                name: "WordsRead",
                table: "Languages");

            migrationBuilder.DropColumn(
                name: "LanguageId1",
                table: "Books");
        }
    }
}
