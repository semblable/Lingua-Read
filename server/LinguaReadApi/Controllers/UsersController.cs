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
using Microsoft.Extensions.Logging;

namespace LinguaReadApi.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class UsersController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly ILogger<UsersController> _logger;

        public UsersController(AppDbContext context, ILogger<UsersController> logger)
        {
            _context = context;
            _logger = logger;
        }

        // GET: api/users/statistics
        [HttpGet("statistics")]
        public async Task<ActionResult<UserStatisticsDto>> GetUserStatistics()
        {
            var userId = GetUserId();
            
            // Get all user's words
            var words = await _context.Words
                .Where(w => w.UserId == userId)
                .ToListAsync();
                
            // Get user's books
            var books = await _context.Books
                .Where(b => b.UserId == userId)
                .Include(b => b.Language)
                .ToListAsync();
                
            // Get word counts by status and language
            var wordsByStatus = words
                .GroupBy(w => w.Status)
                .ToDictionary(g => g.Key, g => g.Count());
                
            var wordsByLanguage = words
                .GroupBy(w => w.LanguageId)
                .ToDictionary(g => g.Key, g => g.Count());
                
            // Create language statistics
            var languages = await _context.Languages
                .Where(l => wordsByLanguage.Keys.Contains(l.LanguageId))
                .ToListAsync();
                
            var languageStats = languages.Select(l => new LanguageStatisticsDto
            {
                LanguageId = l.LanguageId,
                LanguageName = l.Name,
                WordCount = wordsByLanguage.ContainsKey(l.LanguageId) ? wordsByLanguage[l.LanguageId] : 0,
                TotalWordsRead = l.WordsRead,
                BookCount = books.Count(b => b.LanguageId == l.LanguageId),
                FinishedBookCount = books.Count(b => b.LanguageId == l.LanguageId && b.IsFinished)
            }).ToList();
                
            // Calculate total statistics
            var statistics = new UserStatisticsDto
            {
                TotalWords = words.Count,
                KnownWords = wordsByStatus.ContainsKey(5) ? wordsByStatus[5] : 0,
                LearningWords = words.Count - (wordsByStatus.ContainsKey(5) ? wordsByStatus[5] : 0),
                TotalBooks = books.Count,
                FinishedBooks = books.Count(b => b.IsFinished),
                LastActivity = DateTime.UtcNow, // Default to current time to avoid Invalid Date
                TotalLanguages = languageStats.Count,
                LanguageStatistics = languageStats
            };
            
            // Set LastActivity safely
            if (books.Any(b => b.LastReadAt.HasValue))
            {
                // Provide a default value for Max in case the filtered list is empty (though Any check prevents this)
                // or to satisfy the compiler about nullability.
                var maxDate = books.Where(b => b.LastReadAt.HasValue)
                                  .Max(b => b.LastReadAt ?? DateTime.MinValue);
                // Ensure we don't assign MinValue if no valid dates were found
                if (maxDate != DateTime.MinValue)
                {
                    statistics.LastActivity = maxDate;
                }
            }

            return statistics;
        }

        [HttpGet("reading-activity")] // Corrected route to match frontend api.js
        public async Task<IActionResult> GetReadingActivity([FromQuery] string period = "all")
        {
            _logger.LogInformation("Getting reading activity for period: {Period}", period);
            var userId = GetUserId();

            try
            {
                DateTime startDate;
                var now = DateTime.UtcNow;

                switch (period.ToLower())
                {
                    case "last_day":
                        startDate = now.Date; // Start of today
                        break;
                    case "last_week":
                        startDate = now.Date.AddDays(-6); // Start of the week (last 7 days including today)
                        break;
                    case "last_month":
                        startDate = now.Date.AddDays(-29); // Start of the month (last 30 days including today)
                        break;
                    case "last_90":
                        startDate = now.Date.AddDays(-89); // Last 90 days including today
                        break;
                    case "last_180":
                        startDate = now.Date.AddDays(-179); // Last 180 days including today
                        break;
                    case "all":
                    default:
                        startDate = DateTime.MinValue; // Get all activities
                        break;
                }

                _logger.LogDebug("Fetching activities from {StartDate} for user {UserId}", startDate, userId);

                var activities = await _context.UserActivities
                    .Where(a => a.UserId == userId && a.Timestamp >= startDate)
                    .Include(a => a.Language) // Include Language for grouping
                    .OrderBy(a => a.Timestamp)
                    .ToListAsync();

                _logger.LogInformation("Found {ActivityCount} activities for the period.", activities.Count);

                // Aggregate by date
                var activityByDate = activities
                    .GroupBy(a => a.Timestamp.Date)
                    .ToDictionary(
                        g => g.Key.ToString("yyyy-MM-dd"),
                        g => g.Sum(a => a.WordCount)
                    );

                // Aggregate by language
                var activityByLanguage = activities
                    .Where(a => a.Language != null) // Ensure language is loaded
                    .GroupBy(a => a.Language!.Name) // Group by language name
                    .ToDictionary(
                        g => g.Key,
                        g => g.Sum(a => a.WordCount)
                    );
                    
                // Calculate total words read in the period
                int totalWordsRead = activities.Sum(a => a.WordCount);

                var result = new
                {
                    TotalWordsRead = totalWordsRead,
                    ActivityByDate = activityByDate,
                    ActivityByLanguage = activityByLanguage,
                    Period = period,
                    StartDate = startDate == DateTime.MinValue ? "all" : startDate.ToString("yyyy-MM-dd")
                };

                _logger.LogInformation("Successfully retrieved and aggregated reading activity data.");
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving reading activity data for user {UserId} and period {Period}", userId, period);
                return StatusCode(500, new { message = "Error retrieving reading activity data", error = ex.Message });
            }
        }

        // GET: api/users/listening-activity
        [HttpGet("listening-activity")]
        public async Task<IActionResult> GetListeningActivity([FromQuery] string period = "all")
        {
            _logger.LogInformation("Getting listening activity for period: {Period}", period);
            var userId = GetUserId();

            try
            {
                DateTime startDate;
                var now = DateTime.UtcNow;

                switch (period.ToLower())
                {
                    case "last_day":
                        startDate = now.Date;
                        break;
                    case "last_week":
                        startDate = now.Date.AddDays(-6);
                        break;
                    case "last_month":
                        startDate = now.Date.AddDays(-29);
                        break;
                    case "last_90":
                        startDate = now.Date.AddDays(-89); // Last 90 days including today
                        break;
                    case "last_180":
                        startDate = now.Date.AddDays(-179); // Last 180 days including today
                        break;
                    case "all":
                    default:
                        startDate = DateTime.MinValue;
                        break;
                }

                _logger.LogDebug("Fetching listening activities from {StartDate} for user {UserId}", startDate, userId);

                var activities = await _context.UserActivities
                    .Where(a => a.UserId == userId
                                && a.ActivityType == "Listening"
                                && a.ListeningDurationSeconds.HasValue // Ensure we only count listening activities with duration
                                && a.Timestamp >= startDate)
                    .Include(a => a.Language) // Include Language for grouping by name
                    .OrderBy(a => a.Timestamp)
                    .ToListAsync();

                _logger.LogInformation("Found {ActivityCount} listening activities for the period.", activities.Count);

                // Aggregate by date
                var activityByDate = activities
                    .GroupBy(a => a.Timestamp.Date)
                    .Select(g => new {
                        Date = g.Key.ToString("yyyy-MM-dd"),
                        TotalSeconds = g.Sum(a => a.ListeningDurationSeconds ?? 0) // Sum duration
                    })
                    .ToDictionary(g => g.Date, g => g.TotalSeconds);

                // Aggregate by language
                var activityByLanguage = activities
                    .Where(a => a.Language != null) // Ensure language is loaded
                    .GroupBy(a => new { a.LanguageId, a.Language!.Name }) // Group by language ID and name
                    .Select(g => new {
                        LanguageId = g.Key.LanguageId,
                        LanguageName = g.Key.Name,
                        TotalSeconds = g.Sum(a => a.ListeningDurationSeconds ?? 0) // Sum duration
                    })
                    .ToList(); // Keep as a list as requested in the plan

                // Calculate total listening time in the period
                long totalListeningSeconds = activities.Sum(a => a.ListeningDurationSeconds ?? 0);

                var result = new
                {
                    TotalListeningSeconds = totalListeningSeconds,
                    ListeningByDate = activityByDate, // Renamed for clarity
                    ListeningByLanguage = activityByLanguage, // Renamed for clarity
                    Period = period,
                    StartDate = startDate == DateTime.MinValue ? "all" : startDate.ToString("yyyy-MM-dd")
                };

                _logger.LogInformation("Successfully retrieved and aggregated listening activity data.");
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving listening activity data for user {UserId} and period {Period}", userId, period);
                return StatusCode(500, new { message = "Error retrieving listening activity data", error = ex.Message });
            }
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

    public class UserStatisticsDto
    {
        public int TotalWords { get; set; }
        public int KnownWords { get; set; }
        public int LearningWords { get; set; }
        public int TotalBooks { get; set; }
        public int FinishedBooks { get; set; }
        public DateTime LastActivity { get; set; }
        public int TotalLanguages { get; set; }
        public List<LanguageStatisticsDto> LanguageStatistics { get; set; } = new List<LanguageStatisticsDto>();
    }

    public class LanguageStatisticsDto
    {
        public int LanguageId { get; set; }
        public string LanguageName { get; set; } = string.Empty;
        public int WordCount { get; set; }
        public int TotalWordsRead { get; set; }
        public int BookCount { get; set; }
        public int FinishedBookCount { get; set; }
    }
} 