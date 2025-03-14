using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Text.Json.Serialization;
using System.Threading.Tasks;
using System;
using Microsoft.Extensions.Logging;
using LinguaReadApi.Services;

namespace LinguaReadApi.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class SentenceTranslationController : ControllerBase
    {
        private readonly ISentenceTranslationService _translationService;
        private readonly ILogger<SentenceTranslationController> _logger;

        public SentenceTranslationController(
            ISentenceTranslationService translationService,
            ILogger<SentenceTranslationController> logger)
        {
            _translationService = translationService;
            _logger = logger;
        }

        /// <summary>
        /// Translates a sentence or paragraph from one language to another using Gemini API
        /// </summary>
        /// <param name="request">The translation request containing text and language codes</param>
        /// <returns>The translated text</returns>
        [HttpPost]
        public async Task<ActionResult<SentenceTranslationResponse>> TranslateSentence([FromBody] SentenceTranslationRequest request)
        {
            try
            {
                _logger.LogInformation($"Received sentence translation request: {request.Text?.Substring(0, Math.Min(50, request.Text?.Length ?? 0))}...");
                
                if (string.IsNullOrWhiteSpace(request.Text))
                {
                    _logger.LogWarning("Empty text provided for translation");
                    return BadRequest(new { message = "Text to translate cannot be empty" });
                }

                _logger.LogInformation($"Translating from {request.SourceLanguageCode} to {request.TargetLanguageCode}");
                
                var translatedText = await _translationService.TranslateSentenceAsync(
                    request.Text,
                    request.SourceLanguageCode,
                    request.TargetLanguageCode);

                if (string.IsNullOrEmpty(translatedText))
                {
                    _logger.LogWarning("Translation service returned empty result");
                    return StatusCode(500, new { message = "Translation service returned empty result" });
                }

                _logger.LogInformation($"Translation successful, result length: {translatedText.Length}");
                
                return Ok(new SentenceTranslationResponse
                {
                    OriginalText = request.Text,
                    TranslatedText = translatedText,
                    SourceLanguageCode = request.SourceLanguageCode,
                    TargetLanguageCode = request.TargetLanguageCode
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during sentence translation");
                return StatusCode(500, new { message = $"Translation failed: {ex.Message}" });
            }
        }

        /// <summary>
        /// Translates an entire text for a quick preview
        /// </summary>
        [HttpPost("full-text")]
        public async Task<ActionResult<SentenceTranslationResponse>> TranslateFullText([FromBody] SentenceTranslationRequest request)
        {
            try
            {
                _logger.LogInformation($"Received full text translation request, text length: {request.Text?.Length ?? 0}");
                
                if (string.IsNullOrWhiteSpace(request.Text))
                {
                    _logger.LogWarning("Empty text provided for full text translation");
                    return BadRequest(new { message = "Text to translate cannot be empty" });
                }

                _logger.LogInformation($"Translating full text from {request.SourceLanguageCode} to {request.TargetLanguageCode}");
                
                var translatedText = await _translationService.TranslateSentenceAsync(
                    request.Text,
                    request.SourceLanguageCode,
                    request.TargetLanguageCode);

                if (string.IsNullOrEmpty(translatedText))
                {
                    _logger.LogWarning("Translation service returned empty result for full text");
                    return StatusCode(500, new { message = "Translation service returned empty result" });
                }

                _logger.LogInformation($"Full text translation successful, result length: {translatedText.Length}");
                
                return Ok(new SentenceTranslationResponse
                {
                    OriginalText = request.Text,
                    TranslatedText = translatedText,
                    SourceLanguageCode = request.SourceLanguageCode,
                    TargetLanguageCode = request.TargetLanguageCode
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during full text translation");
                return StatusCode(500, new { message = $"Translation failed: {ex.Message}" });
            }
        }
    }

    public class SentenceTranslationRequest
    {
        [JsonPropertyName("text")]
        public string Text { get; set; }

        [JsonPropertyName("sourceLanguageCode")]
        public string SourceLanguageCode { get; set; }

        [JsonPropertyName("targetLanguageCode")]
        public string TargetLanguageCode { get; set; }
    }

    public class SentenceTranslationResponse
    {
        [JsonPropertyName("originalText")]
        public string OriginalText { get; set; }

        [JsonPropertyName("translatedText")]
        public string TranslatedText { get; set; }

        [JsonPropertyName("sourceLanguageCode")]
        public string SourceLanguageCode { get; set; }

        [JsonPropertyName("targetLanguageCode")]
        public string TargetLanguageCode { get; set; }
    }
} 