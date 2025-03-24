using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Threading.Tasks;
using System.ComponentModel.DataAnnotations;
using Microsoft.Extensions.Logging;
using LinguaReadApi.Services;

namespace LinguaReadApi.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class StoryGenerationController : ControllerBase
    {
        private readonly IStoryGenerationService _storyGenerationService;
        private readonly ILogger<StoryGenerationController> _logger;

        public StoryGenerationController(
            IStoryGenerationService storyGenerationService,
            ILogger<StoryGenerationController> logger)
        {
            _storyGenerationService = storyGenerationService;
            _logger = logger;
        }

        /// <summary>
        /// Generates a story based on provided parameters using Gemini API
        /// </summary>
        /// <param name="request">The story generation request containing prompt, language, and other parameters</param>
        /// <returns>The generated story</returns>
        [HttpPost]
        public async Task<ActionResult<StoryGenerationResponse>> GenerateStory([FromBody] StoryGenerationRequest request)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            _logger.LogInformation($"Story generation request received: {request.Prompt}, Language: {request.Language}");

            var generatedStory = await _storyGenerationService.GenerateStoryAsync(
                request.Prompt,
                request.Language,
                request.Level,
                request.MaxLength
            );

            return Ok(new StoryGenerationResponse { GeneratedStory = generatedStory });
        }
    }

    public class StoryGenerationRequest
    {
        [Required]
        public string Prompt { get; set; } = string.Empty;

        [Required]
        public string Language { get; set; } = string.Empty;

        [Required]
        public string Level { get; set; } = "intermediate";

        public int MaxLength { get; set; } = 500;
    }

    public class StoryGenerationResponse
    {
        public string GeneratedStory { get; set; } = string.Empty;
    }
} 