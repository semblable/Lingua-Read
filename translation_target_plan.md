# Plan: Configure DeepL/Gemini Target Languages

**Core Logic:**

1.  A global user setting (managed elsewhere in the application) will define the user's preferred target language (e.g., "English", with code "en").
2.  When configuring a *source* language (e.g., French), the user can optionally specify the exact target language codes that DeepL (e.g., "EN-US") and Gemini (e.g., "en") should use when translating *from* French *to* the user's global target language (English).
3.  When a translation is requested:
    *   The frontend sends the source code (e.g., "fr") and the user's global target code (e.g., "en").
    *   The backend looks up the configuration for the source language ("fr").
    *   It checks for the specific DeepL/Gemini codes configured *for that source language*.
    *   If specific codes are found, they are used for the respective API calls.
    *   If specific codes are *not* found, the backend falls back to using the globally preferred target code ("en") provided in the request.

**Implementation Plan:**

**Phase 1: Backend Modifications**

1.  **Update Database Model (`server/LinguaReadApi/Models/Language.cs`):**
    *   Add two new nullable string properties to the `Language` class:
        *   `public string? DeepLTargetCode { get; set; }`
        *   `public string? GeminiTargetCode { get; set; }`
    *   These will store the specific target codes (like "EN-US", "pt-BR", "de") to use when this language is the *source* and the target is the user's global preference.

2.  **Create Database Migration:**
    *   Use the Entity Framework Core CLI tools (`dotnet ef migrations add AddTargetTranslationCodes`) to generate a migration script that adds the corresponding `DeepLTargetCode` and `GeminiTargetCode` columns (nullable strings) to the `Languages` table.
    *   Apply the migration to the database (`dotnet ef database update`).

3.  **Update DTOs (if applicable):**
    *   Check if any DTOs are used specifically for transferring `Language` data between the controller and service layers or for API responses (e.g., in `LanguagesController.cs` or service method signatures). If so, add the corresponding `deepLTargetCode` and `geminiTargetCode` properties to them.

4.  **Update Language Service (`server/LinguaReadApi/Services/LanguageService.cs` & `ILanguageService.cs`):**
    *   Modify the interface (`ILanguageService`) and implementation (`LanguageService`) for methods involved in creating/updating languages (e.g., `CreateLanguageAsync`, `UpdateLanguageAsync`) to accept and save the new `DeepLTargetCode` and `GeminiTargetCode` values.
    *   Ensure methods fetching language details (e.g., `GetLanguageByIdAsync`, `GetAllLanguagesAsync`) retrieve these new fields.

5.  **Update Translation Service (`server/LinguaReadApi/Services/TranslationService.cs` & `ITranslationService.cs`):**
    *   Modify the implementation of `TranslateTextAsync` and `TranslateBatchAsync`.
    *   Inside these methods:
        *   Inject `ILanguageService`.
        *   Use `ILanguageService` to fetch the full `Language` entity corresponding to the `sourceLanguageCode` from the request.
        *   Determine the actual target code for DeepL: `finalDeepLTargetCode = !string.IsNullOrEmpty(sourceLanguage.DeepLTargetCode) ? sourceLanguage.DeepLTargetCode : request.TargetLanguageCode;`
        *   Determine the actual target code for Gemini: `finalGeminiTargetCode = !string.IsNullOrEmpty(sourceLanguage.GeminiTargetCode) ? sourceLanguage.GeminiTargetCode : request.TargetLanguageCode;`
        *   Pass `finalDeepLTargetCode` or `finalGeminiTargetCode` to the respective underlying translation client calls, instead of directly using `request.TargetLanguageCode`.

**Phase 2: Frontend Modifications**

1.  **Update API Utility (`client/lingua-read-client/src/utils/api.js`):**
    *   Modify the `createLanguage` and `updateLanguage` functions to include `deepLTargetCode` and `geminiTargetCode` in the JSON payload sent to the backend API. Ensure property names match the backend DTO/model (e.g., camelCase `deepLTargetCode`).

