using LinguaReadApi.Data;
using LinguaReadApi.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore; // Added for DbUpdateException
using System;
using System.ComponentModel.DataAnnotations; // Added for [Required] attribute
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using System.Collections.Generic; // For Dictionary, List
using System.Linq; // For LINQ methods like GroupBy, Sum

namespace LinguaReadApi.Controllers
{
    [ApiController]
    [Route("api/activity")]
    [Authorize] // Ensure only logged-in users can log activity
    public class UserActivityController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly UserManager<User> _userManager;
        private readonly ILogger<UserActivityController> _logger; // Add logger field

        public UserActivityController(AppDbContext context, UserManager<User> userManager, ILogger<UserActivityController> logger) // Inject logger
        {
            _context = context;
            _userManager = userManager;
            _logger = logger; // Assign logger
        }

        // DTO for the request body
        public class LogListeningRequest
        {
            public int LanguageId { get; set; }
            public int DurationSeconds { get; set; }
        }
[HttpPost("logListening")]
public async Task<IActionResult> LogListeningActivity([FromBody] LogListeningRequest request)
{
    _logger.LogInformation("Received request to log listening activity. LanguageId: {LanguageId}, DurationSeconds: {DurationSeconds}", request.LanguageId, request.DurationSeconds);

    if (request.DurationSeconds <= 0)
    {
        _logger.LogWarning("Invalid duration received: {DurationSeconds}. Returning BadRequest.", request.DurationSeconds);
        return BadRequest("Duration must be positive.");
    }

    // Get the current user's ID
    var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
    if (string.IsNullOrEmpty(userIdString) || !Guid.TryParse(userIdString, out Guid userId))
    {
         _logger.LogWarning("Could not parse UserId from token for NameIdentifier claim.");
         return Unauthorized("User ID not found in token.");
    }
    _logger.LogInformation("Attempting to log activity for UserId: {UserId}", userId);

    var activity = new UserActivity
    {
        UserId = userId,
        LanguageId = request.LanguageId,
        ActivityType = "Listening", // Specific type for listening
        WordCount = 0, // Not applicable for listening
        ListeningDurationSeconds = request.DurationSeconds,
        Timestamp = DateTime.UtcNow
    };

    try
    {
        _context.UserActivities.Add(activity);
        await _context.SaveChangesAsync();

        // --- Update UserLanguageStatistics cumulative listening time ---
        var stats = await _context.UserLanguageStatistics
            .FirstOrDefaultAsync(uls => uls.UserId == userId && uls.LanguageId == request.LanguageId);

        if (stats == null)
        {
            stats = new UserLanguageStatistics
            {
                UserId = userId,
                LanguageId = request.LanguageId,
                TotalSecondsListened = request.DurationSeconds,
                LastUpdatedAt = DateTime.UtcNow
            };
            _context.UserLanguageStatistics.Add(stats);
        }
        else
        {
            stats.TotalSecondsListened += request.DurationSeconds;
            stats.LastUpdatedAt = DateTime.UtcNow;
        }

        await _context.SaveChangesAsync();
        _logger.LogInformation("Successfully saved listening activity for UserId: {UserId}, ActivityId: {ActivityId}", userId, activity.ActivityId);
        return Ok(new { message = "Listening activity logged successfully.", activityId = activity.ActivityId }); // Indicate success
    }
    catch (DbUpdateException dbEx) // Catch specific DB exceptions first
    {
        _logger.LogError(dbEx, "Database error saving listening activity for UserId: {UserId}. InnerException: {InnerMessage}", userId, dbEx.InnerException?.Message);
        return StatusCode(500, $"A database error occurred while saving the activity: {dbEx.InnerException?.Message ?? dbEx.Message}");
    }
    catch (Exception ex) // Catch general exceptions
    {
        _logger.LogError(ex, "Unexpected error saving listening activity for UserId: {UserId}", userId);
        return StatusCode(500, $"An unexpected error occurred while saving the activity: {ex.Message}");
    }
}

// DTO for manual activity logging
public class LogManualActivityRequest
{
    [Required]
    public int LanguageId { get; set; }
    public int? WordCount { get; set; } // Nullable for listening-only entries
    public int? ListeningDurationSeconds { get; set; } // Nullable for reading-only entries
}

[HttpPost("logManual")]
public async Task<IActionResult> LogManualActivity([FromBody] LogManualActivityRequest request)
{
    _logger.LogInformation("Received request to log manual activity. LanguageId: {LanguageId}, WordCount: {WordCount}, DurationSeconds: {DurationSeconds}",
        request.LanguageId, request.WordCount, request.ListeningDurationSeconds);

    // Basic Validation
    if (request.WordCount == null && request.ListeningDurationSeconds == null)
    {
        _logger.LogWarning("Manual activity log request received with no WordCount or DurationSeconds.");
        return BadRequest("Either WordCount or ListeningDurationSeconds must be provided.");
    }
    if (request.WordCount.HasValue && request.WordCount <= 0)
    {
        _logger.LogWarning("Invalid manual WordCount received: {WordCount}.", request.WordCount);
        return BadRequest("WordCount must be positive if provided.");
    }
    if (request.ListeningDurationSeconds.HasValue && request.ListeningDurationSeconds <= 0)
    {
        _logger.LogWarning("Invalid manual ListeningDurationSeconds received: {DurationSeconds}.", request.ListeningDurationSeconds);
        return BadRequest("ListeningDurationSeconds must be positive if provided.");
    }

    // Check if LanguageId exists (optional but good practice)
    var languageExists = await _context.Languages.AnyAsync(l => l.LanguageId == request.LanguageId);
    if (!languageExists)
    {
        _logger.LogWarning("Attempted to log manual activity for non-existent LanguageId: {LanguageId}.", request.LanguageId);
        return BadRequest($"Language with ID {request.LanguageId} not found.");
    }

    // Get User ID
    var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
    if (!Guid.TryParse(userIdString, out Guid userId))
    {
        _logger.LogWarning("Could not parse UserId from token for manual activity log.");
        return Unauthorized("User ID not found in token.");
    }
    _logger.LogInformation("Attempting to log manual activity for UserId: {UserId}", userId);

    var activitiesToAdd = new List<UserActivity>();
    var now = DateTime.UtcNow;

    // Create Reading Activity if WordCount provided
    if (request.WordCount.HasValue && request.WordCount > 0)
    {
        activitiesToAdd.Add(new UserActivity
        {
            UserId = userId,
            LanguageId = request.LanguageId,
            ActivityType = "ManualReading",
            WordCount = request.WordCount.Value,
            ListeningDurationSeconds = 0,
            Timestamp = now
        });
        _logger.LogInformation("Prepared ManualReading activity for UserId: {UserId}, LanguageId: {LanguageId}, WordCount: {WordCount}", userId, request.LanguageId, request.WordCount.Value);
    }

    // Create Listening Activity if Duration provided
    if (request.ListeningDurationSeconds.HasValue && request.ListeningDurationSeconds > 0)
    {
        activitiesToAdd.Add(new UserActivity
        {
            UserId = userId,
            LanguageId = request.LanguageId,
            ActivityType = "ManualListening",
            WordCount = 0,
            ListeningDurationSeconds = request.ListeningDurationSeconds.Value,
            Timestamp = now
        });
        _logger.LogInformation("Prepared ManualListening activity for UserId: {UserId}, LanguageId: {LanguageId}, Duration: {Duration}", userId, request.LanguageId, request.ListeningDurationSeconds.Value);
    }

    if (!activitiesToAdd.Any())
    {
        // Should have been caught by earlier validation, but good to double-check
        _logger.LogWarning("No valid manual activities to add for UserId: {UserId} despite passing initial validation.", userId);
        return BadRequest("No valid activity data provided.");
    }

    try
    {
        _context.UserActivities.AddRange(activitiesToAdd);
        await _context.SaveChangesAsync();
        // Update UserLanguageStatistics after manual activity save
        try
        {
            var stats = await _context.UserLanguageStatistics
                .FirstOrDefaultAsync(uls => uls.UserId == userId && uls.LanguageId == request.LanguageId);

            if (stats == null)
            {
                stats = new UserLanguageStatistics
                {
                    UserId = userId,
                    LanguageId = request.LanguageId,
                    TotalWordsRead = request.WordCount ?? 0,
                    TotalSecondsListened = request.ListeningDurationSeconds ?? 0,
                    LastUpdatedAt = DateTime.UtcNow
                };
                _context.UserLanguageStatistics.Add(stats);
            }
            else
            {
                if (request.WordCount.HasValue)
                    stats.TotalWordsRead += request.WordCount.Value;
                if (request.ListeningDurationSeconds.HasValue)
                    stats.TotalSecondsListened += request.ListeningDurationSeconds.Value;
                stats.LastUpdatedAt = DateTime.UtcNow;
            }

            await _context.SaveChangesAsync();
            _logger.LogInformation("Updated UserLanguageStatistics for UserId: {UserId}, LanguageId: {LanguageId}", userId, request.LanguageId);
        }
        catch (DbUpdateException dbEx)
        {
            _logger.LogError(dbEx, "Database error updating UserLanguageStatistics for UserId: {UserId}. InnerException: {InnerMessage}", userId, dbEx.InnerException?.Message);
            // Do not fail the request if stats update fails
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error updating UserLanguageStatistics for UserId: {UserId}", userId);
            // Do not fail the request if stats update fails
        }

        _logger.LogInformation("Successfully saved {Count} manual activity record(s) for UserId: {UserId}", activitiesToAdd.Count, userId);
        return Ok(new { message = "Manual activity logged successfully." });
    }
    catch (DbUpdateException dbEx)
    {
        _logger.LogError(dbEx, "Database error saving manual activity for UserId: {UserId}. InnerException: {InnerMessage}", userId, dbEx.InnerException?.Message);
        return StatusCode(500, $"A database error occurred while saving the manual activity: {dbEx.InnerException?.Message ?? dbEx.Message}");
    }
    catch (Exception ex)
    {
        _logger.LogError(ex, "Unexpected error saving manual activity for UserId: {UserId}", userId);
        return StatusCode(500, $"An unexpected error occurred while saving the manual activity: {ex.Message}");
    }
}

// --- DTOs for Statistics Endpoints ---

public class ReadingStatsDto
{
    public int TotalWordsRead { get; set; }
    public Dictionary<string, int> ActivityByDate { get; set; } = new(); // Date (YYYY-MM-DD) -> WordCount
    public List<LanguageReadingStat> ActivityByLanguage { get; set; } = new();
}

public class LanguageReadingStat
{
    public int LanguageId { get; set; }
    public string LanguageName { get; set; } = string.Empty;
    public int TotalWords { get; set; }
}

public class ListeningStatsDto
{
    public int TotalListeningSeconds { get; set; }
    public Dictionary<string, int> ListeningByDate { get; set; } = new(); // Date (YYYY-MM-DD) -> Seconds
    public List<LanguageListeningStat> ListeningByLanguage { get; set; } = new();
}

public class LanguageListeningStat
{
    public int LanguageId { get; set; }
    public string LanguageName { get; set; } = string.Empty;
    public int TotalSeconds { get; set; }
}

// --- Statistics Endpoints ---

[HttpGet("reading")]
public async Task<ActionResult<ReadingStatsDto>> GetReadingStats([FromQuery] string period = "all")
{
    var userId = GetUserId(); // Assuming GetUserId() exists and works
    var startDate = CalculateStartDate(period);

    var readingActivities = await _context.UserActivities
        .Where(ua => ua.UserId == userId &&
                     ua.Timestamp >= startDate &&
                     (ua.ActivityType == "Reading" || ua.ActivityType == "ManualReading" || ua.ActivityType == "TextCompleted")) // Include relevant types
        .Include(ua => ua.Language) // Include Language for name
        .ToListAsync();

    var stats = new ReadingStatsDto();
    stats.TotalWordsRead = readingActivities.Sum(ua => ua.WordCount);

    stats.ActivityByDate = readingActivities
        .GroupBy(ua => ua.Timestamp.Date)
        .ToDictionary(g => g.Key.ToString("yyyy-MM-dd"), g => g.Sum(ua => ua.WordCount));

    stats.ActivityByLanguage = readingActivities
        .GroupBy(ua => ua.Language) // Group by Language entity
        .Select(g => new LanguageReadingStat
        {
            LanguageId = g.Key?.LanguageId ?? 0,
            LanguageName = g.Key?.Name ?? "Unknown",
            TotalWords = g.Sum(ua => ua.WordCount)
        })
        .OrderBy(ls => ls.LanguageName)
        .ToList();

    return Ok(stats);
}

[HttpGet("listening")]
public async Task<ActionResult<ListeningStatsDto>> GetListeningStats([FromQuery] string period = "all")
{
    var userId = GetUserId();
    var startDate = CalculateStartDate(period);

    var listeningActivities = await _context.UserActivities
        .Where(ua => ua.UserId == userId &&
                     ua.Timestamp >= startDate &&
                     (ua.ActivityType == "Listening" || ua.ActivityType == "ManualListening")) // Include relevant types
        .Include(ua => ua.Language) // Include Language for name
        .ToListAsync();

    var stats = new ListeningStatsDto();
    // Fix: Handle potential null values in Sum
    stats.TotalListeningSeconds = listeningActivities.Sum(ua => ua.ListeningDurationSeconds ?? 0);

    stats.ListeningByDate = listeningActivities
        .GroupBy(ua => ua.Timestamp.Date)
        // Fix: Handle potential null values in Sum
        .ToDictionary(g => g.Key.ToString("yyyy-MM-dd"), g => g.Sum(ua => ua.ListeningDurationSeconds ?? 0));

    stats.ListeningByLanguage = listeningActivities
        .GroupBy(ua => ua.Language) // Group by Language entity
        .Select(g => new LanguageListeningStat
        {
            LanguageId = g.Key?.LanguageId ?? 0,
            LanguageName = g.Key?.Name ?? "Unknown",
            // Fix: Handle potential null values in Sum
            TotalSeconds = g.Sum(ua => ua.ListeningDurationSeconds ?? 0)
        })
        .OrderBy(ls => ls.LanguageName)
        .ToList();

    return Ok(stats);
}

private DateTime CalculateStartDate(string period)
{
    var now = DateTime.UtcNow.Date; // Use Date part for comparisons
    return period.ToLowerInvariant() switch
    {
        "week" => now.AddDays(-(int)now.DayOfWeek), // Start of current week (assuming Sunday as start)
        "month" => new DateTime(now.Year, now.Month, 1), // Start of current month
        "year" => new DateTime(now.Year, 1, 1), // Start of current year
        _ => DateTime.MinValue, // "all" or any other value
    };
}

// --- Existing Endpoints Below ---

