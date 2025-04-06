# LinguaRead

## Overview

LinguaRead is a web-based language learning application designed to help users improve their vocabulary and reading comprehension through contextual learning. It leverages modern APIs for content generation and translation, providing an interactive reading experience.

The core concept involves users reading texts or stories in their target language. The application highlights words based on the user's familiarity level (New, Learning, Familiar, Advanced, Known) and provides easy access to translations via tooltips or clicks.

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
*   **Listening Time Tracking:** Automatically tracks time spent actively listening to audio lessons.
 
## Technology Stack

*   **Frontend:** React (using Create React App)
*   **Backend:** .NET Core (C#)
*   **Database:** PostgreSQL
*   **APIs:** Google Gemini Pro, DeepL

## Setup and Running

*(Instructions TBD - Add details on how to set up the database, configure API keys, build, and run the frontend and backend servers)*

### Prerequisites

*   Node.js and npm/yarn
*   .NET SDK (specify version)
*   PostgreSQL Server

### Backend Setup

```bash
# Navigate to backend directory
cd server/LinguaReadApi

# Restore dependencies
dotnet restore

# Update database (ensure connection string in appsettings.json is correct)
# This command applies pending migrations. The initial setup uses ASP.NET Core Identity.
dotnet ef database update --context AppDbContext
 
# Configure API keys and JWT settings in server/LinguaReadApi/.env file (create if needed)
# Example .env content:
# DEEPL_AUTH_KEY=your_deepl_key
# GEMINI_API_KEY=your_gemini_key
# JWT_KEY=your_super_secret_jwt_key_at_least_32_chars
# JWT_ISSUER=YourAppNameOrDomain
# JWT_AUDIENCE=YourAppNameOrDomain
# JWT_EXPIRY_IN_HOURS=24
# ...

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

## Contributing

*(Optional: Add guidelines for contributing if applicable)*

## License

*(Optional: Specify the project license, e.g., MIT)*