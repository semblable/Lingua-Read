using Microsoft.EntityFrameworkCore;
using LinguaReadApi.Models;

namespace LinguaReadApi.Data
{
    public class ApplicationDbContext : DbContext
    {
        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // Configure Language relationships
            modelBuilder.Entity<Language>()
                .HasMany(l => l.Books)
                .WithOne(b => b.Language)
                .HasForeignKey(b => b.LanguageId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<Language>()
                .HasMany(l => l.Texts)
                .WithOne(t => t.Language)
                .HasForeignKey(t => t.LanguageId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<Language>()
                .HasMany(l => l.Words)
                .WithOne(w => w.Language)
                .HasForeignKey(w => w.LanguageId)
                .OnDelete(DeleteBehavior.Restrict);

            // Configure User relationships
            modelBuilder.Entity<User>()
                .HasMany(u => u.Books)
                .WithOne(b => b.User)
                .HasForeignKey(b => b.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<User>()
                .HasMany(u => u.Texts)
                .WithOne(t => t.User)
                .HasForeignKey(t => t.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<User>()
                .HasMany(u => u.Words)
                .WithOne(w => w.User)
                .HasForeignKey(w => w.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            // Configure unique email constraint
            modelBuilder.Entity<User>()
                .HasIndex(u => u.Email)
                .IsUnique();

            // Configure Book-Text relationship
            modelBuilder.Entity<Book>()
                .HasMany(b => b.Texts)
                .WithOne(t => t.Book)
                .HasForeignKey(t => t.BookId)
                .OnDelete(DeleteBehavior.Restrict);

            // Configure Book-LastReadText relationship
            modelBuilder.Entity<Book>()
                .HasOne(b => b.LastReadText)
                .WithMany()
                .HasForeignKey(b => b.LastReadTextId)
                .OnDelete(DeleteBehavior.SetNull);

            // Configure Word-Translation one-to-one relationship
            modelBuilder.Entity<Word>()
                .HasOne(w => w.Translation)
                .WithOne(wt => wt.Word)
                .HasForeignKey<WordTranslation>(wt => wt.WordId)
                .OnDelete(DeleteBehavior.Cascade);

            // Configure TextWord relationships
            modelBuilder.Entity<TextWord>()
                .HasOne(tw => tw.Text)
                .WithMany(t => t.TextWords)
                .HasForeignKey(tw => tw.TextId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<TextWord>()
                .HasOne(tw => tw.Word)
                .WithMany(w => w.TextWords)
                .HasForeignKey(tw => tw.WordId)
                .OnDelete(DeleteBehavior.Restrict);
        }
    }
} 