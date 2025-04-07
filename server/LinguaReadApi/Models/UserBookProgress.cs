using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace LinguaReadApi.Models
{
    // Composite primary key defined in AppDbContext using Fluent API
    public class UserBookProgress
    {
        [Required]
        public Guid UserId { get; set; } // Part of composite PK

        [Required]
        public int BookId { get; set; } // Part of composite PK

        public int? CurrentAudiobookTrackId { get; set; } // FK to AudiobookTrack

        public double? CurrentAudiobookPosition { get; set; } // Position in seconds

        public DateTime UpdatedAt { get; set; }

        // Navigation properties (optional but good practice)
        [ForeignKey("UserId")]
        public virtual User? User { get; set; }

        [ForeignKey("BookId")]
        public virtual Book? Book { get; set; }

        [ForeignKey("CurrentAudiobookTrackId")]
        public virtual AudiobookTrack? CurrentAudiobookTrack { get; set; }
    }
}