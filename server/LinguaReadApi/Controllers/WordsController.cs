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