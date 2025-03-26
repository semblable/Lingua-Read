using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using LinguaReadApi.Models; // Assuming a model for DeepL response exists or will be created
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using System.Linq; // Added for Where/Select

namespace LinguaReadApi.Services
{
    public interface ITranslationService
    {
        Task<string> TranslateTextAsync(string text, string? sourceLang, string targetLang); // Mark sourceLang as nullable
        Task<Dictionary<string, string>> TranslateBatchAsync(List<string> words, string targetLang, string? sourceLang = null); // Mark sourceLang as nullable
    }

    public class DeepLTranslationService : ITranslationService
    {
        private readonly HttpClient _httpClient;
        private readonly IConfiguration _configuration;
        private readonly ILogger<DeepLTranslationService> _logger;
        private readonly string _apiKey;
        private readonly string _apiUrl;

        public DeepLTranslationService(HttpClient httpClient, IConfiguration configuration, ILogger<DeepLTranslationService> logger)
        {
            _httpClient = httpClient;
            _configuration = configuration;
            _logger = logger;
             // Consider using options pattern or safer key retrieval
            _apiKey = _configuration["DeepLApiKey"]; 
            _apiUrl = _configuration["DeepLApiUrl"] ?? "https://api-free.deepl.com/v2/translate"; // Default to free API

            if (string.IsNullOrEmpty(_apiKey))
            {
                _logger.LogError("DeepL API Key is not configured.");
                throw new InvalidOperationException("DeepL API Key is missing in configuration.");
            }
             _httpClient.DefaultRequestHeaders.Add("Authorization", $"DeepL-Auth-Key {_apiKey}");
        }

        public async Task<Dictionary<string, string>> TranslateBatchAsync(List<string> words, string targetLang, string? sourceLang = null) // Mark sourceLang as nullable
        {
            var translations = new Dictionary<string, string>();
            if (words == null || words.Count == 0)
            {
                return translations;
            }

            try
            {
                 // DeepL Free API expects form data, Pro API supports JSON. Assuming Free for default URL.
                 // Adjust content type and serialization if using Pro API with JSON.
                var formContent = new List<KeyValuePair<string, string>>
                {
                    new KeyValuePair<string, string>("target_lang", targetLang)
                };
                foreach (var word in words)
                {
                    formContent.Add(new KeyValuePair<string, string>("text", word));
                }
                if (!string.IsNullOrEmpty(sourceLang))
                {
                    formContent.Add(new KeyValuePair<string, string>("source_lang", sourceLang));
                }

                var requestContent = new FormUrlEncodedContent(formContent);

                _logger.LogInformation($"Sending {words.Count} words to DeepL for translation to {targetLang}");

                var response = await _httpClient.PostAsync(_apiUrl, requestContent);

                if (response.IsSuccessStatusCode)
                {
                    // Need DeepLResponse model defined appropriately
                    var responseContent = await response.Content.ReadFromJsonAsync<DeepLResponse>(); 
                    if (responseContent?.translations != null && responseContent.translations.Length == words.Count)
                    {
                        for (int i = 0; i < words.Count; i++)
                        {
                            // Ensure case-insensitivity if needed, or handle duplicates if DeepL returns multiple for same input
                            translations[words[i]] = responseContent.translations[i].text; 
                        }
                        _logger.LogInformation($"Successfully received {translations.Count} translations from DeepL.");
                    }
                    else
                    {
                         _logger.LogWarning("DeepL response format mismatch or missing translations. Response: {Response}", await response.Content.ReadAsStringAsync());
                    }
                }
                else
                {
                    var errorContent = await response.Content.ReadAsStringAsync();
                    _logger.LogError($"DeepL API request failed with status {response.StatusCode}: {errorContent}");
                    // Consider throwing a specific exception or handling differently
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error occurred while calling DeepL API.");
                // Consider throwing or returning partial results/error indication
            }

            return translations;
        }

        // Implementation for single text translation
        public async Task<string> TranslateTextAsync(string text, string? sourceLang, string targetLang) // Mark sourceLang as nullable
        {
            if (string.IsNullOrEmpty(text))
            {
                return string.Empty;
            }

            // Call batch translation for the single word
            var batchResult = await TranslateBatchAsync(new List<string> { text }, targetLang, sourceLang);
    
            // Since we sent only one word, the result dictionary should contain at most one entry.
            // We rely on DeepL returning translations in the same order as the input.
            // Let's get the first value from the dictionary if it exists.
            var firstTranslation = batchResult.Values.FirstOrDefault();
    
            if (firstTranslation != null)
            {
                return firstTranslation;
            }
            
            // Log if no translation was found (either API failed or returned empty)
            _logger.LogWarning($"Could not get translation for '{text}' from batch response (Count: {batchResult.Count}).");
            return string.Empty; // Return empty if no translation found
        }
    }

    // Placeholder for DeepL's response structure - adjust based on actual API
    // Ensure PropertyNamingPolicy is handled if needed during deserialization, or use [JsonPropertyName]
    public class DeepLResponse
    {
        public DeepLTranslation[] translations { get; set; }
    }

    public class DeepLTranslation
    {
        public string detected_source_language { get; set; }
        public string text { get; set; }
    }
}