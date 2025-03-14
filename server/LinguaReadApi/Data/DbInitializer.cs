using System;
using System.Linq;
using LinguaReadApi.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace LinguaReadApi.Data
{
    public static class DbInitializer
    {
        public static void Initialize(IServiceProvider serviceProvider)
        {
            using (var context = new AppDbContext(
                serviceProvider.GetRequiredService<DbContextOptions<AppDbContext>>()))
            {
                // Look for any languages
                if (context.Languages.Any())
                {
                    return; // DB has been seeded
                }

                // Seed languages
                var languages = new Language[]
                {
                    new Language { Name = "English", Code = "en" },
                    new Language { Name = "Spanish", Code = "es" },
                    new Language { Name = "French", Code = "fr" },
                    new Language { Name = "German", Code = "de" },
                    new Language { Name = "Italian", Code = "it" },
                    new Language { Name = "Portuguese", Code = "pt" },
                    new Language { Name = "Russian", Code = "ru" },
                    new Language { Name = "Japanese", Code = "ja" },
                    new Language { Name = "Chinese", Code = "zh" },
                    new Language { Name = "Korean", Code = "ko" }
                };

                context.Languages.AddRange(languages);
                context.SaveChanges();
            }
        }
    }
} 