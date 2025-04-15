# -------- Build Stage --------
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Copy csproj and restore as distinct layers
COPY LinguaReadApi.csproj ./
RUN dotnet restore LinguaReadApi.csproj

# Copy the rest of the source code
COPY . ./

# Publish the application
RUN dotnet publish LinguaReadApi.csproj -c Release -o /app/publish

# -------- Runtime Stage --------
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app

# Copy published output from build stage
COPY --from=build /app/publish ./

# Install PostgreSQL client for pg_dump and pg_restore
USER root
RUN apt-get update && apt-get install -y --no-install-recommends postgresql-client && \
    rm -rf /var/lib/apt/lists/* # Clean up

# Create the directory the application needs at runtime and ensure correct ownership
RUN mkdir -p /app/wwwroot/audio_lessons && chown -R app:app /app/wwwroot/audio_lessons

# Change ownership of the rest of the app directory to the app user
RUN chown -R app:app /app

USER app

# Expose port 5000 (as set in Program.cs)
EXPOSE 5000

# Set environment variables for ASP.NET Core
ENV ASPNETCORE_URLS=http://+:5000

# Entrypoint
ENTRYPOINT ["dotnet", "LinguaReadApi.dll"]