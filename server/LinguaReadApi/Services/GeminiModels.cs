using System.Text.Json.Serialization;

namespace LinguaReadApi.Services
{
    // Shared response models for Gemini API
    public class GeminiResponse
    {
        public Candidate[] Candidates { get; set; }
    }

    public class Candidate
    {
        public Content Content { get; set; }
    }

    public class Content
    {
        public Part[] Parts { get; set; }
    }

    public class Part
    {
        public string Text { get; set; }
    }

    public class GeminiRequest
    {
        [JsonPropertyName("contents")]
        public Content[] Contents { get; set; }

        [JsonPropertyName("generationConfig")]
        public GenerationConfig GenerationConfig { get; set; }
    }

    public class GenerationConfig
    {
        [JsonPropertyName("temperature")]
        public double Temperature { get; set; }

        [JsonPropertyName("topK")]
        public int TopK { get; set; }

        [JsonPropertyName("topP")]
        public double TopP { get; set; }

        [JsonPropertyName("maxOutputTokens")]
        public int MaxOutputTokens { get; set; }
        
        [JsonPropertyName("responseMimeType")]
        public string ResponseMimeType { get; set; }
    }
} 