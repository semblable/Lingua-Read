using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using LinguaReadApi.Data;
using LinguaReadApi.Models;
using System.ComponentModel.DataAnnotations;

namespace LinguaReadApi.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class TextsController : ControllerBase
    {
        private readonly AppDbContext _context;

        public TextsController(AppDbContext context)
        {
            _context = context;
        }

        // GET: api/texts
        [HttpGet]
        public async Task<ActionResult<IEnumerable<TextDto>>> GetTexts()
        {
            var userId = GetUserId();
            
            var texts = await _context.Texts
                .Where(t => t.UserId == userId)
                .Include(t => t.Language)
                .Select(t => new TextDto
                {
                    TextId = t.TextId,
                    Title = t.Title,
                    LanguageName = t.Language.Name,
                    CreatedAt = t.CreatedAt
                })
                .ToListAsync();
                
            return texts;
        }

        // GET: api/texts/5
        [HttpGet("{id}")]
        public async Task<ActionResult<TextDetailDto>> GetText(int id)
        {
            var userId = GetUserId();
            
            var text = await _context.Texts
                .Where(t => t.TextId == id && t.UserId == userId)
                .Include(t => t.Language)
                .Include(t => t.TextWords)
                    .ThenInclude(tw => tw.Word)
                        .ThenInclude(w => w.Translation)
                .FirstOrDefaultAsync();
                
            if (text == null)
            {
                return NotFound();
            }
            
            var textDetail = new TextDetailDto
            {
                TextId = text.TextId,
                Title = text.Title,
                Content = text.Content,
                LanguageName = text.Language.Name,
                LanguageId = text.LanguageId,
                BookId = text.BookId,
                CreatedAt = text.CreatedAt,
                Words = text.TextWords.Select(tw => new WordDto
                {
                    WordId = tw.Word.WordId,
                    Term = tw.Word.Term,
                    Status = tw.Word.Status,
                    Translation = tw.Word.Translation?.Translation,
                    IsNew = false // Words from the text are not new
                }).ToList()
            };
            
            return textDetail;
        }

        // POST: api/texts
        [HttpPost]
        public async Task<ActionResult<TextDto>> CreateText([FromBody] CreateTextDto createTextDto)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }
            
            var userId = GetUserId();
            
            // Check if language exists
            var languageExists = await _context.Languages.AnyAsync(l => l.LanguageId == createTextDto.LanguageId);
            if (!languageExists)
            {
                return BadRequest("Invalid language ID");
            }
            
            var text = new Text
            {
                Title = createTextDto.Title,
                Content = createTextDto.Content,
                LanguageId = createTextDto.LanguageId,
                UserId = userId,
                CreatedAt = DateTime.UtcNow
            };
            
            _context.Texts.Add(text);
            await _context.SaveChangesAsync();
            
            var language = await _context.Languages.FindAsync(text.LanguageId);
            
            var textDto = new TextDto
            {
                TextId = text.TextId,
                Title = text.Title,
                LanguageName = language.Name,
                CreatedAt = text.CreatedAt
            };
            
            return CreatedAtAction(nameof(GetText), new { id = text.TextId }, textDto);
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

    public class TextDto
    {
        public int TextId { get; set; }
        public string Title { get; set; } = string.Empty;
        public string LanguageName { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
    }

    public class TextDetailDto
    {
        public int TextId { get; set; }
        public string Title { get; set; } = string.Empty;
        public string Content { get; set; } = string.Empty;
        public string LanguageName { get; set; } = string.Empty;
        public int LanguageId { get; set; }
        public int? BookId { get; set; }
        public DateTime CreatedAt { get; set; }
        public List<WordDto> Words { get; set; } = new List<WordDto>();
    }

    public class WordDto
    {
        public int WordId { get; set; }
        public string Term { get; set; } = string.Empty;
        public int Status { get; set; }
        public string Translation { get; set; } = string.Empty;
        public bool IsNew { get; set; }
    }

    public class CreateTextDto
    {
        [Required]
        [StringLength(200)]
        public string Title { get; set; } = string.Empty;
        
        [Required]
        public string Content { get; set; } = string.Empty;
        
        [Required]
        public int LanguageId { get; set; }
    }
} 