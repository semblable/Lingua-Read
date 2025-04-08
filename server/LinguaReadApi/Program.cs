using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.IdentityModel.Tokens;
using System;
using System.Text;
using LinguaReadApi.Data;
using Microsoft.OpenApi.Models;
using LinguaReadApi.Services;
using Microsoft.Extensions.FileProviders; // Add this for StaticFileOptions
using System.IO; // Add this for Path.Combine
using Microsoft.AspNetCore.Http.Features; // Needed for FormOptions
using Microsoft.AspNetCore.Server.Kestrel.Core; // Needed for KestrelServerOptions
using DotNetEnv; // <-- Add this using directive
using Microsoft.AspNetCore.Identity; // Keep one Identity using
// using Microsoft.AspNetCore.Identity.EntityFrameworkCore; // This namespace is not needed directly here

// --- Load .env file ---
Env.Load(); // <-- Load environment variables from .env file

var builder = WebApplication.CreateBuilder(args);

// --- Add Kestrel Configuration ---
builder.WebHost.ConfigureKestrel(serverOptions =>
{
    // Set a higher limit for the request body size (e.g., 100 MB)
    // Adjust this value based on expected maximum file sizes
    serverOptions.Limits.MaxRequestBodySize = 600 * 1024 * 1024; // 600 MB (Increased significantly)
});

// --- Add Form Options Configuration ---
builder.Services.Configure<FormOptions>(options =>
{
    // Ensure this limit is also high enough for multipart requests
    options.MultipartBodyLengthLimit = 600 * 1024 * 1024; // 600 MB (Increased significantly)
    // You might need to adjust other limits depending on your form data
    options.ValueLengthLimit = int.MaxValue; // Or a specific large value
    options.KeyLengthLimit = int.MaxValue;   // Or a specific large value
    options.ValueCountLimit = int.MaxValue; // Or a specific large value
    // options.MemoryBufferThreshold = int.MaxValue; // REMOVED - Use default disk buffering for large files
});

// Add services to the container.
builder.Services.AddControllers();
// Configure DbContext with PostgreSQL
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

// --- Add ASP.NET Core Identity ---
// Make sure LinguaReadApi.Models.User exists and is the correct user class
builder.Services.AddIdentity<LinguaReadApi.Models.User, IdentityRole<Guid>>(options => // Specify Guid as the key type for IdentityRole
{
    // Configure identity options if needed (e.g., password requirements)
    options.SignIn.RequireConfirmedAccount = false; // Adjust as needed
    options.Password.RequireDigit = false;
    options.Password.RequiredLength = 6;
    options.Password.RequireNonAlphanumeric = false;
    options.Password.RequireUppercase = false;
    options.Password.RequireLowercase = false;
})
.AddEntityFrameworkStores<AppDbContext>() // Tell Identity to use your DbContext
.AddDefaultTokenProviders(); // Adds providers for password reset tokens, etc.
 
// --- Remove the two duplicate AddIdentity blocks ---
// Register HttpClient
builder.Services.AddHttpClient();

// Register DeepL Translation Service
builder.Services.AddScoped<ITranslationService, DeepLTranslationService>();

// Register Gemini Translation Service for sentences
builder.Services.AddScoped<ISentenceTranslationService, GeminiTranslationService>();

// Register Gemini Story Generation Service
builder.Services.AddScoped<IStoryGenerationService, GeminiStoryGenerationService>();

// Register Database Admin Service
builder.Services.AddScoped<IDatabaseAdminService, DatabaseAdminService>(); // <-- Add this line

// Register Language Service (New)
builder.Services.AddScoped<ILanguageService, LanguageService>();
builder.Services.AddScoped<LanguageDataUpdater>();

