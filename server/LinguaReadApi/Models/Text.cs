using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace LinguaReadApi.Models
{
    public class Text
    {
        [Key]
        public int TextId { get; set; }
        
        [Required]
        [StringLength(200)]
        public string Title { get; set; } = string.Empty;
        
        [Required]
        public string Content { get; set; } = string.Empty;
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        
        // Position within a book (if part of a book)
        public int? PartNumber { get; set; }
        
        // Foreign keys
        [ForeignKey("User")]
        public Guid UserId { get; set; }
        
        [ForeignKey("Language")]
        public int LanguageId { get; set; }
        
        // Optional Book relationship
        [ForeignKey("Book")]
        public int? BookId { get; set; }
        
        // Navigation properties
        public virtual User User { get; set; } = null!;
        public virtual Language Language { get; set; } = null!;
        public virtual Book Book { get; set; } = null!;
        public virtual ICollection<TextWord> TextWords { get; set; } = new List<TextWord>();
    }
} 