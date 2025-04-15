# LinguaRead

## Overview

LinguaRead is a web application for contextual language learning, inspired by Learning With Texts (LWT). It enhances vocabulary and reading comprehension by allowing users to read texts where words are dynamically highlighted based on familiarity levels (New to Known). Features include easy tooltip/click translations and content integration via modern APIs, delivering an interactive learning environment focused on reading immersion.

## Important Notice

This is an early version of the application and is still under active development. As such:

*   The application may contain bugs or incomplete features
*   Some functionality might not work as expected
*   The user interface and features may change significantly in future versions
*   It is not yet intended for use
*   LinguaRead is free, open-source software provided under the MIT License. You're welcome to use it for any reason, make changes, share it, and incorporate it into other products without cost.

## Key Features

*   **AI-Powered Lesson Generation:** Creates reading materials (lessons/stories) using Google Gemini Pro based on user prompts.
*   **Advanced Translation:** Integrates with the DeepL API for accurate word and phrase translations.
*   **Vocabulary Management:** Tracks the learning status of words.
*   **Interactive Reading:** Displays text with words color-coded by learning status. Hovering/clicking shows translations.
*   **Term Selection:** Allows selecting single words or multi-word phrases for translation and saving.
*   **Book Management:** Import longer texts by pasting content or uploading `.txt` and `.epub` files. Books are automatically split into lessons, and reading progress is tracked. Supports adding multiple tags to books for organization.
*   **Audio Lessons:** Upload audio (e.g., MP3) and corresponding SRT subtitles for synchronized listening/reading ("karaoke-style").
*   **User Customization:** Settings for theme (Light/Dark/System), text size, font, and translation behavior.
*   **Statistics:** Insights into reading activity, listening time (per language, per day), and vocabulary progress. Includes filtering by various time periods (Today, 7/30/90/180 Days, All Time).
*   **Batch Operations:** Translate all words, mark all as known, create audio lessons in batches.
*   **Listening Time Tracking:** Automatically tracks time spent actively listening to audio lessons and audiobooks.
*   **Terms Management Page:**
    *   View all saved terms by language.
    *   Filter by learning status (1-5).
    *   Search by term or translation.
    *   Sort by term, status, or date added (default: newest first).
    *   Export all terms or filtered terms as CSV.
    *   Import terms from CSV with optional status.
    *   Remembers last selected language.
*   **Audiobook Player:** Upload MP3 files for a book to create a persistent audiobook playlist. Tracks playback progress per book and integrates listening time into statistics.

## Language Management

LinguaRead supports a wide range of languages with customizable settings, including:

*   Right-to-left (RTL) support
*   Parser type (space-delimited, MeCab, Jieba, etc.)
*   Character substitutions for normalization
*   Sentence splitting rules
*   Word character sets
*   Dictionaries and translation sources

### Updating Language Data

Languages can be configured and updated via the **Manage Languages** UI in the app. You can:

*   Add new languages
*   Edit existing language settings
*   Configure dictionaries and parsing rules
*   Enable or disable languages for translation and content creation

### Impact on Features

Language settings influence:

*   Text parsing and sentence splitting
*   Dictionary lookups
*   Translation behavior
*   Batch audio lesson language selection

---

## Technology Stack

*   **Frontend:** React (using Create React App)
*   **Backend:** .NET Core (C#)
*   **Database:** PostgreSQL
*   **APIs:** Google Gemini Pro, DeepL

---

## Setup and Running

*(Instructions below provide basic setup. Ensure database connection and API keys are configured.)*

### Prerequisites

*   Node.js and npm/yarn
*   .NET SDK (e.g., .NET 8 or later)
*   PostgreSQL Server

### Backend Setup

```bash
# Navigate to backend directory
cd server/LinguaReadApi

# Restore dependencies
dotnet restore

# Update database (ensure connection string in appsettings.json is correct)
dotnet ef database update --context AppDbContext

# Configure API keys and JWT settings in the root `.env` file (in the Lingua_Read directory)
# Ensure the following keys are present:
# - DEEPL_API_KEY
# - GEMINI_API_KEY
# - JWT_KEY (must be sufficiently long and secret)
# Note: JWT_ISSUER, JWT_AUDIENCE, and JWT_EXPIRY_IN_HOURS are typically set via docker-compose.yml for containerized environments.

# Run the backend server
dotnet run
```

### Frontend Setup

```bash
# Navigate to frontend directory
cd client/lingua-read-client

# Install dependencies
npm install
# or
yarn install

# Run the frontend development server
npm start
# or
yarn start
```

---

## Docker Setup (Recommended)

This is the recommended way to run LinguaRead, as it manages the database, backend, and frontend services together.

### Prerequisites

*   [Docker](https://docs.docker.com/get-docker/)

### Configuration (`.env` file)

Before running the application with Docker Compose, you need to create a `.env` file in the **`Lingua_Read` directory** (where the `docker-compose.yml` file is located). This file stores configuration secrets and settings.

1.  **Copy the example:** You can create a `.env` file by copying the structure below.
2.  **Set Database Credentials:** Change `your_secure_postgres_password_here` to a secure password for the database user.
3.  **Generate JWT Key:** Replace the example `JWT_KEY` with a new, secure, random string (at least 32 characters long). You can use online generators or tools like `openssl rand -base64 32`.
4.  **(Optional but Recommended) API Keys:**
    *   **DeepL:** For high-quality translations, sign up for a DeepL API key (the free tier is usually sufficient for moderate use) and replace the placeholder `your_deepl_api_key_or_leave_empty`.
    *   **Gemini:** For AI story generation, obtain a Google Gemini API key (free tier available) and replace the placeholder `your_gemini_api_key_or_leave_empty`.
    *   *Note:* Using the application without these keys will disable translation and story generation features. Using free tiers is recommended to avoid unexpected charges.

**Example `.env` file:**

```env
# PostgreSQL configuration
POSTGRES_DB=linguaread_db
POSTGRES_USER=linguaread_user
POSTGRES_PASSWORD=your_secure_postgres_password_here

# JWT secret key for backend (Generate a new, secure 32+ character key)
JWT_KEY="replace_this_with_your_very_long_and_secure_random_jwt_key"

# DeepL API key for backend (Optional - Get from DeepL website, free tier recommended)
DEEPL_API_KEY="your_deepl_api_key_or_leave_empty"

# Gemini API key for backend (Optional - Get from Google AI Studio, no billing enabled recommended)
GEMINI_API_KEY="your_gemini_api_key_or_leave_empty"
```

### Running the Application

1.  Open a terminal **inside the `Lingua_Read` directory** (where `docker-compose.yml` is located).
2.  Build and start the services in detached mode:

    ```bash
    docker-compose up --build -d
    ```

3.  The application should now be accessible in your web browser, typically at `http://localhost`.

### Stopping the Application

```bash
docker-compose down
```

### Accessing Services

*   **Frontend:** `http://localhost` (Port 80)
*   **Backend API:** `http://localhost:5000` (Proxied via frontend at `/api`)
*   **Database (Direct):** `localhost:5432` (Use credentials from `.env` if connecting with a DB tool)

---

## License

MIT License

Copyright (c) 2025 LinguaRead

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