2.  **Update Language Form (`client/lingua-read-client/src/components/settings/LanguageForm.js`):**
    *   **State:** Add `deepLTargetCode: ''` and `geminiTargetCode: ''` to the `initialLanguageState`.
    *   **Loading:** Update the `useEffect` hook that loads language data (`language` prop) to set the `deepLTargetCode` and `geminiTargetCode` in the `formData` state. Remember to handle null values from the backend, defaulting to empty strings for the form.
    *   **UI:** Add two new `Form.Group` sections within the form's JSX, likely below the "Active for Translation" switch or grouped with other translation-related settings:
        *   Input field for "DeepL Target Code" bound to `formData.deepLTargetCode`. Include placeholder text like "e.g., EN-US, DE".
        *   Input field for "Gemini Target Code" bound to `formData.geminiTargetCode`. Include placeholder text like "e.g., en, de".
        *   Add `Form.Text` muted descriptions explaining that these codes override the global target for this specific source language.
    *   **Handling Changes:** Ensure the existing `handleChange` function correctly updates these new fields in the `formData` state.
    *   **Saving:** Ensure the `handleSubmit` function includes `deepLTargetCode` and `geminiTargetCode` from the `formData` when constructing the `payload` for the API call.

**Phase 3: Testing**

1.  **Unit/Integration Tests:** Add or update tests for the backend services (`LanguageService`, `TranslationService`) to verify the new logic.
2.  **Manual Testing:**
    *   Test creating a new language and setting the specific target codes.
    *   Test updating an existing language with the codes.
    *   Test leaving the codes blank.
    *   Perform translations from a language *with* specific codes set and verify the correct target language is used by the providers (requires inspecting logs or provider dashboards if possible).
    *   Perform translations from a language *without* specific codes set and verify it falls back to the global target language code.

**Data Flow Diagram (Translation Process):**

```mermaid
sequenceDiagram
    participant User
    participant Frontend UI
    participant Frontend API Util
    participant Backend API (TranslationController)
    participant Backend TranslationService
    participant Backend LanguageService
    participant DeepL/Gemini Client
    participant Database

    User->>Frontend UI: Initiates translation (e.g., clicks word)
    Frontend UI->>Frontend API Util: Call translate(text, sourceCode, globalTargetCode)
    Frontend API Util->>Backend API (TranslationController): POST /api/translation (request: {text, sourceCode, targetCode=globalTargetCode})
    Backend API (TranslationController)->>Backend TranslationService: TranslateTextAsync(request.Text, request.SourceLanguageCode, request.TargetLanguageCode)
    Backend TranslationService->>Backend LanguageService: GetLanguageByCodeAsync(request.SourceLanguageCode)
    Backend LanguageService->>Database: Fetch Language WHERE Code = sourceCode
    Database-->>Backend LanguageService: Return Language object (incl. DeepLTargetCode, GeminiTargetCode)
    Backend LanguageService-->>Backend TranslationService: Return source Language object
    Backend TranslationService->>Backend TranslationService: Determine finalDeepLTargetCode (use specific if exists, else globalTargetCode)
    Backend TranslationService->>Backend TranslationService: Determine finalGeminiTargetCode (use specific if exists, else globalTargetCode)
    alt Use DeepL
        Backend TranslationService->>DeepL/Gemini Client: Call DeepL API (text, sourceCode, finalDeepLTargetCode)
    else Use Gemini
        Backend TranslationService->>DeepL/Gemini Client: Call Gemini API (text, sourceCode, finalGeminiTargetCode)
    end
    DeepL/Gemini Client-->>Backend TranslationService: Return translated text
    Backend TranslationService-->>Backend API (TranslationController): Return translated text
    Backend API (TranslationController)-->>Frontend API Util: Return 200 OK (response: {translatedText, ...})
    Frontend API Util-->>Frontend UI: Return translated text
    Frontend UI->>User: Display translated text