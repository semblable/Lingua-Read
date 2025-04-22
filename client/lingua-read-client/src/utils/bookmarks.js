const BOOKMARKS_STORAGE_KEY = 'linguaReadBookmarks';

// Helper to get all bookmarks from localStorage
const getAllBookmarks = () => {
  try {
    const storedBookmarks = localStorage.getItem(BOOKMARKS_STORAGE_KEY);
    return storedBookmarks ? JSON.parse(storedBookmarks) : {};
  } catch (error) {
    console.error("Error reading bookmarks from localStorage:", error);
    return {}; // Return empty object on error
  }
};

// Helper to save all bookmarks to localStorage
const saveAllBookmarks = (allBookmarks) => {
  try {
    localStorage.setItem(BOOKMARKS_STORAGE_KEY, JSON.stringify(allBookmarks));
  } catch (error) {
    console.error("Error saving bookmarks to localStorage:", error);
  }
};

/**
 * Gets the array of bookmarked sentence indices for a specific text.
 * @param {string|number} textId The ID of the text.
 * @returns {number[]} An array of sentence indices, or an empty array.
 */
export const getBookmarkedSentences = (textId) => {
  if (!textId) return [];
  const allBookmarks = getAllBookmarks();
  // Ensure textId is treated consistently (e.g., as a string key)
  return allBookmarks[String(textId)] || [];
};

/**
 * Toggles a bookmark for a specific sentence in a text.
 * Adds the sentence index if not present, removes it if present.
 * @param {string|number} textId The ID of the text.
 * @param {number} sentenceIndex The index of the sentence to toggle.
 */
export const toggleBookmark = (textId, sentenceIndex) => {
  if (!textId || typeof sentenceIndex !== 'number' || sentenceIndex < 0) return;

  const stringTextId = String(textId); // Use string key consistently
  const allBookmarks = getAllBookmarks();
  const currentBookmarks = allBookmarks[stringTextId] || [];
  const indexExists = currentBookmarks.includes(sentenceIndex);

  if (indexExists) {
    // Remove the index
    allBookmarks[stringTextId] = currentBookmarks.filter(idx => idx !== sentenceIndex);
    // If the array becomes empty, remove the textId key for cleanliness
    if (allBookmarks[stringTextId].length === 0) {
      delete allBookmarks[stringTextId];
    }
  } else {
    // Add the index and sort for consistency (optional)
    allBookmarks[stringTextId] = [...currentBookmarks, sentenceIndex].sort((a, b) => a - b);
  }

  saveAllBookmarks(allBookmarks);
};