// Configure JWT Authentication
builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.RequireHttpsMetadata = false;
    options.SaveToken = true;
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = builder.Configuration["Jwt:Issuer"],
        ValidAudience = builder.Configuration["Jwt:Audience"],
        IssuerSigningKey = new SymmetricSecurityKey(
            Encoding.UTF8.GetBytes(builder.Configuration["Jwt:Key"] ?? throw new InvalidOperationException("JWT Key is not configured"))
        )
    };

    options.Events = new JwtBearerEvents
    {
        OnMessageReceived = context =>
        {
            var token = context.Request.Headers["Authorization"].FirstOrDefault()?.Split(" ").Last();
            Console.WriteLine($"Raw Authorization header: {context.Request.Headers["Authorization"]}");
            Console.WriteLine($"Extracted token: {token}");
            return Task.CompletedTask;
        },
        OnAuthenticationFailed = context =>
        {
            Console.WriteLine($"Authentication failed: {context.Exception.GetType().Name} - {context.Exception.Message}");
            return Task.CompletedTask;
        },
        OnTokenValidated = context =>
        {
            Console.WriteLine("Token validated successfully");
            return Task.CompletedTask;
        }
    };
});

// Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Configure CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowClientApp", policy =>
    {
        // Restore specific CORS policy
        policy.WithOrigins("http://localhost:3000", "http://localhost:19006") // Allow specific frontend origins
              .WithMethods("GET", "POST", "PUT", "DELETE", "OPTIONS") // Explicitly allow needed methods + OPTIONS for preflight
              .WithHeaders("Content-Type", "Authorization", "Accept") // Explicitly allow common headers + Authorization
              .AllowCredentials(); // Allow cookies/auth headers
              //.SetIsOriginAllowed(origin => true); // Rely on WithOrigins explicitly
    });
});

var app = builder.Build();

// --- Add early exception logging middleware ---
app.Use(async (context, next) =>
{
    try
    {
        await next.Invoke();
    }
    catch (Exception ex)
    {
        // Log the exception details
        var logger = context.RequestServices.GetRequiredService<ILogger<Program>>();
        logger.LogError(ex, "Unhandled exception caught early in pipeline for request {Path}", context.Request.Path);

        // Optionally re-throw or handle the response
        // For now, just log and let the default error handling potentially take over
        // (or return a generic 500 if needed)
        if (!context.Response.HasStarted) // Avoid writing if response already started
        {
             context.Response.StatusCode = 500;
             await context.Response.WriteAsync("An unexpected server error occurred.");
        }
        // Do not re-throw if you handle the response here
    }
});
// --- End early exception logging middleware ---

// Seed the database
using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;
    try
    {
        DbInitializer.Initialize(services); // Restore seeding call
    }
    catch (Exception ex)
    {
        var logger = services.GetRequiredService<ILogger<Program>>();
        logger.LogError(ex, "An error occurred while seeding the database.");
    }
}

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "LinguaRead API V1");
    });
}

// IMPORTANT: Order matters for middleware
// Apply CORS policy *very* early, before routing
app.UseCors("AllowClientApp");

app.UseRouting();

// Serve static files from wwwroot (e.g., uploaded audio)
// Use default UseStaticFiles for general wwwroot content
app.UseStaticFiles();
// Explicitly serve audio_lessons directory with a specific request path
app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new PhysicalFileProvider(
        Path.Combine(builder.Environment.ContentRootPath, "wwwroot", "audio_lessons")),
    RequestPath = "/audio_lessons" // Map requests starting with /audio_lessons
});
// Ensure the base audiobooks directory exists before configuring static files for it
var audiobooksBasePath = Path.Combine(builder.Environment.ContentRootPath, "wwwroot", "audiobooks");
Directory.CreateDirectory(audiobooksBasePath); // This does nothing if the directory already exists

// Explicitly serve audiobooks directory
app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new PhysicalFileProvider(audiobooksBasePath), // Use the ensured path
    RequestPath = "/audiobooks" // Map requests starting with /audiobooks
});

// Apply CORS before authentication - Redundant comment, UseCors moved up
// app.UseCors("AllowClientApp"); // Moved up

app.UseAuthentication();
app.UseAuthorization();

// Only use HTTPS redirection in production
if (!app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}

app.MapControllers();

// Configure Kestrel to use port 5000
app.Urls.Clear();
app.Urls.Add("http://localhost:5000");

app.Run();