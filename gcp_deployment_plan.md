# LinguaRead Deployment Plan for Google Cloud Platform (GCP)

This document outlines the steps to deploy the LinguaRead application (React frontend, .NET Core backend, PostgreSQL database) to Google Cloud Platform.

## Core Components & Deployment Needs

1.  **.NET Core Backend (`server/LinguaReadApi`):**
    *   Needs to be published (compiled into deployable artifacts).
    *   Requires a server environment with the .NET Runtime installed.
    *   Needs access to a PostgreSQL database.
    *   Requires configuration for:
        *   Production Database Connection String
        *   JWT Secret Key, Issuer, Audience
        *   DeepL API Key
        *   Gemini API Key
        *   Allowed CORS origins (the URL of your deployed frontend)
        *   `ASPNETCORE_ENVIRONMENT` set to `Production`.
    *   Needs persistent storage for `wwwroot/audio_lessons` and `wwwroot/audiobooks`. **Using Cloud Run requires migrating file storage to Google Cloud Storage (GCS).**
    *   Needs appropriate request body size limits configured on the hosting environment/reverse proxy (e.g., Cloud Run ingress settings or Load Balancer).

2.  **React Frontend (`client/lingua-read-client`):**
    *   Needs to be built into static HTML, CSS, and JavaScript files (`npm run build`).
    *   Requires configuration for the production backend API URL (via `REACT_APP_API_URL` environment variable during build).
    *   Needs a web server or static hosting service.

3.  **PostgreSQL Database:**
    *   Needs to be hosted somewhere accessible by the backend server.
    *   Database schema needs to be created/updated using Entity Framework migrations (`dotnet ef database update`).

## Proposed GCP Services

*   **Backend Compute:** Google Cloud Run (Serverless container platform)
*   **Frontend Hosting:** Firebase Hosting (Optimized for static/SPA hosting)
*   **Database:** Google Cloud SQL for PostgreSQL (Managed PostgreSQL service)
*   **Container Registry:** Google Artifact Registry (To store the backend Docker image)
*   **Secrets Management:** Google Secret Manager
*   **File Storage:** Google Cloud Storage (GCS) for user uploads (`audio_lessons`, `audiobooks`). **Requires backend code changes.**

## Deployment Plan Steps

1.  **GCP Project Setup:**
    *   Ensure a GCP project is created.
    *   Enable APIs: Cloud Run, Cloud SQL Admin, Secret Manager, Artifact Registry, Cloud Build (optional).
    *   Install and configure `gcloud` CLI and Docker locally.

2.  **Database Setup (Cloud SQL):**
    *   Create a Cloud SQL for PostgreSQL instance.
    *   Create a database (e.g., `linguaread_db`) and a user (e.g., `linguaread_user`).
    *   Note the database password securely.
    *   Note the **Instance connection name** (format: `project:region:instance`).
    *   Configure networking (Private IP recommended for Cloud Run connection).

3.  **Secrets Management (Secret Manager):**
    *   Store sensitive values as secrets: `db-password`, `jwt-key`, `deepl-api-key`, `gemini-api-key`.
    *   Grant the Cloud Run service account the "Secret Manager Secret Accessor" role.

4.  **File Storage (GCS - Recommended):**
    *   Create a GCS bucket (e.g., `linguaread-uploads`).
    *   Grant the Cloud Run service account appropriate roles (e.g., "Storage Object Admin").
    *   **(Code Change Required):** Modify backend code (`TextsController.cs`, etc.) to use the GCS SDK for uploads/serving instead of the local `wwwroot`.

5.  **Backend Dockerization:**
    *   Create a `Dockerfile` in `server/LinguaReadApi`:
      ```dockerfile
      # Stage 1: Build
      FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
      WORKDIR /source
      COPY *.csproj .
      RUN dotnet restore
      COPY . .
      RUN dotnet publish -c Release -o /app/publish --no-restore

      # Stage 2: Runtime
      FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
      WORKDIR /app
      COPY --from=build /app/publish .
      EXPOSE 8080
      ENV ASPNETCORE_URLS=http://+:8080
      ENTRYPOINT ["dotnet", "LinguaReadApi.dll"]
      ```
    *   Create a `.dockerignore` file.

