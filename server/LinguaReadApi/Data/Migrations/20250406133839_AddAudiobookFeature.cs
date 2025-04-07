using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace LinguaReadApi.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddAudiobookFeature : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<double>(
                name: "CurrentAudiobookPosition",
                table: "UserSettings",
                type: "double precision",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "CurrentAudiobookTrackId",
                table: "UserSettings",
                type: "integer",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "AudiobookTracks",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    BookId = table.Column<int>(type: "integer", nullable: false),
                    FilePath = table.Column<string>(type: "text", nullable: false),
                    TrackNumber = table.Column<int>(type: "integer", nullable: false),
                    Duration = table.Column<double>(type: "double precision", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AudiobookTracks", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AudiobookTracks_Books_BookId",
                        column: x => x.BookId,
                        principalTable: "Books",
                        principalColumn: "BookId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_AudiobookTracks_BookId",
                table: "AudiobookTracks",
                column: "BookId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AudiobookTracks");

            migrationBuilder.DropColumn(
                name: "CurrentAudiobookPosition",
                table: "UserSettings");

            migrationBuilder.DropColumn(
                name: "CurrentAudiobookTrackId",
                table: "UserSettings");
        }
    }
}
