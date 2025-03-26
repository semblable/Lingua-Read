using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using System.ComponentModel.DataAnnotations;
using LinguaReadApi.Data;
using LinguaReadApi.Models;
using LinguaReadApi.Utilities;

namespace LinguaReadApi.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class BooksController : ControllerBase
    {
        private readonly AppDbContext _context;

        public BooksController(AppDbContext context)
        {
            _context = context;
        }

        // GET: api/books
        [HttpGet]
        public async Task<ActionResult<IEnumerable<BookDto>>> GetBooks()
        {
            var userId = GetUserId();
            
            var books = await _context.Books
                .Where(b => b.UserId == userId)
                .Include(b => b.Language)
                .Select(b => new BookDto
                {
                    BookId = b.BookId,
                    Title = b.Title,
                    Description = b.Description,
                    LanguageName = b.Language.Name,
                    CreatedAt = b.CreatedAt,
                    PartCount = b.Texts.Count,
                    LastReadTextId = b.LastReadTextId,
                    LastReadAt = b.LastReadAt,
                    TotalWords = b.TotalWords,
                    KnownWords = b.KnownWords,
                    LearningWords = b.LearningWords,
                    IsFinished = b.IsFinished
                })
                .ToListAsync();
                
            return books;
        }

        // GET: api/books/5
        [HttpGet("{id}")]
        public async Task<ActionResult<BookDetailDto>> GetBook(int id)
        {
            var userId = GetUserId();
            
            var book = await _context.Books
                .Where(b => b.BookId == id && b.UserId == userId)
                .Include(b => b.Language)
                .Include(b => b.Texts)
                .FirstOrDefaultAsync();
                
            if (book == null)
            {
                return NotFound();
            }
            
            var bookDetail = new BookDetailDto
            {
                BookId = book.BookId,
                Title = book.Title,
                Description = book.Description,
                LanguageName = book.Language.Name,
                LanguageId = book.LanguageId,
                CreatedAt = book.CreatedAt,
                Parts = book.Texts.OrderBy(t => t.PartNumber).Select(t => new TextPartDto
                {
                    TextId = t.TextId,
                    Title = t.Title,
                    PartNumber = t.PartNumber ?? 0,
                    CreatedAt = t.CreatedAt
                }).ToList()
            };
            
            return bookDetail;
        }

        // POST: api/books
        [HttpPost]
        public async Task<ActionResult<BookDto>> CreateBook([FromBody] CreateBookDto createBookDto)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }
            
            var userId = GetUserId();
            
            // Check if language exists
            var languageExists = await _context.Languages.AnyAsync(l => l.LanguageId == createBookDto.LanguageId);
            if (!languageExists)
            {
                return BadRequest("Invalid language ID");
            }
            
            var book = new Book
            {
                Title = createBookDto.Title,
                Description = createBookDto.Description,
                LanguageId = createBookDto.LanguageId,
                UserId = userId,
                CreatedAt = DateTime.UtcNow
            };
            
            _context.Books.Add(book);
            await _context.SaveChangesAsync();
            
            // Create initial text parts
            if (!string.IsNullOrEmpty(createBookDto.Content))
            {
                // Split content into parts according to the settings
                var textParts = SplitContent(createBookDto.Content, createBookDto.SplitMethod, createBookDto.MaxSegmentSize);
                
                for (int i = 0; i < textParts.Count; i++)
                {
                    var text = new Text
                    {
                        Title = $"{book.Title} - Part {i + 1}",
                        Content = textParts[i],
                        LanguageId = book.LanguageId,
                        UserId = userId,
                        BookId = book.BookId,
                        PartNumber = i + 1,
                        CreatedAt = DateTime.UtcNow
                    };
                    
                    _context.Texts.Add(text);
                }
                
                await _context.SaveChangesAsync();
            }
            
            var language = await _context.Languages.FindAsync(book.LanguageId);
            
            var bookDto = new BookDto
            {
                BookId = book.BookId,
                Title = book.Title,
                Description = book.Description,
                LanguageName = language.Name,
                CreatedAt = book.CreatedAt,
                PartCount = await _context.Texts.CountAsync(t => t.BookId == book.BookId),
                LastReadTextId = null,
                LastReadAt = null,
                TotalWords = 0,
                KnownWords = 0,
                LearningWords = 0
            };
            
            return CreatedAtAction(nameof(GetBook), new { id = book.BookId }, bookDto);
        }

        // Helper method to split content into parts
        private List<string> SplitContent(string content, string splitMethod, int maxSegmentSize)
        {
            var result = new List<string>();
            
            switch (splitMethod.ToLower())
            {
                case "paragraph":
                    // Split by paragraphs
                    var paragraphs = content.Split(new[] { "\r\n\r\n", "\n\n" }, StringSplitOptions.RemoveEmptyEntries);
                    
                    // Group paragraphs to respect max size
                    var currentPart = new List<string>();
                    int currentCharCount = 0;
                    
                    foreach (var para in paragraphs)
                    {
                        if (currentCharCount + para.Length > maxSegmentSize && currentPart.Count > 0)
                        {
                            // This paragraph would exceed max size, save current part and start a new one
                            result.Add(string.Join("\n\n", currentPart));
                            currentPart.Clear();
                            currentCharCount = 0;
                        }
                        
                        currentPart.Add(para);
                        currentCharCount += para.Length + 2; // +2 for newlines
                    }
                    
                    // Add the last part if it contains paragraphs
                    if (currentPart.Count > 0)
                    {
                        result.Add(string.Join("\n\n", currentPart));
                    }
                    break;
                    
                case "sentence":
                    // Split by sentences (roughly)
                    var sentences = System.Text.RegularExpressions.Regex.Split(content, @"(?<=[.!?])\s+")
                        .Where(s => !string.IsNullOrWhiteSpace(s))
                        .ToList();
                    
                    // Group sentences to respect max size
                    currentPart = new List<string>();
                    currentCharCount = 0;
                    
                    foreach (var sentence in sentences)
                    {
                        if (currentCharCount + sentence.Length > maxSegmentSize && currentPart.Count > 0)
                        {
                            // This sentence would exceed max size, save current part and start a new one
                            result.Add(string.Join(" ", currentPart));
                            currentPart.Clear();
                            currentCharCount = 0;
                        }
                        
                        currentPart.Add(sentence);
                        currentCharCount += sentence.Length + 1; // +1 for space
                    }
                    
                    // Add the last part if it contains sentences
                    if (currentPart.Count > 0)
                    {
                        result.Add(string.Join(" ", currentPart));
                    }
                    break;
                    
                case "length":
                default:
                    // Split by fixed character length
                    for (int i = 0; i < content.Length; i += maxSegmentSize)
                    {
                        var length = Math.Min(maxSegmentSize, content.Length - i);
                        
                        // Try to find a good breaking point (space, punctuation)
                        if (i + length < content.Length)
                        {
                            // Look for a space or punctuation within the last 20% of the segment
                            int searchStart = i + (int)(length * 0.8);
                            int breakPoint = content.LastIndexOfAny(new[] { ' ', '.', '!', '?', '\n' }, i + length, length - searchStart + i);
                            
                            if (breakPoint > searchStart)
                            {
                                length = breakPoint - i + 1;
                            }
                        }
                        
                        result.Add(content.Substring(i, length));
                    }
                    break;
            }
            
            return result;
        }

        // PUT: api/books/5/lastread
        [HttpPut("{id}/lastread")]
        public async Task<IActionResult> UpdateLastRead(int id, [FromBody] UpdateLastReadDto updateDto)
        {
            var userId = GetUserId();
            
            var book = await _context.Books
                .Where(b => b.BookId == id && b.UserId == userId)
                .FirstOrDefaultAsync();
                
            if (book == null)
            {
                return NotFound();
            }
            
            // Verify the text belongs to this book
            var text = await _context.Texts
                .Where(t => t.TextId == updateDto.TextId && t.BookId == id)
                .FirstOrDefaultAsync();
                
            if (text == null) 
            {
                return BadRequest("The specified text does not belong to this book");
            }
            
            book.LastReadTextId = updateDto.TextId;
            book.LastReadAt = DateTime.UtcNow;
            
            await _context.SaveChangesAsync();
            
            return NoContent();
        }

        // PUT: api/books/5/complete-lesson
        [HttpPut("{id}/complete-lesson")]
        public async Task<ActionResult<BookStatsDto>> CompleteLesson(int id, [FromBody] CompleteLessonDto lessonDto)
        {
            var userId = GetUserId();
            
            var book = await _context.Books
                .Where(b => b.BookId == id && b.UserId == userId)
                .Include(b => b.Language)  // Include the language
                .FirstOrDefaultAsync();
                
            if (book == null)
            {
                return NotFound();
            }
            
            if (book.Language == null)
            {
                return BadRequest("Book language not found");
            }
            
            // Verify the text belongs to this book
            var text = await _context.Texts
                .Include(t => t.TextWords)
                .ThenInclude(tw => tw.Word)
                .Where(t => t.TextId == lessonDto.TextId && t.BookId == id)
                .FirstOrDefaultAsync();
                
            if (text == null)
            {
                return NotFound("Text not found or does not belong to this book");
            }
            
            // Count all words in the text (not just unique words)
            int totalWordCount = WordCountUtility.CountTotalWords(text.Content);
            
            // Get the language directly from the database to update it
            var language = await _context.Languages.FindAsync(book.LanguageId);
            if (language != null)
            {
                // Update the language WordsRead counter
                language.WordsRead += totalWordCount;
                
                // Explicitly mark the language entity as modified
                _context.Entry(language).State = EntityState.Modified;
                
                // Track this reading activity for statistics
                var activity = new UserActivity
                {
                    UserId = userId,
                    LanguageId = language.LanguageId,
                    ActivityType = "LessonCompleted",
                    WordCount = totalWordCount,
                    Timestamp = DateTime.UtcNow
                };
                _context.UserActivities.Add(activity);
                
                // Save the change immediately
                await _context.SaveChangesAsync();
            }
            
            // Get unique words from this text
            var textWords = text.TextWords.Select(tw => tw.Word).ToList();
            var knownWords = textWords.Count(w => w.Status >= 4);
            var learningWords = textWords.Count(w => w.Status >= 2 && w.Status < 4);
            
            // Update user's words
            var userWords = await _context.Words
                .Where(w => w.UserId == userId && textWords.Select(tw => tw.Term.ToLower()).Contains(w.Term.ToLower()))
                .ToListAsync();
            
            foreach (var word in textWords)
            {
                var userWord = userWords.FirstOrDefault(w => w.Term.ToLower() == word.Term.ToLower());
                if (userWord != null)
                {
                    if (userWord.Status < 5) // Only update if not mastered
                    {
                        userWord.Status = Math.Min(userWord.Status + 1, 5);
                    }
                }
            }
            
            // Update book stats
            book.TotalWords = await _context.TextWords
                .Where(tw => tw.Text.BookId == id)
                .Select(tw => tw.Word)
                .Distinct()
                .CountAsync();
            
            book.KnownWords = await _context.TextWords
                .Where(tw => tw.Text.BookId == id)
                .Select(tw => tw.Word)
                .Where(w => w.Status >= 4)
                .Distinct()
                .CountAsync();
            
            book.LearningWords = await _context.TextWords
                .Where(tw => tw.Text.BookId == id)
                .Select(tw => tw.Word)
                .Where(w => w.Status >= 2 && w.Status < 4)
                .Distinct()
                .CountAsync();
            
            book.LastReadAt = DateTime.UtcNow;
            book.LastReadTextId = text.TextId;
            book.LastReadPartId = text.PartNumber;
            
            await _context.SaveChangesAsync();
            
            // Calculate completion percentage based on text position
            // Get total number of texts/parts in this book
            int totalTexts = await _context.Texts
                .Where(t => t.BookId == id)
                .CountAsync();

            double completionPercentage;
            // Check if this is the last lesson
            if (totalTexts > 0 && text.PartNumber == totalTexts)
            {
                book.IsFinished = true;
                completionPercentage = 100.0;
            }
            else
            {
                // Calculate progress based on current part number and format to 2 decimal places
                completionPercentage = totalTexts > 0
                    ? Math.Round(((double)text.PartNumber / totalTexts) * 100, 2)
                    : 0;
            }
            // Save changes again to persist IsFinished if updated
            await _context.SaveChangesAsync();
            
            return new BookStatsDto
            {
                TotalWords = book.TotalWords,
                KnownWords = book.KnownWords,
                LearningWords = book.LearningWords,
                CompletionPercentage = completionPercentage,
                IsFinished = book.IsFinished
            };
        }

        // PUT: api/books/5/finish
        [HttpPut("{id}/finish")]
        public async Task<ActionResult<BookStatsDto>> FinishBook(int id)
        {
            var userId = GetUserId();
            
            var book = await _context.Books
                .Where(b => b.BookId == id && b.UserId == userId)
                .Include(b => b.Language)  // Include the language
                .Include(b => b.Texts)
                .FirstOrDefaultAsync();
                
            if (book == null)
            {
                return NotFound("Book not found");
            }
            
            if (book.Language == null)
            {
                return BadRequest("Book language not found");
            }
            
            // Count all words in all texts of the book
            int totalWordCount = WordCountUtility.CountWordsInTexts(book.Texts);
            
            // Update the language WordsRead counter
            WordCountUtility.UpdateLanguageWordCount(book.Language, totalWordCount);
            // Explicitly mark the language entity as modified
            _context.Entry(book.Language).State = EntityState.Modified;
            
            // Track this reading activity for statistics
            var activity = new UserActivity
            {
                UserId = userId,
                LanguageId = book.LanguageId,
                ActivityType = "BookFinished",
                WordCount = totalWordCount,
                Timestamp = DateTime.UtcNow
            };
            _context.UserActivities.Add(activity);
            
            // Get all unique words from all texts in the book
            var textWords = await _context.TextWords
                .Where(tw => tw.Text.BookId == id)
                .Include(tw => tw.Word)
                .ToListAsync();
            
            var uniqueWords = textWords.Select(tw => tw.Word).GroupBy(w => w.Term.ToLower()).Select(g => g.First()).ToList();
            
            // Mark all words as known
            foreach (var word in uniqueWords)
            {
                word.Status = 5; // Mastered
            }
            
            // Update book stats
            book.TotalWords = uniqueWords.Count;
            book.KnownWords = uniqueWords.Count; // All words are now known
            book.LearningWords = 0;
            book.LastReadAt = DateTime.UtcNow;
            book.IsFinished = true;
            
            await _context.SaveChangesAsync();
            
            return new BookStatsDto
            {
                TotalWords = book.TotalWords,
                KnownWords = book.KnownWords,
                LearningWords = book.LearningWords,
                CompletionPercentage = 100,
                IsFinished = true
            };
        }

        // GET: api/books/5/next-lesson
        [HttpGet("{id}/next-lesson")]
        public async Task<ActionResult<NextLessonDto>> GetNextLesson(int id, [FromQuery] int currentTextId)
        {
            var userId = GetUserId();
            
            // Retrieve the book and ensure it belongs to the user
            var book = await _context.Books
                .Include(b => b.Texts)
                .Where(b => b.BookId == id && b.UserId == userId)
                .FirstOrDefaultAsync();
                
            if (book == null)
            {
                return NotFound("Book not found");
            }
            
            // Order texts by their part number
            var orderedTexts = book.Texts.OrderBy(t => t.PartNumber).ToList();
            
            // Find the current text index
            var currentIndex = orderedTexts.FindIndex(t => t.TextId == currentTextId);
            
            if (currentIndex == -1)
            {
                return NotFound("Current text not found in this book");
            }
            
            // Check if this is the last text
            if (currentIndex >= orderedTexts.Count - 1)
            {
                return Ok(new NextLessonDto { TextId = null });
            }
            
            // Return the next text
            var nextText = orderedTexts[currentIndex + 1];
            return Ok(new NextLessonDto { TextId = nextText.TextId });
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

    public class BookDto
    {
        public int BookId { get; set; }
        public string Title { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public string LanguageName { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public int PartCount { get; set; }
        public int? LastReadTextId { get; set; }
        public DateTime? LastReadAt { get; set; }
        public int TotalWords { get; set; }
        public int KnownWords { get; set; }
        public int LearningWords { get; set; }
        public bool IsFinished { get; set; }
        public double CompletionPercentage => TotalWords > 0 ? 
            Math.Round((double)(KnownWords + LearningWords) / TotalWords * 100, 1) : 0;
    }

    public class BookDetailDto
    {
        public int BookId { get; set; }
        public string Title { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public string LanguageName { get; set; } = string.Empty;
        public int LanguageId { get; set; }
        public DateTime CreatedAt { get; set; }
        public List<TextPartDto> Parts { get; set; } = new List<TextPartDto>();
    }

    public class TextPartDto
    {
        public int TextId { get; set; }
        public string Title { get; set; } = string.Empty;
        public int PartNumber { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class CreateBookDto
    {
        [Required]
        [StringLength(200)]
        public string Title { get; set; } = string.Empty;
        
        [StringLength(1000)]
        public string Description { get; set; } = string.Empty;
        
        [Required]
        public int LanguageId { get; set; }
        
        public string Content { get; set; } = string.Empty;
        
        [Required]
        public string SplitMethod { get; set; } = "paragraph"; // paragraph, sentence, length
        
        [Required]
        [Range(500, 50000)]
        public int MaxSegmentSize { get; set; } = 3000; // Default max characters per segment
    }

    public class UpdateLastReadDto
    {
        [Required]
        public int TextId { get; set; }
    }

    public class CompleteLessonDto
    {
        [Required]
        public int TextId { get; set; }
    }

    public class BookStatsDto
    {
        public int TotalWords { get; set; }
        public int KnownWords { get; set; }
        public int LearningWords { get; set; }
        public double CompletionPercentage { get; set; }
        public bool IsFinished { get; set; }
    }

    public class NextLessonDto
    {
        public int? TextId { get; set; }
    }
} 