6.  **Backend Build & Push (Artifact Registry):**
    *   Configure Docker auth: `gcloud auth configure-docker YOUR_REGION-docker.pkg.dev`
    *   Build: `docker build -t YOUR_REGION-docker.pkg.dev/YOUR_PROJECT_ID/linguaread/api:latest -f server/LinguaReadApi/Dockerfile .`
    *   Push: `docker push YOUR_REGION-docker.pkg.dev/YOUR_PROJECT_ID/linguaread/api:latest`

7.  **Backend Deployment (Cloud Run):**
    *   Deploy using `gcloud run deploy`:
      ```bash
      gcloud run deploy linguaread-api \
        --image YOUR_REGION-docker.pkg.dev/YOUR_PROJECT_ID/linguaread/api:latest \
        --platform managed \
        --region YOUR_REGION \
        --allow-unauthenticated \
        --add-cloudsql-instances YOUR_PROJECT_ID:YOUR_REGION:YOUR_INSTANCE_NAME \
        --set-secrets=db-password=db-password:latest,jwt-key=jwt-key:latest,deepl-api-key=deepl-api-key:latest,gemini-api-key=gemini-api-key:latest \
        --set-env-vars=ASPNETCORE_ENVIRONMENT=Production,ConnectionStrings__DefaultConnection="Host=/cloudsql/YOUR_PROJECT_ID:YOUR_REGION:YOUR_INSTANCE_NAME;Database=linguaread_db;Username=linguaread_user;Password=SECRET_PLACEHOLDER",Jwt__Issuer=YOUR_ISSUER_URL,Jwt__Audience=YOUR_AUDIENCE_URL \
        --update-labels=app=linguaread,tier=backend
        # Add GCS_BUCKET_NAME env var if using GCS
      ```
    *   Replace placeholders. Note the **Service URL**.

8.  **Database Migration:**
    *   Use Cloud SQL Auth Proxy locally or a Cloud Build step to run `dotnet ef database update`.

9.  **Frontend Deployment (Firebase Hosting):**
    *   Install Firebase CLI, login (`firebase login`), init (`firebase init hosting`).
    *   Configure `firebase.json`: public directory `build`, configure as SPA.
    *   Create `.env.production` in `client/lingua-read-client`: `REACT_APP_API_URL=YOUR_CLOUD_RUN_SERVICE_URL`.
    *   Build: `cd client/lingua-read-client && npm run build`
    *   Deploy: `firebase deploy --only hosting`

10. **DNS & HTTPS (Optional Custom Domain):**
    *   Use the provided `*.web.app` domain or configure a custom domain in Firebase Hosting.

11. **CORS Configuration:**
    *   Update the backend's allowed origins (via Cloud Run environment variables) to include your Firebase Hosting URL(s). Redeploy Cloud Run service.

12. **Testing:** Thoroughly test the deployed application via the Firebase Hosting URL.

## Architecture Diagram

```mermaid
graph TD
    subgraph User Browser
        FB[Firebase Hosting Frontend]
    end

    subgraph Google Cloud Platform
        CR[Cloud Run Backend API]
        AR[Artifact Registry (Docker Image)]
        CSQL[Cloud SQL PostgreSQL]
        SM[Secret Manager]
        GCS[Cloud Storage (Uploads)]
        CB[Cloud Build (Optional CI/CD)]
    end

    User -- HTTPS --> FB
    FB -- API Calls (HTTPS) --> CR
    CR -- Reads/Writes --> CSQL
    CR -- Reads Secrets --> SM
    CR -- Reads/Writes --> GCS
    Developer -- docker push / build trigger --> AR
    CR -- Pulls Image --> AR
    Developer/CI -- Build Trigger --> CB
    CB -- Pushes --> AR
    CB -- Deploys --> CR
    CB -- Deploys --> FB

    style FB fill:#f9f,stroke:#333,stroke-width:2px
    style CR fill:#ccf,stroke:#333,stroke-width:2px
    style CSQL fill:#fcc,stroke:#333,stroke-width:2px
    style GCS fill:#fcf,stroke:#333,stroke-width:2px
    style SM fill:#ffc,stroke:#333,stroke-width:2px
    style AR fill:#cff,stroke:#333,stroke-width:2px
    style CB fill:#cfc,stroke:#333,stroke-width:2px