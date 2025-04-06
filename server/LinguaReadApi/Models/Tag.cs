using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace LinguaReadApi.Models
{
    public class Tag
    {
        [Key]
        public int TagId { get; set; }

        [Required]
        [StringLength(50)] // Limit tag length
        public string Name { get; set; } = string.Empty;

        // Navigation property for the many-to-many relationship
        public virtual ICollection<BookTag> BookTags { get; set; } = new List<BookTag>();
    }
}