        // DTO for updating audiobook progress
        public class UpdateAudiobookProgressRequest
        {
            [Required] // BookId is now required to identify the progress record
            public int BookId { get; set; }
            public int? CurrentAudiobookTrackId { get; set; }
            public double? CurrentAudiobookPosition { get; set; }
        }

        [HttpPut("audiobookprogress")]
        public async Task<IActionResult> UpdateAudiobookProgress([FromBody] UpdateAudiobookProgressRequest request)
        {
            // Enhanced Logging
            _logger.LogInformation("---- BEGIN UpdateAudiobookProgress ----");
            _logger.LogInformation("Received request body: BookId={BookId}, TrackId={TrackId}, Position={Position}", request?.BookId, request?.CurrentAudiobookTrackId, request?.CurrentAudiobookPosition);

            if (request == null)
            {
                 _logger.LogWarning("Request body is null.");
                 return BadRequest("Request body cannot be null.");
            }
             if (request.CurrentAudiobookTrackId == null)
             {
                 _logger.LogWarning("CurrentAudiobookTrackId is null in the request.");
                 // Decide if this is acceptable or should be a BadRequest
             }
             if (request.CurrentAudiobookPosition == null)
             {
                 _logger.LogWarning("CurrentAudiobookPosition is null in the request.");
                 // Decide if this is acceptable or should be a BadRequest
             }


            var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
             _logger.LogInformation("Attempting to parse UserId from token claim: {UserIdString}", userIdString);
            if (!Guid.TryParse(userIdString, out Guid userId))
            {
                _logger.LogWarning("Failed to parse UserId from token claim '{UserIdString}'.", userIdString);
                 _logger.LogInformation("---- END UpdateAudiobookProgress (Unauthorized) ----");
                return Unauthorized("User ID not found or invalid in token.");
            }
            _logger.LogInformation("Successfully parsed UserId: {UserId}", userId);
            _logger.LogInformation("Attempting to find UserBookProgress for UserId: {UserId}, BookId: {BookId}", userId, request.BookId);

            try
            {
                // Find the most recent activity record for the user. This is flawed.
                // var latestActivity = await _context.UserActivities
                //     .Where(ua => ua.UserId == userId)
                //     .OrderByDescending(ua => ua.Timestamp)
                //     .FirstOrDefaultAsync();

                // --- Use UserBookProgress table ---
                var progressRecord = await _context.UserBookProgresses.FindAsync(userId, request.BookId);

                if (progressRecord == null)
                {
                    _logger.LogInformation("UserBookProgress record not found for UserId: {UserId}, BookId: {BookId}. Creating new record.", userId, request.BookId);
                    progressRecord = new UserBookProgress
                    {
                        UserId = userId,
                        BookId = request.BookId,
                        CurrentAudiobookTrackId = request.CurrentAudiobookTrackId,
                        CurrentAudiobookPosition = request.CurrentAudiobookPosition,
                        UpdatedAt = DateTime.UtcNow
                    };
                    _context.UserBookProgresses.Add(progressRecord);
                    _logger.LogInformation("Added new UserBookProgress to context for UserId: {UserId}, BookId: {BookId}", userId, request.BookId);
                }
                else
                {
                    _logger.LogInformation("Found existing UserBookProgress for UserId: {UserId}, BookId: {BookId}. Updating.", userId, request.BookId);
                    _logger.LogInformation("Updating UserBookProgress: Old TrackId={OldTrackId}, Old Position={OldPosition}", progressRecord.CurrentAudiobookTrackId, progressRecord.CurrentAudiobookPosition);
                    progressRecord.CurrentAudiobookTrackId = request.CurrentAudiobookTrackId;
                    // Only update position if a valid position is provided in the request
                    if (request.CurrentAudiobookPosition.HasValue)
                    {
                         progressRecord.CurrentAudiobookPosition = request.CurrentAudiobookPosition;
                    }
                    // Always update the timestamp
                    progressRecord.UpdatedAt = DateTime.UtcNow;
                    _logger.LogInformation("Updating UserBookProgress: New TrackId={NewTrackId}, New Position={NewPosition}", progressRecord.CurrentAudiobookTrackId, progressRecord.CurrentAudiobookPosition);
                    // EF Core tracks changes on the found entity, no need for explicit Update call
                }

                _logger.LogInformation("Calling SaveChangesAsync...");
                await _context.SaveChangesAsync();
                _logger.LogInformation("SaveChangesAsync completed successfully for UserId: {UserId}, BookId: {BookId}", userId, request.BookId);
                 _logger.LogInformation("---- END UpdateAudiobookProgress (Success) ----");
                return Ok(new { message = "Audiobook progress updated successfully." });

            }
            catch (DbUpdateException dbEx) // Catch specific DB exceptions
            {
                 _logger.LogError(dbEx, "Database error updating audiobook progress for UserId: {UserId}, BookId: {BookId}. InnerException: {InnerMessage}", userId, request.BookId, dbEx.InnerException?.Message);
                 _logger.LogInformation("---- END UpdateAudiobookProgress (DB Error) ----");
                 return StatusCode(500, $"A database error occurred while updating progress: {dbEx.Message}");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error updating audiobook progress for UserId: {UserId}, BookId: {BookId}", userId, request.BookId);
                 _logger.LogInformation("---- END UpdateAudiobookProgress (Error) ----");
                return StatusCode(500, $"An unexpected error occurred while updating progress: {ex.Message}");
            }
        }

