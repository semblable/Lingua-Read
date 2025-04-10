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
* [2025-04-10 18:57:34] - Implemented "Reset Statistics" feature: Added backend endpoint (`/api/users/reset-statistics`) and frontend button (User Settings > Data Management) to allow selective clearing of `UserActivities` and resetting of `UserLanguageStatistics` aggregates, preserving other user data. Verified implementation and button visibility.

## Rationale

*

## Implementation Details

*