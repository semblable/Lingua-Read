# Stage 1: Build the ASP.NET Core application
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Copy the project file first to leverage Docker layer caching
COPY ["server/LinguaReadApi/LinguaReadApi.csproj", "server/LinguaReadApi/"]
# Copy solution file if needed for restore (optional but good practice)
# COPY ["Lingua_Read.sln", "."]
RUN dotnet restore "server/LinguaReadApi/LinguaReadApi.csproj"

# Copy the rest of the source code
COPY . .

# Set the working directory to the project folder before building
WORKDIR "/src/server/LinguaReadApi"
RUN dotnet build "LinguaReadApi.csproj" -c Release -o /app/build

# Stage 2: Publish the application
FROM build AS publish
# No need to change WORKDIR, it's inherited
RUN dotnet publish "LinguaReadApi.csproj" -c Release -o /app/publish /p:UseAppHost=false

# Stage 3: Create the final runtime image
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app
# Expose the port the application will listen on.
# Use 8080 for HTTP by default in ASP.NET Core Kestrel within containers.
EXPOSE 8080
# Copy the published output from the publish stage
COPY --from=publish /app/publish .
# Set the entry point for the container
ENTRYPOINT ["dotnet", "LinguaReadApi.dll"]