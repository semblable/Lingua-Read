using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace LinguaReadApi.Models
{
    public class Language
    {
        [Key]
        public int LanguageId { get; set; }
        
        [Required]
        [StringLength(50)]
        public string Name { get; set; } = string.Empty;
        
        [Required]
        [StringLength(10)]
        public string Code { get; set; } = string.Empty;
        
        // Statistics tracking
        public int WordsRead { get; set; } = 0;
        
        // Navigation properties
        public virtual ICollection<Book> Books { get; set; } = new List<Book>();
        public virtual ICollection<Text> Texts { get; set; } = new List<Text>();
        public virtual ICollection<Word> Words { get; set; } = new List<Word>();
    }
} 