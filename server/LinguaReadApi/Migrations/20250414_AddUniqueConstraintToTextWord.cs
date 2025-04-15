using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LinguaReadApi.Migrations
{
    public partial class AddUniqueConstraintToTextWord : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Remove duplicate TextWord records, keeping only the one with the lowest TextWordId per (TextId, WordId)
            migrationBuilder.Sql(@"
                DELETE FROM ""TextWords""
                WHERE ""TextWordId"" NOT IN (
                  SELECT MIN(""TextWordId"")
                  FROM ""TextWords""
                  GROUP BY ""TextId"", ""WordId""
                );
            ");

            // Add unique index on (TextId, WordId)
            migrationBuilder.CreateIndex(
                name: "IX_TextWords_TextId_WordId",
                table: "TextWords",
                columns: new[] { "TextId", "WordId" },
                unique: true
            );
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_TextWords_TextId_WordId",
                table: "TextWords"
            );
        }
    }
}