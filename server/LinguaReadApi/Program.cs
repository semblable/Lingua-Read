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

// --- Load .env file ---
Env.Load(); // <-- Load environment variables from .env file

var builder = WebApplication.CreateBuilder(args);

// --- Add Kestrel Configuration ---
builder.WebHost.ConfigureKestrel(serverOptions =>
{
    // Set a higher limit for the request body size (e.g., 100 MB)
    // Adjust this value based on expected maximum file sizes
    serverOptions.Limits.MaxRequestBodySize = 100 * 1024 * 1024; // 100 MB
});

// --- Add Form Options Configuration ---
builder.Services.Configure<FormOptions>(options =>
{
    // Ensure this limit is also high enough for multipart requests
    options.MultipartBodyLengthLimit = 100 * 1024 * 1024; // 100 MB
    // You might need to adjust other limits depending on your form data
    options.ValueLengthLimit = int.MaxValue; // Or a specific large value
    options.KeyLengthLimit = int.MaxValue;   // Or a specific large value
    options.ValueCountLimit = int.MaxValue; // Or a specific large value
    options.MemoryBufferThreshold = int.MaxValue; // Buffer large uploads to disk
});

// Add services to the container.
builder.Services.AddControllers();
// Configure DbContext with PostgreSQL
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

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
        policy.WithOrigins("http://localhost:3000", "http://localhost:19006")
              .AllowAnyMethod()
              .AllowAnyHeader() // Revert back to AllowAnyHeader
              //.WithHeaders("Authorization", "Content-Type") // Remove specific headers for now
              .AllowCredentials();
              //.SetIsOriginAllowed(origin => true); // Rely on WithOrigins explicitly
    });
});

var app = builder.Build();

// Seed the database
using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;
    try
    {
        DbInitializer.Initialize(services);
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
app.UseRouting();

// Apply CORS policy early, before endpoints that need it
app.UseCors("AllowClientApp");

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