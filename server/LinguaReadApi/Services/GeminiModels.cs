using System.Text.Json.Serialization;

namespace LinguaReadApi.Services
{
    // Shared response models for Gemini API
    public class GeminiResponse
    {
        public Candidate[] Candidates { get; set; } = Array.Empty<Candidate>(); // Initialize
    }

    public class Candidate
    {
        public Content Content { get; set; } = new Content(); // Initialize
    }

    public class Content
    {
        public Part[] Parts { get; set; } = Array.Empty<Part>(); // Initialize
    }

    public class Part
    {
        public string Text { get; set; } = string.Empty; // Initialize
    }

    public class GeminiRequest
    {
        [JsonPropertyName("contents")]
        public Content[] Contents { get; set; } = Array.Empty<Content>(); // Initialize

        [JsonPropertyName("generationConfig")]
        public GenerationConfig GenerationConfig { get; set; } = new GenerationConfig(); // Initialize
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
        public string ResponseMimeType { get; set; } = "text/plain"; // Initialize to default

        [JsonPropertyName("thinkingConfig")]
        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] // Don't serialize if null
        public ThinkingConfig? ThinkingConfig { get; set; } // Add ThinkingConfig property
    }

    // Add ThinkingConfig class definition
    public class ThinkingConfig
    {
        [JsonPropertyName("thinkingBudget")]
        public int ThinkingBudget { get; set; }
    }
}