// Import Platform from react-native
import { Platform } from 'react-native';
import storage from './storage';

// Dynamically set API URL based on platform
// For web development use localhost, for mobile use your computer's IP address
const API_URL = Platform.OS === 'web' 
  ? 'http://localhost:5000' 
  : 'http://192.168.0.48:5000'; // Your Ethernet adapter IP address

// Helper function to get token from storage
const getToken = () => {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      console.log('No token found in storage');
      return null;
    }
    console.log('Token retrieved from storage:', token.length + ' chars');
    return token;
  } catch (error) {
    console.error('Error retrieving token:', error);
    return null;
  }
};

// Helper function to store token
const storeToken = (token) => {
  try {
    if (!token || typeof token !== 'string') {
      console.error('Invalid token provided');
      return false;
    }
    const cleanToken = token.trim();
    localStorage.setItem('token', cleanToken);
    console.log('Token stored successfully:', cleanToken.length + ' chars');
    return true;
  } catch (error) {
    console.error('Error storing token:', error);
    return false;
  }
};

// Enhanced fetch function with debugging
const fetchWithDebug = async (url, options = {}) => {
  console.log(`[API Debug] Fetching from: ${url}`);
  console.log(`[API Debug] Options:`, options);
  
  try {
    // Create the URL object to ensure proper URL construction
    let fullUrl;
    try {
      // Check if the URL is already absolute
      if (url.startsWith('http://') || url.startsWith('https://')) {
        fullUrl = new URL(url);
      } else {
        // Handle relative URLs by joining with API_URL
        fullUrl = new URL(url, API_URL);
      }
      console.log(`[API Debug] Constructed URL: ${fullUrl.toString()}`);
    } catch (urlError) {
      console.error(`[API Error] Invalid URL construction: ${urlError.message}`);
      throw new Error(`Invalid URL: ${url} - ${urlError.message}`);
    }
    
    const response = await fetch(fullUrl.toString(), options);
    console.log(`[API Debug] Response status: ${response.status}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    // Check if response has content
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      const data = await response.json();
      console.log(`[API Debug] Response data:`, data);
      return data;
    } else {
      console.log(`[API Debug] Response is not JSON or empty. Content-Type: ${contentType}`);
      return null;
    }
  } catch (error) {
    console.error(`[API Error] Fetch failed: ${error.message}`);
    throw error;
  }
};

// Helper function for making API requests
const fetchApi = async (endpoint, options = {}) => {
  // Ensure endpoint starts with a slash
  if (!endpoint.startsWith('/')) {
    endpoint = '/' + endpoint;
  }
  
  try {
    const token = getToken();
    console.log('[API Debug] Endpoint:', endpoint);
    console.log('[API Debug] Base URL:', API_URL);
    
    const headers = {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    };

    // Only add Authorization header if token exists and is a string
    if (token && typeof token === 'string' && token.trim() !== '') {
      const cleanToken = token.trim();
      headers.Authorization = `Bearer ${cleanToken}`;
      console.log('[API Debug] Authorization header added');
    } else {
      console.log('[API Debug] No token available for request');
      if (endpoint !== '/api/auth/login' && endpoint !== '/api/auth/register' && endpoint !== '/api/languages') {
        throw new Error('Authentication required');
      }
    }

    // Add any additional headers from options
    if (options.headers) {
      Object.assign(headers, options.headers);
    }

    const requestConfig = {
      ...options,
      headers,
      credentials: 'include',
      mode: 'cors'
    };

    // Construct the full URL properly
    const fullUrl = new URL(endpoint, API_URL);
    console.log('[API Debug] Full URL:', fullUrl.toString());
    console.log('[API Debug] Request config:', {
      method: requestConfig.method || 'GET',
      headers: requestConfig.headers,
      credentials: requestConfig.credentials,
      mode: requestConfig.mode
    });
    
    const response = await fetch(fullUrl.toString(), requestConfig);
    console.log('[API Debug] Response status:', response.status);
    console.log('[API Debug] Response headers:', Object.fromEntries(response.headers.entries()));

    // Handle response
    if (!response.ok) {
      const contentType = response.headers.get('content-type');
      let errorMessage;
      
      if (contentType && contentType.includes('application/json')) {
        const errorData = await response.json();
        errorMessage = errorData.message || `HTTP error! Status: ${response.status}`;
      } else {
        const text = await response.text();
        errorMessage = text || `HTTP error! Status: ${response.status}`;
      }
      
      console.error('[API Error] Request failed:', {
        status: response.status,
        statusText: response.statusText,
        url: fullUrl.toString(),
        error: errorMessage
      });
      
      throw new Error(errorMessage);
    }

    // Parse successful response
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      const data = await response.json();
      console.log('[API Debug] Response data:', data);
      return data;
    } else {
      const text = await response.text();
      console.log('[API Debug] Non-JSON response:', text);
      return { message: text || response.statusText };
    }
  } catch (error) {
    console.error('[API Error] Request failed:', {
      endpoint,
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
};

// Simple test function to check API connectivity
export const testApiConnection = async () => {
  try {
    console.log('Testing API connection to server');
    const response = await fetch(`${API_URL}/api/languages`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      },
      mode: 'cors'
    });
    console.log('API response status:', response.status);
    return response.ok;
  } catch (error) {
    console.error('API connection error:', error);
    return false;
  }
};

// Auth API
export const login = (email, password) => {
  return fetchApi('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  });
};

export const register = (email, password) => {
  return fetchApi('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  });
};

// Languages API
export const getLanguages = () => {
  return fetchApi('/api/languages');
};

// Texts API
export const getTexts = () => {
  return fetchApi('/api/texts');
};

export const getText = (textId) => {
  return fetchApi(`/api/texts/${textId}`);
};

export const createText = (title, content, languageId) => {
  return fetchApi('/api/texts', {
    method: 'POST',
    body: JSON.stringify({ title, content, languageId })
  });
};

// Books API
export const getBooks = () => {
  return fetchApi('/api/books');
};

export const getBook = (bookId) => {
  return fetchApi(`/api/books/${bookId}`);
};

export const createBook = (title, description, languageId, content, splitMethod = 'paragraph', maxSegmentSize = 3000) => {
  return fetchApi('/api/books', {
    method: 'POST',
    body: JSON.stringify({ 
      title, 
      description, 
      languageId, 
      content,
      splitMethod,
      maxSegmentSize
    })
  });
};

export const updateLastRead = (bookId, textId) => {
  return fetchApi(`/api/books/${bookId}/lastread`, {
    method: 'PUT',
    body: JSON.stringify({ textId })
  });
};

export const completeLesson = (bookId, textId) => {
  return fetchApi(`/api/books/${bookId}/complete-lesson`, {
    method: 'PUT',
    body: JSON.stringify({ textId })
  });
};

export const finishBook = (bookId) => {
  return fetchApi(`/api/books/${bookId}/finish`, {
    method: 'PUT'
  });
};

// User Statistics API
export const getUserStatistics = () => {
  return fetchApi('/api/users/statistics');
};

export const getReadingActivity = async (period = 'all') => {
  try {
    console.log(`[API] Getting reading activity for period: ${period}`);
    const data = await fetchApi(`/api/users/reading-activity?period=${period}`);
    return data;
  } catch (error) {
    console.error('Error getting reading activity:', error);
    return { error: error.message };
  }
};

// Words API
export const createWord = async (textId, term, status, translation) => {
  try {
    // Validate inputs
    if (!textId) throw new Error('Text ID is required');
    if (!term || term.trim() === '') throw new Error('Word term is required');
    if (!status) throw new Error('Word status is required');
    
    console.log(`[API] Creating word: "${term}" with status: ${status}`);
    
    const payload = {
      textId,
      term: term.trim(),
      status,
      translation: translation || null
    };
    
    const response = await fetchApi('/api/words', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8'
      },
      body: JSON.stringify(payload)
    });
    
    return response;
  } catch (error) {
    console.error('Error in createWord:', error);
    throw error;
  }
};

export const updateWord = async (wordId, status, translation) => {
  try {
    // Validate inputs
    if (!wordId) throw new Error('Word ID is required');
    if (!status) throw new Error('Word status is required');
    
    const payload = {
      status,
      translation: translation || null
    };
    
    const response = await fetchApi(`/api/words/${wordId}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
    
    return response;
  } catch (error) {
    console.error('Error in updateWord:', error);
    throw error;
  }
};

// Translation API
export const translateText = async (text, sourceLanguageCode, targetLanguageCode) => {
  try {
    const payload = {
      text,
      sourceLanguageCode,
      targetLanguageCode
    };
    return await fetchApi('/api/translation', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  } catch (error) {
    console.error('Translation failed:', error);
    throw error;
  }
};

// Story Generation API
export const generateStory = async (prompt, language, level, maxLength) => {
  try {
    const payload = {
      prompt,
      language,
      level,
      maxLength
    };
    return await fetchApi('/api/storygeneration', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  } catch (error) {
    console.error('Story generation failed:', error);
    throw error;
  }
};

export const translateSentence = async (text, sourceLanguageCode, targetLanguageCode) => {
  try {
    console.log('Initiating sentence translation request');
    
    const payload = {
      text,
      sourceLanguageCode,
      targetLanguageCode
    };
    
    const response = await fetchApi('/api/sentencetranslation', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8'
      },
      body: JSON.stringify(payload)
    });
    
    return response;
  } catch (error) {
    console.error('Sentence translation failed:', error);
    throw error;
  }
};

export const translateFullText = async (text, sourceLanguageCode, targetLanguageCode) => {
  try {
    console.log('Initiating full text translation request');
    
    const payload = {
      text,
      sourceLanguageCode,
      targetLanguageCode
    };
    
    const response = await fetchApi('/api/sentencetranslation/full-text', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8'
      },
      body: JSON.stringify(payload)
    });
    
    return response;
  } catch (error) {
    console.error('Full text translation failed:', error);
    throw error;
  }
};

export const getSupportedLanguages = () => {
  return fetchApi('/api/translation/languages');
};

// Get next lesson from a book
export const getNextLesson = (bookId, currentTextId) => {
  return fetchApi(`/api/books/${bookId}/next-lesson?currentTextId=${currentTextId}`);
};

// User Settings API
export const getUserSettings = async () => {
  try {
    return await fetchApi('/api/usersettings');
  } catch (error) {
    console.error('Failed to get user settings:', error);
    throw error;
  }
};

export const updateUserSettings = async (settings) => {
  try {
    return await fetchApi('/api/usersettings', {
      method: 'PUT',
      body: JSON.stringify(settings)
    });
  } catch (error) {
    console.error('Failed to update user settings:', error);
    throw error;
  }
};