using System;
using System.Net.Http;
using System.Text;
using System.Threading.Tasks;
using System.Text.Json;
using Microsoft.Extensions.Configuration;
using System.Collections.Generic;

namespace LinguaReadApi.Services
{
    public interface ITranslationService
    {
        Task<string> TranslateTextAsync(string text, string sourceLanguage, string targetLanguage);
    }

    public class DeepLTranslationService : ITranslationService
    {
        private readonly HttpClient _httpClient;
        private readonly string _apiKey;
        private readonly string _baseUrl;

        public DeepLTranslationService(IConfiguration configuration, HttpClient httpClient)
        {
            _httpClient = httpClient;
            _apiKey = configuration["DeepL:ApiKey"];
            _baseUrl = configuration["DeepL:BaseUrl"];

            if (string.IsNullOrEmpty(_apiKey))
                throw new ArgumentException("DeepL API key is missing in configuration");

            if (string.IsNullOrEmpty(_baseUrl))
                throw new ArgumentException("DeepL base URL is missing in configuration");
        }

        public async Task<string> TranslateTextAsync(string text, string sourceLanguage, string targetLanguage)
        {
            if (string.IsNullOrEmpty(text))
                return string.Empty;

            // Map language codes to DeepL format if needed
            sourceLanguage = MapLanguageCodeToDeepL(sourceLanguage);
            targetLanguage = MapLanguageCodeToDeepL(targetLanguage);

            var requestData = new
            {
                text = new[] { text },
                source_lang = sourceLanguage,
                target_lang = targetLanguage
            };

            var content = new StringContent(
                JsonSerializer.Serialize(requestData),
                Encoding.UTF8,
                "application/json");

            var request = new HttpRequestMessage(HttpMethod.Post, $"{_baseUrl}/translate")
            {
                Content = content
            };

            request.Headers.Add("Authorization", $"DeepL-Auth-Key {_apiKey}");

            var response = await _httpClient.SendAsync(request);
            response.EnsureSuccessStatusCode();

            var responseBody = await response.Content.ReadAsStringAsync();
            var translationResponse = JsonSerializer.Deserialize<DeepLResponse>(responseBody);

            if (translationResponse?.translations == null || translationResponse.translations.Length == 0)
                return string.Empty;

            return translationResponse.translations[0].text;
        }

        private string MapLanguageCodeToDeepL(string languageCode)
        {
            // DeepL uses different language codes than ISO
            return languageCode.ToUpper() switch
            {
                "EN" => "EN",
                "FR" => "FR",
                "DE" => "DE",
                "ES" => "ES",
                "IT" => "IT",
                "NL" => "NL",
                "PL" => "PL",
                "PT" => "PT",
                "RU" => "RU",
                "ZH" => "ZH",
                "JA" => "JA",
                _ => languageCode.ToUpper()
            };
        }

        private class DeepLResponse
        {
            public Translation[] translations { get; set; }

            public class Translation
            {
                public string text { get; set; }
                public string detected_source_language { get; set; }
            }
        }
    }
} 