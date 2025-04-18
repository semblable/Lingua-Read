﻿// <auto-generated />
using System;
using LinguaReadApi.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace LinguaReadApi.Data.Migrations
{
    [DbContext(typeof(AppDbContext))]
    [Migration("20250408092605_AddLeftPanelWidthToUserSettings")]
    partial class AddLeftPanelWidthToUserSettings
    {
        /// <inheritdoc />
        protected override void BuildTargetModel(ModelBuilder modelBuilder)
        {
#pragma warning disable 612, 618
            modelBuilder
                .HasAnnotation("ProductVersion", "9.0.2")
                .HasAnnotation("Relational:MaxIdentifierLength", 63);

            NpgsqlModelBuilderExtensions.UseIdentityByDefaultColumns(modelBuilder);

            modelBuilder.Entity("LinguaReadApi.Models.AudiobookTrack", b =>
                {
                    b.Property<int>("Id")
                        .ValueGeneratedOnAdd()
                        .HasColumnType("integer");

                    NpgsqlPropertyBuilderExtensions.UseIdentityByDefaultColumn(b.Property<int>("Id"));

                    b.Property<int>("BookId")
                        .HasColumnType("integer");

                    b.Property<double?>("Duration")
                        .HasColumnType("double precision");

                    b.Property<string>("FilePath")
                        .IsRequired()
                        .HasColumnType("text");

                    b.Property<int>("TrackNumber")
                        .HasColumnType("integer");

                    b.HasKey("Id");

                    b.HasIndex("BookId");

                    b.ToTable("AudiobookTracks");
                });

            modelBuilder.Entity("LinguaReadApi.Models.Book", b =>
                {
                    b.Property<int>("BookId")
                        .ValueGeneratedOnAdd()
                        .HasColumnType("integer");

                    NpgsqlPropertyBuilderExtensions.UseIdentityByDefaultColumn(b.Property<int>("BookId"));

                    b.Property<DateTime>("CreatedAt")
                        .HasColumnType("timestamp with time zone");

                    b.Property<string>("Description")
                        .IsRequired()
                        .HasMaxLength(1000)
                        .HasColumnType("character varying(1000)");

                    b.Property<bool>("IsFinished")
                        .HasColumnType("boolean");

                    b.Property<int>("KnownWords")
                        .HasColumnType("integer");

                    b.Property<int>("LanguageId")
                        .HasColumnType("integer");

                    b.Property<DateTime?>("LastReadAt")
                        .HasColumnType("timestamp with time zone");

                    b.Property<int?>("LastReadPartId")
                        .HasColumnType("integer");

                    b.Property<int?>("LastReadTextId")
                        .HasColumnType("integer");

                    b.Property<int>("LearningWords")
                        .HasColumnType("integer");

                    b.Property<string>("Title")
                        .IsRequired()
                        .HasMaxLength(200)
                        .HasColumnType("character varying(200)");

                    b.Property<int>("TotalWords")
                        .HasColumnType("integer");

                    b.Property<Guid>("UserId")
                        .HasColumnType("uuid");

                    b.HasKey("BookId");

                    b.HasIndex("LanguageId");

                    b.HasIndex("LastReadTextId");

                    b.HasIndex("UserId");

                    b.ToTable("Books");
                });

            modelBuilder.Entity("LinguaReadApi.Models.BookTag", b =>
                {
                    b.Property<int>("BookId")
                        .HasColumnType("integer");

                    b.Property<int>("TagId")
                        .HasColumnType("integer");

                    b.HasKey("BookId", "TagId");

                    b.HasIndex("TagId");

                    b.ToTable("BookTags");
                });

            modelBuilder.Entity("LinguaReadApi.Models.Language", b =>
                {
                    b.Property<int>("LanguageId")
                        .ValueGeneratedOnAdd()
                        .HasColumnType("integer");

                    NpgsqlPropertyBuilderExtensions.UseIdentityByDefaultColumn(b.Property<int>("LanguageId"));

                    b.Property<string>("Code")
                        .IsRequired()
                        .HasMaxLength(10)
                        .HasColumnType("character varying(10)");

                    b.Property<string>("Name")
                        .IsRequired()
                        .HasMaxLength(50)
                        .HasColumnType("character varying(50)");

                    b.Property<int>("WordsRead")
                        .HasColumnType("integer");

                    b.HasKey("LanguageId");

                    b.ToTable("Languages");
                });

            modelBuilder.Entity("LinguaReadApi.Models.Tag", b =>
                {
                    b.Property<int>("TagId")
                        .ValueGeneratedOnAdd()
                        .HasColumnType("integer");

                    NpgsqlPropertyBuilderExtensions.UseIdentityByDefaultColumn(b.Property<int>("TagId"));

                    b.Property<string>("Name")
                        .IsRequired()
                        .HasMaxLength(50)
                        .HasColumnType("character varying(50)");

                    b.HasKey("TagId");

                    b.HasIndex("Name")
                        .IsUnique();

                    b.ToTable("Tags");
                });

            modelBuilder.Entity("LinguaReadApi.Models.Text", b =>
                {
                    b.Property<int>("TextId")
                        .ValueGeneratedOnAdd()
                        .HasColumnType("integer");

                    NpgsqlPropertyBuilderExtensions.UseIdentityByDefaultColumn(b.Property<int>("TextId"));

                    b.Property<string>("AudioFilePath")
                        .HasColumnType("text");

                    b.Property<int?>("BookId")
                        .HasColumnType("integer");

                    b.Property<string>("Content")
                        .IsRequired()
                        .HasColumnType("text");

                    b.Property<DateTime>("CreatedAt")
                        .HasColumnType("timestamp with time zone");

                    b.Property<bool>("IsAudioLesson")
                        .HasColumnType("boolean");

                    b.Property<int>("LanguageId")
                        .HasColumnType("integer");

                    b.Property<DateTime?>("LastAccessedAt")
                        .HasColumnType("timestamp with time zone");

                    b.Property<int?>("PartNumber")
                        .HasColumnType("integer");

                    b.Property<string>("SrtContent")
                        .HasColumnType("text");

                    b.Property<string>("Tag")
                        .HasMaxLength(100)
                        .HasColumnType("character varying(100)");

                    b.Property<string>("Title")
                        .IsRequired()
                        .HasMaxLength(200)
                        .HasColumnType("character varying(200)");

                    b.Property<Guid>("UserId")
                        .HasColumnType("uuid");

                    b.HasKey("TextId");

                    b.HasIndex("BookId");

                    b.HasIndex("LanguageId");

                    b.HasIndex("UserId");

                    b.ToTable("Texts");
                });

            modelBuilder.Entity("LinguaReadApi.Models.TextWord", b =>
                {
                    b.Property<int>("TextWordId")
                        .ValueGeneratedOnAdd()
                        .HasColumnType("integer");

                    NpgsqlPropertyBuilderExtensions.UseIdentityByDefaultColumn(b.Property<int>("TextWordId"));

                    b.Property<DateTime>("CreatedAt")
                        .HasColumnType("timestamp with time zone");

                    b.Property<int>("TextId")
                        .HasColumnType("integer");

                    b.Property<int>("WordId")
                        .HasColumnType("integer");

                    b.HasKey("TextWordId");

                    b.HasIndex("TextId");

                    b.HasIndex("WordId");

                    b.ToTable("TextWords");
                });

            modelBuilder.Entity("LinguaReadApi.Models.User", b =>
                {
                    b.Property<Guid>("Id")
                        .ValueGeneratedOnAdd()
                        .HasColumnType("uuid");

                    b.Property<int>("AccessFailedCount")
                        .HasColumnType("integer");

                    b.Property<string>("ConcurrencyStamp")
                        .HasColumnType("text");

                    b.Property<DateTime>("CreatedAt")
                        .HasColumnType("timestamp with time zone");

                    b.Property<string>("Email")
                        .HasColumnType("text");

                    b.Property<bool>("EmailConfirmed")
                        .HasColumnType("boolean");

                    b.Property<DateTime?>("LastLogin")
                        .HasColumnType("timestamp with time zone");

                    b.Property<bool>("LockoutEnabled")
                        .HasColumnType("boolean");

                    b.Property<DateTimeOffset?>("LockoutEnd")
                        .HasColumnType("timestamp with time zone");

                    b.Property<string>("NormalizedEmail")
                        .HasColumnType("text");

                    b.Property<string>("NormalizedUserName")
                        .HasColumnType("text");

                    b.Property<string>("PasswordHash")
                        .HasColumnType("text");

                    b.Property<string>("PhoneNumber")
                        .HasColumnType("text");

                    b.Property<bool>("PhoneNumberConfirmed")
                        .HasColumnType("boolean");

                    b.Property<string>("SecurityStamp")
                        .HasColumnType("text");

                    b.Property<bool>("TwoFactorEnabled")
                        .HasColumnType("boolean");

                    b.Property<string>("UserName")
                        .HasColumnType("text");

                    b.HasKey("Id");

                    b.HasIndex("Email")
                        .IsUnique();

                    b.ToTable("Users");
                });

            modelBuilder.Entity("LinguaReadApi.Models.UserActivity", b =>
                {
                    b.Property<int>("ActivityId")
                        .ValueGeneratedOnAdd()
                        .HasColumnType("integer");

                    NpgsqlPropertyBuilderExtensions.UseIdentityByDefaultColumn(b.Property<int>("ActivityId"));

                    b.Property<string>("ActivityType")
                        .IsRequired()
                        .HasMaxLength(50)
                        .HasColumnType("character varying(50)");

                    b.Property<int>("LanguageId")
                        .HasColumnType("integer");

                    b.Property<int?>("ListeningDurationSeconds")
                        .HasColumnType("integer");

                    b.Property<DateTime>("Timestamp")
                        .HasColumnType("timestamp with time zone");

                    b.Property<Guid>("UserId")
                        .HasColumnType("uuid");

                    b.Property<int>("WordCount")
                        .HasColumnType("integer");

                    b.HasKey("ActivityId");

                    b.HasIndex("LanguageId");

                    b.ToTable("UserActivities");
                });

            modelBuilder.Entity("LinguaReadApi.Models.UserBookProgress", b =>
                {
                    b.Property<Guid>("UserId")
                        .HasColumnType("uuid");

                    b.Property<int>("BookId")
                        .HasColumnType("integer");

                    b.Property<double?>("CurrentAudiobookPosition")
                        .HasColumnType("double precision");

                    b.Property<int?>("CurrentAudiobookTrackId")
                        .HasColumnType("integer");

                    b.Property<DateTime>("UpdatedAt")
                        .HasColumnType("timestamp with time zone");

                    b.HasKey("UserId", "BookId");

                    b.HasIndex("BookId");

                    b.HasIndex("CurrentAudiobookTrackId");

                    b.ToTable("UserBookProgresses");
                });

            modelBuilder.Entity("LinguaReadApi.Models.UserSettings", b =>
                {
                    b.Property<Guid>("UserId")
                        .HasColumnType("uuid");

                    b.Property<bool>("AutoAdvanceToNextLesson")
                        .HasColumnType("boolean");

                    b.Property<bool>("AutoTranslateWords")
                        .HasColumnType("boolean");

                    b.Property<DateTime>("CreatedAt")
                        .HasColumnType("timestamp with time zone");

                    b.Property<double?>("CurrentAudiobookPosition")
                        .HasColumnType("double precision");

                    b.Property<int?>("CurrentAudiobookTrackId")
                        .HasColumnType("integer");

                    b.Property<int>("DefaultLanguageId")
                        .HasColumnType("integer");

                    b.Property<bool>("HighlightKnownWords")
                        .HasColumnType("boolean");

                    b.Property<int>("LeftPanelWidth")
                        .HasColumnType("integer");

                    b.Property<bool>("ShowProgressStats")
                        .HasColumnType("boolean");

                    b.Property<string>("TextFont")
                        .IsRequired()
                        .HasColumnType("text");

                    b.Property<int>("TextSize")
                        .HasColumnType("integer");

                    b.Property<string>("Theme")
                        .IsRequired()
                        .HasColumnType("text");

                    b.Property<DateTime?>("UpdatedAt")
                        .HasColumnType("timestamp with time zone");

                    b.HasKey("UserId");

                    b.ToTable("UserSettings");
                });

            modelBuilder.Entity("LinguaReadApi.Models.Word", b =>
                {
                    b.Property<int>("WordId")
                        .ValueGeneratedOnAdd()
                        .HasColumnType("integer");

                    NpgsqlPropertyBuilderExtensions.UseIdentityByDefaultColumn(b.Property<int>("WordId"));

                    b.Property<DateTime>("CreatedAt")
                        .HasColumnType("timestamp with time zone");

                    b.Property<int>("LanguageId")
                        .HasColumnType("integer");

                    b.Property<int>("Status")
                        .HasColumnType("integer");

                    b.Property<string>("Term")
                        .IsRequired()
                        .HasMaxLength(100)
                        .HasColumnType("character varying(100)");

                    b.Property<Guid>("UserId")
                        .HasColumnType("uuid");

                    b.HasKey("WordId");

                    b.HasIndex("LanguageId");

                    b.HasIndex("UserId");

                    b.ToTable("Words");
                });

            modelBuilder.Entity("LinguaReadApi.Models.WordTranslation", b =>
                {
                    b.Property<int>("WordId")
                        .HasColumnType("integer");

                    b.Property<DateTime>("CreatedAt")
                        .HasColumnType("timestamp with time zone");

                    b.Property<string>("Translation")
                        .IsRequired()
                        .HasColumnType("text");

                    b.Property<DateTime?>("UpdatedAt")
                        .HasColumnType("timestamp with time zone");

                    b.HasKey("WordId");

                    b.ToTable("WordTranslations");
                });

            modelBuilder.Entity("LinguaReadApi.Models.AudiobookTrack", b =>
                {
                    b.HasOne("LinguaReadApi.Models.Book", "Book")
                        .WithMany("AudiobookTracks")
                        .HasForeignKey("BookId")
                        .OnDelete(DeleteBehavior.Cascade)
                        .IsRequired();

                    b.Navigation("Book");
                });

            modelBuilder.Entity("LinguaReadApi.Models.Book", b =>
                {
                    b.HasOne("LinguaReadApi.Models.Language", "Language")
                        .WithMany("Books")
                        .HasForeignKey("LanguageId")
                        .OnDelete(DeleteBehavior.Restrict)
                        .IsRequired();

                    b.HasOne("LinguaReadApi.Models.Text", "LastReadText")
                        .WithMany()
                        .HasForeignKey("LastReadTextId")
                        .OnDelete(DeleteBehavior.SetNull);

                    b.HasOne("LinguaReadApi.Models.User", "User")
                        .WithMany("Books")
                        .HasForeignKey("UserId")
                        .OnDelete(DeleteBehavior.Cascade)
                        .IsRequired();

                    b.Navigation("Language");

                    b.Navigation("LastReadText");

                    b.Navigation("User");
                });

            modelBuilder.Entity("LinguaReadApi.Models.BookTag", b =>
                {
                    b.HasOne("LinguaReadApi.Models.Book", "Book")
                        .WithMany("BookTags")
                        .HasForeignKey("BookId")
                        .OnDelete(DeleteBehavior.Cascade)
                        .IsRequired();

                    b.HasOne("LinguaReadApi.Models.Tag", "Tag")
                        .WithMany("BookTags")
                        .HasForeignKey("TagId")
                        .OnDelete(DeleteBehavior.Cascade)
                        .IsRequired();

                    b.Navigation("Book");

                    b.Navigation("Tag");
                });

            modelBuilder.Entity("LinguaReadApi.Models.Text", b =>
                {
                    b.HasOne("LinguaReadApi.Models.Book", "Book")
                        .WithMany("Texts")
                        .HasForeignKey("BookId")
                        .OnDelete(DeleteBehavior.Cascade);

                    b.HasOne("LinguaReadApi.Models.Language", "Language")
                        .WithMany("Texts")
                        .HasForeignKey("LanguageId")
                        .OnDelete(DeleteBehavior.Restrict)
                        .IsRequired();

                    b.HasOne("LinguaReadApi.Models.User", "User")
                        .WithMany("Texts")
                        .HasForeignKey("UserId")
                        .OnDelete(DeleteBehavior.Cascade)
                        .IsRequired();

                    b.Navigation("Book");

                    b.Navigation("Language");

                    b.Navigation("User");
                });

            modelBuilder.Entity("LinguaReadApi.Models.TextWord", b =>
                {
                    b.HasOne("LinguaReadApi.Models.Text", "Text")
                        .WithMany("TextWords")
                        .HasForeignKey("TextId")
                        .OnDelete(DeleteBehavior.Cascade)
                        .IsRequired();

                    b.HasOne("LinguaReadApi.Models.Word", "Word")
                        .WithMany("TextWords")
                        .HasForeignKey("WordId")
                        .OnDelete(DeleteBehavior.Restrict)
                        .IsRequired();

                    b.Navigation("Text");

                    b.Navigation("Word");
                });

            modelBuilder.Entity("LinguaReadApi.Models.UserActivity", b =>
                {
                    b.HasOne("LinguaReadApi.Models.Language", "Language")
                        .WithMany()
                        .HasForeignKey("LanguageId")
                        .OnDelete(DeleteBehavior.Restrict)
                        .IsRequired();

                    b.Navigation("Language");
                });

            modelBuilder.Entity("LinguaReadApi.Models.UserBookProgress", b =>
                {
                    b.HasOne("LinguaReadApi.Models.Book", "Book")
                        .WithMany()
                        .HasForeignKey("BookId")
                        .OnDelete(DeleteBehavior.Cascade)
                        .IsRequired();

                    b.HasOne("LinguaReadApi.Models.AudiobookTrack", "CurrentAudiobookTrack")
                        .WithMany()
                        .HasForeignKey("CurrentAudiobookTrackId")
                        .OnDelete(DeleteBehavior.SetNull);

                    b.HasOne("LinguaReadApi.Models.User", "User")
                        .WithMany()
                        .HasForeignKey("UserId")
                        .OnDelete(DeleteBehavior.Cascade)
                        .IsRequired();

                    b.Navigation("Book");

                    b.Navigation("CurrentAudiobookTrack");

                    b.Navigation("User");
                });

            modelBuilder.Entity("LinguaReadApi.Models.UserSettings", b =>
                {
                    b.HasOne("LinguaReadApi.Models.User", "User")
                        .WithOne("Settings")
                        .HasForeignKey("LinguaReadApi.Models.UserSettings", "UserId")
                        .OnDelete(DeleteBehavior.Cascade)
                        .IsRequired();

                    b.Navigation("User");
                });

            modelBuilder.Entity("LinguaReadApi.Models.Word", b =>
                {
                    b.HasOne("LinguaReadApi.Models.Language", "Language")
                        .WithMany("Words")
                        .HasForeignKey("LanguageId")
                        .OnDelete(DeleteBehavior.Restrict)
                        .IsRequired();

                    b.HasOne("LinguaReadApi.Models.User", "User")
                        .WithMany("Words")
                        .HasForeignKey("UserId")
                        .OnDelete(DeleteBehavior.Cascade)
                        .IsRequired();

                    b.Navigation("Language");

                    b.Navigation("User");
                });

            modelBuilder.Entity("LinguaReadApi.Models.WordTranslation", b =>
                {
                    b.HasOne("LinguaReadApi.Models.Word", "Word")
                        .WithOne("Translation")
                        .HasForeignKey("LinguaReadApi.Models.WordTranslation", "WordId")
                        .OnDelete(DeleteBehavior.Cascade)
                        .IsRequired();

                    b.Navigation("Word");
                });

            modelBuilder.Entity("LinguaReadApi.Models.Book", b =>
                {
                    b.Navigation("AudiobookTracks");

                    b.Navigation("BookTags");

                    b.Navigation("Texts");
                });

            modelBuilder.Entity("LinguaReadApi.Models.Language", b =>
                {
                    b.Navigation("Books");

                    b.Navigation("Texts");

                    b.Navigation("Words");
                });

            modelBuilder.Entity("LinguaReadApi.Models.Tag", b =>
                {
                    b.Navigation("BookTags");
                });

            modelBuilder.Entity("LinguaReadApi.Models.Text", b =>
                {
                    b.Navigation("TextWords");
                });

            modelBuilder.Entity("LinguaReadApi.Models.User", b =>
                {
                    b.Navigation("Books");

                    b.Navigation("Settings")
                        .IsRequired();

                    b.Navigation("Texts");

                    b.Navigation("Words");
                });

            modelBuilder.Entity("LinguaReadApi.Models.Word", b =>
                {
                    b.Navigation("TextWords");

                    b.Navigation("Translation")
                        .IsRequired();
                });
#pragma warning restore 612, 618
        }
    }
}
