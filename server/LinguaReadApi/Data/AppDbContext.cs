using Microsoft.EntityFrameworkCore;
using LinguaReadApi.Models;

namespace LinguaReadApi.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
        {
        }
        
        public DbSet<User> Users { get; set; }
        public DbSet<Language> Languages { get; set; }
        public DbSet<Text> Texts { get; set; }
        public DbSet<Word> Words { get; set; }
        public DbSet<WordTranslation> WordTranslations { get; set; }
        public DbSet<TextWord> TextWords { get; set; }
        public DbSet<Book> Books { get; set; }
        public DbSet<UserActivity> UserActivities { get; set; }
        public DbSet<UserSettings> UserSettings { get; set; }
        
        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);
            
            // Configure relationships
            
            // User - Text: One-to-Many
            modelBuilder.Entity<Text>()
                .HasOne(t => t.User)
                .WithMany(u => u.Texts)
                .HasForeignKey(t => t.UserId)
                .OnDelete(DeleteBehavior.Cascade);
                
            // Language - Text: One-to-Many
            modelBuilder.Entity<Text>()
                .HasOne(t => t.Language)
                .WithMany(l => l.Texts)
                .HasForeignKey(t => t.LanguageId)
                .OnDelete(DeleteBehavior.Restrict);
            
            // Book - Text: One-to-Many
            modelBuilder.Entity<Text>()
                .HasOne(t => t.Book)
                .WithMany(b => b.Texts)
                .HasForeignKey(t => t.BookId)
                .OnDelete(DeleteBehavior.Restrict)
                .IsRequired(false);
            
            // User - Book: One-to-Many
            modelBuilder.Entity<Book>()
                .HasOne(b => b.User)
                .WithMany(u => u.Books)
                .HasForeignKey(b => b.UserId)
                .OnDelete(DeleteBehavior.Cascade);
            
            // Language - Book: One-to-Many
            modelBuilder.Entity<Book>()
                .HasOne(b => b.Language)
                .WithMany(l => l.Books) // Correct: Specify the inverse navigation property
                .HasForeignKey(b => b.LanguageId)
                .OnDelete(DeleteBehavior.Restrict);
                
            // Word - Language: Many-to-One
            modelBuilder.Entity<Word>()
                .HasOne(w => w.Language)
                .WithMany(l => l.Words)
                .HasForeignKey(w => w.LanguageId)
                .OnDelete(DeleteBehavior.Restrict);
                
            // Word - User: Many-to-One
            modelBuilder.Entity<Word>()
                .HasOne(w => w.User)
                .WithMany(u => u.Words)
                .HasForeignKey(w => w.UserId)
                .OnDelete(DeleteBehavior.Cascade);
                
            // Word - WordTranslation: One-to-One
            modelBuilder.Entity<Word>()
                .HasOne(w => w.Translation)
                .WithOne(wt => wt.Word)
                .HasForeignKey<WordTranslation>(wt => wt.WordId)
                .OnDelete(DeleteBehavior.Cascade);
                
            // Text - Word: Many-to-Many through TextWord
            modelBuilder.Entity<TextWord>()
                .HasKey(tw => tw.TextWordId);
                
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
                
            // Configure Book.LastReadText relationship
            modelBuilder.Entity<Book>()
                .HasOne(b => b.LastReadText)
                .WithMany()
                .HasForeignKey(b => b.LastReadTextId)
                .IsRequired(false)
                .OnDelete(DeleteBehavior.SetNull);
                
            // Configure unique constraints
            modelBuilder.Entity<User>()
                .HasIndex(u => u.Email)
                .IsUnique();
            
            // UserActivity - Language: Many-to-One
            modelBuilder.Entity<UserActivity>()
                .HasOne(ua => ua.Language)
                .WithMany()
                .HasForeignKey(ua => ua.LanguageId)
                .OnDelete(DeleteBehavior.Restrict);
                
            // User - UserSettings: One-to-One
            modelBuilder.Entity<UserSettings>()
                .HasOne(us => us.User)
                .WithOne(u => u.Settings)
                .HasForeignKey<UserSettings>(us => us.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        }
    }
} 