using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Cors;
using System;
using System.Collections.Generic;

namespace LinguaReadApi.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [AllowAnonymous] // Explicitly allow anonymous access to all health endpoints
    [EnableCors("AllowClientApp")] // Enable CORS for this controller
    public class HealthController : ControllerBase
    {
        private readonly ILogger<HealthController> _logger;

        public HealthController(ILogger<HealthController> logger)
        {
            _logger = logger;
        }

        /// <summary>
        /// Basic health check endpoint that returns server status
        /// </summary>
        [HttpGet]
        public IActionResult Get()
        {
            _logger.LogInformation("Health check requested at: {time}", DateTimeOffset.UtcNow);
            
            return Ok(new
            {
                Status = "healthy",
                Timestamp = DateTimeOffset.UtcNow,
                Version = "1.0.0",
                Environment = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") ?? "Development"
            });
        }

        /// <summary>
        /// Test endpoint that returns sample statistics data for debugging
        /// </summary>
        [HttpGet("stats")]
        public IActionResult GetTestStats()
        {
            _logger.LogInformation("Test statistics requested at: {time}", DateTimeOffset.UtcNow);
            
            return Ok(new
            {
                TotalBooks = 12,
                FinishedBooks = 8,
                TotalWords = 25000,
                KnownWords = 18750,
                LanguageStats = new Dictionary<string, object>
                {
                    { "English", new { TotalWords = 15000, KnownWords = 12000 } },
                    { "Spanish", new { TotalWords = 10000, KnownWords = 6750 } }
                }
            });
        }
        
        /// <summary>
        /// Test endpoint that returns sample reading activity data for debugging
        /// </summary>
        [HttpGet("activity")]
        public IActionResult GetTestActivity([FromQuery] string period = "all")
        {
            _logger.LogInformation("Test activity data requested for period: {period} at: {time}", 
                period, DateTimeOffset.UtcNow);
            
            // Current date for reference
            var today = DateTime.UtcNow.Date;
            
            // Create sample activity data
            var activityByDate = new Dictionary<string, int>();
            
            // Generate data for the last 30 days with random word counts
            var random = new Random(42); // Fixed seed for consistent results
            for (int i = 0; i < 30; i++)
            {
                var date = today.AddDays(-i).ToString("yyyy-MM-dd");
                activityByDate[date] = random.Next(10, 500);
            }
            
            return Ok(new
            {
                TotalWordsRead = 25000,
                ActivityByDate = activityByDate,
                ActivityByLanguage = new Dictionary<string, int>
                {
                    { "English", 15000 },
                    { "Spanish", 10000 }
                }
            });
        }
        
        /// <summary>
        /// Diagnostic endpoint that returns information about the current request
        /// </summary>
        [HttpGet("diagnostics")]
        public IActionResult GetDiagnostics()
        {
            _logger.LogInformation("Diagnostics endpoint called at {time} from {ip}", 
                DateTime.UtcNow, HttpContext.Connection.RemoteIpAddress);
            
            try
            {
                var headers = new Dictionary<string, string>();
                foreach (var header in Request.Headers)
                {
                    headers[header.Key] = header.Value;
                }
                
                var result = new
                {
                    Timestamp = DateTime.UtcNow,
                    ClientIP = HttpContext.Connection.RemoteIpAddress?.ToString(),
                    Host = Request.Host.ToString(),
                    Path = Request.Path.ToString(),
                    Protocol = Request.Protocol,
                    Headers = headers,
                    QueryString = Request.QueryString.ToString(),
                    ServerVariables = new
                    {
                        ServerName = Environment.MachineName,
                        OSVersion = Environment.OSVersion.ToString(),
                        DotNetVersion = Environment.Version.ToString(),
                        ServerTime = DateTime.Now.ToString()
                    }
                };

                _logger.LogInformation("Successfully returned diagnostics data");
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error generating diagnostics data");
                return StatusCode(500, new { message = "Error generating diagnostics data", error = ex.Message });
            }
        }
        
        /// <summary>
        /// Debug endpoint that returns test data for the Statistics component
        /// </summary>
        [HttpGet("debug-stats")]
        public IActionResult GetDebugStats()
        {
            _logger.LogInformation("Debug statistics and activity requested at: {time}", DateTimeOffset.UtcNow);
            
            // Create combined stats and activity data for debugging
            return Ok(new
            {
                ApiVersion = "1.0.0",
                Timestamp = DateTimeOffset.UtcNow,
                Environment = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") ?? "Development",
                StatsData = new
                {
                    TotalBooks = 12,
                    FinishedBooks = 8,
                    TotalWords = 25000,
                    KnownWords = 18750,
                    LanguageStats = new Dictionary<string, object>
                    {
                        { "English", new { TotalWords = 15000, KnownWords = 12000 } },
                        { "Spanish", new { TotalWords = 10000, KnownWords = 6750 } }
                    },
                    TotalWordsRead = 25000,
                    ActivityByDate = CreateSampleActivityByDate(),
                    ActivityByLanguage = new Dictionary<string, int>
                    {
                        { "English", 15000 },
                        { "Spanish", 10000 }
                    }
                }
            });
        }

        private Dictionary<string, int> CreateSampleActivityByDate()
        {
            var activityByDate = new Dictionary<string, int>();
            var today = DateTime.UtcNow.Date;
            var random = new Random(42); // Fixed seed for consistent results
            
            for (int i = 0; i < 30; i++)
            {
                var date = today.AddDays(-i).ToString("yyyy-MM-dd");
                activityByDate[date] = random.Next(10, 500);
            }
            
            return activityByDate;
        }
    }
} 