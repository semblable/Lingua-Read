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
        [StringLength(10)] // e.g., "en", "fr-CA"
        public string Code { get; set; } = string.Empty;

        // Statistics tracking
        public int WordsRead { get; set; } = 0;

        // --- New Configuration Properties ---

        [Required]
        public bool ShowRomanization { get; set; } = false;

        [Required]
        public bool RightToLeft { get; set; } = false;

        [Required]
        [StringLength(50)] // e.g., "spacedel", "mecab", "jieba"
        public string ParserType { get; set; } = "spacedel"; // Default to space delimited

        [StringLength(500)] // Store as pipe-separated key=value pairs, e.g., "´='|`='|’='|‘='|...=…"
        public string? CharacterSubstitutions { get; set; } // Nullable if no substitutions needed

        [Required]
        [StringLength(50)] // Characters that split sentences, e.g., ".!?"
        public string SplitSentences { get; set; } = ".!?";

        [Required]
        [StringLength(200)] // Regex character class, e.g., "a-zA-ZÀ-Üà-ü'"
        public string WordCharacters { get; set; } = "a-zA-Z"; // Basic default

        [Required]
        public bool IsActiveForTranslation { get; set; } = false; // Default to false

        /// <summary>
        /// Optional override target language code for DeepL translations when this language is the source.
        /// </summary>
        [StringLength(20)]
        public string? DeepLTargetCode { get; set; }

        /// <summary>
        /// Optional override target language code for Gemini translations when this language is the source.
        /// </summary>
        [StringLength(20)]
        public string? GeminiTargetCode { get; set; }

        // --- Navigation properties ---

        // Existing
        public virtual ICollection<Book> Books { get; set; } = new List<Book>();
        public virtual ICollection<Text> Texts { get; set; } = new List<Text>();
        public virtual ICollection<Word> Words { get; set; } = new List<Word>();

        // New
        public virtual ICollection<LanguageDictionary> Dictionaries { get; set; } = new List<LanguageDictionary>();
        public virtual ICollection<LanguageSentenceSplitException> SentenceSplitExceptions { get; set; } = new List<LanguageSentenceSplitException>();
    }
}