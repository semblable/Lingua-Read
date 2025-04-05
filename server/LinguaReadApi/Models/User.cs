using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Identity; // Add Identity using

namespace LinguaReadApi.Models
{
    // Inherit from IdentityUser<Guid>
    public class User : IdentityUser<Guid>
    {
        // Remove properties provided by IdentityUser:
        // Id (replaces UserId, Key is handled by Identity)
        // UserName (replaces Username)
        // Email
        // PasswordHash
        // Other IdentityUser properties like PhoneNumber, EmailConfirmed etc. are also available
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? LastLogin { get; set; }
        
        // Navigation properties
        public virtual ICollection<Text> Texts { get; set; } = new List<Text>();
        public virtual ICollection<Word> Words { get; set; } = new List<Word>();
        public virtual ICollection<Book> Books { get; set; } = new List<Book>();
        public virtual UserSettings Settings { get; set; } = null!;
    }
} 