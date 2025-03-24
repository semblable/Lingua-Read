using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace LinguaReadApi.Models
{
    public class User
    {
        [Key]
        public Guid UserId { get; set; }
        
        [Required]
        [StringLength(100)]
        public string Username { get; set; } = string.Empty;
        
        [Required]
        [StringLength(100)]
        public string Email { get; set; } = string.Empty;
        
        [Required]
        public string PasswordHash { get; set; } = string.Empty;
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? LastLogin { get; set; }
        
        // Navigation properties
        public virtual ICollection<Text> Texts { get; set; } = new List<Text>();
        public virtual ICollection<Word> Words { get; set; } = new List<Word>();
        public virtual ICollection<Book> Books { get; set; } = new List<Book>();
        public virtual UserSettings Settings { get; set; } = null!;
    }
} 