        // --- Endpoint for GETTING audiobook progress ---

        // GET endpoint now requires bookId
        [HttpGet("audiobookprogress/{bookId}")]
        public async Task<IActionResult> GetAudiobookProgress(int bookId)
        {
            _logger.LogInformation("Received request to get audiobook progress for BookId: {BookId}", bookId);

            var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!Guid.TryParse(userIdString, out Guid userId))
            {
                _logger.LogWarning("Could not parse UserId from token for getting audiobook progress for BookId: {BookId}.", bookId);
                return Unauthorized("User ID not found in token.");
            }
            _logger.LogInformation("Attempting to get progress for UserId: {UserId}, BookId: {BookId}", userId, bookId);

            try
            {
                var progressRecord = await _context.UserBookProgresses.FindAsync(userId, bookId);

                if (progressRecord == null)
                {
                    _logger.LogInformation("UserBookProgress record not found for UserId: {UserId}, BookId: {BookId}. Returning default progress.", userId, bookId);
                    // Return default/empty progress if no record found
                    return Ok(new { currentAudiobookTrackId = (int?)null, currentAudiobookPosition = (double?)null });
                }

                _logger.LogInformation("Successfully retrieved audiobook progress from UserBookProgress for UserId: {UserId}, BookId: {BookId}. TrackId: {TrackId}, Position: {Position}", userId, bookId, progressRecord.CurrentAudiobookTrackId, progressRecord.CurrentAudiobookPosition);
                return Ok(new
                {
                    currentAudiobookTrackId = progressRecord.CurrentAudiobookTrackId,
                    currentAudiobookPosition = progressRecord.CurrentAudiobookPosition
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving audiobook progress for UserId: {UserId}, BookId: {BookId}", userId, bookId);
                return StatusCode(500, "An error occurred while retrieving audiobook progress.");
            }
        }

        // --- Endpoints for Audio Lesson Progress ---

        // DTO for updating audio lesson progress
        public class UpdateAudioLessonProgressRequest
        {
            [Required]
            public int TextId { get; set; } // ID of the Text entity representing the lesson
            public double? CurrentPosition { get; set; } // Nullable position
        }

        [HttpPut("audiolessonprogress")]
        public async Task<IActionResult> UpdateAudioLessonProgress([FromBody] UpdateAudioLessonProgressRequest request)
        {
            _logger.LogInformation("---- BEGIN UpdateAudioLessonProgress ----");
            _logger.LogInformation("Received request body: TextId={TextId}, Position={Position}", request?.TextId, request?.CurrentPosition);

            if (request == null)
            {
                _logger.LogWarning("Request body is null.");
                return BadRequest("Request body cannot be null.");
            }

            var userId = GetUserId(); // Use helper method
            if (userId == Guid.Empty)
            {
                _logger.LogWarning("Failed to get UserId from token claim for UpdateAudioLessonProgress.");
                return Unauthorized("User ID not found or invalid in token.");
            }
            _logger.LogInformation("Attempting to find/update UserAudioLessonProgress for UserId: {UserId}, TextId: {TextId}", userId, request.TextId);

            try
            {
                var progressRecord = await _context.UserAudioLessonProgresses.FindAsync(userId, request.TextId);

                if (progressRecord == null)
                {
                    _logger.LogInformation("UserAudioLessonProgress record not found for UserId: {UserId}, TextId: {TextId}. Creating new record.", userId, request.TextId);
                    progressRecord = new UserAudioLessonProgress
                    {
                        UserId = userId,
                        TextId = request.TextId,
                        CurrentPosition = request.CurrentPosition, // Can be null
                        UpdatedAt = DateTime.UtcNow
                    };
                    _context.UserAudioLessonProgresses.Add(progressRecord);
                    _logger.LogInformation("Added new UserAudioLessonProgress to context for UserId: {UserId}, TextId: {TextId}", userId, request.TextId);
                }
                else
                {
                    _logger.LogInformation("Found existing UserAudioLessonProgress for UserId: {UserId}, TextId: {TextId}. Updating.", userId, request.TextId);
                    _logger.LogInformation("Updating UserAudioLessonProgress: Old Position={OldPosition}", progressRecord.CurrentPosition);
                    progressRecord.CurrentPosition = request.CurrentPosition; // Update position (can be null)
                    progressRecord.UpdatedAt = DateTime.UtcNow;
                    _logger.LogInformation("Updating UserAudioLessonProgress: New Position={NewPosition}", progressRecord.CurrentPosition);
                }

                await _context.SaveChangesAsync();
                _logger.LogInformation("SaveChangesAsync completed successfully for UserAudioLessonProgress for UserId: {UserId}, TextId: {TextId}", userId, request.TextId);
                _logger.LogInformation("---- END UpdateAudioLessonProgress (Success) ----");
                return Ok(new { message = "Audio lesson progress updated successfully." });
            }
            catch (DbUpdateException dbEx)
            {
                _logger.LogError(dbEx, "Database error updating audio lesson progress for UserId: {UserId}, TextId: {TextId}. InnerException: {InnerMessage}", userId, request.TextId, dbEx.InnerException?.Message);
                _logger.LogInformation("---- END UpdateAudioLessonProgress (DB Error) ----");
                return StatusCode(500, $"A database error occurred while updating progress: {dbEx.Message}");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error updating audio lesson progress for UserId: {UserId}, TextId: {TextId}", userId, request.TextId);
                _logger.LogInformation("---- END UpdateAudioLessonProgress (Error) ----");
                return StatusCode(500, $"An unexpected error occurred while updating progress: {ex.Message}");
            }
        }

        [HttpGet("audiolessonprogress/{textId}")]
        public async Task<IActionResult> GetAudioLessonProgress(int textId)
        {
            _logger.LogInformation("Received request to get audio lesson progress for TextId: {TextId}", textId);

            var userId = GetUserId();
            if (userId == Guid.Empty)
            {
                _logger.LogWarning("Could not parse UserId from token for getting audio lesson progress for TextId: {TextId}.", textId);
                return Unauthorized("User ID not found in token.");
            }
            _logger.LogInformation("Attempting to get audio lesson progress for UserId: {UserId}, TextId: {TextId}", userId, textId);

            try
            {
                var progressRecord = await _context.UserAudioLessonProgresses.FindAsync(userId, textId);

                if (progressRecord == null)
                {
                    _logger.LogInformation("UserAudioLessonProgress record not found for UserId: {UserId}, TextId: {TextId}. Returning default progress.", userId, textId);
                    return Ok(new { currentPosition = (double?)null }); // Return null if no record found
                }

                _logger.LogInformation("Successfully retrieved audio lesson progress from UserAudioLessonProgress for UserId: {UserId}, TextId: {TextId}. Position: {Position}", userId, textId, progressRecord.CurrentPosition);
                return Ok(new
                {
                    currentPosition = progressRecord.CurrentPosition
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving audio lesson progress for UserId: {UserId}, TextId: {TextId}", userId, textId);
                return StatusCode(500, "An error occurred while retrieving audio lesson progress.");
            }
        }

        // --- Helper Methods ---

        private Guid GetUserId()
        {
            var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (Guid.TryParse(userIdString, out Guid userId))
            {
                return userId;
            }
            _logger.LogWarning("GetUserId: Failed to parse UserId from token claim '{UserIdString}'. Returning Guid.Empty.", userIdString);
            return Guid.Empty; // Return empty Guid if parsing fails
        }
    }
}