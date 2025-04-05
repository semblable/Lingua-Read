using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
using Microsoft.Extensions.Configuration;
using System.IO;

namespace LinguaReadApi.Data
{
    /// <summary>
    /// Factory for creating AppDbContext instances during design time (e.g., for EF Core Migrations).
    /// Reads the connection string from appsettings.json.
    /// </summary>
    public class DesignTimeDbContextFactory : IDesignTimeDbContextFactory<AppDbContext>
    {
        public AppDbContext CreateDbContext(string[] args)
        {
            // Build configuration
            IConfigurationRoot configuration = new ConfigurationBuilder()
                // Set base path to the project root where appsettings.json resides
                .SetBasePath(Directory.GetCurrentDirectory().Replace("Data", string.Empty)) // Adjust if factory is nested deeper
                .AddJsonFile("appsettings.json")
                // Optionally add environment-specific settings
                // .AddJsonFile($"appsettings.{Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") ?? "Production"}.json", optional: true)
                .Build();

            // Get connection string
            var connectionString = configuration.GetConnectionString("DefaultConnection");
            if (string.IsNullOrEmpty(connectionString))
            {
                throw new InvalidOperationException("Could not find connection string 'DefaultConnection'.");
            }

            // Create options builder
            var optionsBuilder = new DbContextOptionsBuilder<AppDbContext>();
            optionsBuilder.UseNpgsql(connectionString);

            // Return new instance of AppDbContext
            return new AppDbContext(optionsBuilder.Options);
        }
    }
}