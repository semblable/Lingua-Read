using System.ComponentModel.DataAnnotations.Schema;

namespace LinguaReadApi.Models
{
    // Join entity for the many-to-many relationship between Book and Tag
    public class BookTag
    {
        // Foreign key for Book
        public int BookId { get; set; }
        [ForeignKey("BookId")]
        public virtual Book Book { get; set; } = null!;

        // Foreign key for Tag
        public int TagId { get; set; }
        [ForeignKey("TagId")]
        public virtual Tag Tag { get; set; } = null!;
    }
}