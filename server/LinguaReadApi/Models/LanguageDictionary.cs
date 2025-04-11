using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace LinguaReadApi.Models
{
    public class LanguageDictionary
    {
        [Key]
        public int DictionaryId { get; set; }

        [Required]
        public int LanguageId { get; set; } // Foreign Key

        [Required]
        [StringLength(50)] // e.g., "terms", "sentences"
        public string Purpose { get; set; } = "terms";

        [Required]
        [StringLength(50)] // e.g., "embedded", "popup"
        public string DisplayType { get; set; } = "popup";

        [Required]
        [StringLength(500)] // URL template with [LUTE] placeholder
        public string UrlTemplate { get; set; } = string.Empty;

        [Required]
        public bool IsActive { get; set; } = true;

        [Required]
        public int SortOrder { get; set; } = 0; // For UI ordering

        // Navigation property
        [ForeignKey("LanguageId")]
        [System.Text.Json.Serialization.JsonIgnore]
        public virtual Language? Language { get; set; }
    }
}