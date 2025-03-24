using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace LinguaReadApi.Models
{
    public class UserSettings
    {
        [Key]
        [ForeignKey("User")]
        public Guid UserId { get; set; }
        
        // UI Preferences
        public string Theme { get; set; } = "light"; // light, dark, system
        public int TextSize { get; set; } = 16; // font size for reading
        public string TextFont { get; set; } = "default"; // font family for reading
        
        // Reading Preferences
        public bool AutoTranslateWords { get; set; } = true; // automatically translate words on click
        public bool HighlightKnownWords { get; set; } = true; // highlight words based on knowledge level
        public int DefaultLanguageId { get; set; } = 0; // default language for new texts
        
        // Navigation Preferences
        public bool AutoAdvanceToNextLesson { get; set; } = false; // automatically go to next lesson after completion
        public bool ShowProgressStats { get; set; } = true; // show progress statistics
        
        // Creation timestamps
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAt { get; set; }
        
        // Navigation property
        public virtual User User { get; set; } = null!;
    }
} 