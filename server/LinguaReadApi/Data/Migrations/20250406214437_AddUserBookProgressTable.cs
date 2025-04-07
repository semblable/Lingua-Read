using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LinguaReadApi.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddUserBookProgressTable : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "UserBookProgresses",
                columns: table => new
                {
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    BookId = table.Column<int>(type: "integer", nullable: false),
                    CurrentAudiobookTrackId = table.Column<int>(type: "integer", nullable: true),
                    CurrentAudiobookPosition = table.Column<double>(type: "double precision", nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UserBookProgresses", x => new { x.UserId, x.BookId });
                    table.ForeignKey(
                        name: "FK_UserBookProgresses_AudiobookTracks_CurrentAudiobookTrackId",
                        column: x => x.CurrentAudiobookTrackId,
                        principalTable: "AudiobookTracks",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_UserBookProgresses_Books_BookId",
                        column: x => x.BookId,
                        principalTable: "Books",
                        principalColumn: "BookId",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_UserBookProgresses_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_UserBookProgresses_BookId",
                table: "UserBookProgresses",
                column: "BookId");

            migrationBuilder.CreateIndex(
                name: "IX_UserBookProgresses_CurrentAudiobookTrackId",
                table: "UserBookProgresses",
                column: "CurrentAudiobookTrackId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "UserBookProgresses");
        }
    }
}
