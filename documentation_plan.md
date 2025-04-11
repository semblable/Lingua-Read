# LinguaRead Documentation Plan

This document outlines the plan for creating comprehensive documentation for the LinguaRead application.

## 1. Introduction & Overview

*   **Purpose:** Briefly restate the application's goal (language learning via contextual reading).
*   **Core Concepts:** Explain the key ideas (word status tracking, interactive reading, AI generation, translation). (Leverage existing README)
*   **Target Audience:** Define who the documentation is for (e.g., developers, administrators).

## 2. Features Deep Dive

*   Expand significantly on the "Key Features" section from the README.
*   For each feature (e.g., Lesson Generation, Translation, Vocabulary Management, Book Management, Audio Lessons, Statistics, Terms Management, Audiobook Player, Language Management), provide:
    *   Detailed description of functionality.
    *   User workflow (how to use the feature).
    *   Relevant UI components (briefly mention).
    *   Underlying mechanisms (e.g., which API is used, relevant backend services).

## 3. Architecture

*   **High-Level Overview:** Describe the client-server architecture (React Frontend, .NET Backend).
*   **Technology Stack:** List all core technologies, libraries, and frameworks used. (Leverage README)
*   **Diagrams:**
    *   Component Diagram:
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
    *   Potential Sequence Diagrams for key workflows.

## 4. Backend (.NET API)

*   **Project Structure:** Overview of the `server/LinguaReadApi` directory structure (Controllers, Services, Models, Data, etc.).
*   **API Endpoints:**
    *   List all controllers and their primary responsibilities.
    *   Document key endpoints: Route, HTTP Method, Request Body/Query Params, Response Format, Authentication required? (Based on `list_code_definition_names` output).
*   **Services Layer:** Describe the purpose of each service interface (`ITranslationService`, `ILanguageService`, etc.) and its implementation.
*   **Data Model (Database):**
    *   Detailed explanation of each entity in `Models` (properties, purpose).
    *   Explain the relationships defined in `AppDbContext`.
    *   Include an Entity-Relationship Diagram (ERD):
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
*   **Authentication & Authorization:** Explain the JWT setup (`Program.cs`, `AuthController`).
*   **Configuration:** Detail required environment variables (`.env`) and settings in `appsettings.json`.

## 5. Frontend (React Client)

*   **Project Structure:** Overview of the `client/lingua-read-client/src` directory structure (components, pages, services, contexts, utils - based on `list_files` output).
*   **Key Components:** Describe important reusable components and page components.
*   **Routing:** How navigation is handled (likely `react-router-dom`).
*   **State Management:** Identify and explain the state management approach (e.g., Context API - `SettingsContext.js`, potentially others).
*   **API Communication:** How the frontend interacts with the backend API (e.g., using `axios` or `fetch` via `utils/api.js`).
*   **Build Process:** How the frontend is built for production.

## 6. Setup & Installation

*   Refine the instructions from the `README.md`.
*   Ensure all prerequisites are listed.
*   Provide clear, step-by-step instructions for setting up the database, backend, and frontend.
*   Include details on obtaining and configuring API keys (DeepL, Gemini).

## 7. Deployment

*   Provide guidance on deploying the application (e.g., server requirements, build steps, deployment strategies for backend and frontend). (Requires clarification).

## 8. Language Management Details

*   Expand on the `README.md` section.
*   Explain the different parser types.
*   Detail the structure of `LanguageDictionary` and `LanguageSentenceSplitException`.
*   Provide examples of configuring a language via the UI.

## 9. Contributing (Optional)

*   Coding standards.
*   Branching strategy.
*   How to submit pull requests.

## 10. License (Optional)

*   Specify the project's license.

## Information Gathering Steps Performed

1.  Read `README.md`.
2.  Listed files in `server/LinguaReadApi`.
3.  Listed files in `client/lingua-read-client`.
4.  Read `server/LinguaReadApi/Program.cs`.
5.  Read `server/LinguaReadApi/Data/AppDbContext.cs`.
6.  Listed files in `client/lingua-read-client/src`.
7.  Listed code definitions in `server/LinguaReadApi/Controllers`.

## Remaining Information Gathering/Clarification Needed

*   Clarification on deployment strategy.
*   Confirmation/details on frontend state management beyond Context API.
*   Potentially reading specific source files for deeper implementation details during documentation writing.