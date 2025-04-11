using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace LinguaReadApi.Models
{
    /// <summary>
    /// Tracks the playback progress for a specific user on an audio lesson (represented by a Text entity).
    /// </summary>
    public class UserAudioLessonProgress
    {
        // Composite Primary Key defined in AppDbContext

        [Required]
        [ForeignKey("User")]
        public Guid UserId { get; set; }

        [Required]
        [ForeignKey("Text")]
        public int TextId { get; set; } // Links to the Text entity representing the audio lesson

        public double? CurrentPosition { get; set; } // Nullable to allow resetting or indicating no progress

        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        // Navigation properties
        public virtual User User { get; set; } = null!;
        public virtual Text Text { get; set; } = null!;
    }
}