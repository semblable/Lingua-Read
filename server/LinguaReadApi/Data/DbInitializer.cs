using System;
using System.Linq;
using LinguaReadApi.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace LinguaReadApi.Data
{
    public static class DbInitializer
    {
        public static void Initialize(IServiceProvider serviceProvider)
        {
            using (var context = new AppDbContext(
                serviceProvider.GetRequiredService<DbContextOptions<AppDbContext>>()))
            {
                // Look for any languages
                if (context.Languages.Any())
                {
                    return; // DB has been seeded
                }

                // Seed languages with default configurations
                var languages = new List<Language> // Use List for easier modification later
                {
                    new Language { // English
                        Name = "English", Code = "en",
                        ShowRomanization = false, RightToLeft = false, ParserType = "spacedel",
                        SplitSentences = ".!?", WordCharacters = @"\p{L}\p{M}'-", // Unicode letters, marks, hyphen, apostrophe
                        IsActiveForTranslation = true,
                        CharacterSubstitutions = "’='|‘='|“=\"|”=\"|...=…|--=—", // Common substitutions
                        Dictionaries = new List<LanguageDictionary> {
                            new LanguageDictionary { Purpose = "terms", DisplayType = "popup", UrlTemplate = "https://www.wordreference.com/definition/###", IsActive = true, SortOrder = 0 },
                            new LanguageDictionary { Purpose = "terms", DisplayType = "popup", UrlTemplate = "https://en.wiktionary.org/wiki/###", IsActive = false, SortOrder = 1 }
                        }
                    },
                    new Language { // Spanish
                        Name = "Spanish", Code = "es",
                        ShowRomanization = false, RightToLeft = false, ParserType = "spacedel",
                        SplitSentences = ".!?", WordCharacters = @"\p{L}\p{M}'-", IsActiveForTranslation = true,
                        CharacterSubstitutions = "’='|‘='|“=\"|”=\"|...=…|--=—",
                        Dictionaries = new List<LanguageDictionary> {
                            new LanguageDictionary { Purpose = "terms", DisplayType = "popup", UrlTemplate = "https://www.wordreference.com/es/en/translation.asp?spen=###", IsActive = true, SortOrder = 0 },
                            new LanguageDictionary { Purpose = "terms", DisplayType = "popup", UrlTemplate = "https://es.wiktionary.org/wiki/###", IsActive = false, SortOrder = 1 },
                            new LanguageDictionary { Purpose = "terms", DisplayType = "popup", UrlTemplate = "https://dle.rae.es/###", IsActive = false, SortOrder = 2 } // RAE dictionary
                        },
                        SentenceSplitExceptions = new List<LanguageSentenceSplitException> {
                            new LanguageSentenceSplitException { ExceptionString = "Sr." },
                            new LanguageSentenceSplitException { ExceptionString = "Sra." },
                            new LanguageSentenceSplitException { ExceptionString = "Dr." },
                            new LanguageSentenceSplitException { ExceptionString = "Ud." },
                            new LanguageSentenceSplitException { ExceptionString = "Uds." }
                        }
                    },
                    new Language { // French
                        Name = "French", Code = "fr",
                        ShowRomanization = false, RightToLeft = false, ParserType = "spacedel",
                        SplitSentences = ".!?", WordCharacters = @"\p{L}\p{M}'-", IsActiveForTranslation = true,
                        CharacterSubstitutions = "’='|‘='|“=\"|”=\"|...=…|--=—",
                        Dictionaries = new List<LanguageDictionary> {
                            new LanguageDictionary { Purpose = "terms", DisplayType = "popup", UrlTemplate = "https://www.wordreference.com/enfr/###", IsActive = true, SortOrder = 0 }, // User requested
                            new LanguageDictionary { Purpose = "terms", DisplayType = "popup", UrlTemplate = "https://fr.wiktionary.org/wiki/###", IsActive = false, SortOrder = 1 }
                        },
                        SentenceSplitExceptions = new List<LanguageSentenceSplitException> {
                            new LanguageSentenceSplitException { ExceptionString = "M." },
                            new LanguageSentenceSplitException { ExceptionString = "Mme." },
                            new LanguageSentenceSplitException { ExceptionString = "Mlle." },
                            new LanguageSentenceSplitException { ExceptionString = "Dr." }
                        }
                    },
                    new Language { // German
                        Name = "German", Code = "de",
                        ShowRomanization = false, RightToLeft = false, ParserType = "spacedel",
                        SplitSentences = ".!?", WordCharacters = @"\p{L}\p{M}'-", IsActiveForTranslation = true,
                        CharacterSubstitutions = "’='|‘='|“=\"|”=\"|...=…|--=—",
                         Dictionaries = new List<LanguageDictionary> {
                            new LanguageDictionary { Purpose = "terms", DisplayType = "popup", UrlTemplate = "https://www.wordreference.com/ende/###", IsActive = true, SortOrder = 0 },
                            new LanguageDictionary { Purpose = "terms", DisplayType = "popup", UrlTemplate = "https://de.wiktionary.org/wiki/###", IsActive = false, SortOrder = 1 },
                            new LanguageDictionary { Purpose = "terms", DisplayType = "popup", UrlTemplate = "https://www.duden.de/suchen/dudenonline/###", IsActive = false, SortOrder = 2 }
                        }
                    },
                    new Language { // Italian
                        Name = "Italian", Code = "it",
                        ShowRomanization = false, RightToLeft = false, ParserType = "spacedel",
                        SplitSentences = ".!?", WordCharacters = @"\p{L}\p{M}'-", IsActiveForTranslation = true,
                        CharacterSubstitutions = "’='|‘='|“=\"|”=\"|...=…|--=—",
                         Dictionaries = new List<LanguageDictionary> {
                            new LanguageDictionary { Purpose = "terms", DisplayType = "popup", UrlTemplate = "https://www.wordreference.com/enit/###", IsActive = true, SortOrder = 0 },
                            new LanguageDictionary { Purpose = "terms", DisplayType = "popup", UrlTemplate = "https://it.wiktionary.org/wiki/###", IsActive = false, SortOrder = 1 }
                        }
                    },
                    new Language { // Portuguese
                        Name = "Portuguese", Code = "pt",
                        ShowRomanization = false, RightToLeft = false, ParserType = "spacedel",
                        SplitSentences = ".!?", WordCharacters = @"\p{L}\p{M}'-", IsActiveForTranslation = true,
                        CharacterSubstitutions = "’='|‘='|“=\"|”=\"|...=…|--=—",
                         Dictionaries = new List<LanguageDictionary> {
                            new LanguageDictionary { Purpose = "terms", DisplayType = "popup", UrlTemplate = "https://www.wordreference.com/enpt/###", IsActive = true, SortOrder = 0 },
                            new LanguageDictionary { Purpose = "terms", DisplayType = "popup", UrlTemplate = "https://pt.wiktionary.org/wiki/###", IsActive = false, SortOrder = 1 }
                        }
                    },
                    new Language { // Russian
                        Name = "Russian", Code = "ru",
                        ShowRomanization = true, RightToLeft = false, ParserType = "spacedel",
                        SplitSentences = ".!?", WordCharacters = @"\p{L}\p{M}'-", IsActiveForTranslation = true,
                        CharacterSubstitutions = "’='|‘='|“=\"|”=\"|...=…|--=—",
                         Dictionaries = new List<LanguageDictionary> {
                            new LanguageDictionary { Purpose = "terms", DisplayType = "popup", UrlTemplate = "https://www.wordreference.com/enru/###", IsActive = true, SortOrder = 0 },
                            new LanguageDictionary { Purpose = "terms", DisplayType = "popup", UrlTemplate = "https://ru.wiktionary.org/wiki/###", IsActive = false, SortOrder = 1 }
                        }
                    },
                    new Language { // Japanese
                        Name = "Japanese", Code = "ja",
                        ShowRomanization = true, RightToLeft = false, ParserType = "mecab",
                        SplitSentences = "。！？", WordCharacters = @"\p{IsHiragana}\p{IsKatakana}\p{IsHan}ー々", IsActiveForTranslation = true, // Added iteration mark
                        CharacterSubstitutions = "’='|‘='|“=\"|”=\"|...=…|--=—",
                         Dictionaries = new List<LanguageDictionary> {
                            new LanguageDictionary { Purpose = "terms", DisplayType = "popup", UrlTemplate = "https://jisho.org/search/###", IsActive = true, SortOrder = 0 }
                        }
                    },
                    new Language { // Chinese
                        Name = "Chinese", Code = "zh", // Simplified is default assumption
                        ShowRomanization = true, RightToLeft = false, ParserType = "jieba",
                        SplitSentences = "。！？", WordCharacters = @"\p{IsHan}", IsActiveForTranslation = true,
                        CharacterSubstitutions = "’='|‘='|“=\"|”=\"|...=…|--=—",
                         Dictionaries = new List<LanguageDictionary> {
                            new LanguageDictionary { Purpose = "terms", DisplayType = "popup", UrlTemplate = "https://www.mdbg.net/chinese/dictionary?page=worddict&wdrst=0&wdqb=###", IsActive = true, SortOrder = 0 }
                        }
                    },
                    new Language { // Korean
                        Name = "Korean", Code = "ko",
                        ShowRomanization = true, RightToLeft = false, ParserType = "mecab",
                        SplitSentences = ".!?", WordCharacters = @"\p{IsHangul}", IsActiveForTranslation = false,
                        CharacterSubstitutions = "’='|‘='|“=\"|”=\"|...=…|--=—",
                         Dictionaries = new List<LanguageDictionary> {
                            new LanguageDictionary { Purpose = "terms", DisplayType = "popup", UrlTemplate = "https://krdict.korean.go.kr/eng/dicSearch/search?nation=eng&nationCode=6&ParaWordNo=&mainSearchWord=###", IsActive = true, SortOrder = 0 }
                        }
                    }
                };

                // AddRange will also add the related entities (Dictionaries, SentenceSplitExceptions)
                context.Languages.AddRange(languages);
                context.SaveChanges();
            }
        }
    }
} 