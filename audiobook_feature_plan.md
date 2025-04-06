# Audiobook Feature Implementation Plan

## Goal

Allow users to upload MP3 files associated with an existing book, creating a persistent audiobook playlist accessible while viewing the book. Track playback progress and integrate listening time with existing statistics (combined with audio lessons).

## Plan Summary

### Backend (.NET Core / C#)

*   **Data Model:**
    *   Introduce a new table/model: `AudiobookTrack` (`Id`, `BookId` FK, `FilePath`, `TrackNumber`, `Duration` (optional)).
    *   Modify `UserActivity` model/logic to store: `CurrentAudiobookTrackId` (nullable FK), `CurrentAudiobookPosition` (seconds).
*   **API Endpoints:**
    *   **Upload:** New endpoint in `BooksController.cs` (`POST /api/books/{bookId}/audiobook`). Handles multiple MP3 uploads, validation, file saving (e.g., `wwwroot/audiobooks/{bookId}/track_{n}.mp3`), and `AudiobookTrack` record creation.
    *   **Retrieval:** Modify `GET /api/books/{bookId}` in `BooksController.cs` to include the ordered list of associated `AudiobookTrack`s.
    *   **Progress Tracking:** Modify endpoints in `UserActivityController.cs` (e.g., `PUT /api/useractivity/audiobookprogress`) to save/retrieve `CurrentAudiobookTrackId` and `CurrentAudiobookPosition`. Ensure listening time updates correctly combine audiobook and audio lesson time.
*   **Service Layer:** Update/create services (`BookService`, `UserActivityService`) for business logic.

### Frontend (React)

*   **Upload UI (`BookDetail.js`):**
    *   Add a file input accepting multiple `.mp3` files.
    *   Implement file selection/handling logic.
    *   Call `POST /api/books/{bookId}/audiobook` on submission.
*   **Audio Player (`BookDetail.js` / `TextDisplay.js`):**
    *   Integrate an audio player component.
    *   Fetch book data including `AudiobookTrack` list and last playback position (`GET /api/books/{bookId}`, `GET /api/useractivity/audiobookprogress`).
    *   Load tracks into a playlist.
    *   Resume playback from the last position.
    *   Implement play/pause (including '`' key shortcut).
    *   Periodically save current track and position (`PUT /api/useractivity/audiobookprogress`).
    *   Handle track changes within the playlist.
*   **Statistics (`Statistics.js`):**
    *   Update logic to fetch and display combined listening time (audio lessons + audiobooks).

## Architecture Diagram

```mermaid
graph TD
    subgraph Frontend (React)
        A[User uploads MP3s] --> B(Upload Component in BookDetail.js);
        B --> C[API Call: POST /api/books/{id}/audiobook];
        D[Book View (BookDetail/TextDisplay)] --> E(Audio Player Component);
        E --> F[Fetches Book Data + Tracks + Last Position];
        F --> G[API Call: GET /api/books/{id}];
        F --> G2[API Call: GET /api/useractivity/audiobookprogress];
        E --> H[Handles Playback ('`' key, Track changes)];
        H --> I[Tracks Position/Time];
        I --> J[API Call: PUT /api/useractivity/audiobookprogress];
        K[Statistics Page] --> L[API Call: GET /api/useractivity/stats];
    end

    subgraph Backend (.NET Core)
        M[BooksController] --> N(Handle MP3 Upload);
        N --> O[Save MP3 Files];
        N --> P[DB: Create AudiobookTrack records];
        M --> Q(Serve Book Data w/ Tracks);
        Q --> R[DB: Fetch Book & AudiobookTracks];
        S[UserActivityController] --> T(Handle Progress Update);
        T --> U[DB: Update UserActivity (Audiobook Position/Time)];
        S --> V(Serve Statistics);
        V --> W[DB: Fetch UserActivity];
        S --> X(Serve Last Position);
        X --> Y[DB: Fetch UserActivity];
    end

    subgraph Database (PostgreSQL)
        Z1[Books Table]
        Z2[AudiobookTracks Table]
        Z3[UserActivity Table]
    end

    C --> M;
    G --> M;
    G2 --> S;
    J --> S;
    L --> S;
    O -- Stores --> Filesystem;
    P -- Writes --> Z2;
    P -- Links --> Z1;
    R -- Reads --> Z1;
    R -- Reads --> Z2;
    U -- Writes --> Z3;
    W -- Reads --> Z3;
    Y -- Reads --> Z3;