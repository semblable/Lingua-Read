using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
using Microsoft.Extensions.Configuration;
using System.IO;
using DotNetEnv; // Assuming DotNetEnv is used to load .env files

namespace LinguaReadApi.Data
{
    /// <summary>
    /// Factory for creating AppDbContext instances during design time (e.g., for EF migrations).
    /// This allows tools to discover and use configuration sources like .env files
    /// that might not be loaded by default during the design-time build process.
    /// </summary>
    public class DesignTimeDbContextFactory : IDesignTimeDbContextFactory<AppDbContext>
    {
        public AppDbContext CreateDbContext(string[] args)
        {
            // Determine the path to the .env file relative to the project root
            // Adjust the path if your .env file is located elsewhere
            string projectPath = Directory.GetCurrentDirectory(); // This should be server/LinguaReadApi when running 'dotnet ef'
            string envFilePath = Path.Combine(projectPath, ".env");

            // Load the .env file if it exists
            if (File.Exists(envFilePath))
            {
                Env.Load(envFilePath);
            }
            else
            {
                // Optionally, try loading from parent directory if .env is at solution root
                string solutionEnvPath = Path.Combine(projectPath, "..", ".env");
                if (File.Exists(solutionEnvPath))
                {
                    Env.Load(solutionEnvPath);
                }
                // Consider logging a warning if .env is not found, but proceed
                // as connection string might be available via other environment variables.
            }


            // Build configuration that includes environment variables
            // DotNetEnv typically loads .env variables into the process environment
            IConfigurationRoot configuration = new ConfigurationBuilder()
                .AddEnvironmentVariables()
                .Build();

            var optionsBuilder = new DbContextOptionsBuilder<AppDbContext>();

            // Get the connection string from configuration (loaded from .env via environment variables)
            // Ensure the key matches the one used in your .env file (e.g., "DefaultConnection", "POSTGRES_CONNECTION_STRING")
            string? connectionString = configuration.GetConnectionString("DefaultConnection");

            if (string.IsNullOrEmpty(connectionString))
            {
                // Fallback or alternative key if needed
                connectionString = configuration["POSTGRES_CONNECTION_STRING"]; // Example alternative key
            }

            if (string.IsNullOrEmpty(connectionString))
            {
                throw new InvalidOperationException("Could not find database connection string. Ensure it's set in the .env file or environment variables (e.g., DefaultConnection or POSTGRES_CONNECTION_STRING).");
            }

            optionsBuilder.UseNpgsql(connectionString);

            return new AppDbContext(optionsBuilder.Options);
        }
    }
}