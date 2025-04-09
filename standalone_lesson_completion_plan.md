# Plan: Fix Standalone Text Completion

This plan addresses issues related to completing standalone texts (both regular and audio lessons) that are not part of a book.

## Issues Addressed

1.  **Auto-Advance Setting:** The "Automatically advance to next lesson" setting wasn't working correctly for lessons within books when "Show progress stats" was also enabled.
2.  **Missing "Complete Lesson" Button:** Audio lessons lacked a "Complete Lesson" button in the top bar.
3.  **Non-functional "Complete Lesson" Button:** Clicking "Complete Lesson" for any standalone text (audio or regular) resulted in a backend error because the API endpoint required a `bookId`.

## Frontend Fixes Implemented

1.  **Auto-Advance Prioritization:** Modified `TextDisplay.js` (`handleCompleteLesson`) to prioritize auto-advance over showing stats when both settings are enabled.
2.  **Button Visibility:** Modified `TextDisplay.js` to render the "Complete Lesson" button in the top bar for audio lessons, removing the incorrect dependency on `text?.bookId`.
3.  **Standalone Lesson Handling:**
    *   Modified `TextDisplay.js` (`handleCompleteLesson`) to proceed even if `bookId` is null.
    *   Modified `utils/api.js` (`completeLesson`) to conditionally call a different API endpoint (`/api/texts/{textId}/complete`) for standalone texts.

## Required Backend Change

The frontend now attempts to call `PUT /api/texts/{textId}/complete` for standalone texts. This endpoint needs to be implemented in the backend.

**Recommendation:**

*   **Create New Endpoint:** `PUT /api/texts/{textId}/complete`
*   **Action:** This endpoint should take `textId` from the URL and mark the corresponding text as complete (update status, log activity, etc.) without requiring a `bookId`.

## Plan Diagram

```mermaid
graph TD
    A[Start: Issues Reported] --> B{Diagnose Auto-Advance};
    B --> C{Fix Auto-Advance Precedence in TextDisplay.js};
    A --> D{Diagnose Missing Button in Audio Lessons};
    D --> E{Fix Button Visibility Condition in TextDisplay.js};
    A --> F{Diagnose Non-functional Button for Standalone Texts};
    F --> G{Identify Backend API Limitation};
    G --> H{Modify Frontend API Call in utils/api.js};
    H --> I[Backend Task: Implement PUT /api/texts/{textId}/complete];
    I --> J[End: Functionality Complete];
    C --> J;
    E --> J;

    style I fill:#f9f,stroke:#333,stroke-width:2px
```

## Next Steps

1.  Implement the backend endpoint `PUT /api/texts/{textId}/complete`.
2.  Test the "Complete Lesson" functionality for standalone texts.