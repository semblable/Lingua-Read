using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace LinguaReadApi.Models
{
    public class WordTranslation
    {
        [Key]
        [ForeignKey("Word")]
        public int WordId { get; set; }
        
        [Required]
        public string Translation { get; set; } = string.Empty;
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAt { get; set; }
        
        // Navigation property
        public virtual Word Word { get; set; } = null!;
    }
} 