using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace LinguaReadApi.Models
{
    public class AudiobookTrack
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public int BookId { get; set; }

        [ForeignKey("BookId")]
        public Book Book { get; set; } = null!; // Navigation property

        [Required]
        public string FilePath { get; set; } = string.Empty;

        [Required]
        public int TrackNumber { get; set; }

        // Optional: Store duration in seconds if easily obtainable during upload
        public double? Duration { get; set; } 
    }
}