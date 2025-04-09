# Plan for New "Terms" Page

This document outlines the plan for implementing a new "Terms" page in the LinguaRead application.

## I. Backend Modifications (ASP.NET Core API - `server/LinguaReadApi`)

1.  **Enhance `WordsController.cs` (`GET /api/words/language/{languageId}`):**
    *   Modify the existing `GetWordsByLanguage` endpoint to accept optional query parameters:
        *   `status`: An integer (or comma-separated string) to filter words by status (1-5).
        *   `sortBy`: A string to specify sorting criteria (e.g., "term_asc", "status_desc"). Default to term ascending.
    *   Implement filtering and sorting logic in the LINQ query.

2.  **Create New Endpoint in `WordsController.cs` (`GET /api/words/export`):**
    *   Add a new action method for CSV export.
    *   Accept optional `languageId` and `status` query parameters.
    *   Fetch relevant `Word` entities (including `Language`, `Translation`).
    *   Generate CSV content (Columns: Term, Translation, Status, Language Name).
    *   Return response with `Content-Type: text/csv` and `Content-Disposition` header.

## II. Frontend Modifications (React Client - `client/lingua-read-client`)

1.  **Create New Page Component:**
    *   Create `src/pages/TermsPage.js`.
    *   Manage state for terms, filters, sorting, loading, errors.

2.  **Add Routing:**
    *   Update router configuration (likely `src/App.js`) to add route `/terms` -> `TermsPage`.

3.  **Update Navigation:**
    *   Modify `src/components/Navigation.js` to include a link to `/terms`.

4.  **Implement `TermsPage.js` Functionality:**
    *   **Language Selection:** Dropdown using `GET /api/languages`.
    *   **Status Filtering:** Controls (checkboxes/multi-select) for status (1-5).
    *   **Sorting:** Controls (e.g., clickable table headers).
    *   **Data Display:** Fetch terms via enhanced `GET /api/words/language/{languageId}`. Display in a table.
    *   **Export Button:** Trigger request to `GET /api/words/export` for CSV download.

## III. Data Flow Diagram

```mermaid
graph TD
    subgraph Frontend (React Client)
        A[Navigation.js] --> B(App.js Router);
        B -- Route '/terms' --> C{TermsPage.js};
        C -- Fetch Languages --> D[API: GET /api/languages];
        C -- Fetch Words (with filters/sort) --> E[API: GET /api/words/language/{languageId}?status=...&sortBy=...];
        C -- Trigger Export --> F[API: GET /api/words/export?languageId=...&status=...];
        C -- Displays --> G[Terms Table UI];
        C -- Contains --> H[Language Selector UI];
        C -- Contains --> I[Status Filter UI];
        C -- Contains --> J[Sort Controls UI];
        C -- Contains --> K[Export Button UI];
    end

    subgraph Backend (ASP.NET Core API)
        D --> P[LanguagesController.cs];
        E --> O[WordsController.cs];
        F --> O;
        P -- Reads --> L(Languages Table);
        O -- Reads --> M(Words Table);
        O -- Reads --> N(WordTranslations Table);
        O -- Reads --> L;
    end

    subgraph Database
        L;
        M;
        N;
    end

    style Frontend fill:#f9f,stroke:#333,stroke-width:2px
    style Backend fill:#ccf,stroke:#333,stroke-width:2px
    style Database fill:#cfc,stroke:#333,stroke-width:2px