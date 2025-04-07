using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using System;
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
    public class UserSettingsController : ControllerBase
    {
        private readonly AppDbContext _context;

        public UserSettingsController(AppDbContext context)
        {
            _context = context;
        }

        // GET: api/usersettings
        [HttpGet]
        public async Task<ActionResult<UserSettingsDto>> GetUserSettings()
        {
            var userId = GetUserId();
            
            var settings = await _context.UserSettings
                .FirstOrDefaultAsync(s => s.UserId == userId);
                
            if (settings == null)
            {
                // Create default settings if they don't exist
                settings = new UserSettings
                {
                    UserId = userId,
                    Theme = "light",
                    TextSize = 16,
                    TextFont = "default",
                    AutoTranslateWords = true,
                    HighlightKnownWords = true,
                    DefaultLanguageId = 0,
                    AutoAdvanceToNextLesson = false,
                    ShowProgressStats = true,
                    CreatedAt = DateTime.UtcNow
                };
                
                _context.UserSettings.Add(settings);
                await _context.SaveChangesAsync();
            }
            
            return new UserSettingsDto
            {
                Theme = settings.Theme,
                TextSize = settings.TextSize,
                TextFont = settings.TextFont,
                AutoTranslateWords = settings.AutoTranslateWords,
                HighlightKnownWords = settings.HighlightKnownWords,
                DefaultLanguageId = settings.DefaultLanguageId,
                AutoAdvanceToNextLesson = settings.AutoAdvanceToNextLesson,
                ShowProgressStats = settings.ShowProgressStats,
                CurrentAudiobookTrackId = settings.CurrentAudiobookTrackId, // Added
                CurrentAudiobookPosition = settings.CurrentAudiobookPosition // Added
            };
        }

        // PUT: api/usersettings
        [HttpPut]
        public async Task<ActionResult<UserSettingsDto>> UpdateUserSettings([FromBody] UpdateUserSettingsDto updateDto)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }
            
            var userId = GetUserId();
            
            var settings = await _context.UserSettings
                .FirstOrDefaultAsync(s => s.UserId == userId);
                
            if (settings == null)
            {
                // Create settings if they don't exist
                settings = new UserSettings
                {
                    UserId = userId,
                    CreatedAt = DateTime.UtcNow
                };
                _context.UserSettings.Add(settings);
            }
            
            // Update settings with provided values
            settings.Theme = updateDto.Theme ?? settings.Theme;
            settings.TextSize = updateDto.TextSize ?? settings.TextSize;
            settings.TextFont = updateDto.TextFont ?? settings.TextFont;
            settings.AutoTranslateWords = updateDto.AutoTranslateWords ?? settings.AutoTranslateWords;
            settings.HighlightKnownWords = updateDto.HighlightKnownWords ?? settings.HighlightKnownWords;
            settings.DefaultLanguageId = updateDto.DefaultLanguageId ?? settings.DefaultLanguageId;
            settings.AutoAdvanceToNextLesson = updateDto.AutoAdvanceToNextLesson ?? settings.AutoAdvanceToNextLesson;
            settings.ShowProgressStats = updateDto.ShowProgressStats ?? settings.ShowProgressStats;
            settings.UpdatedAt = DateTime.UtcNow;
            
            await _context.SaveChangesAsync();
            
            return new UserSettingsDto
            {
                Theme = settings.Theme,
                TextSize = settings.TextSize,
                TextFont = settings.TextFont,
                AutoTranslateWords = settings.AutoTranslateWords,
                HighlightKnownWords = settings.HighlightKnownWords,
                DefaultLanguageId = settings.DefaultLanguageId,
                AutoAdvanceToNextLesson = settings.AutoAdvanceToNextLesson,
                ShowProgressStats = settings.ShowProgressStats
            };
        }

        // PUT: api/usersettings/audiobook-progress
        [HttpPut("audiobook-progress")]
        public async Task<IActionResult> UpdateAudiobookProgress([FromBody] UpdateAudiobookProgressDto updateDto)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var userId = GetUserId();
            var settings = await _context.UserSettings.FirstOrDefaultAsync(s => s.UserId == userId);

            if (settings == null)
            {
                // Optionally create settings if they don't exist, or return NotFound/BadRequest
                 return NotFound("User settings not found.");
                // Or create default:
                // settings = new UserSettings { UserId = userId, CreatedAt = DateTime.UtcNow };
                // _context.UserSettings.Add(settings);
            }

            // Optional: Validate if the trackId exists and belongs to the user
            if (updateDto.CurrentAudiobookTrackId.HasValue)
            {
                 var trackExists = await _context.AudiobookTracks
                     .AnyAsync(at => at.Id == updateDto.CurrentAudiobookTrackId.Value && at.Book.UserId == userId);
                 if (!trackExists)
                 {
                     return BadRequest("Invalid Audiobook Track ID or track does not belong to user.");
                 }
            }
             else // If trackId is null, position should also be null
             {
                 if (updateDto.CurrentAudiobookPosition.HasValue)
                 {
                     return BadRequest("Audiobook position cannot be set without a valid Track ID.");
                 }
             }


            settings.CurrentAudiobookTrackId = updateDto.CurrentAudiobookTrackId;
            settings.CurrentAudiobookPosition = updateDto.CurrentAudiobookPosition;
            settings.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return NoContent(); // Indicate success without returning data
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

    public class UserSettingsDto
    {
        public string Theme { get; set; } = "light";
        public int TextSize { get; set; } = 16;
        public string TextFont { get; set; } = "default";
        public bool AutoTranslateWords { get; set; } = true;
        public bool HighlightKnownWords { get; set; } = true;
        public int DefaultLanguageId { get; set; } = 0;
        public bool AutoAdvanceToNextLesson { get; set; } = false;
        public bool ShowProgressStats { get; set; } = true;
        public int? CurrentAudiobookTrackId { get; set; } // Added
        public double? CurrentAudiobookPosition { get; set; } // Added
    }

    public class UpdateUserSettingsDto
    {
        public string? Theme { get; set; }
        
        [Range(10, 36)]
        public int? TextSize { get; set; }
        
        public string? TextFont { get; set; }
        public bool? AutoTranslateWords { get; set; }
        public bool? HighlightKnownWords { get; set; }
        public int? DefaultLanguageId { get; set; }
        public bool? AutoAdvanceToNextLesson { get; set; }
        public bool? ShowProgressStats { get; set; }
    }

    public class UpdateAudiobookProgressDto
    {
        // Nullable to allow clearing the current track
        public int? CurrentAudiobookTrackId { get; set; }

        // Nullable, should only be non-null if TrackId is non-null
        [Range(0, double.MaxValue)]
        public double? CurrentAudiobookPosition { get; set; } // Position in seconds
    }
} 