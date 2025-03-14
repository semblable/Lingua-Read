using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Threading.Tasks;
using LinguaReadApi.Data;
using LinguaReadApi.Models;
using System.Collections.Generic;
using System.Linq;

namespace LinguaReadApi.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AdminController : ControllerBase
    {
        private readonly AppDbContext _context;

        public AdminController(AppDbContext context)
        {
            _context = context;
        }

        // GET: api/admin/initialize-languages
        [HttpGet("initialize-languages")]
        public async Task<ActionResult<string>> InitializeLanguages()
        {
            // Check if languages already exist
            if (await _context.Languages.AnyAsync())
            {
                return "Languages already exist in the database";
            }

            // Seed languages
            var languages = new Language[]
            {
                new Language { Name = "English", Code = "en", WordsRead = 0 },
                new Language { Name = "Spanish", Code = "es", WordsRead = 0 },
                new Language { Name = "French", Code = "fr", WordsRead = 0 },
                new Language { Name = "German", Code = "de", WordsRead = 0 },
                new Language { Name = "Italian", Code = "it", WordsRead = 0 },
                new Language { Name = "Portuguese", Code = "pt", WordsRead = 0 },
                new Language { Name = "Russian", Code = "ru", WordsRead = 0 },
                new Language { Name = "Japanese", Code = "ja", WordsRead = 0 },
                new Language { Name = "Chinese", Code = "zh", WordsRead = 0 },
                new Language { Name = "Korean", Code = "ko", WordsRead = 0 }
            };

            await _context.Languages.AddRangeAsync(languages);
            await _context.SaveChangesAsync();

            return "Languages initialized successfully";
        }

        // GET: api/admin/fix-language-stats
        [HttpGet("fix-language-stats")]
        public async Task<ActionResult<string>> FixLanguageStats()
        {
            // Get all languages
            var languages = await _context.Languages.ToListAsync();
            
            if (languages == null || !languages.Any())
            {
                return "No languages found in the database";
            }

            // Calculate total words read for each language from texts
            foreach (var language in languages)
            {
                // Get all texts for this language through books
                var texts = await _context.Texts
                    .Where(t => t.Book.LanguageId == language.LanguageId)
                    .ToListAsync();

                int totalWordsRead = 0;
                foreach (var text in texts)
                {
                    // Count words in text content
                    if (!string.IsNullOrEmpty(text.Content))
                    {
                        totalWordsRead += text.Content.Split(new[] { ' ', '\t', '\n', '\r' }, 
                            System.StringSplitOptions.RemoveEmptyEntries).Length;
                    }
                }

                // Update language stats
                language.WordsRead = totalWordsRead;
                // Explicitly mark the language entity as modified
                _context.Entry(language).State = EntityState.Modified;
            }

            await _context.SaveChangesAsync();
            return "Language statistics fixed successfully";
        }
    }
} 