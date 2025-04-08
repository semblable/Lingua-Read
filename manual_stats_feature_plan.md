# Plan: Manual Statistics Entry

**Goal:** Allow users to manually log reading (word count) and listening time for a specific language via a modal on the Statistics page. This data should be stored alongside automatically tracked activity and reflected in the statistics display.

**Requirements Summary:**
*   Manual entry form in a modal triggered from Statistics page.
*   Inputs: Language, Words Read (optional), Time Listened (optional, in minutes).
*   Entries apply to the current day.
*   Backend uses the existing `UserActivity` table.
*   Existing statistics aggregation endpoints (`GET /api/users/reading-activity`, `GET /api/users/listening-activity`) must include manual data.

**1. Backend (.NET Core - `server/LinguaReadApi`)**

*   **Define New Activity Types:**
    *   Use distinct `ActivityType` strings in the `UserActivity` table for manual entries:
        *   `"ManualReading"`
        *   `"ManualListening"`
*   **Add Manual Logging Endpoint (`UserActivityController.cs`):**
    *   Create a new endpoint: `POST /api/activity/logManual`
    *   **Request DTO (`LogManualActivityRequest`):**
        *   `int LanguageId` (Required)
        *   `int? WordCount` (Nullable, for reading)
        *   `int? ListeningDurationSeconds` (Nullable, for listening)
    *   **Logic:**
        *   Validate input (LanguageId exists, at least one of WordCount or ListeningDurationSeconds is provided and positive).
        *   Get current `UserId` from the token.
        *   Create one or two `UserActivity` records:
            *   If `WordCount` is provided, create a record with `ActivityType = "ManualReading"`, `WordCount`, `ListeningDurationSeconds = 0`, `LanguageId`, `UserId`, `Timestamp = DateTime.UtcNow`.
            *   If `ListeningDurationSeconds` is provided, create a record with `ActivityType = "ManualListening"`, `ListeningDurationSeconds`, `WordCount = 0`, `LanguageId`, `UserId`, `Timestamp = DateTime.UtcNow`.
        *   Save changes to the database (`_context.SaveChangesAsync()`).
        *   Return success or error response.
*   **Update Statistics Aggregation Logic (`UsersController.cs`):**
    *   **Review `GetReadingActivity`:**
        *   Examine the database query (likely using LINQ on `_context.UserActivities`).
        *   Ensure the query aggregates `WordCount` for `ActivityType` values: `"LessonCompleted"`, `"BookFinished"`, AND `"ManualReading"`.
        *   Verify filtering by `UserId`, `LanguageId` (if applicable), and `Timestamp` (based on the `period` query parameter) remains correct.
    *   **Review `GetListeningActivity`:**
        *   Examine the database query.
        *   Ensure the query aggregates `ListeningDurationSeconds` for `ActivityType` values: `"Listening"` AND `"ManualListening"`.
        *   Verify filtering by `UserId`, `LanguageId`, and `Timestamp` remains correct.

**2. Frontend (React - `client/lingua-read-client`)**

*   **Create Manual Entry Modal Component (`src/components/ManualEntryModal.js` or similar):**
    *   Use a modal library (e.g., React Modal, or a component from a UI library if one is used like Material UI, Ant Design).
    *   **State:** Manage input values for language, words, time, loading/error states.
    *   **Inputs:**
        *   Language dropdown: Fetch languages (likely from `GET /api/languages`) and populate the dropdown. Store the selected `languageId`.
        *   Words Read input: Numeric input, binds to state.
        *   Time Listened input: Numeric input (label should specify units, e.g., "Minutes"). Convert to seconds before sending to the backend. Binds to state.
    *   **Actions:**
        *   Submit button: Calls the handler function passed via props. Disabled if required fields are empty or during submission.
        *   Close button/mechanism: Calls the close handler function passed via props.
*   **Integrate Modal into Statistics Page (`src/pages/Statistics.js`):**
    *   **State:** Add state to manage modal visibility (`isModalOpen`).
    *   **Button:** Add a button ("Add Manual Entry", "Log Activity", etc.) that sets `isModalOpen` to `true`.
    *   **Render Modal:** Conditionally render `<ManualEntryModal>` when `isModalOpen` is true. Pass necessary props:
        *   `isOpen={isModalOpen}`
        *   `onClose={() => setIsModalOpen(false)}`
        *   `onSubmit={handleManualSubmit}` (function to be created)
    *   **Submission Handler (`handleManualSubmit`):**
        *   Takes the form data (languageId, words, timeInMinutes) from the modal.
        *   Converts time to seconds.
        *   Calls the backend API: `POST /api/activity/logManual` with the data.
        *   Handles success:
            *   Close the modal (`setIsModalOpen(false)`).
            *   Trigger a refresh of the statistics data (call the functions that fetch from `GET /api/users/reading-activity` and `GET /api/users/listening-activity`).
            *   Optionally show a success notification.
        *   Handles errors: Display an error message within the modal or via a notification.
*   **Verify Statistics Display:** Confirm that the charts/data displays update correctly after a manual entry is submitted and the data is refreshed.

**Data Flow Diagram:**

```mermaid
graph TD
    subgraph Frontend (React)
        A[Statistics.js Page] -- contains --> B(Button: "Add Manual Entry");
        B -- onClick --> C[Opens ManualEntryModal];
        C -- contains --> D{Form: Lang Dropdown, Words Input, Time Input (Mins)};
        D --> E[Submit Button];
        E -- onClick --> F[handleManualSubmit];
        F -- Calls API --> G[POST /api/activity/logManual];
        G -- onSuccess --> H[Close Modal & Refresh Stats Data];
        A -- Loads/Refreshes --> I[Fetch GET /users/reading-activity];
        A -- Loads/Refreshes --> J[Fetch GET /users/listening-activity];
        I --> K[Display Reading Stats];
        J --> L[Display Listening Stats];
        C -- contains --> M[Close Button];
        M -- onClick --> N[Close Modal];
    end

    subgraph Backend (.NET)
        O[UserActivityController.cs] --> P{Endpoint: POST /api/activity/logManual};
        P -- Receives Data (LangId, Words?, Mins?) --> Q[Convert Mins to Secs];
        Q --> R[Create UserActivity Record(s) (Type='ManualReading'/'ManualListening')];
        R --> S[Save to DB];
        T[UsersController.cs] --> U{Endpoint: GET /api/users/reading-activity};
        T[UsersController.cs] --> V{Endpoint: GET /api/users/listening-activity};
        U -- Reads & Aggregates --> S[UserActivity Table (Incl. ManualReading)];
        V -- Reads & Aggregates --> S[UserActivity Table (Incl. ManualListening)];
        U --> I;
        V --> J;
        G --> P;
    end

    style Frontend fill:#f9f,stroke:#333,stroke-width:2px
    style Backend fill:#ccf,stroke:#333,stroke-width:2px