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
using Microsoft.Extensions.Logging; // Add this

namespace LinguaReadApi.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class TextsController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly ILogger<TextsController> _logger; // Add logger field

        public TextsController(AppDbContext context, ILogger<TextsController> logger) // Inject logger
        {
            _context = context;
            _logger = logger; // Assign logger
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
                    CreatedAt = t.CreatedAt,
                    Tag = t.Tag, // Include Tag
                    IsAudioLesson = t.IsAudioLesson // Include IsAudioLesson
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
                LanguageCode = text.Language.Code, // Populate LanguageCode
                LanguageId = text.LanguageId,
                BookId = text.BookId,
                CreatedAt = text.CreatedAt,
                IsAudioLesson = text.IsAudioLesson, // Add IsAudioLesson
                AudioFilePath = text.AudioFilePath, // Add AudioFilePath
                SrtContent = text.SrtContent,       // Add SrtContent
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
                Tag = createTextDto.Tag, // Assign the tag
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

        // POST: api/texts/audio
        [HttpPost("audio")]
        [Consumes("multipart/form-data")] // Specify content type
        [RequestSizeLimit(100 * 1024 * 1024)] // 100 MB limit, match Program.cs
        [RequestFormLimits(MultipartBodyLengthLimit = 100 * 1024 * 1024, ValueLengthLimit = int.MaxValue)] // Match Program.cs
        public async Task<ActionResult<TextDto>> CreateAudioLesson([FromForm] CreateAudioLessonDto createAudioLessonDto)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            if (createAudioLessonDto.AudioFile == null || createAudioLessonDto.AudioFile.Length == 0)
            {
                return BadRequest("Audio file is required.");
            }

            if (createAudioLessonDto.SrtFile == null || createAudioLessonDto.SrtFile.Length == 0)
            {
                return BadRequest("SRT file is required.");
            }

            // Basic validation for file types (can be improved)
            if (!createAudioLessonDto.AudioFile.ContentType.StartsWith("audio/"))
            {
                return BadRequest("Invalid audio file type.");
            }
            // SRT files often don't have a standard MIME type, check extension
            if (!createAudioLessonDto.SrtFile.FileName.EndsWith(".srt", StringComparison.OrdinalIgnoreCase))
            {
                 return BadRequest("Invalid SRT file type. Must be .srt");
            }


            var userId = GetUserId();

            // Check if language exists
            var languageExists = await _context.Languages.AnyAsync(l => l.LanguageId == createAudioLessonDto.LanguageId);
            if (!languageExists)
            {
                return BadRequest("Invalid language ID");
            }

            string audioFilePath = null;
            string srtContent = null;
            string transcript = null;

            try
            {
                // --- 1. Save Audio File ---
                // TODO: Implement robust file saving logic
                // Example: Save to wwwroot/audio_lessons/{userId}/{guid}_{filename}
                // Ensure the directory exists
                var audioFileName = $"{Guid.NewGuid()}_{Path.GetFileName(createAudioLessonDto.AudioFile.FileName)}";
                var userAudioDir = Path.Combine("wwwroot", "audio_lessons", userId.ToString()); // Consider configuration for base path
                Directory.CreateDirectory(userAudioDir); // Ensure directory exists
                var fullAudioPath = Path.Combine(userAudioDir, audioFileName);

                using (var stream = new FileStream(fullAudioPath, FileMode.Create))
                {
                    await createAudioLessonDto.AudioFile.CopyToAsync(stream);
                }
                // Store relative path for access via web server
                audioFilePath = Path.Combine("audio_lessons", userId.ToString(), audioFileName).Replace("\\", "/");


                // --- 2. Read and Parse SRT File ---
                using (var reader = new StreamReader(createAudioLessonDto.SrtFile.OpenReadStream()))
                {
                    srtContent = await reader.ReadToEndAsync();
                }
                // TODO: Implement SRT parsing logic to extract transcript
                transcript = ParseSrt(srtContent); // Placeholder for SRT parsing function

                if (string.IsNullOrWhiteSpace(transcript))
                {
                    return BadRequest("Could not parse transcript from SRT file.");
                }

                // --- 3. Create Text Entity ---
                var text = new Text
                {
                    Title = createAudioLessonDto.Title,
                    Content = transcript, // Use parsed transcript as main content
                    LanguageId = createAudioLessonDto.LanguageId,
                    UserId = userId,
                    CreatedAt = DateTime.UtcNow,
                    IsAudioLesson = true,
                    AudioFilePath = audioFilePath,
                    SrtContent = srtContent,
                    Tag = createAudioLessonDto.Tag // Assign the tag
                };

                _context.Texts.Add(text);
                await _context.SaveChangesAsync();

                // --- 4. Return Response ---
                var language = await _context.Languages.FindAsync(text.LanguageId);
                var textDto = new TextDto
                {
                    TextId = text.TextId,
                    Title = text.Title,
                    LanguageName = language?.Name ?? "Unknown", // Handle potential null language
                    CreatedAt = text.CreatedAt
                    // Add IsAudioLesson? Maybe in TextDetailDto
                };

                return CreatedAtAction(nameof(GetText), new { id = text.TextId }, textDto);
            }
            catch (Exception ex) // Basic error handling
            {
                // Log the exception (implementation needed)
                _logger.LogError(ex, "Error creating audio lesson for user {UserId}", userId); // Use structured logging
                // Consider cleanup: delete saved audio file if creation fails halfway
                if (!string.IsNullOrEmpty(audioFilePath))
                {
                     // Attempt to delete saved file on error
                    var fullPathToDelete = Path.Combine("wwwroot", audioFilePath.Replace("/", "\\"));
                     if(System.IO.File.Exists(fullPathToDelete)) {
                         System.IO.File.Delete(fullPathToDelete);
                     }
                }
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        // Placeholder for SRT parsing logic
        private string ParseSrt(string srtContent)
        {
            // Simple SRT parser: Extracts lines that don't contain '-->' and aren't sequence numbers
            var lines = srtContent.Split(new[] { "\r\n", "\r", "\n" }, StringSplitOptions.None);
            var transcriptLines = new List<string>();
            foreach (var line in lines)
            {
                if (!string.IsNullOrWhiteSpace(line) && !line.Contains("-->") && !int.TryParse(line, out _))
                {
                    transcriptLines.Add(line.Trim());
                }
            }
            return string.Join(" ", transcriptLines); // Join lines into a single transcript string
        }

        // PUT: api/texts/5
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateText(int id, [FromBody] UpdateTextDto updateTextDto)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var userId = GetUserId();
            var text = await _context.Texts
                .Where(t => t.TextId == id && t.UserId == userId)
                .FirstOrDefaultAsync();

            if (text == null)
            {
                return NotFound();
            }

            // Update allowed fields
            text.Title = updateTextDto.Title;
            text.Content = updateTextDto.Content;
            text.Tag = updateTextDto.Tag; // Allow updating the tag

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!await TextExists(id, userId))
                {
                    return NotFound();
                }
                else
                {
                    throw;
                }
            }

            return NoContent();
        }

        // DELETE: api/texts/5
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteText(int id)
        {
            var userId = GetUserId();
            var text = await _context.Texts
                .Where(t => t.TextId == id && t.UserId == userId)
                // Include related TextWords if cascade delete isn't automatic or needs verification
                // .Include(t => t.TextWords)
                .FirstOrDefaultAsync();

            if (text == null)
            {
                return NotFound();
            }

            // Note: TextWords associated with this Text should be handled by cascade delete
            // configured in AppDbContext. If not, they would need manual removal here.
            _context.Texts.Remove(text);
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

        private async Task<bool> TextExists(int id, Guid userId)
        {
            return await _context.Texts.AnyAsync(e => e.TextId == id && e.UserId == userId);
        }
    }
    // Removed extra closing brace here

    public class TextDto
    {
        public int TextId { get; set; }
        public string Title { get; set; } = string.Empty;
        public string LanguageName { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public string? Tag { get; set; } // Add Tag property
        public bool IsAudioLesson { get; set; } // Add IsAudioLesson property
    }

    public class TextDetailDto
    {
        public int TextId { get; set; }
        public string Title { get; set; } = string.Empty;
        public string Content { get; set; } = string.Empty;
        public string LanguageName { get; set; } = string.Empty;
        public string LanguageCode { get; set; } = string.Empty; // Add LanguageCode
        public int LanguageId { get; set; }
        public int? BookId { get; set; }
        public DateTime CreatedAt { get; set; }
        public bool IsAudioLesson { get; set; } // Add IsAudioLesson
        public string? AudioFilePath { get; set; } // Add AudioFilePath (nullable)
        public string? SrtContent { get; set; }    // Add SrtContent (nullable)
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

        [StringLength(100)] // Match the model's constraint
        public string? Tag { get; set; } // Optional tag
    }

    public class CreateAudioLessonDto
    {
        [Required]
        [StringLength(200)]
        public string Title { get; set; } = string.Empty;

        [Required]
        public int LanguageId { get; set; }

        [Required]
        public IFormFile AudioFile { get; set; } = null!;

        [Required]
        public IFormFile SrtFile { get; set; } = null!;

        [StringLength(100)] // Match the model's constraint
        public string? Tag { get; set; } // Optional tag
    }

    public class UpdateTextDto
    {
        [Required]
        [StringLength(200)]
        public string Title { get; set; } = string.Empty;

        [Required]
        public string Content { get; set; } = string.Empty;

        [StringLength(100)] // Match the model's constraint
        public string? Tag { get; set; } // Allow updating the tag
    }
}