# LinguaRead Installation Guide (Windows)

This guide outlines the steps required to install and run the LinguaRead application on a new Windows computer.

## 1. Prerequisites

Ensure the following software is installed on the target Windows machine:

*   **Git:** For cloning the source code repository. ([Download Git](https://git-scm.com/downloads))
*   **Node.js:** JavaScript runtime (includes npm). LTS version recommended. ([Download Node.js](https://nodejs.org/))
    *   Alternatively, **Yarn** can be used instead of npm. ([Install Yarn](https://classic.yarnpkg.com/en/docs/install))
*   **.NET SDK:** Version 8 or later is recommended based on the `README.md`. ([Download .NET SDK](https://dotnet.microsoft.com/download))
*   **PostgreSQL Server:** Database system. Version 12 or later recommended. ([Download PostgreSQL](https://www.postgresql.org/download/windows)) - Make sure to note the password you set for the default `postgres` user during installation, or create a new superuser.
*   **(Optional) pgAdmin:** A graphical tool for managing PostgreSQL databases, often included with the PostgreSQL installer.

## 2. Obtain Source Code

1.  Open **Command Prompt** or **PowerShell**.
2.  Navigate to the directory where you want to store the project (e.g., `C:\Projects`).
    ```bash
    cd C:\Projects
    ```
3.  Clone the project repository using Git:
    ```bash
    git clone <repository_url> LinguaRead
    cd LinguaRead
    ```
    Replace `<repository_url>` with the actual URL of your Git repository.

## 3. Database Setup (PostgreSQL)

1.  **Start PostgreSQL Server:** Ensure the PostgreSQL service is running (check Windows Services).
2.  **Create Database User:** Open `psql` (usually found in `C:\Program Files\PostgreSQL\<version>\bin`) or use pgAdmin. Log in as the `postgres` user (or another superuser). Create a dedicated user for the application:
    ```sql
    -- Replace 'new_username' and 'new_password' with secure credentials
    CREATE USER new_username WITH PASSWORD 'new_password';
    ```
3.  **Create Database:** Create the database that the application will use:
    ```sql
    -- Replace 'new_databasename' with your chosen name (e.g., LinguaReadDB)
    -- Replace 'new_username' with the user created above
    CREATE DATABASE new_databasename OWNER new_username;
    ```
4.  **Grant Privileges:** Ensure the user has the necessary permissions on the database:
    ```sql
    -- Replace 'new_databasename' and 'new_username' accordingly
    GRANT ALL PRIVILEGES ON DATABASE new_databasename TO new_username;
    ```

## 4. Backend Setup (.NET Core API)

1.  **Navigate to Backend Directory:** In your Command Prompt or PowerShell window:
    ```bash
    cd server\LinguaReadApi
    ```
2.  **Configure Settings via `.env` File:**
    *   The backend application reads configuration settings from a `.env` file located in the `server/LinguaReadApi` directory. Values in this file override defaults found in `appsettings.json`.
    *   Create a file named `.env` in the `server/LinguaReadApi` directory if it doesn't already exist.
    *   Add the following lines to the `.env` file, **replacing the placeholder values with your actual secrets and configuration**:

        ```dotenv
        # .env file for LinguaRead API Configuration
        # Use double underscore (__) to map to nested JSON properties

        # Database Connection String
        ConnectionStrings__DefaultConnection="Host=localhost;Database=new_databasename;Username=new_username;Password=new_password"

        # JWT Settings
        Jwt__Key="your_very_long_and_secure_jwt_secret_key_at_least_32_characters" # Generate a strong, unique key
        Jwt__Issuer="http://localhost:5000" # Adjust port if necessary
        Jwt__Audience="http://localhost:3000" # Adjust port if necessary
        Jwt__ExpiryInHours=24 # Or your desired expiry time

        # API Keys
        DeepL__ApiKey="your_deepl_api_key"
        Gemini__ApiKey="your_gemini_api_key"

        # Optional: PostgreSQL connection details for backup/restore scripts (if used)
        # PGHOST="localhost"
        # PGPORT="5432"
        # PGDATABASE="new_databasename"
        # PGUSER="new_username"
        # PGPASSWORD="new_password"
        ```
    *   **Important:** Ensure this `.env` file is **never** committed to version control (it should be listed in your `.gitignore` file).
3.  **Restore Dependencies:** In the `server\LinguaReadApi` directory:
    ```bash
    dotnet restore
    ```
4.  **Apply Database Migrations:** This creates the necessary tables.
    ```bash
    # Ensure you are in the server\LinguaReadApi directory
    dotnet ef database update --context AppDbContext
    ```
    *(Note: If `dotnet ef` command is not found, install it globally: `dotnet tool install --global dotnet-ef` and ensure the .NET tools directory is in your PATH)*

## 5. Frontend Setup (React Client)

1.  **Navigate to Frontend Directory:** In a *new* Command Prompt or PowerShell window (to ensure environment variables are loaded if needed for proxy settings, though less common for frontend):
    ```bash
    # From the project root directory (e.g., C:\Projects\LinguaRead)
    cd client\lingua-read-client
    ```
2.  **Configure API Endpoint (If Necessary):**
    *   Check `client\lingua-read-client\package.json` for a `"proxy"` setting. If it exists and points to the correct backend URL (e.g., `http://localhost:5000`), no action is needed.
    *   Check the frontend code (e.g., API service files) for usage of `process.env.REACT_APP_API_URL`. If used, create a file named `.env` in the `client\lingua-read-client` directory and add:
        ```dotenv
        REACT_APP_API_URL=http://localhost:5000 # Or the actual backend URL
        ```
3.  **Install Dependencies:**
    ```bash
    npm install
    # or
    yarn install
    ```

## 6. Running the Application

1.  **Start the Backend:**
    *   Open a Command Prompt or PowerShell in the `server\LinguaReadApi` directory.
    *   Run:
        ```bash
        dotnet run
        ```
    *   Note the URL the API is running on (e.g., `http://localhost:5000`).
2.  **Start the Frontend:**
    *   Open a *separate* Command Prompt or PowerShell in the `client\lingua-read-client` directory.
    *   Run:
        ```bash
        npm start
        # or
        yarn start
        ```
    *   This should open the application in your browser (e.g., `http://localhost:3000`).

## 7. Verification

Navigate to the frontend URL in your browser. Test login and core features to confirm the setup.

---