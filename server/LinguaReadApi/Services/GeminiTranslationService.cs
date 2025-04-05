using System;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace LinguaReadApi.Services
{
    public interface ISentenceTranslationService
    {
        Task<string> TranslateSentenceAsync(string text, string sourceLanguage, string targetLanguage);
    }

    public class GeminiTranslationService : ISentenceTranslationService
    {
        private readonly HttpClient _httpClient;
        private readonly string _apiKey;
        private readonly string _baseUrl;
        private readonly ILogger<GeminiTranslationService> _logger;

        public GeminiTranslationService(IConfiguration configuration, ILogger<GeminiTranslationService> logger)
        {
            _httpClient = new HttpClient();
            _apiKey = configuration["Gemini:ApiKey"] ?? throw new ArgumentNullException("Gemini:ApiKey is missing in configuration");
            _baseUrl = configuration["Gemini:BaseUrl"] ?? "https://generativelanguage.googleapis.com/v1beta";
            _logger = logger;
            
            _logger.LogInformation("GeminiTranslationService initialized");
            _logger.LogDebug($"Using base URL: {_baseUrl}");
        }

        public async Task<string> TranslateSentenceAsync(string text, string sourceLanguage, string targetLanguage)
        {
            if (string.IsNullOrWhiteSpace(text))
            {
                _logger.LogWarning("Empty text provided for translation");
                return string.Empty;
            }

            try
            {
                _logger.LogInformation($"Translating text ({text.Length} chars) from {sourceLanguage} to {targetLanguage}");
                
                // Prepare a clear prompt specifically for translation
                string prompt = $"Translate the following text from {sourceLanguage} to {targetLanguage}. Maintain all formatting, punctuation, and special characters. Return ONLY the translated text with no additional text.\n\nText to translate: {text}";

                // Create request payload according to Gemini API specs
                var requestPayload = new GeminiRequest
                {
                    Contents = new[]
                    {
                        new Content
                        {
                            Parts = new[]
                            {
                                new Part { Text = prompt }
                            }
                        }
                    },
                    GenerationConfig = new GenerationConfig
                    {
                        Temperature = 0.3,
                        TopK = 32,
                        TopP = 1.0,
                        MaxOutputTokens = 60000,
                        ResponseMimeType = "text/plain"
                    }
                };

                // Serialize with proper casing
                var options = new JsonSerializerOptions
                {
                    PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
                    WriteIndented = false
                };
                
                string jsonPayload = JsonSerializer.Serialize(requestPayload, options);
                _logger.LogDebug($"Request payload: {jsonPayload}");

                // Create the request
                var endpoint = $"{_baseUrl}/models/gemini-2.0-flash:generateContent?key={_apiKey}";
                var content = new StringContent(jsonPayload, Encoding.UTF8, "application/json");
                
                // Send the request
                var response = await _httpClient.PostAsync(endpoint, content);
                var responseContent = await response.Content.ReadAsStringAsync();
                
                // Check if the request was successful
                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogError($"Gemini API error: {response.StatusCode}, {responseContent}");
                    return $"Translation error: {response.StatusCode}";
                }

                _logger.LogDebug($"Gemini API response: {responseContent}");
                
                // Parse using proper models
                var geminiResponse = JsonSerializer.Deserialize<GeminiResponse>(responseContent, options);
                
                if (geminiResponse?.Candidates != null && 
                    geminiResponse.Candidates.Length > 0 && 
                    geminiResponse.Candidates[0].Content?.Parts != null &&
                    geminiResponse.Candidates[0].Content.Parts.Length > 0)
                {
                    var translatedText = geminiResponse.Candidates[0].Content.Parts[0].Text;
                    _logger.LogInformation($"Translation successful, length: {translatedText?.Length ?? 0}");
                    return translatedText ?? string.Empty;
                }
                
                _logger.LogWarning("Could not extract translation from response");
                return "Translation failed: Could not extract result";
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during translation");
                return $"Translation error: {ex.Message}";
            }
        }
    }
} 