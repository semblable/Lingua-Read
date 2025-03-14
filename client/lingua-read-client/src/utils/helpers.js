// Format date to a user-friendly string
export const formatDate = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

// Truncate text with ellipsis if it exceeds max length
export const truncateText = (text, maxLength = 100) => {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  
  return text.substring(0, maxLength) + '...';
};

// Calculate reading time estimate based on content length
export const calculateReadingTime = (content) => {
  if (!content) return '< 1 min';
  
  // Average reading speed: 200 words per minute
  const wordCount = content.trim().split(/\s+/).length;
  const minutes = Math.max(1, Math.ceil(wordCount / 200));
  
  return `${minutes} min read`;
}; 