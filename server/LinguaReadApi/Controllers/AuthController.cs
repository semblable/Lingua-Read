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
using Microsoft.AspNetCore.Identity; // Added for Identity

namespace LinguaReadApi.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AuthController : ControllerBase
    {
        // Remove direct DbContext dependency, use Identity managers instead
        // private readonly AppDbContext _context;
        private readonly UserManager<User> _userManager;
        private readonly SignInManager<User> _signInManager;
        private readonly IConfiguration _configuration;

        public AuthController(
            UserManager<User> userManager,
            SignInManager<User> signInManager,
            IConfiguration configuration)
        {
            _userManager = userManager;
            _signInManager = signInManager;
            _configuration = configuration;
        }

        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] RegisterModel model)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            // Check if user already exists using UserManager
            var existingUser = await _userManager.FindByEmailAsync(model.Email);
            if (existingUser != null)
            {
                return Conflict("User with this email already exists");
            }

            // Create new user using UserManager
            var user = new User
            {
                UserName = model.Email, // Identity requires UserName
                Email = model.Email,
                CreatedAt = DateTime.UtcNow // Keep custom field if needed
            };

            var result = await _userManager.CreateAsync(user, model.Password);

            if (!result.Succeeded)
            {
                // Log errors if needed: foreach (var error in result.Errors) { ... }
                return BadRequest(result.Errors);
            }

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

            // Use SignInManager to handle login attempt
            var result = await _signInManager.PasswordSignInAsync(model.Email, model.Password, isPersistent: false, lockoutOnFailure: false);

            if (!result.Succeeded)
            {
                // Avoid giving specific reasons for failure (security)
                return Unauthorized("Invalid email or password");
            }

            // If successful, get the user to generate the token
            var user = await _userManager.FindByEmailAsync(model.Email);
            if (user == null)
            {
                 // Should not happen if PasswordSignInAsync succeeded, but handle defensively
                 return Unauthorized("User not found after successful sign-in.");
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