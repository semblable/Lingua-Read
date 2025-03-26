using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Threading.Tasks;
using LinguaReadApi.Services;
using System.Text.Json.Serialization;
using System;
using System.Collections.Generic;

namespace LinguaReadApi.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class TranslationController : ControllerBase
    {
        private readonly ITranslationService _translationService;

        public TranslationController(ITranslationService translationService)
        {
            _translationService = translationService;
        }

        /// <summary>
        /// Translates text from one language to another
        /// </summary>
        /// <param name="request">The translation request containing text and language codes</param>
        /// <returns>The translated text</returns>
        [HttpPost]
        public async Task<ActionResult<TranslationResponse>> TranslateText([FromBody] TranslationRequest request)
        {
            if (string.IsNullOrEmpty(request.Text))
            {
                return BadRequest("Text to translate cannot be empty");
            }

            if (string.IsNullOrEmpty(request.SourceLanguageCode))
            {
                return BadRequest("Source language code cannot be empty");
            }

            if (string.IsNullOrEmpty(request.TargetLanguageCode))
            {
                return BadRequest("Target language code cannot be empty");
            }

            try
            {
                var translatedText = await _translationService.TranslateTextAsync(
                    request.Text,
                    request.SourceLanguageCode,
                    request.TargetLanguageCode);

                return Ok(new TranslationResponse
                {
                    OriginalText = request.Text,
                    TranslatedText = translatedText,
                    SourceLanguageCode = request.SourceLanguageCode,
                    TargetLanguageCode = request.TargetLanguageCode
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Translation failed: {ex.Message}");
            }
        }

        /// <summary>
        /// Gets the list of supported languages
        /// </summary>
        /// <returns>List of language codes and names</returns>
        [HttpGet("languages")]
        public ActionResult<IEnumerable<LanguageInfo>> GetSupportedLanguages()
        {
            // Return a list of languages supported by DeepL
            var languages = new List<LanguageInfo>
            {
                new LanguageInfo { Code = "EN", Name = "English" },
                new LanguageInfo { Code = "DE", Name = "German" },
                new LanguageInfo { Code = "FR", Name = "French" },
                new LanguageInfo { Code = "ES", Name = "Spanish" },
                new LanguageInfo { Code = "IT", Name = "Italian" },
                new LanguageInfo { Code = "NL", Name = "Dutch" },
                new LanguageInfo { Code = "PL", Name = "Polish" },
                new LanguageInfo { Code = "PT", Name = "Portuguese" },
                new LanguageInfo { Code = "RU", Name = "Russian" },
                new LanguageInfo { Code = "JA", Name = "Japanese" },
                new LanguageInfo { Code = "ZH", Name = "Chinese" }
            };

            return Ok(languages);
        }

        /// <summary>
        /// Translates a batch of words using DeepL.
        /// </summary>
        /// <param name="request">The batch translation request containing words and language codes.</param>
        /// <returns>A dictionary mapping original words to their translations.</returns>
        [HttpPost("batch")] // Added route segment "batch"
        public async Task<ActionResult<Dictionary<string, string>>> TranslateBatch([FromBody] BatchTranslationRequest request)
        {
            if (request.Words == null || request.Words.Count == 0)
            {
                return BadRequest("Word list cannot be empty.");
            }
            if (string.IsNullOrEmpty(request.TargetLanguageCode))
            {
                return BadRequest("Target language code cannot be empty.");
            }

            try
            {
                // SourceLanguageCode is optional for DeepL, service handles null
                var translations = await _translationService.TranslateBatchAsync(
                    request.Words,
                    request.TargetLanguageCode,
                    request.SourceLanguageCode); // Pass sourceLang if provided

                return Ok(translations);
            }
            catch (Exception ex)
            {
                // Log the exception details
                // Consider returning a more specific error response
                return StatusCode(500, $"Batch translation failed: {ex.Message}");
            }
        }
    } // End of Controller class

    // Add the new Request DTO below the existing ones
    public class BatchTranslationRequest
    {
        [JsonPropertyName("words")]
        public List<string> Words { get; set; } = new List<string>();

        [JsonPropertyName("targetLanguageCode")]
        public string TargetLanguageCode { get; set; } = string.Empty;

        [JsonPropertyName("sourceLanguageCode")] // Optional
        public string? SourceLanguageCode { get; set; }
    }

    public class TranslationRequest
    {
        [JsonPropertyName("text")]
        public string Text { get; set; } = string.Empty;

        [JsonPropertyName("sourceLanguageCode")]
        public string SourceLanguageCode { get; set; } = string.Empty;

        [JsonPropertyName("targetLanguageCode")]
        public string TargetLanguageCode { get; set; } = string.Empty;
    }

    public class TranslationResponse
    {
        [JsonPropertyName("originalText")]
        public string OriginalText { get; set; } = string.Empty;

        [JsonPropertyName("translatedText")]
        public string TranslatedText { get; set; } = string.Empty;

        [JsonPropertyName("sourceLanguageCode")]
        public string SourceLanguageCode { get; set; } = string.Empty;

        [JsonPropertyName("targetLanguageCode")]
        public string TargetLanguageCode { get; set; } = string.Empty;
    }

    public class LanguageInfo
    {
        [JsonPropertyName("code")]
        public string Code { get; set; } = string.Empty;

        [JsonPropertyName("name")]
        public string Name { get; set; } = string.Empty;
    }
} 