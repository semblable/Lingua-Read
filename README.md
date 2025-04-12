# LinguaRead

## Overview

LinguaRead is a web-based language learning application designed to help users improve their vocabulary and reading comprehension through contextual learning. It leverages modern APIs for content generation and translation, providing an interactive reading experience.

The core concept involves users reading texts or stories in their target language. The application highlights words based on the user's familiarity level (New, Learning, Familiar, Advanced, Known) and provides easy access to translations via tooltips or clicks.

## Key Features

- **AI-Powered Lesson Generation:** Creates reading materials (lessons/stories) using Google Gemini Pro based on user prompts.
- **Advanced Translation:** Integrates with the DeepL API for accurate word and phrase translations.
- **Vocabulary Management:** Tracks the learning status of words.
- **Interactive Reading:** Displays text with words color-coded by learning status. Hovering/clicking shows translations.
- **Term Selection:** Allows selecting single words or multi-word phrases for translation and saving.
- **Book Management:** Import longer texts by pasting content or uploading `.txt` and `.epub` files. Books are automatically split into lessons, and reading progress is tracked. Supports adding multiple tags to books for organization.
- **Audio Lessons:** Upload audio (e.g., MP3) and corresponding SRT subtitles for synchronized listening/reading ("karaoke-style").
- **User Customization:** Settings for theme (Light/Dark/System), text size, font, and translation behavior.
- **Statistics:** Insights into reading activity, listening time (per language, per day), and vocabulary progress. Includes filtering by various time periods (Today, 7/30/90/180 Days, All Time).
- **Batch Operations:** Translate all words, mark all as known, create audio lessons in batches.
- **Listening Time Tracking:** Automatically tracks time spent actively listening to audio lessons and audiobooks.
- **Terms Management Page:**
  - View all saved terms by language.
  - Filter by learning status (1-5).
  - Search by term or translation.
  - Sort by term, status, or date added (default: newest first).
  - Export all terms or filtered terms as CSV.
  - Import terms from CSV with optional status.
  - Remembers last selected language.
- **Audiobook Player:** Upload MP3 files for a book to create a persistent audiobook playlist. Tracks playback progress per book and integrates listening time into statistics.

## Language Management

LinguaRead supports a wide range of languages with customizable settings, including:

- **Right-to-left (RTL) support**
- **Parser type** (space-delimited, MeCab, Jieba, etc.)
- **Character substitutions** for normalization
- **Sentence splitting rules**
- **Word character sets**
- **Dictionaries and translation sources**

### Updating Language Data

Languages can be configured and updated via the **Manage Languages** UI in the app. You can:

- Add new languages
- Edit existing language settings
- Configure dictionaries and parsing rules
- Enable or disable languages for translation and content creation

### CSV Import

Initial language data was imported from a detailed CSV file, which included:

- Dictionaries
- Parsing rules
- RTL flags
- Scripts and fonts

This data has been integrated into the database. You can further customize languages via the UI without re-importing CSVs.

### Impact on Features

Language settings influence:

- **Text parsing and sentence splitting**
- **Dictionary lookups**
- **Translation behavior**
- **Batch audio lesson language selection**

---

## Technology Stack

- **Frontend:** React (using Create React App)
- **Backend:** .NET Core (C#)
- **Database:** PostgreSQL
- **APIs:** Google Gemini Pro, DeepL

## Setup and Running

*(Instructions below provide basic setup. Ensure database connection and API keys are configured.)*

### Prerequisites

- Node.js and npm/yarn
- .NET SDK (e.g., .NET 8 or later)
- PostgreSQL Server

### Backend Setup

```bash
# Navigate to backend directory
cd server/LinguaReadApi

# Restore dependencies
dotnet restore

# Update database (ensure connection string in appsettings.json is correct)
dotnet ef database update --context AppDbContext

# Configure API keys and JWT settings in server/LinguaReadApi/.env file
# Ensure the following keys are present:
# - DEEPL_AUTH_KEY
# - GEMINI_API_KEY
# - JWT_KEY (must be sufficiently long and secret)
# - JWT_ISSUER (e.g., http://localhost:5000)
# - JWT_AUDIENCE (e.g., http://localhost:3000)
# - JWT_EXPIRY_IN_HOURS (e.g., 24)

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

## CSV Import/Export Format for Terms

- **Columns:** `Term`, `Translation`, `Status` (optional)
- **Status:** Integer 1-5 (1=New, 5=Known)
- **Language:** Determined by the selected language in the UI during import/export
- **Example:**

```csv
Term,Translation,Status
bonjour,hello,5
merci,thank you,4
oui,yes,
non,no,1
chat,cat,
chien,dog,3
maison,house,
livre,book,2
```

## Contributing

*(Optional: Add guidelines for contributing if applicable)*

## License

*(Optional: Specify the project license, e.g., MIT)*