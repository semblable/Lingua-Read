using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using System;
using System.ComponentModel.DataAnnotations;
using System.Security.Claims;
using System.Threading.Tasks;
using LinguaReadApi.Data;
using LinguaReadApi.Models;
using System.Linq; // Required for Count() on nullable collection
using System.Collections.Generic;
// using Microsoft.Extensions.Logging; // TODO: Inject ILogger later

namespace LinguaReadApi.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class WordsController : ControllerBase
    {
        private readonly AppDbContext _context;
        // private readonly ILogger<WordsController> _logger; // TODO: Inject ILogger later

        // TODO: Inject ILogger later
        public WordsController(AppDbContext context /*, ILogger<WordsController> logger*/)
        {
            _context = context;
            // _logger = logger;
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

                // Update translation if provided and different or missing
                if (!string.IsNullOrEmpty(createWordDto.Translation))
                {
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
                }

                await _context.SaveChangesAsync();

                return Ok(new WordResponseDto
                {
                    WordId = existingWord.WordId,
                    Term = existingWord.Term,
                    Status = existingWord.Status,
                    Translation = existingWord.Translation?.Translation ?? "", // Handle null translation
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
            // Save here to get the WordId for relationships
            await _context.SaveChangesAsync();

            // Create text-word relationship
            var textWord = new TextWord
            {
                TextId = text.TextId,
                WordId = word.WordId,
                CreatedAt = DateTime.UtcNow
            };
            _context.Set<TextWord>().Add(textWord);

            WordTranslation? wordTranslation = null;
            // Create translation only if provided
            if (!string.IsNullOrEmpty(createWordDto.Translation))
            {
                wordTranslation = new WordTranslation
                {
                    WordId = word.WordId,
                    Translation = createWordDto.Translation,
                    CreatedAt = DateTime.UtcNow
                };
                _context.WordTranslations.Add(wordTranslation);
            }

            // Save relationships and potentially translation
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetWord), new { id = word.WordId }, new WordResponseDto
            {
                WordId = word.WordId,
                Term = word.Term,
                Status = word.Status,
                Translation = wordTranslation?.Translation ?? "", // Handle null translation
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
                Translation = word.Translation?.Translation ?? "", // Handle null translation
                IsNew = word.Status == 1 // Or based on your definition of "New"
            };
        }

        // GET: api/words/language/5?status=1,2,3&sortBy=term_asc
        [HttpGet("language/{languageId}")]
        public async Task<ActionResult<IEnumerable<WordResponseDto>>> GetWordsByLanguage(
            int languageId,
            [FromQuery] string? status = null,     // Comma-separated list of statuses (e.g., "1,2,5")
            [FromQuery] string? sortBy = null,     // Sort criteria (e.g., "term_asc", "status_desc")
            [FromQuery] string? searchTerm = null) // Search term for Term or Translation
        {
            var userId = GetUserId();

            var query = _context.Words
                .Where(w => w.LanguageId == languageId && w.UserId == userId)
                .Include(w => w.Translation)
                .AsQueryable(); // Use AsQueryable for building the query

            // Apply status filtering
            if (!string.IsNullOrEmpty(status))
            {
                var statusList = status.Split(',')
                                       .Select(s => s.Trim())
                                       .Where(s => int.TryParse(s, out _))
                                       .Select(int.Parse)
                                       .ToList();
                if (statusList.Any())
                {
                    query = query.Where(w => statusList.Contains(w.Status));
                }
            }

            // Apply search term filtering (case-insensitive)
            if (!string.IsNullOrWhiteSpace(searchTerm))
            {
                var termLower = searchTerm.ToLower();
                query = query.Where(w => w.Term.ToLower().Contains(termLower) ||
                                       (w.Translation != null && w.Translation.Translation.ToLower().Contains(termLower)));
            }

            // Apply sorting
            switch (sortBy?.ToLowerInvariant())
            {
                case "term_desc":
                    query = query.OrderByDescending(w => w.Term);
                    break;
                case "status_asc":
                    query = query.OrderBy(w => w.Status).ThenBy(w => w.Term);
                    break;
                case "status_desc":
                    query = query.OrderByDescending(w => w.Status).ThenBy(w => w.Term);
                    break;
                case "created_asc":
                    query = query.OrderBy(w => w.CreatedAt);
                    break;
                case "created_desc":
                    query = query.OrderByDescending(w => w.CreatedAt);
                    break;
                case "term_asc":
                default:
                    query = query.OrderBy(w => w.Term);
                    break;
            }

            var words = await query
                .Select(w => new WordResponseDto
                {
                    WordId = w.WordId,
                    Term = w.Term,
                    Status = w.Status,
                    Translation = w.Translation != null ? w.Translation.Translation : "",
                    IsNew = w.Status == 1, // Or based on your definition of "New"
                    CreatedAt = w.CreatedAt
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

            // Update translation only if provided
            if (updateWordDto.Translation != null) // Check if translation was provided in the request
            {
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
            }

            await _context.SaveChangesAsync();

            return NoContent();
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

            // Basic check if language exists
            var languageExists = await _context.Languages.AnyAsync(l => l.LanguageId == languageId);
            if (!languageExists)
            {
                return BadRequest($"Language with ID {languageId} not found.");
            }

            // Get distinct terms from the input DTO
            var termStrings = termsToAdd
                                .Where(t => !string.IsNullOrWhiteSpace(t.Term)) // Ensure term is not empty
                                .Select(t => t.Term.Trim()) // Trim whitespace
                                .Distinct()
                                .ToList();

            if (!termStrings.Any())
            {
                 return BadRequest("Term list contains no valid terms.");
            }

            // Fetch existing words for this user and language efficiently
            var existingWords = await _context.Words
                .Include(w => w.Translation)
                .Where(w => w.UserId == userId && w.LanguageId == languageId && termStrings.Contains(w.Term))
                .ToDictionaryAsync(w => w.Term, w => w); // Use Trimmed term as key? Assuming Term is stored trimmed.

            var wordsToCreate = new List<Word>();
            var translationsToCreate = new List<WordTranslation>();
            // EF Core tracks changes to existingWords automatically

            foreach (var termDto in termsToAdd)
            {
                var trimmedTerm = termDto.Term?.Trim(); // Trim term for lookup and creation
                // Skip if term is empty or whitespace after trimming
                if (string.IsNullOrWhiteSpace(trimmedTerm)) continue;

                if (existingWords.TryGetValue(trimmedTerm, out var existingWord))
                {
                    // Word exists - Update status to 5 (Known) if it's lower
                    // bool needsSave = false; // Removed unused variable
                    if (existingWord.Status < 5)
                    {
                        existingWord.Status = 5;
                        // needsSave = true; // Removed unused assignment
                    }

                    // Handle translation only if provided in the DTO
                    if (!string.IsNullOrEmpty(termDto.Translation))
                    {
                        if (existingWord.Translation == null)
                        {
                             // Add new translation if missing
                             translationsToCreate.Add(new WordTranslation
                             {
                                 Word = existingWord, // Link for EF Core relationship fixup
                                 Translation = termDto.Translation,
                                 CreatedAt = DateTime.UtcNow
                             });
                            // needsSave = true; // Removed unused assignment
                        }
                        else if (existingWord.Translation.Translation != termDto.Translation)
                        {
                            // Update existing translation only if different
                            existingWord.Translation.Translation = termDto.Translation;
                            existingWord.Translation.UpdatedAt = DateTime.UtcNow;
                            // needsSave = true; // Removed unused assignment
                        }
                    }
                    // EF Core's change tracker will handle the update on SaveChangesAsync if changes were made
                }
                else
                {
                    // Word doesn't exist - Create new Word
                    // Use status from DTO if valid (1-5), otherwise default to 5 (Known)
                    int initialStatus = (termDto.Status.HasValue && termDto.Status.Value >= 1 && termDto.Status.Value <= 5)
                                        ? termDto.Status.Value
                                        : 5;

                    var newWord = new Word
                    {
                        Term = trimmedTerm, // Use trimmed term
                        Status = initialStatus, // Use determined initial status
                        UserId = userId,
                        LanguageId = languageId,
                        CreatedAt = DateTime.UtcNow
                    };
                    wordsToCreate.Add(newWord);

                    // Only add translation if provided
                    if (!string.IsNullOrEmpty(termDto.Translation))
                    {
                        translationsToCreate.Add(new WordTranslation
                        {
                            Word = newWord, // Link navigation property
                            Translation = termDto.Translation,
                            CreatedAt = DateTime.UtcNow
                        });
                    }

                    // Add to dictionary to handle potential duplicates in the input list affecting future checks in this loop
                    existingWords[newWord.Term] = newWord; // Use trimmed term as key
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
                 // Log the detailed exception (Inject ILogger<WordsController> later)
                 // For now, using Console.WriteLine for immediate visibility
                 Console.WriteLine($"DbUpdateException saving batch terms: {ex.Message}");
                 if (ex.InnerException != null)
                 {
                    Console.WriteLine($"Inner Exception: {ex.InnerException.Message}");
                 }
                 // Log entries that might have caused the issue (if possible)
                 Console.WriteLine($"Entries involved: {ex.Entries?.Count()}");
                 return StatusCode(500, "An error occurred while saving the terms. Check logs for details.");
            }
            // Removed extra brace here if present
        }

        // GET: api/words/export?languageId=5&status=1,5
        [HttpGet("export")]
        public async Task<IActionResult> ExportWordsCsv(
            [FromQuery] int? languageId = null,
            [FromQuery] string? status = null) // Comma-separated list of statuses (e.g., "1,2,5")
        {
            var userId = GetUserId();

            var query = _context.Words
                .Where(w => w.UserId == userId)
                .Include(w => w.Translation)
                .Include(w => w.Language) // Include Language for the name
                .AsQueryable();

            // Apply language filtering
            if (languageId.HasValue)
            {
                query = query.Where(w => w.LanguageId == languageId.Value);
            }

            // Apply status filtering
            if (!string.IsNullOrEmpty(status))
            {
                var statusList = status.Split(',')
                                       .Select(s => s.Trim())
                                       .Where(s => int.TryParse(s, out _))
                                       .Select(int.Parse)
                                       .ToList();
                if (statusList.Any())
                {
                    query = query.Where(w => statusList.Contains(w.Status));
                }
            }

            // Default sort by Language then Term for consistent export
            query = query.OrderBy(w => w.Language.Name).ThenBy(w => w.Term);

            var wordsToExport = await query.ToListAsync();

            // Generate CSV content
            var csvBuilder = new System.Text.StringBuilder();
            // Add header row
            csvBuilder.AppendLine("Term,Translation,Status,Language");

            foreach (var word in wordsToExport)
            {
                var termCsv = EscapeCsvField(word.Term);
                var translationCsv = EscapeCsvField(word.Translation?.Translation ?? "");
                var statusCsv = word.Status.ToString();
                var languageCsv = EscapeCsvField(word.Language?.Name ?? "Unknown"); // Handle potential null language if needed

                csvBuilder.AppendLine($"{termCsv},{translationCsv},{statusCsv},{languageCsv}");
            }

            var csvBytes = System.Text.Encoding.UTF8.GetBytes(csvBuilder.ToString());
            var fileName = $"linguaread_terms_{DateTime.UtcNow:yyyyMMddHHmmss}.csv";

            return File(csvBytes, "text/csv", fileName);
        }

        // Helper method to escape CSV fields containing commas or quotes
        private string EscapeCsvField(string field)
        {
            if (string.IsNullOrEmpty(field)) return "";

            // If the field contains a comma, double quote, or newline, enclose it in double quotes
            if (field.Contains(',') || field.Contains('"') || field.Contains('\n') || field.Contains('\r'))
            {
                // Escape existing double quotes by doubling them
                var escapedField = field.Replace("\"", "\"\"");
                return $"\"{escapedField}\"";
            }
            return field;
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

        public string? Translation { get; set; } // Translation is optional

        [Range(1, 5, ErrorMessage = "Status must be between 1 and 5.")] // Add validation if status is provided
        public int? Status { get; set; } // Status is optional
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
        public DateTime CreatedAt { get; set; }
    }
} // End of namespace