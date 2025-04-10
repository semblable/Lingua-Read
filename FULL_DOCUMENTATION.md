# LinguaRead - Complete Documentation

---

## Table of Contents

1. [Introduction](#introduction)
2. [Features](#features)
3. [Architecture](#architecture)
4. [Backend API](#backend-api)
5. [Frontend Application](#frontend-application)
6. [Setup & Installation](#setup--installation)
7. [Deployment](#deployment)
8. [Language Management](#language-management)
9. [Contributing](#contributing)
10. [License](#license)

---

## Introduction

**LinguaRead** is a web-based language learning platform designed to improve vocabulary and reading comprehension through contextual, interactive reading experiences. It leverages AI-powered content generation and advanced translation services to provide personalized lessons and insights.

---

## Features

### AI-Powered Lesson Generation
- Generate reading materials using Google Gemini Pro based on user prompts.
- Supports story creation tailored to user interests.

### Advanced Translation
- Integrates with DeepL API for accurate word and phrase translations.
- Sentence-level translations via Gemini.

### Vocabulary Management
- Tracks user familiarity with words (New, Learning, Familiar, Advanced, Known).
- Allows saving single words or multi-word phrases.
- Batch operations: translate all, mark all as known, export/import CSV.

### Interactive Reading
- Color-coded words by familiarity.
- Hover or click to view translations.
- Multi-word term selection.

### Book Management
- Import `.txt` and `.epub` files.
- Books split into lessons automatically.
- Tagging system for organization.
- Tracks reading progress.

### Audio Lessons
- Upload MP3 and SRT subtitle files.
- Synchronized listening and reading ("karaoke-style").
- Batch audio lesson creation.

### Audiobook Player
- Upload multiple MP3s per book.
- Persistent playlist with progress tracking.
- Listening time integrated into statistics.

### User Customization
- Theme (Light/Dark/System).
- Text size, font.
- Translation behavior.

### Statistics
- Reading activity, listening time.
- Per language, per day.
- Filter by Today, 7/30/90/180 days, All Time.

### Language Management
- Add/edit languages.
- Configure parsing, dictionaries, RTL support.
- Import/export language data.

---

## Architecture

### High-Level Overview

LinguaRead is a **full-stack** application with:

- **Frontend:** React (Create React App)
- **Backend:** ASP.NET Core Web API
- **Database:** PostgreSQL
- **External APIs:** Google Gemini Pro, DeepL

### Component Diagram

```mermaid
graph TD
    A[User Browser] --> B(React Frontend);
    B --> C{Backend API (.NET)};
    C --> D[PostgreSQL Database];
    C --> E[DeepL API];
    C --> F[Gemini API];

    subgraph LinguaRead System
        B
        C
        D
    end

    subgraph External Services
        E
        F
    end
```

---

## Backend API

### Technologies
- ASP.NET Core
- Entity Framework Core (PostgreSQL)
- ASP.NET Identity with JWT Authentication
- Swagger/OpenAPI

### Key Components

- **Controllers:** REST API endpoints
- **Services:** Business logic (Translation, Story Generation, Language, User Activity)
- **Models:** Database entities
- **Data:** EF Core DbContext, migrations, seeding

### Authentication
- JWT Bearer tokens
- User registration & login via `/api/auth`
- Token validation middleware

### API Endpoints Overview

| Controller | Routes & Methods | Description |
|------------|------------------|-------------|
| **AuthController** | `/api/auth/register` (POST), `/api/auth/login` (POST) | User registration and login |
| **BooksController** | `/api/books` (GET, POST), `/api/books/{id}` (GET, PUT, DELETE), `/api/books/upload` (POST), `/api/books/{id}/audiobook` (POST) | Manage books, upload, audiobook |
| **TextsController** | `/api/texts` (GET, POST), `/api/texts/{id}` (GET, PUT, DELETE), `/api/texts/audio` (POST), `/api/texts/audio/batch` (POST) | Manage lessons/texts, audio lessons |
| **WordsController** | `/api/words` (POST), `/api/words/{id}` (GET, PUT), `/api/words/language/{languageId}` (GET), `/api/words/batch` (POST), `/api/words/export` (GET) | Manage vocabulary |
| **TranslationController** | `/api/translation` (POST), `/api/translation/languages` (GET), `/api/translation/batch` (POST) | Translation services |
| **LanguagesController** | `/api/languages` (GET, POST), `/api/languages/{id}` (GET, PUT, DELETE) | Manage languages |
| **StoryGenerationController** | `/api/storygeneration` (POST) | AI story generation |
| **SentenceTranslationController** | `/api/sentencetranslation` (POST), `/api/sentencetranslation/full-text` (POST) | Sentence-level translation |
| **UserActivityController** | `/api/useractivity/logListening` (POST), `/api/useractivity/logManual` (POST), `/api/useractivity/reading` (GET), `/api/useractivity/listening` (GET), `/api/useractivity/audiobookprogress` (PUT, GET) | Track user activity |
| **UserSettingsController** | `/api/usersettings` (GET, PUT), `/api/usersettings/audiobook-progress` (PUT) | User preferences |
| **UsersController** | `/api/users/statistics` (GET), `/api/users/reading-activity` (GET), `/api/users/listening-activity` (GET) | User stats |
| **AdminController** | `/api/admin/backup` (GET), `/api/admin/restore` (POST) | Backup & restore |
| **DataManagementController** | `/api/datamanagement/backup` (GET), `/api/datamanagement/restore` (POST) | Data management |
| **HealthController** | `/api/health` (GET), `/api/health/stats` (GET), `/api/health/activity` (GET) | Health checks |

### Data Model (Simplified ERD)

```mermaid
erDiagram
    USER ||--o{ TEXT : creates
    USER ||--o{ BOOK : creates
    USER ||--o{ WORD : knows
    USER ||--o{ USER_ACTIVITY : performs
    USER ||--|{ USER_SETTINGS : has
    USER ||--o{ USER_BOOK_PROGRESS : tracks
    USER ||--o{ USER_LANGUAGE_STATISTICS : accumulates

    LANGUAGE ||--o{ TEXT : written_in
    LANGUAGE ||--o{ BOOK : written_in
    LANGUAGE ||--o{ WORD : belongs_to
    LANGUAGE ||--o{ USER_ACTIVITY : related_to
    LANGUAGE ||--o{ LANGUAGE_DICTIONARY : has
    LANGUAGE ||--o{ LANGUAGE_SENTENCE_SPLIT_EXCEPTION : has
    LANGUAGE ||--o{ USER_LANGUAGE_STATISTICS : related_to

    BOOK ||--o{ TEXT : contains
    BOOK ||--o{ BOOK_TAG : has
    BOOK ||--o{ AUDIOBOOK_TRACK : has
    BOOK ||--o{ USER_BOOK_PROGRESS : progress_for
    BOOK ||--o? TEXT : last_read

    TEXT ||--o{ TEXT_WORD : contains_instance_of

    WORD ||--|{ WORD_TRANSLATION : has
    WORD ||--o{ TEXT_WORD : instance_in

    TAG ||--o{ BOOK_TAG : applied_to

    AUDIOBOOK_TRACK ||--o? USER_BOOK_PROGRESS : current_track_for

    TEXT_WORD { int TextWordId PK, int TextId FK, int WordId FK, int Position }
    BOOK_TAG { int BookId PK, FK, int TagId PK, FK }
    USER_BOOK_PROGRESS { Guid UserId PK, FK, int BookId PK, FK, int CurrentAudiobookTrackId FK "Nullable", float CurrentAudiobookTime }
    USER_LANGUAGE_STATISTICS { int UserLanguageStatisticsId PK, Guid UserId FK, int LanguageId FK, int WordsRead, int KnownWords, int ListeningSeconds }
```

---

## Frontend Application

### Technologies
- React (Create React App)
- Context API for settings
- REST API calls via `utils/api.js`
- CSS for styling

### Structure

- **Entry Point:** `index.js`, `App.js`
- **Pages:** Home, BookList, BookDetail, TextList, TextCreate, TermsPage, Statistics, UserSettings, Login, Register, BatchAudioCreate, CreateAudioLesson
- **Components:** Navigation, TranslationPopup, AudiobookPlayer, ManualEntryModal, UserSettings, Auth (Login/Register), Settings (LanguagesPage, LanguageForm), Texts (TextCreate, TextList, TextDisplay)
- **Contexts:** `SettingsContext.js`
- **Utils:** API calls, helpers, storage

### Routing
- Likely uses `react-router-dom` (confirm in `App.js`)
- Routes for all main pages

### State Management
- Context API for user settings
- Local component state
- Possibly localStorage/sessionStorage via `utils/storage.js`

### API Communication
- `utils/api.js` handles backend requests
- JWT token stored and sent with requests

---

## Setup & Installation

### Prerequisites
- Node.js & npm/yarn
- .NET SDK (8+)
- PostgreSQL server
- API keys for DeepL and Gemini

### Backend Setup

```bash
cd server/LinguaReadApi
dotnet restore
dotnet ef database update --context AppDbContext
# Configure .env with:
# DEEPL_AUTH_KEY, GEMINI_API_KEY, JWT_KEY, JWT_ISSUER, JWT_AUDIENCE, JWT_EXPIRY_IN_HOURS
dotnet run
```

### Frontend Setup

```bash
cd client/lingua-read-client
npm install
npm start
# or
yarn install
yarn start
```

---

## Deployment

- Backend can be deployed as an ASP.NET Core Web API (IIS, Linux, Docker, etc.)
- Frontend can be built with `npm run build` and served via static hosting (Netlify, Vercel, Azure Static Web Apps, etc.)
- Environment variables and API keys must be configured securely
- PostgreSQL database must be accessible to backend

---

## Language Management

- Supports many languages with:
  - RTL support
  - Parser types (space-delimited, MeCab, Jieba, etc.)
  - Character substitutions
  - Sentence splitting rules
  - Dictionaries
- Configurable via UI
- CSV import/export supported

---

## Contributing

- Follow standard Git workflow
- Use feature branches
- Submit pull requests with clear descriptions
- Follow code style guidelines

---

## License

*(Specify license, e.g., MIT)*

---

# End of Documentation