using System;
using System.Collections.Generic;
using System.Linq;
using LinguaReadApi.Models;

namespace LinguaReadApi.Utilities
{
    public static class WordCountUtility
    {
        /// <summary>
        /// Counts the total number of words in a text by splitting on whitespace
        /// </summary>
        /// <param name="text">The text to count words in</param>
        /// <returns>The total word count</returns>
        public static int CountTotalWords(string text)
        {
            if (string.IsNullOrWhiteSpace(text))
                return 0;
                
            return text.Split(new[] { ' ', '\t', '\n', '\r' }, StringSplitOptions.RemoveEmptyEntries).Length;
        }
        
        /// <summary>
        /// Updates the words read count for a language
        /// </summary>
        /// <param name="language">The language to update</param>
        /// <param name="wordCount">The number of words to add</param>
        public static void UpdateLanguageWordCount(Language language, int wordCount)
        {
            if (language == null)
                throw new ArgumentNullException(nameof(language));
                
            language.WordsRead += wordCount;
            
            // NOTE: After calling this method, you must explicitly mark the language entity
            // as modified in your DbContext by using:
            // _context.Entry(language).State = EntityState.Modified;
        }
        
        /// <summary>
        /// Counts the total number of words across multiple texts
        /// </summary>
        /// <param name="texts">The collection of texts</param>
        /// <returns>The total word count across all texts</returns>
        public static int CountWordsInTexts(IEnumerable<Text> texts)
        {
            if (texts == null)
                return 0;
                
            return texts.Sum(text => CountTotalWords(text.Content));
        }
        
        /// <summary>
        /// Gets distinct words from a text content
        /// </summary>
        /// <param name="content">The text content</param>
        /// <returns>A HashSet of distinct words</returns>
        public static HashSet<string> GetDistinctWords(string content)
        {
            if (string.IsNullOrWhiteSpace(content))
                return new HashSet<string>();
                
            var words = content.Split(new[] { ' ', '\t', '\n', '\r' }, StringSplitOptions.RemoveEmptyEntries)
                .Select(word => word.Trim().ToLower());
                
            return new HashSet<string>(words);
        }
    }
} 