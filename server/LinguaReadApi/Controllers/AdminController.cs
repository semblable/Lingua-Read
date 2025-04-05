using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.Extensions.Logging;
using System;
using System.IO;
using System.Threading.Tasks;
using LinguaReadApi.Services; // Assuming your service is here
using Microsoft.AspNetCore.Http; // Required for IFormFile

namespace LinguaReadApi.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize] // Basic authorization, refine later for admin role
    public class AdminController : ControllerBase
    {
        private readonly IDatabaseAdminService _dbAdminService;
        private readonly ILogger<AdminController> _logger;

        public AdminController(IDatabaseAdminService dbAdminService, ILogger<AdminController> logger)
        {
            _dbAdminService = dbAdminService;
            _logger = logger;
        }

        // GET: api/admin/backup
        [HttpGet("backup")]
        // [Authorize(Roles = "Admin")] // TODO: Add role-based authorization later
        public async Task<IActionResult> BackupDatabase()
        {
            _logger.LogInformation("Database backup requested by user {UserId}", User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value);

            var backupFilePath = await _dbAdminService.BackupDatabaseAsync();

            if (string.IsNullOrEmpty(backupFilePath))
            {
                _logger.LogError("Database backup failed in service.");
                return StatusCode(500, "Database backup failed.");
            }

            try
            {
                var memoryStream = new MemoryStream();
                using (var fileStream = new FileStream(backupFilePath, FileMode.Open, FileAccess.Read, FileShare.Read))
                {
                    await fileStream.CopyToAsync(memoryStream);
                }
                memoryStream.Position = 0;

                // Clean up the temporary file after reading it into memory
                System.IO.File.Delete(backupFilePath);
                _logger.LogInformation("Temporary backup file deleted: {BackupFilePath}", backupFilePath);


                return File(memoryStream, "application/octet-stream", Path.GetFileName(backupFilePath));
            }
            catch (Exception ex)
            {
                 _logger.LogError(ex, "Error reading or deleting backup file: {BackupFilePath}", backupFilePath);
                 // Attempt cleanup again just in case
                 if (System.IO.File.Exists(backupFilePath)) System.IO.File.Delete(backupFilePath);
                 return StatusCode(500, "Error processing backup file.");
            }
        }

        // POST: api/admin/restore
        [HttpPost("restore")]
        [Consumes("multipart/form-data")]
        [RequestSizeLimit(200 * 1024 * 1024)] // Example: 200MB limit for restore file, adjust as needed
        [RequestFormLimits(MultipartBodyLengthLimit = 200 * 1024 * 1024)]
        // [Authorize(Roles = "Admin")] // TODO: Add role-based authorization later
        public async Task<IActionResult> RestoreDatabase(IFormFile backupFile)
        {
             _logger.LogWarning("Database restore requested by user {UserId}. THIS IS A DESTRUCTIVE OPERATION.", User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value);

            if (backupFile == null || backupFile.Length == 0)
            {
                return BadRequest("No backup file uploaded.");
            }

            // Optional: Add more validation for file type/name if desired
            // if (!backupFile.FileName.EndsWith(".backup", StringComparison.OrdinalIgnoreCase))
            // {
            //     return BadRequest("Invalid backup file type. Expected '.backup'.");
            // }

            try
            {
                using (var stream = backupFile.OpenReadStream())
                {
                    var success = await _dbAdminService.RestoreDatabaseAsync(stream);
                    if (success)
                    {
                        _logger.LogInformation("Database restore successful.");
                        return Ok(new { message = "Database restored successfully." });
                    }
                    else
                    {
                        _logger.LogError("Database restore failed in service.");
                        return StatusCode(500, "Database restore failed.");
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Exception occurred during database restore request processing.");
                return StatusCode(500, $"Internal server error during restore: {ex.Message}");
            }
        }
    }
}