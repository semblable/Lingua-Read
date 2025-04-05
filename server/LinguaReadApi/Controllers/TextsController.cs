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
using System.IO; // Added for Path and File operations

namespace LinguaReadApi.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class TextsController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly ILogger<TextsController> _logger; // Add logger field
        private const int MaxRecentTexts = 5; // Define max recent texts to return

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
                .Include(t => t.Book) // Include Book for BookTitle
                .OrderByDescending(t => t.CreatedAt) // Order by creation date by default
                .Select(t => new TextDto
                {
                    TextId = t.TextId,
                    Title = t.Title,
                    LanguageName = t.Language.Name,
                    CreatedAt = t.CreatedAt,
                    Tag = t.Tag,
                    IsAudioLesson = t.IsAudioLesson,
                    BookId = t.BookId,
                    BookTitle = t.Book != null ? t.Book.Title : null // Include BookTitle
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
                .Include(t => t.Book) // Include Book
                .Include(t => t.TextWords)
                    .ThenInclude(tw => tw.Word)
                        .ThenInclude(w => w.Translation)
                .FirstOrDefaultAsync();

            if (text == null)
            {
                return NotFound();
            }

            // --- Update LastAccessedAt ---
            text.LastAccessedAt = DateTime.UtcNow;
            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException ex)
            {
                 _logger.LogWarning(ex, "Concurrency error updating LastAccessedAt for TextId {TextId}", id);
                 // Decide if this is critical. For now, we'll proceed with returning the data.
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error saving LastAccessedAt for TextId {TextId}", id);
                // Log and continue, as fetching the data is the primary goal here.
            }
            // --- End Update ---

            var textDetail = new TextDetailDto
            {
                TextId = text.TextId,
                Title = text.Title,
                Content = text.Content,
                LanguageName = text.Language.Name,
                LanguageCode = text.Language.Code,
                LanguageId = text.LanguageId,
                BookId = text.BookId,
                BookTitle = text.Book?.Title, // Add BookTitle
                CreatedAt = text.CreatedAt,
                IsAudioLesson = text.IsAudioLesson,
                AudioFilePath = text.AudioFilePath,
                SrtContent = text.SrtContent,
                Words = text.TextWords.Select(tw => new WordDto
                {
                    WordId = tw.Word.WordId,
                    Term = tw.Word.Term,
                    Status = tw.Word.Status,
                    Translation = tw.Word.Translation?.Translation,
                    IsNew = false
                }).ToList()
            };

            return textDetail;
        }

        // GET: api/texts/recent
        [HttpGet("recent")]
        public async Task<ActionResult<IEnumerable<RecentTextDto>>> GetRecentTexts()
        {
            var userId = GetUserId();

            var recentTexts = await _context.Texts
                .Where(t => t.UserId == userId && t.LastAccessedAt != null)
                .OrderByDescending(t => t.LastAccessedAt)
                .Take(MaxRecentTexts)
                .Include(t => t.Language)
                .Include(t => t.Book) // Include Book for title and context
                .Select(t => new RecentTextDto // Use a specific DTO for recent texts
                {
                    TextId = t.TextId,
                    Title = t.Title,
                    LanguageName = t.Language.Name,
                    LastAccessedAt = t.LastAccessedAt ?? DateTime.MinValue, // Use default if somehow null despite Where clause
                    IsAudioLesson = t.IsAudioLesson,
                    BookId = t.BookId,
                    BookTitle = t.Book != null ? t.Book.Title : null,
                    PartNumber = t.PartNumber
                })
                .ToListAsync();

            return recentTexts;
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
                CreatedAt = DateTime.UtcNow,
                LastAccessedAt = null // Explicitly null on creation
            };

            _context.Texts.Add(text);
            await _context.SaveChangesAsync();

            var language = await _context.Languages.FindAsync(text.LanguageId);

            var textDto = new TextDto
            {
                TextId = text.TextId,
                Title = text.Title,
                LanguageName = language?.Name ?? "Unknown", // Handle potential null
                CreatedAt = text.CreatedAt,
                Tag = text.Tag,
                IsAudioLesson = text.IsAudioLesson,
                BookId = text.BookId,
                BookTitle = null // No book on direct text creation
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
                    Tag = createAudioLessonDto.Tag, // Assign the tag
                    LastAccessedAt = null // Explicitly null on creation
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
                    CreatedAt = text.CreatedAt,
                    Tag = text.Tag,
                    IsAudioLesson = text.IsAudioLesson,
                    BookId = text.BookId,
                    BookTitle = null // No book context here
                };

                return CreatedAtAction(nameof(GetText), new { id = text.TextId }, textDto);
            }
            catch (Exception ex) // Basic error handling
            {
                _logger.LogError(ex, "Error creating audio lesson for user {UserId}", userId); // Use structured logging
                // Consider cleanup: delete saved audio file if creation fails halfway
                if (!string.IsNullOrEmpty(audioFilePath))
                {
                     // Attempt to delete saved file on error
                    var fullPathToDelete = Path.Combine("wwwroot", audioFilePath.Replace("/", "\\"));
                     if(System.IO.File.Exists(fullPathToDelete)) {
                         try { System.IO.File.Delete(fullPathToDelete); } catch (IOException ioEx) { _logger.LogWarning(ioEx, "Failed to delete audio file during cleanup: {FilePath}", fullPathToDelete); }
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


        // POST: api/texts/audio/batch
        [HttpPost("audio/batch")]
        [Consumes("multipart/form-data")]
        [RequestSizeLimit(500 * 1024 * 1024)] // Increase limit for batch uploads (e.g., 500MB) - Adjust as needed
        [RequestFormLimits(MultipartBodyLengthLimit = 500 * 1024 * 1024, ValueLengthLimit = int.MaxValue)]
        public async Task<ActionResult> CreateAudioLessonsBatch([FromForm] CreateAudioLessonsBatchDto dto, List<IFormFile> files)
        {
            if (files == null || files.Count == 0)
            {
                return BadRequest("No files uploaded.");
            }
             if (!ModelState.IsValid) // Validate DTO
            {
                return BadRequest(ModelState);
            }

            var userId = GetUserId();
            _logger.LogInformation("Starting batch audio lesson creation for user {UserId}. Files received: {FileCount}", userId, files.Count);

            // Check language exists
            var languageExists = await _context.Languages.AnyAsync(l => l.LanguageId == dto.LanguageId);
            if (!languageExists)
            {
                return BadRequest("Invalid language ID provided for the batch.");
            }

            var createdCount = 0;
            var skippedFiles = new List<string>();
            var processedBaseNames = new HashSet<string>(); // To track processed pairs

            // --- Start: Fuzzy Pairing Logic ---
            var fileInfos = files.Select(f => ParseFileInfo(f)).ToList();

            var mp3Infos = fileInfos.Where(fi => fi.Type == FileType.MP3 && !fi.HasError).ToList();
            var srtInfos = fileInfos.Where(fi => fi.Type == FileType.SRT && !fi.HasError).ToList();

            var mp3sByNormalizedBase = mp3Infos.GroupBy(fi => fi.NormalizedBaseName).ToDictionary(g => g.Key, g => g.ToList());
            var srtsByNormalizedBase = srtInfos.GroupBy(fi => fi.NormalizedBaseName).ToDictionary(g => g.Key, g => g.ToList());

            var processedFiles = new HashSet<string>(); // Track original filenames that have been processed (paired or skipped)

            _logger.LogInformation("Attempting fuzzy pairing. MP3s found: {Mp3Count}, SRTs found: {SrtCount}", mp3Infos.Count, srtInfos.Count);

            foreach (var kvp in mp3sByNormalizedBase)
            {
                var normalizedName = kvp.Key;
                var currentMp3Infos = kvp.Value;
                srtsByNormalizedBase.TryGetValue(normalizedName, out var currentSrtInfos);

                _logger.LogDebug("Checking normalized name: '{NormalizedName}'. MP3s: {Mp3Count}, SRTs: {SrtCount}",
                    normalizedName, currentMp3Infos.Count, currentSrtInfos?.Count ?? 0);

                // Check for Ambiguity or Missing Pairs
                bool isAmbiguous = false;
                if (currentMp3Infos.Count > 1)
                {
                    _logger.LogWarning("Ambiguous MP3 match for normalized name '{NormalizedName}'. Files: {FileNames}", normalizedName, string.Join(", ", currentMp3Infos.Select(fi => fi.OriginalName)));
                    currentMp3Infos.ForEach(fi => {
                        skippedFiles.Add($"{fi.OriginalName} (Ambiguous MP3 Match)");
                        processedFiles.Add(fi.OriginalName);
                    });
                    isAmbiguous = true;
                }
                if (currentSrtInfos != null && currentSrtInfos.Count > 1)
                {
                     _logger.LogWarning("Ambiguous SRT match for normalized name '{NormalizedName}'. Files: {FileNames}", normalizedName, string.Join(", ", currentSrtInfos.Select(fi => fi.OriginalName)));
                     currentSrtInfos.ForEach(fi => {
                         skippedFiles.Add($"{fi.OriginalName} (Ambiguous SRT Match)");
                         processedFiles.Add(fi.OriginalName);
                     });
                     isAmbiguous = true;
                }

                if (isAmbiguous)
                {
                    // If SRTs existed but were ambiguous, ensure they are marked as processed/skipped
                    currentSrtInfos?.ForEach(fi => processedFiles.Add(fi.OriginalName));
                    continue; // Move to the next normalized name
                }

                // Process 1-to-1 Matches or Missing Pairs
                if (currentMp3Infos.Count == 1)
                {
                    var mp3Info = currentMp3Infos[0];
                    processedFiles.Add(mp3Info.OriginalName); // Mark MP3 as processed

                    if (currentSrtInfos != null && currentSrtInfos.Count == 1)
                    {
                        var srtInfo = currentSrtInfos[0];
                        processedFiles.Add(srtInfo.OriginalName); // Mark SRT as processed

                        _logger.LogInformation("Processing pair for normalized name: '{NormalizedName}'. MP3: {Mp3Name}, SRT: {SrtName}",
                            normalizedName, mp3Info.OriginalName, srtInfo.OriginalName);

                        string audioFilePath = null;
                        try
                        {
                            // --- 1. Save Audio File ---
                            var audioFileName = $"{Guid.NewGuid()}_{Path.GetFileName(mp3Info.File.FileName)}";
                            var userAudioDir = Path.Combine("wwwroot", "audio_lessons", userId.ToString());
                            Directory.CreateDirectory(userAudioDir);
                            var fullAudioPath = Path.Combine(userAudioDir, audioFileName);

                            using (var stream = new FileStream(fullAudioPath, FileMode.Create))
                            {
                                await mp3Info.File.CopyToAsync(stream);
                            }
                            audioFilePath = Path.Combine("audio_lessons", userId.ToString(), audioFileName).Replace("\\", "/");

                            // --- 2. Read and Parse SRT File ---
                            string srtContent;
                            using (var reader = new StreamReader(srtInfo.File.OpenReadStream()))
                            {
                                srtContent = await reader.ReadToEndAsync();
                            }
                            string transcript = ParseSrt(srtContent);

                            if (string.IsNullOrWhiteSpace(transcript))
                            {
                                _logger.LogWarning("Could not parse transcript from SRT file: {SrtFileName} for normalized name: {NormalizedName}. Skipping.", srtInfo.OriginalName, normalizedName);
                                skippedFiles.Add($"{mp3Info.OriginalName} / {srtInfo.OriginalName} (Transcript parsing failed)");
                                if (!string.IsNullOrEmpty(audioFilePath)) {
                                     var fullPathToDelete = Path.Combine("wwwroot", audioFilePath.Replace("/", "\\"));
                                     if(System.IO.File.Exists(fullPathToDelete)) try { System.IO.File.Delete(fullPathToDelete); } catch (IOException ioEx) { _logger.LogWarning(ioEx, "Failed to delete audio file during cleanup: {FilePath}", fullPathToDelete); }
                                }
                                continue;
                            }

                            // --- 3. Create Text Entity ---
                            var text = new Text
                            {
                                Title = mp3Info.BaseName, // Use MP3's original base name for title
                                Content = transcript,
                                LanguageId = dto.LanguageId,
                                UserId = userId,
                                CreatedAt = DateTime.UtcNow,
                                IsAudioLesson = true,
                                AudioFilePath = audioFilePath,
                                SrtContent = srtContent,
                                Tag = dto.Tag,
                                LastAccessedAt = null // Explicitly null on creation
                            };
                            _context.Texts.Add(text);
                            createdCount++;
                        }
                        catch (Exception ex)
                        {
                            _logger.LogError(ex, "Error processing pair for normalized name {NormalizedName}. MP3: {Mp3Name}, SRT: {SrtName}. Skipping.", normalizedName, mp3Info.OriginalName, srtInfo.OriginalName);
                            skippedFiles.Add($"{mp3Info.OriginalName} / {srtInfo.OriginalName} (Error: {ex.Message})");
                            if (!string.IsNullOrEmpty(audioFilePath)) {
                                var fullPathToDelete = Path.Combine("wwwroot", audioFilePath.Replace("/", "\\"));
                                if(System.IO.File.Exists(fullPathToDelete)) try { System.IO.File.Delete(fullPathToDelete); } catch (IOException ioEx) { _logger.LogWarning(ioEx, "Failed to delete audio file during cleanup: {FilePath}", fullPathToDelete); }
                            }
                        }
                    }
                    else // MP3 exists (count=1), but no matching SRT (count=0)
                    {
                        _logger.LogWarning("Missing SRT pair for MP3: {Mp3Name} (Normalized: '{NormalizedName}')", mp3Info.OriginalName, normalizedName);
                        skippedFiles.Add($"{mp3Info.OriginalName} (Missing SRT Pair)");
                    }
                }
            }

            // Identify any remaining SRTs that weren't processed (missing MP3 pair or format error)
            var unprocessedSrtInfos = fileInfos.Where(fi => fi.Type == FileType.SRT && !processedFiles.Contains(fi.OriginalName)).ToList();
            foreach (var srtInfo in unprocessedSrtInfos)
            {
                 if (srtInfo.HasError)
                 {
                     skippedFiles.Add($"{srtInfo.OriginalName} ({srtInfo.ErrorMessage})");
                 }
                 else
                 {
                     skippedFiles.Add($"{srtInfo.OriginalName} (Missing MP3 Pair)");
                 }
                 processedFiles.Add(srtInfo.OriginalName); // Ensure it's marked processed
            }

             // Add any remaining MP3s (should only be those with format errors, if any added later)
             var unprocessedMp3Infos = fileInfos.Where(fi => fi.Type == FileType.MP3 && !processedFiles.Contains(fi.OriginalName)).ToList();
             foreach (var mp3Info in unprocessedMp3Infos)
             {
                  skippedFiles.Add($"{mp3Info.OriginalName} ({mp3Info.ErrorMessage ?? "Unknown Error"})");
                  processedFiles.Add(mp3Info.OriginalName);
             }


            // --- End: Fuzzy Pairing Logic ---


            // Save all successfully created Text entities at once
            try
            {
                 await _context.SaveChangesAsync();
                 _logger.LogInformation("Attempted to save {CreatedCount} new audio lessons for user {UserId}.", createdCount, userId);
            }
            catch (Exception ex)
            {
                 _logger.LogError(ex, "Failed to save batch created audio lessons to database for user {UserId}.", userId);
                 // Note: At this point, files might be saved but DB entries failed. Manual cleanup might be needed.
                 return StatusCode(500, "Failed to save created lessons to the database.");
            }


            return Ok(new {
                message = $"Batch processing complete. Created {createdCount} lessons.",
                createdCount = createdCount,
                skippedFiles = skippedFiles
             });
        }

        // --- Start: Fuzzy Parsing Helper ---

        private enum FileType { MP3, SRT, Unknown }

        private class FileInfoResult
        {
            public IFormFile File { get; set; } = null!;
            public string OriginalName { get; set; } = string.Empty;
            public string BaseName { get; set; } = string.Empty;
            public string NormalizedBaseName { get; set; } = string.Empty;
            public FileType Type { get; set; } = FileType.Unknown;
            public bool HasError { get; set; } = false;
            public string? ErrorMessage { get; set; }
        }

        private FileInfoResult ParseFileInfo(IFormFile file)
        {
            var result = new FileInfoResult { File = file, OriginalName = file.FileName };
            try
            {
                result.BaseName = Path.GetFileNameWithoutExtension(file.FileName);
                result.NormalizedBaseName = NormalizeBaseName(result.BaseName);
                var extension = Path.GetExtension(file.FileName).ToLowerInvariant();

                if (extension == ".mp3") result.Type = FileType.MP3;
                else if (extension == ".srt") result.Type = FileType.SRT;
                else
                {
                    result.Type = FileType.Unknown;
                    result.HasError = true;
                    result.ErrorMessage = "Unsupported file type";
                    _logger.LogWarning("Unsupported file type encountered in batch upload: {FileName}", file.FileName);
                }
            }
            catch (ArgumentException ex) // Handle invalid characters in path/filename
            {
                 _logger.LogWarning(ex, "Invalid file name encountered in batch upload: {FileName}", file.FileName);
                 result.HasError = true;
                 result.ErrorMessage = "Invalid file name";
                 result.BaseName = file.FileName; // Use original name if parsing fails
                 result.NormalizedBaseName = NormalizeBaseName(result.BaseName); // Still try to normalize
                 result.Type = FileType.Unknown;
            }
             catch (Exception ex) // Catch unexpected errors during parsing
            {
                 _logger.LogError(ex, "Unexpected error parsing file info for: {FileName}", file.FileName);
                 result.HasError = true;
                 result.ErrorMessage = "Unexpected parsing error";
                 result.BaseName = file.FileName;
                 result.NormalizedBaseName = NormalizeBaseName(result.BaseName);
                 result.Type = FileType.Unknown;
            }
            return result;
        }

        // Normalizes the base name for better matching (lowercase, remove common separators/whitespace)
        private string NormalizeBaseName(string? name)
        {
            if (string.IsNullOrWhiteSpace(name)) return string.Empty;
            // Simple normalization: lowercase, remove spaces, underscores, hyphens
            return System.Text.RegularExpressions.Regex.Replace(name.ToLowerInvariant(), @"[\s_-]+", "");
        }

        // --- End: Fuzzy Parsing Helper ---


        // PUT: api/texts/5
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateText(int id, [FromBody] UpdateTextDto updateTextDto)
        {
            if (id != updateTextDto.TextId)
            {
                return BadRequest("ID mismatch");
            }

            var userId = GetUserId();
            var text = await _context.Texts.FirstOrDefaultAsync(t => t.TextId == id && t.UserId == userId);

            if (text == null)
            {
                return NotFound();
            }

            // Update only allowed fields
            text.Title = updateTextDto.Title;
            text.Content = updateTextDto.Content;
            text.Tag = updateTextDto.Tag; // Update tag

            // If LanguageId is provided and different, update it
            if (updateTextDto.LanguageId.HasValue && updateTextDto.LanguageId.Value != text.LanguageId)
            {
                 var languageExists = await _context.Languages.AnyAsync(l => l.LanguageId == updateTextDto.LanguageId.Value);
                 if (!languageExists)
                 {
                     return BadRequest("Invalid LanguageId provided for update.");
                 }
                 text.LanguageId = updateTextDto.LanguageId.Value;
            }


            _context.Entry(text).State = EntityState.Modified;

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

            return NoContent(); // Standard response for successful PUT
        }


        // DELETE: api/texts/5
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteText(int id)
        {
            var userId = GetUserId();
            var text = await _context.Texts.FirstOrDefaultAsync(t => t.TextId == id && t.UserId == userId);
            if (text == null)
            {
                return NotFound();
            }

            // Optionally: Add logic to delete associated audio files if it's an audio lesson
            if (text.IsAudioLesson && !string.IsNullOrEmpty(text.AudioFilePath))
            {
                 var fullPathToDelete = Path.Combine("wwwroot", text.AudioFilePath.Replace("/", "\\"));
                 if(System.IO.File.Exists(fullPathToDelete)) {
                     try { System.IO.File.Delete(fullPathToDelete); } catch (IOException ex) { _logger.LogWarning(ex, "Could not delete associated audio file during text deletion: {FilePath}", fullPathToDelete); }
                 }
            }


            _context.Texts.Remove(text);
            await _context.SaveChangesAsync();

            return NoContent(); // Standard response for successful DELETE
        }

        private Guid GetUserId()
        {
            var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out var userId))
            {
                throw new UnauthorizedAccessException("User ID not found or invalid in token.");
            }
            return userId;
        }

        private async Task<bool> TextExists(int id, Guid userId)
        {
            return await _context.Texts.AnyAsync(e => e.TextId == id && e.UserId == userId);
        }
    }

    // DTOs (Data Transfer Objects)

    public class TextDto
    {
        public int TextId { get; set; }
        public string Title { get; set; } = string.Empty;
        public string? LanguageName { get; set; } // Language name - Can be null if language is missing
        public DateTime CreatedAt { get; set; }
        public string? Tag { get; set; }
        public bool IsAudioLesson { get; set; }
        public int? BookId { get; set; } // Include BookId
        public string? BookTitle { get; set; } // Include BookTitle
    }

    public class TextDetailDto
    {
        public int TextId { get; set; }
        public string Title { get; set; } = string.Empty;
        public string Content { get; set; } = string.Empty;
        public string LanguageName { get; set; } = string.Empty;
        public string LanguageCode { get; set; } = string.Empty; // Added LanguageCode
        public int LanguageId { get; set; }
        public int? BookId { get; set; }
        public string? BookTitle { get; set; } // Added BookTitle
        public DateTime CreatedAt { get; set; }
        public bool IsAudioLesson { get; set; }
        public string? AudioFilePath { get; set; }
        public string? SrtContent { get; set; }
        public List<WordDto> Words { get; set; } = new List<WordDto>();
    }

    public class WordDto
    {
        public int WordId { get; set; }
        public string Term { get; set; } = string.Empty;
        public int Status { get; set; }
        public string? Translation { get; set; }
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
        [StringLength(100)]
        public string? Tag { get; set; } // Add Tag property
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
        [StringLength(100)]
        public string? Tag { get; set; } // Add Tag property
    }

    public class UpdateTextDto
    {
        [Required]
        public int TextId { get; set; }
        [Required]
        [StringLength(200)]
        public string Title { get; set; } = string.Empty;
        [Required]
        public string Content { get; set; } = string.Empty;
        public int? LanguageId { get; set; } // Allow updating language
        [StringLength(100)]
        public string? Tag { get; set; } // Allow updating tag
    }

    // DTO for the new recent texts endpoint
    public class RecentTextDto
    {
        public int TextId { get; set; }
        public string Title { get; set; } = string.Empty;
        public string LanguageName { get; set; } = string.Empty;
        public DateTime LastAccessedAt { get; set; }
        public bool IsAudioLesson { get; set; }
        public int? BookId { get; set; }
        public string? BookTitle { get; set; }
        public int? PartNumber { get; set; } // Include PartNumber for book context
    }

    public class CreateAudioLessonsBatchDto
    {
        [Required]
        public int LanguageId { get; set; }

        [StringLength(100)]
        public string? Tag { get; set; } // Optional tag for the whole batch
    }
}