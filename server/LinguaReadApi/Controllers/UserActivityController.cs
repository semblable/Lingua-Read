using LinguaReadApi.Data;
using LinguaReadApi.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging; // Add logger namespace

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
                _logger.LogInformation("Successfully saved listening activity for UserId: {UserId}, ActivityId: {ActivityId}", userId, activity.ActivityId);
                return Ok(new { message = "Listening activity logged successfully.", activityId = activity.ActivityId }); // Indicate success
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error saving listening activity for UserId: {UserId}", userId);
                return StatusCode(500, "An error occurred while saving the activity.");
            }
        }

        // --- Endpoint for fetching statistics will be added later ---
    }
}