﻿// <auto-generated />
using System;
using LinguaReadApi.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace LinguaReadApi.Migrations
{
    [DbContext(typeof(AppDbContext))]
    [Migration("20250303195224_AddIsFinishedToBook")]
    partial class AddIsFinishedToBook
    {
        /// <inheritdoc />
        protected override void BuildTargetModel(ModelBuilder modelBuilder)
        {
#pragma warning disable 612, 618
            modelBuilder
                .HasAnnotation("ProductVersion", "9.0.2")
                .HasAnnotation("Relational:MaxIdentifierLength", 63);

            NpgsqlModelBuilderExtensions.UseIdentityByDefaultColumns(modelBuilder);

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

                    b.HasKey("LanguageId");

                    b.ToTable("Languages");
                });

            modelBuilder.Entity("LinguaReadApi.Models.Text", b =>
                {
                    b.Property<int>("TextId")
                        .ValueGeneratedOnAdd()
                        .HasColumnType("integer");

                    NpgsqlPropertyBuilderExtensions.UseIdentityByDefaultColumn(b.Property<int>("TextId"));

                    b.Property<int?>("BookId")
                        .HasColumnType("integer");

                    b.Property<string>("Content")
                        .IsRequired()
                        .HasColumnType("text");

                    b.Property<DateTime>("CreatedAt")
                        .HasColumnType("timestamp with time zone");

                    b.Property<int>("LanguageId")
                        .HasColumnType("integer");

                    b.Property<int?>("PartNumber")
                        .HasColumnType("integer");

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
                    b.Property<Guid>("UserId")
                        .ValueGeneratedOnAdd()
                        .HasColumnType("uuid");

                    b.Property<DateTime>("CreatedAt")
                        .HasColumnType("timestamp with time zone");

                    b.Property<string>("Email")
                        .IsRequired()
                        .HasColumnType("text");

                    b.Property<string>("PasswordHash")
                        .IsRequired()
                        .HasColumnType("text");

                    b.HasKey("UserId");

                    b.HasIndex("Email")
                        .IsUnique();

                    b.ToTable("Users");
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

            modelBuilder.Entity("LinguaReadApi.Models.Book", b =>
                {
                    b.HasOne("LinguaReadApi.Models.Language", "Language")
                        .WithMany()
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

            modelBuilder.Entity("LinguaReadApi.Models.Text", b =>
                {
                    b.HasOne("LinguaReadApi.Models.Book", "Book")
                        .WithMany("Texts")
                        .HasForeignKey("BookId")
                        .OnDelete(DeleteBehavior.Restrict);

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

            modelBuilder.Entity("LinguaReadApi.Models.Word", b =>
                {
                    b.HasOne("LinguaReadApi.Models.Language", "Language")
                        .WithMany()
                        .HasForeignKey("LanguageId")
                        .OnDelete(DeleteBehavior.Restrict)
                        .IsRequired();

                    b.HasOne("LinguaReadApi.Models.User", "User")
                        .WithMany()
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
                    b.Navigation("Texts");
                });

            modelBuilder.Entity("LinguaReadApi.Models.Language", b =>
                {
                    b.Navigation("Texts");
                });

            modelBuilder.Entity("LinguaReadApi.Models.Text", b =>
                {
                    b.Navigation("TextWords");
                });

            modelBuilder.Entity("LinguaReadApi.Models.User", b =>
                {
                    b.Navigation("Books");

                    b.Navigation("Texts");
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
