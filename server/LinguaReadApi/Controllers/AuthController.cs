using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System;
using System.ComponentModel.DataAnnotations;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using System.Threading.Tasks;
using LinguaReadApi.Data;
using LinguaReadApi.Models;

namespace LinguaReadApi.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AuthController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IConfiguration _configuration;

        public AuthController(AppDbContext context, IConfiguration configuration)
        {
            _context = context;
            _configuration = configuration;
        }

        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] RegisterModel model)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            // Check if user already exists
            if (await _context.Users.AnyAsync(u => u.Email == model.Email))
            {
                return Conflict("User with this email already exists");
            }

            // Hash the password
            string passwordHash = BCrypt.Net.BCrypt.HashPassword(model.Password);

            // Create new user
            var user = new User
            {
                // Id is handled by IdentityUser
                UserName = model.Email, // Set UserName, e.g., using Email
                Email = model.Email,
                PasswordHash = passwordHash,
                CreatedAt = DateTime.UtcNow
            };

            // Save user to database
            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            // Generate JWT token
            var token = GenerateJwtToken(user);

            // Return token along with user info
            return StatusCode(201, new { userId = user.Id, email = user.Email, token }); // Use user.Id
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginModel model)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            // Find user by email
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == model.Email);
            if (user == null)
            {
                return Unauthorized("Invalid email or password");
            }

            // Verify password
            bool isPasswordValid = BCrypt.Net.BCrypt.Verify(model.Password, user.PasswordHash);
            if (!isPasswordValid)
            {
                return Unauthorized("Invalid email or password");
            }

            // Generate JWT token
            var token = GenerateJwtToken(user);

            // Return token
            return Ok(new { token });
        }

        private string GenerateJwtToken(User user)
        {
            Console.WriteLine($"Generating token for user: {user.Email}");
            Console.WriteLine($"Using issuer: {_configuration["Jwt:Issuer"]}");
            Console.WriteLine($"Using audience: {_configuration["Jwt:Audience"]}");
            
            var jwtKey = _configuration["Jwt:Key"] ?? throw new InvalidOperationException("JWT Key not configured.");
            var securityKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey));
            var credentials = new SigningCredentials(securityKey, SecurityAlgorithms.HmacSha256);

            var claims = new[]
            {
                new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()), // Use ClaimTypes.NameIdentifier and user.Id
                new Claim(JwtRegisteredClaimNames.Email, user.Email!), // Assuming user.Email is non-null here
                new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
                new Claim(JwtRegisteredClaimNames.Iat, DateTimeOffset.UtcNow.ToUnixTimeSeconds().ToString(), ClaimValueTypes.Integer64)
            };

            Console.WriteLine("Claims added to token:");
            foreach (var claim in claims)
            {
                Console.WriteLine($"  {claim.Type}: {claim.Value}");
            }

            var token = new JwtSecurityToken(
                issuer: _configuration["Jwt:Issuer"],
                audience: _configuration["Jwt:Audience"],
                claims: claims,
                expires: DateTime.UtcNow.AddHours(Convert.ToDouble(_configuration["Jwt:ExpiryInHours"])),
                signingCredentials: credentials
            );

            var tokenString = new JwtSecurityTokenHandler().WriteToken(token);
            Console.WriteLine($"Generated token length: {tokenString.Length}");
            return tokenString;
        }
    }

    public class RegisterModel
    {
        [Required]
        [EmailAddress]
        public string Email { get; set; } = string.Empty; // Initialize

        [Required]
        [StringLength(100, MinimumLength = 6)]
        public string Password { get; set; } = string.Empty; // Initialize
    }

    public class LoginModel
    {
        [Required]
        [EmailAddress]
        public string Email { get; set; } = string.Empty; // Initialize

        [Required]
        public string Password { get; set; } = string.Empty; // Initialize
    }
} 