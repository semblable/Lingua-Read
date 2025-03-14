using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace LinguaReadApi.Models
{
    public class Word
    {
        [Key]
        public int WordId { get; set; }
        
        [Required]
        [StringLength(100)]
        public string Term { get; set; } = string.Empty;
        
        [Required]
        [Range(1, 5)]
        public int Status { get; set; } = 1; // 1: New/Learning, 5: Mastered
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        
        [ForeignKey("Language")]
        public int LanguageId { get; set; }
        
        [ForeignKey("User")]
        public Guid UserId { get; set; }
        
        // Navigation properties
        public virtual Language Language { get; set; } = null!;
        public virtual User User { get; set; } = null!;
        public virtual WordTranslation Translation { get; set; } = null!;
        public virtual ICollection<TextWord> TextWords { get; set; } = new List<TextWord>();
    }

    public class TextWord
    {
        [Key]
        public int TextWordId { get; set; }
        
        [ForeignKey("Text")]
        public int TextId { get; set; }
        
        [ForeignKey("Word")]
        public int WordId { get; set; }
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        
        // Navigation properties
        public virtual Text Text { get; set; } = null!;
        public virtual Word Word { get; set; } = null!;
    }
} 