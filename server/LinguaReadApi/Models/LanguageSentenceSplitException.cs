using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace LinguaReadApi.Models
{
    public class LanguageSentenceSplitException
    {
        [Key]
        public int ExceptionId { get; set; }

        [Required]
        public int LanguageId { get; set; } // Foreign Key

        [Required]
        [StringLength(50)] // The string that should NOT cause a sentence split (e.g., "Sr.", "Dr.")
        public string ExceptionString { get; set; } = string.Empty;

        // Navigation property
        [ForeignKey("LanguageId")]
        [System.Text.Json.Serialization.JsonIgnore]
        public virtual Language? Language { get; set; }
    }
}