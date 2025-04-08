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
                        SplitSentences = ",.!?", WordCharacters = "a-zA-ZÀ-ÖØ-öø-ȳáéíóúÁÉÍÓÚñÑ",
                        IsActiveForTranslation = true,
                        CharacterSubstitutions = "´='|`='|’='|‘='|...=…|..=‥",
                        Dictionaries = new List<LanguageDictionary> { }
                    },
                    new Language { // Spanish
                        Name = "Spanish", Code = "es",
                        ShowRomanization = false, RightToLeft = false, ParserType = "spacedel",
                        SplitSentences = ",.!?", WordCharacters = "a-zA-ZÀ-ÖØ-öø-ȳáéíóúÁÉÍÓÚñÑ",
                        IsActiveForTranslation = true,
                        CharacterSubstitutions = "´='|`='|’='|‘='|...=…|..=‥",
                        Dictionaries = new List<LanguageDictionary> { }
                    },
                    new Language { // French
                        Name = "French", Code = "fr",
                        ShowRomanization = false, RightToLeft = false, ParserType = "spacedel",
                        SplitSentences = ",.!?", WordCharacters = "a-zA-ZÀ-ÖØ-öø-ȳáéíóúÁÉÍÓÚñÑ",
                        IsActiveForTranslation = true,
                        CharacterSubstitutions = "´='|`='|’='|‘='|...=…|..=‥",
                        Dictionaries = new List<LanguageDictionary> { }
                    },
                    new Language { // German
                        Name = "German", Code = "de",
                        ShowRomanization = false, RightToLeft = false, ParserType = "spacedel",
                        SplitSentences = ",.!?", WordCharacters = "a-zA-ZÀ-ÖØ-öø-ȳáéíóúÁÉÍÓÚñÑ\\u200C\\u200D",
                        IsActiveForTranslation = true,
                        CharacterSubstitutions = "´='|`='|’='|‘='|...=…|..=‥",
                        Dictionaries = new List<LanguageDictionary> { }
                    },
                    new Language { // Italian
                        Name = "Italian", Code = "it",
                        ShowRomanization = false, RightToLeft = false, ParserType = "spacedel",
                        SplitSentences = ",.!?", WordCharacters = "a-zA-ZÀàÉéÈèÌìÎîÓóÒòÙù",
                        IsActiveForTranslation = true,
                        CharacterSubstitutions = "´='|`='|’='|‘='|...=…|..=‥",
                        Dictionaries = new List<LanguageDictionary> { }
                    },
                    new Language { // Portuguese
                        Name = "Portuguese", Code = "pt",
                        ShowRomanization = false, RightToLeft = false, ParserType = "spacedel",
                        SplitSentences = ",.!?", WordCharacters = "a-zA-ZÀÁÂÃÇÉÊÍÓÔÕÚÜàáâãçéêíóôõúü",
                        IsActiveForTranslation = true,
                        CharacterSubstitutions = "´='|`='|’='|‘='|...=…|..=‥",
                        Dictionaries = new List<LanguageDictionary> { }
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
                };

                // AddRange will also add the related entities (Dictionaries, SentenceSplitExceptions)
                context.Languages.AddRange(languages);
                context.SaveChanges();
            }
        }
    }
} 