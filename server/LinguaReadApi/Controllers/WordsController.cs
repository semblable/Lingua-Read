using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using System;
using System.ComponentModel.DataAnnotations;
using System.Security.Claims;
using System.Threading.Tasks;
using LinguaReadApi.Data;
using LinguaReadApi.Models;
using System.Linq;
using System.Collections.Generic;

namespace LinguaReadApi.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class WordsController : ControllerBase
    {
        private readonly AppDbContext _context;

        public WordsController(AppDbContext context)
        {
            _context = context;
        }

        // POST: api/words
        [HttpPost]
        public async Task<ActionResult<WordResponseDto>> CreateWord([FromBody] CreateWordDto createWordDto)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }
            
            var userId = GetUserId();
            
            // Check if the text exists and belongs to the user
            var text = await _context.Texts
                .Include(t => t.Language)
                .FirstOrDefaultAsync(t => t.TextId == createWordDto.TextId && t.UserId == userId);
                
            if (text == null)
            {
                return NotFound("Text not found or does not belong to the user");
            }

            // Check if the word already exists for this user and language
            var existingWord = await _context.Words
                .Include(w => w.Translation)
                .FirstOrDefaultAsync(w => 
                    w.Term == createWordDto.Term && 
                    w.UserId == userId &&
                    w.LanguageId == text.LanguageId);

            if (existingWord != null)
            {
                // Create text-word relationship if it doesn't exist
                var existingTextWord = await _context.Set<TextWord>()
                    .FirstOrDefaultAsync(tw => tw.TextId == text.TextId && tw.WordId == existingWord.WordId);

                if (existingTextWord == null)
                {
                    _context.Set<TextWord>().Add(new TextWord
                    {
                        TextId = text.TextId,
                        WordId = existingWord.WordId,
                        CreatedAt = DateTime.UtcNow
                    });
                }

                // Update status if the new status is higher
                if (createWordDto.Status > existingWord.Status)
                {
                    existingWord.Status = createWordDto.Status;
                }

                // Update translation if provided
                if (existingWord.Translation == null)
                {
                    existingWord.Translation = new WordTranslation
                    {
                        WordId = existingWord.WordId,
                        Translation = createWordDto.Translation,
                        CreatedAt = DateTime.UtcNow
                    };
                }
                else if (createWordDto.Translation != existingWord.Translation.Translation)
                {
                    existingWord.Translation.Translation = createWordDto.Translation;
                    existingWord.Translation.UpdatedAt = DateTime.UtcNow;
                }

                await _context.SaveChangesAsync();

                return Ok(new WordResponseDto
                {
                    WordId = existingWord.WordId,
                    Term = existingWord.Term,
                    Status = existingWord.Status,
                    Translation = existingWord.Translation.Translation,
                    IsNew = false
                });
            }

            // Create new word
            var word = new Word
            {
                Term = createWordDto.Term,
                Status = createWordDto.Status,
                UserId = userId,
                LanguageId = text.LanguageId,
                CreatedAt = DateTime.UtcNow
            };

            _context.Words.Add(word);
            await _context.SaveChangesAsync();

            // Create text-word relationship
            var textWord = new TextWord
            {
                TextId = text.TextId,
                WordId = word.WordId,
                CreatedAt = DateTime.UtcNow
            };

            _context.Set<TextWord>().Add(textWord);

            // Create translation
            var wordTranslation = new WordTranslation
            {
                WordId = word.WordId,
                Translation = createWordDto.Translation,
                CreatedAt = DateTime.UtcNow
            };

            _context.WordTranslations.Add(wordTranslation);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetWord), new { id = word.WordId }, new WordResponseDto
            {
                WordId = word.WordId,
                Term = word.Term,
                Status = word.Status,
                Translation = wordTranslation.Translation,
                IsNew = true
            });
        }

        // GET: api/words/5
        [HttpGet("{id}")]
        public async Task<ActionResult<WordResponseDto>> GetWord(int id)
        {
            var userId = GetUserId();
            
            var word = await _context.Words
                .Include(w => w.Translation)
                .FirstOrDefaultAsync(w => w.WordId == id && w.UserId == userId);
                
            if (word == null)
            {
                return NotFound();
            }
            
            return new WordResponseDto
            {
                WordId = word.WordId,
                Term = word.Term,
                Status = word.Status,
                Translation = word.Translation?.Translation,
                IsNew = word.Status == 1
            };
        }

        // GET: api/words/language/5
        [HttpGet("language/{languageId}")]
        public async Task<ActionResult<IEnumerable<WordResponseDto>>> GetWordsByLanguage(int languageId)
        {
            var userId = GetUserId();
            
            var words = await _context.Words
                .Where(w => w.LanguageId == languageId && w.UserId == userId)
                .Include(w => w.Translation)
                .Select(w => new WordResponseDto
                {
                    WordId = w.WordId,
                    Term = w.Term,
                    Status = w.Status,
                    Translation = w.Translation != null ? w.Translation.Translation : "",
                    IsNew = w.Status == 1
                })
                .ToListAsync();
                
            return words;
        }

        // PUT: api/words/5
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateWord(int id, [FromBody] UpdateWordDto updateWordDto)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }
            
            var userId = GetUserId();
            
            var word = await _context.Words
                .Include(w => w.Translation)
                .FirstOrDefaultAsync(w => w.WordId == id && w.UserId == userId);
                
            if (word == null)
            {
                return NotFound();
            }
            
            // Update word status
            word.Status = updateWordDto.Status;
            
            // Update translation
            if (word.Translation == null)
            {
                word.Translation = new WordTranslation
                {
                    WordId = word.WordId,
                    Translation = updateWordDto.Translation,
                    CreatedAt = DateTime.UtcNow
                };
            }
            else
            {
                word.Translation.Translation = updateWordDto.Translation;
                word.Translation.UpdatedAt = DateTime.UtcNow;
            }
            
            await _context.SaveChangesAsync();
            
            return NoContent();
        }

        private Guid GetUserId()
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userIdClaim))
            {
                throw new UnauthorizedAccessException("User ID not found in token");
            }
            
            return Guid.Parse(userIdClaim);
        }

        // POST: api/words/batch
        [HttpPost("batch")]
        public async Task<IActionResult> AddTermsBatch([FromBody] AddTermBatchDto batchDto)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var userId = GetUserId();
            var languageId = batchDto.LanguageId;
            var termsToAdd = batchDto.Terms;

            if (termsToAdd == null || !termsToAdd.Any())
            {
                return BadRequest("Term list cannot be empty.");
            }

            // Basic check if language exists (adjust based on your Language entity)
            var languageExists = await _context.Languages.AnyAsync(l => l.LanguageId == languageId);
            if (!languageExists)
            {
                return BadRequest($"Language with ID {languageId} not found.");
            }

            var termStrings = termsToAdd.Select(t => t.Term).Distinct().ToList();

            // Fetch existing words for this user and language efficiently
            var existingWords = await _context.Words
                .Include(w => w.Translation)
                .Where(w => w.UserId == userId && w.LanguageId == languageId && termStrings.Contains(w.Term))
                .ToDictionaryAsync(w => w.Term, w => w);

            var wordsToCreate = new List<Word>();
            var translationsToCreate = new List<WordTranslation>();
            // EF Core tracks changes to existingWords automatically

            foreach (var termDto in termsToAdd)
            {
                // Skip if term is empty or whitespace
                 if (string.IsNullOrWhiteSpace(termDto.Term)) continue;

                if (existingWords.TryGetValue(termDto.Term, out var existingWord))
                {
                    // Word exists - Update status (only if lower) and translation (if different)
                    bool needsSave = false;
                    if (existingWord.Status < 5)
                    {
                        existingWord.Status = 5;
                        needsSave = true; // Mark that this entity needs saving (though EF tracks it)
                    }
                    
                    if (existingWord.Translation == null)
                    {
                         // Add new translation if missing
                         translationsToCreate.Add(new WordTranslation
                         {
                             Word = existingWord, // Link for EF Core relationship fixup
                             Translation = termDto.Translation,
                             CreatedAt = DateTime.UtcNow
                         });
                         needsSave = true;
                    }
                    else if (existingWord.Translation.Translation != termDto.Translation && !string.IsNullOrEmpty(termDto.Translation))
                    {
                        // Update existing translation only if different and not empty
                        existingWord.Translation.Translation = termDto.Translation;
                        existingWord.Translation.UpdatedAt = DateTime.UtcNow;
                        needsSave = true;
                    }
                    // If needsSave is true, EF Core's change tracker will handle the update on SaveChangesAsync
                }
                else
                {
                    // Word doesn't exist - Create new Word and Translation
                    var newWord = new Word
                    {
                        Term = termDto.Term,
                        Status = 5, // Set status to 5 as requested
                        UserId = userId,
                        LanguageId = languageId,
                        CreatedAt = DateTime.UtcNow
                    };
                    wordsToCreate.Add(newWord);

                    translationsToCreate.Add(new WordTranslation
                    {
                        Word = newWord, // Link navigation property
                        Translation = termDto.Translation,
                        CreatedAt = DateTime.UtcNow
                    });

                    // Add to dictionary to handle potential duplicates in the input list affecting future checks in this loop
                    existingWords[newWord.Term] = newWord;
                }
            }

            if (wordsToCreate.Any())
            {
                _context.Words.AddRange(wordsToCreate);
            }
            if (translationsToCreate.Any())
            {
                 _context.WordTranslations.AddRange(translationsToCreate);
            }
            
            try
            {
                var changedCount = await _context.SaveChangesAsync();
                // Return a summary of actions or just success
                return Ok(new { Message = $"Batch processed. {changedCount} database changes saved." });
            }
            catch (DbUpdateException ex)
            {
                 // Log the detailed exception (replace Console.WriteLine with proper logging)
                 Console.WriteLine($"Error saving batch terms: {ex.InnerException?.Message ?? ex.Message}");
                 return StatusCode(500, "An error occurred while saving the terms. Check logs for details.");
            }
        }
    } // End of Controller class

    // DTO for the batch request
    public class AddTermBatchDto
    {
        [Required]
        public int LanguageId { get; set; }

        [Required]
        public List<NewTermDto> Terms { get; set; } = new List<NewTermDto>();
    }

    // DTO for each term in the batch
    public class NewTermDto
    {
        [Required]
        [StringLength(100)]
        public string Term { get; set; } = string.Empty;

        [Required] // Translation is required for new terms via this route
        public string Translation { get; set; } = string.Empty;
    }


    public class CreateWordDto
    {
        [Required]
        public int TextId { get; set; }
        
        [Required]
        [StringLength(100)]
        public string Term { get; set; } = string.Empty;
        
        [Required]
        [Range(1, 5)]
        public int Status { get; set; }
        
        // Translation can be empty
        public string Translation { get; set; } = string.Empty;
    }

    public class UpdateWordDto
    {
        [Required]
        [Range(1, 5)]
        public int Status { get; set; }
        
        // Translation can be empty
        public string Translation { get; set; } = string.Empty;
    }

    public class WordResponseDto
    {
        public int WordId { get; set; }
        public string Term { get; set; } = string.Empty;
        public int Status { get; set; }
        public string Translation { get; set; } = string.Empty;
        public bool IsNew { get; set; }
    }
} 