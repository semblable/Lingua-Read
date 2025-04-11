using LinguaReadApi.Models;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace LinguaReadApi.Services
{
    /// <summary>
    /// Defines the contract for managing language configurations.
    /// </summary>
    public interface ILanguageService
    {
        /// <summary>
        /// Gets all configured languages, including their dictionaries and exceptions.
        /// </summary>
        Task<IEnumerable<Language>> GetAllLanguagesAsync();

        /// <summary>
        /// Gets a specific language by its ID, including related configurations.
        /// </summary>
        Task<Language?> GetLanguageByIdAsync(int id);

        /// <summary>
        /// Creates a new language configuration.
        /// </summary>
        Task<Language> CreateLanguageAsync(Language language);

        /// <summary>
        /// Updates an existing language configuration.
        /// </summary>
        /// <returns>True if update was successful, false otherwise (e.g., not found).</returns>
        Task<bool> UpdateLanguageAsync(int id, Language language);

        /// <summary>
        /// Deletes a language configuration by its ID.
        /// </summary>
        /// <returns>True if deletion was successful, false otherwise (e.g., not found).</returns>
        Task<bool> DeleteLanguageAsync(int id);

        /// <summary>
        /// Gets languages marked as active for translation.
        /// </summary>
        Task<IEnumerable<Language>> GetLanguagesForTranslationAsync();
    }
}