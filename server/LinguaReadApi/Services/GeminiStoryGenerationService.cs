using System;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace LinguaReadApi.Services
{
    public interface IStoryGenerationService
    {
        Task<string> GenerateStoryAsync(string prompt, string language, string level, int maxLength);
    }

    public class GeminiStoryGenerationService : IStoryGenerationService
    {
        private readonly HttpClient _httpClient;
        private readonly string _apiKey;
        private readonly string _baseUrl;
        private readonly ILogger<GeminiStoryGenerationService> _logger;

        public GeminiStoryGenerationService(IConfiguration configuration, ILogger<GeminiStoryGenerationService> logger)
        {
            _httpClient = new HttpClient();
            _apiKey = configuration["Gemini:ApiKey"] ?? throw new ArgumentNullException("Gemini:ApiKey is missing in configuration");
            _baseUrl = configuration["Gemini:BaseUrl"] ?? "https://generativelanguage.googleapis.com/v1beta";
            _logger = logger;
            
            _logger.LogInformation("GeminiStoryGenerationService initialized");
            _logger.LogDebug($"Using base URL: {_baseUrl}");
        }

        public async Task<string> GenerateStoryAsync(string prompt, string language, string level, int maxLength)
        {
            if (string.IsNullOrWhiteSpace(prompt))
            {
                _logger.LogWarning("Empty prompt provided for story generation");
                return string.Empty;
            }

            try
            {
                _logger.LogInformation($"Generating story with prompt: '{prompt}', language: {language}, level: {level}");
                
                // Create a well-structured prompt for story generation
                string fullPrompt = $"Write a {level} level story in {language} about: {prompt}\n\n" +
                                    $"Requirements:\n" +
                                    $"- Write approximately {maxLength} words\n" +
                                    $"- Use vocabulary and grammar appropriate for {level} level learners\n" +
                                    $"- Include diverse sentence structures\n" +
                                    $"- Use everyday vocabulary with occasional new words for learning\n" +
                                    $"- Return ONLY the story with no additional text or explanations";

                // Create request payload according to Gemini API specs
                var requestPayload = new GeminiRequest
                {
                    Contents = new[]
                    {
                        new Content
                        {
                            Parts = new[]
                            {
                                new Part { Text = fullPrompt }
                            }
                        }
                    },
                    GenerationConfig = new GenerationConfig
                    {
                        Temperature = 0.7,
                        TopK = 40,
                        TopP = 0.95,
                        MaxOutputTokens = 20000, // Increased token limit
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
                var endpoint = $"{_baseUrl}/models/gemini-2.5-pro-exp-03-25:generateContent?key={_apiKey}";
                var content = new StringContent(jsonPayload, Encoding.UTF8, "application/json");
                
                // Send the request
                var response = await _httpClient.PostAsync(endpoint, content);
                var responseContent = await response.Content.ReadAsStringAsync();
                
                // Check if the request was successful
                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogError($"Gemini API error: {response.StatusCode}, {responseContent}");
                    return $"Story generation error: {response.StatusCode}";
                }

                _logger.LogDebug($"Gemini API response: {responseContent}");
                
                // Parse the response to extract the generated story
                var geminiResponse = JsonSerializer.Deserialize<GeminiResponse>(responseContent, options);
                
                if (geminiResponse?.Candidates != null && 
                    geminiResponse.Candidates.Length > 0 && 
                    geminiResponse.Candidates[0].Content?.Parts != null)
                {
                    // Concatenate text from all parts
                    var generatedStory = string.Join("", geminiResponse.Candidates[0].Content.Parts
                        .Where(part => !string.IsNullOrEmpty(part.Text))
                        .Select(part => part.Text));

                    if (!string.IsNullOrEmpty(generatedStory))
                    {
                        _logger.LogInformation($"Story generation successful, length: {generatedStory.Length}");
                        return generatedStory;
                    }
                }
                
                _logger.LogWarning("Could not extract story from Gemini response structure.");
                return "Story generation failed: Could not extract result";
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during story generation");
                return $"Story generation error: {ex.Message}";
            }
        }
    }
} 