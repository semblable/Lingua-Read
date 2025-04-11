# Decision Log

This file records architectural and implementation decisions using a list format.
2025-04-10 16:41:42 - Log of updates made.

*

## Decision

*   [2025-04-10 16:44:13] - Adopted a 10-section plan for creating comprehensive project documentation.
*   [2025-04-10 16:44:13] - Saved the documentation plan to `documentation_plan.md`.
*   [2025-04-10 16:44:13] - Generated a full documentation draft in `FULL_DOCUMENTATION.md` based on the plan and gathered info.
*   [2025-04-10 16:44:13] - Initialized the Memory Bank structure upon finding it absent.

[2025-04-10 17:35:34] - Fixed statistics update issue: Backend now re-parses and re-links all words in the text upon lesson completion, ensuring accurate per-language stats. User confirmed stats now update correctly after lesson completion.

*
* [2025-04-10 18:43:44] - Fixed statistics page bug: Identified that per-language period stats were always zero due to frontend expecting an array but receiving an object from the API. Updated mapping logic to robustly handle object-to-language mapping and ensure correct display for all periods. Also ensured timezone handling is consistent for period boundaries.
* [2025-04-10 18:43:44] - Enhanced audiobook player: Added a volume slider with real-time adjustment, styled for both themes, and implemented a mute toggle via the speaker icon that saves/restores previous volume and updates the icon accordingly.


* [2025-04-11 09:12:01] - Implemented backend storage for audio lesson progress: Added `UserAudioLessonProgress` model, updated `AppDbContext`, created/applied migration, added `PUT/GET /api/activity/audiolessonprogress` endpoints to `UserActivityController`. Updated frontend `TextDisplay.js` to use these API endpoints instead of localStorage, resolving progress loss across sessions/devices.
* [2025-04-11 00:07:27] - Fixed audiobook progress loss issue by patching the frontend `AudiobookPlayer.js` to immediately save the new track index and position 0 when a track ends and the next track starts. This ensures backend progress is always up-to-date, preventing regressions if the app is closed or refreshed mid-playback.
* [2025-04-10 18:57:34] - Implemented "Reset Statistics" feature: Added backend endpoint (`/api/users/reset-statistics`) and frontend button (User Settings > Data Management) to allow selective clearing of `UserActivities` and resetting of `UserLanguageStatistics` aggregates, preserving other user data. Verified implementation and button visibility.
*   [2025-04-11 00:02:38] - Clarified API endpoint responsibilities: `/api/translation/batch` is for fetching translations only, while `/api/words/batch` is for saving terms/translations. Frontend workflow must use both sequentially for fetch-and-save operations.
*   [2025-04-11 00:02:38] - Decided to implement upsert logic in `WordsController.AddTermsBatch` to handle potential duplicate terms gracefully, preventing unique constraint violations.
*   [2025-04-11 00:02:38] - Determined that frontend UI refresh issue after batch save was due to incorrect state update logic (merging instead of replacing data). Decided to modify the state update function (`fetchAllLanguageWords`) to fully replace the data.

## Rationale

*

## Implementation Details

*
*   [2025-04-10 22:45:50] - Debugged batch DeepL translation (`/api/translation/batch`). Iteratively fixed:
    *   Initial 500 error due to frontend/backend payload mismatch (`languageId`/`terms` vs `targetLanguageCode`/`words`).
    *   Subsequent 400 error due to frontend sending integer `languageId` instead of string `targetLanguageCode`.
    *   Final 400 error identified via verbose logging: frontend was incorrectly calling `/api/words/batch` instead of `/api/translation/batch`. Corrected URL in `client/lingua-read-client/src/utils/api.js`.
*   [2025-04-11 00:02:38] - Implemented two-step batch translation workflow in frontend (`client/lingua-read-client/src/utils/api.js`, `client/lingua-read-client/src/pages/TextDisplay.js`): Fetch translations via `/api/translation/batch`, then save terms+translations via `/api/words/batch`.
*   [2025-04-11 00:02:38] - Modified `WordsController.AddTermsBatch` (`server/LinguaReadApi/Controllers/WordsController.cs`) to perform an upsert: check for existing terms (case-insensitive, trimmed) before inserting or updating. Resolved `unique_user_language_term_ci` constraint errors.
*   [2025-04-11 00:02:38] - Modified `fetchAllLanguageWords` function in `client/lingua-read-client/src/pages/TextDisplay.js` to fully replace the `words` state with fetched data, ensuring immediate UI refresh after batch save.