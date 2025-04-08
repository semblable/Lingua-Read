using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using LinguaReadApi.Models;
using LinguaReadApi.Services;

namespace LinguaReadApi.Services
{
    public class LanguageDataUpdater
    {
        private readonly ILanguageService _languageService;

        public LanguageDataUpdater(ILanguageService languageService)
        {
            _languageService = languageService;
        }

        public async Task UpdateLanguagesFromCsvDataAsync()
        {
            var languages = await _languageService.GetAllLanguagesAsync();

            var updates = new List<(string isoCode, Action<Language> updateAction)>
            {
                ("en", lang =>
                {
                    lang.Name = "English";
                    lang.RightToLeft = false;
                    lang.ParserType = "spacedel";
                    lang.CharacterSubstitutions = "´='|`='|’='|‘='|...=…|..=‥";
                    lang.SplitSentences = ",.!?";
                    lang.WordCharacters = "a-zA-ZÀ-ÖØ-öø-ȳáéíóúÁÉÍÓÚñÑ";
                }),
                ("es", lang =>
                {
                    lang.Name = "Spanish";
                    lang.RightToLeft = false;
                    lang.ParserType = "spacedel";
                    lang.CharacterSubstitutions = "´='|`='|’='|‘='|...=…|..=‥";
                    lang.SplitSentences = ",.!?";
                    lang.WordCharacters = "a-zA-ZÀ-ÖØ-öø-ȳáéíóúÁÉÍÓÚñÑ";
                }),
                ("fr", lang =>
                {
                    lang.Name = "French";
                    lang.RightToLeft = false;
                    lang.ParserType = "spacedel";
                    lang.CharacterSubstitutions = "´='|`='|’='|‘='|...=…|..=‥";
                    lang.SplitSentences = ",.!?";
                    lang.WordCharacters = "a-zA-ZÀ-ÖØ-öø-ȳáéíóúÁÉÍÓÚñÑ";
                }),
                ("de", lang =>
                {
                    lang.Name = "German";
                    lang.RightToLeft = false;
                    lang.ParserType = "spacedel";
                    lang.CharacterSubstitutions = "´='|`='|’='|‘='|...=…|..=‥";
                    lang.SplitSentences = ",.!?";
                    lang.WordCharacters = "a-zA-ZÀ-ÖØ-öø-ȳáéíóúÁÉÍÓÚñÑ\\u200C\\u200D";
                }),
                ("it", lang =>
                {
                    lang.Name = "Italian";
                    lang.RightToLeft = false;
                    lang.ParserType = "spacedel";
                    lang.CharacterSubstitutions = "´='|`='|’='|‘='|...=…|..=‥";
                    lang.SplitSentences = ",.!?";
                    lang.WordCharacters = "a-zA-ZÀàÉéÈèÌìÎîÓóÒòÙù";
                }),
                ("pt", lang =>
                {
                    lang.Name = "Portuguese";
                    lang.RightToLeft = false;
                    lang.ParserType = "spacedel";
                    lang.CharacterSubstitutions = "´='|`='|’='|‘='|...=…|..=‥";
                    lang.SplitSentences = ",.!?";
                    lang.WordCharacters = "a-zA-ZÀÁÂÃÇÉÊÍÓÔÕÚÜàáâãçéêíóôõúü";
                })
            };

            foreach (var (isoCode, updateAction) in updates)
            {
                var lang = languages.FirstOrDefault(l => l.Code == isoCode);
                if (lang != null)
                {
                    updateAction(lang);
                    await _languageService.UpdateLanguageAsync(lang.LanguageId, lang);
                }
            }
        }
    }
}