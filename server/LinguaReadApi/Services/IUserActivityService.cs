using System;
using System.Threading.Tasks;

namespace LinguaReadApi.Services
{
    public interface IUserActivityService
    {
        Task LogTextCompletedActivity(Guid userId, int languageId, int textId, int wordCount, bool isListening);
        Task UpdateUserLanguageStats(Guid userId, int languageId);
    }
}