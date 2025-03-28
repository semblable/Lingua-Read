import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Container, Card, Spinner, Alert, Button, Modal, Form, Row, Col, Badge, ProgressBar, OverlayTrigger, Tooltip } from 'react-bootstrap'; // Added OverlayTrigger, Tooltip
import { useParams, useNavigate } from 'react-router-dom';
import { FixedSizeList as List } from 'react-window'; // Import react-window
import {
  getText, createWord, updateWord, updateLastRead, completeLesson, getBook,
  translateText, /*translateSentence,*/ translateFullText, getUserSettings, // Removed translateSentence
  batchTranslateWords, addTermsBatch, // Added batch functions
  API_URL // Import the base URL
} from '../utils/api';
import TranslationPopup from '../components/TranslationPopup';
import './TextDisplay.css';

// --- SRT Parsing Utilities ---

// Helper function to parse SRT time format (HH:MM:SS,ms) into seconds
const parseSrtTime = (timeString) => {
  if (!timeString) return 0;
  const parts = timeString.split(':');
  const secondsParts = parts[2]?.split(',');
  if (!secondsParts || secondsParts.length < 2) return 0;

  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);
  const seconds = parseInt(secondsParts[0], 10);
  const milliseconds = parseInt(secondsParts[1], 10);

  if (isNaN(hours) || isNaN(minutes) || isNaN(seconds) || isNaN(milliseconds)) {
    return 0;
  }

  return hours * 3600 + minutes * 60 + seconds + milliseconds / 1000;
};

// Parses SRT content into a structured array
const parseSrtContent = (srtContent) => {
  if (!srtContent) return [];

  const lines = srtContent.trim().split(/\r?\n/);
  const entries = [];
  let currentEntry = null;
  let textBuffer = [];

  for (const line of lines) {
    const trimmedLine = line.trim();

    if (currentEntry === null) {
      // Expecting sequence number
      if (/^\d+$/.test(trimmedLine)) {
        currentEntry = { id: parseInt(trimmedLine, 10), startTime: 0, endTime: 0, text: '' };
        textBuffer = []; // Reset text buffer for new entry
      }
    } else if (currentEntry.startTime === 0 && trimmedLine.includes('-->')) {
      // Expecting timecodes
      const timeParts = trimmedLine.split(' --> ');
      if (timeParts.length === 2) {
        currentEntry.startTime = parseSrtTime(timeParts[0]);
        currentEntry.endTime = parseSrtTime(timeParts[1]);
      }
    } else if (trimmedLine === '') {
       // Blank line signifies end of current entry's text
       if (currentEntry && currentEntry.startTime > 0 && textBuffer.length > 0) {
           currentEntry.text = textBuffer.join(' ').trim(); // Join multi-line text with spaces
           entries.push(currentEntry);
           currentEntry = null; // Reset for next entry
           textBuffer = [];
       } else if (currentEntry && currentEntry.startTime > 0) {
           // Handle case where text might be missing but times are present (less common)
           currentEntry.text = '';
           entries.push(currentEntry);
           currentEntry = null;
           textBuffer = [];
       }
    } else if (currentEntry) {
      // Expecting text line(s)
      textBuffer.push(trimmedLine);
    }
  }

  // Add the last entry if it wasn't followed by a blank line
  if (currentEntry && currentEntry.startTime > 0 && textBuffer.length > 0) {
    currentEntry.text = textBuffer.join(' ').trim();
    entries.push(currentEntry);
  }

  console.log(`[SRT Parser] Parsed ${entries.length} entries.`);
  return entries;
};

// --- End SRT Parsing Utilities ---


// CSS for word highlighting
const styles = {
  highlightedWord: {
    cursor: 'pointer',
    padding: '0 2px',
    margin: '0 1px',
    borderRadius: '3px',
    transition: 'all 0.2s ease',
  },

  wordStatus1: { color: '#000', backgroundColor: '#ff6666' },  // New (red)
  wordStatus2: { color: '#000', backgroundColor: '#ff9933' },  // Learning (orange)
  wordStatus3: { color: '#000', backgroundColor: '#ffdd66' },  // Familiar (yellow)
  wordStatus4: { color: '#000', backgroundColor: '#99dd66' },  // Advanced (light green)
  wordStatus5: { color: 'inherit', backgroundColor: 'transparent' }, // Known - no highlighting
  selectedSentence: {
    backgroundColor: 'rgba(0, 123, 255, 0.1)',
    padding: '0.25rem',
    borderRadius: '0.25rem',
    border: '1px dashed rgba(0, 123, 255, 0.5)',
  },
  untrackedWord: {
    cursor: 'pointer',
    color: '#007bff',
    textDecoration: 'underline',
  },
  textContainer: {
    height: 'calc(100vh - 120px)',
    overflowY: 'auto',
    padding: '15px',
    borderRight: '1px solid #eee'
  },
  translationPanel: {
    height: 'calc(100vh - 120px)',
    padding: '15px',
  },
  wordPanel: {
    marginTop: '20px',
    padding: '15px',
    backgroundColor: '#f8f9fa',
    borderRadius: '8px',
  },
  // Modal header styling
  modalHeader: {
    backgroundColor: '#f8f9fa',
    borderBottom: '1px solid #dee2e6',
  }
};

const TextDisplay = () => {
  const { textId } = useParams();
  const navigate = useNavigate();
  const textContentRef = useRef(null);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [text, setText] = useState(null);
  const [book, setBook] = useState(null); // Restored state for setBook usage
  const [words, setWords] = useState([]);
  
  // Word editing state
  const [selectedWord, setSelectedWord] = useState('');
  const [translation, setTranslation] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);
  const [processingWord, setProcessingWord] = useState(false);
  // State to track the currently displayed word in the side panel
  const [displayedWord, setDisplayedWord] = useState(null);
  
  // Add success message state
  const [saveSuccess, setSaveSuccess] = useState(false);
  
  // Add states for lesson completion
  const [completing, setCompleting] = useState(false);
  const [stats, setStats] = useState(null);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [nextTextId, setNextTextId] = useState(null);

  
    // States for sentence translation
    const [selectedSentence, /*setSelectedSentence*/] = useState(''); // Removed unused setter
    // Removed sentenceTranslation and isSentenceTranslating states
    
  const [showTranslationPopup, setShowTranslationPopup] = useState(false);
  const [fullTextTranslation, setFullTextTranslation] = useState('');
  const [isFullTextTranslating, setIsFullTextTranslating] = useState(false);

  // Add this to the component's state declarations
  const [userSettings, setUserSettings] = useState({
    textSize: 16,
    textFont: 'default',
    autoTranslateWords: true,
    highlightKnownWords: true,
    autoAdvanceToNextLesson: false,
    showProgressStats: true
  });

  // Add these new state variables with the other state declarations
  const [leftPanelWidth, setLeftPanelWidth] = useState(85); // Default 85% of width for reading panel
  const [isDragging, setIsDragging] = useState(false);
  const resizeDividerRef = useRef(null);

  // State for translating unknown words
  const [translatingUnknown, setTranslatingUnknown] = useState(false);
  const [translateUnknownError, setTranslateUnknownError] = useState('');
  const [wordTranslationError, setWordTranslationError] = useState(''); // Add state for single word translation error

  // State for Audio Lessons
  const [isAudioLesson, setIsAudioLesson] = useState(false);
  const [audioSrc, setAudioSrc] = useState(null);
  const [srtLines, setSrtLines] = useState([]); // Parsed SRT lines: { id, startTime, endTime, text }
  const [currentSrtLineId, setCurrentSrtLineId] = useState(null); // ID of the currently active SRT line
  const [audioCurrentTime, setAudioCurrentTime] = useState(0); // Current playback time
  const audioRef = useRef(null); // Ref for the audio element
  const listRef = useRef(null); // Ref for the react-window List
  
    // Helper function to get the data (status, translation) of a word
    // Moved here and wrapped in useCallback
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const getWordData = useCallback((word) => {
      if (!word) return null; // Return null if no word provided
  
      // Make case-insensitive search
      const wordLower = word.toLowerCase();
      const foundWord = words.find(w =>
        w.term &&
        w.term.toLowerCase() === wordLower
      );
  
      // Return the full word object if found, otherwise null
      return foundWord || null;
    }, [words]); // Dependency: words state
  
    // Function to get word styling based on status and settings
    // Moved here and wrapped in useCallback
    const getWordStyle = useCallback((wordStatus) => { // Parameter is status (number)
      const baseStyle = {
        cursor: 'pointer',
        padding: '2px 0',
        margin: '0 2px',
        borderRadius: '3px',
        transition: 'all 0.2s'
      };
  
      // If highlighting is disabled in settings, show only hover effect
      if (!userSettings?.highlightKnownWords) {
        return {
          ...baseStyle,
          backgroundColor: 'transparent'
        };
      }
  
      // Known words (status 5) have no highlighting
      if (wordStatus === 5) {
        return {
          ...baseStyle,
          backgroundColor: 'transparent',
          color: 'inherit'
        };
      }
  
      // Status-based styling
      const statusStyles = {
        0: { backgroundColor: 'var(--status-0-color)', color: '#000' }, // Untracked (if needed)
        1: { backgroundColor: 'var(--status-1-color)', color: '#000' }, // New
        2: { backgroundColor: 'var(--status-2-color)', color: '#000' }, // Learning
        3: { backgroundColor: 'var(--status-3-color)', color: '#000' }, // Familiar
        4: { backgroundColor: 'var(--status-4-color)', color: '#000' }, // Advanced
        5: { backgroundColor: 'transparent', color: 'inherit' },      // Known
      };
  
      // Return style based on word status
      return {
        ...baseStyle,
        ...(statusStyles[wordStatus] || statusStyles[0]) // Default to untracked style if status is invalid
      };
    }, [userSettings?.highlightKnownWords]); // Dependency: userSettings
  
    // Helper function to trigger auto-translation
    // Moved here and wrapped in useCallback
    const triggerAutoTranslation = useCallback(async (termToTranslate) => {
      console.log(`[triggerAutoTranslation] Called for: "${termToTranslate}"`);
      console.log(`[triggerAutoTranslation] autoTranslateWords setting: ${userSettings.autoTranslateWords}`);
  
      if (!termToTranslate || !userSettings.autoTranslateWords || !text?.languageCode) {
        console.log('[triggerAutoTranslation] Condition not met, exiting.');
        return;
      }
  
      setIsTranslating(true);
      setWordTranslationError('');
  
      try {
        console.log(`[triggerAutoTranslation] Calling API: translateText("${termToTranslate}", "${text.languageCode}", "EN")`);
        const result = await translateText(termToTranslate, text.languageCode, 'EN'); // Assuming EN target
        console.log('[triggerAutoTranslation] API Result:', result);
  
        if (result?.translatedText) {
          console.log(`[triggerAutoTranslation] Translation found: "${result.translatedText}"`);
          setTranslation(result.translatedText);
          setDisplayedWord(prev => ({
            ...prev,
            translation: result.translatedText
          }));
        } else {
          console.warn('Translation successful but result is empty for:', termToTranslate);
          setWordTranslationError('Translation not found.');
        }
      } catch (err) {
        console.error('Auto-translation failed for:', termToTranslate, err);
        setWordTranslationError(`Translation failed: ${err.message}`);
      } finally {
        setIsTranslating(false);
      }
    // Dependencies: userSettings, text state, and state setters
    }, [userSettings.autoTranslateWords, text?.languageCode, setTranslation, setDisplayedWord, setIsTranslating, setWordTranslationError]); // Removed translateText
  
    // Function to handle clicking on a word
    // Moved here and kept useCallback
    const handleWordClick = useCallback(async (word) => {
      setSelectedWord(word);
      setProcessingWord(true);
      setWordTranslationError(''); // Clear previous error on new click
  
      // Find if the word already exists in our state
      const existingWord = words.find(w =>
        w.term && w.term.toLowerCase() === word.toLowerCase()
      );
  
      if (existingWord) {
        console.log('Found existing word:', existingWord);
        setDisplayedWord(existingWord);
        setTranslation(existingWord.translation || '');
        // Trigger auto-translation if needed
        if (!existingWord.translation) {
           triggerAutoTranslation(word); // Assumes triggerAutoTranslation is defined below or stable
        }
      } else {
        // Create a new word object
        const newWord = {
          term: word,
          status: 0,
          translation: '',
          isNew: true
        };
        setDisplayedWord(newWord);
        setTranslation('');
        // Trigger auto-translation
        triggerAutoTranslation(word); // Assumes triggerAutoTranslation is defined below or stable
      }
      setProcessingWord(false);
    // Dependencies: words state and the trigger function
    }, [words, triggerAutoTranslation]); // Removed text, userSettings.autoTranslateWords
  
    // Process the content to create formatted text
    // Moved here to be defined before itemData uses it
    const processTextContent = useCallback((content) => {
      // Use Unicode-aware regex that includes all letters from any language
      const words = content.split(/([^\p{L}''-]+)/gu); // Removed \ before -
  
      return words.map((segment, index) => {
        const trimmed = segment.trim();
        if (trimmed.length === 0) {
          return segment; // Return spaces and punctuation as is
        }
  
        // If this is a word
        if (/[\p{L}''-]/u.test(segment)) { // Removed \ before -
          const wordOnly = segment;
  
          // Skip very short segments
          if (wordOnly.length <= 1 && !/[\p{L}]/u.test(wordOnly)) {
            return segment;
          }
  
          const wordData = getWordData(wordOnly); // Assumes getWordData is defined below
          const wordStatus = wordData ? wordData.status : 0;
          const wordTranslation = wordData ? wordData.translation : null;
  
          const wordSpan = (
            <span
              key={`word-${index}-${wordOnly}`}
              style={{
                ...styles.highlightedWord,
                ...getWordStyle(wordStatus) // Assumes getWordStyle is defined below
              }}
              className={`clickable-word word-status-${wordStatus}`}
              onClick={(e) => {
                e.stopPropagation();
                handleWordClick(wordOnly); // Assumes handleWordClick is defined below
              }}
            >
              {segment}
            </span>
          );
  
          // Wrap with OverlayTrigger if translation exists
          if (wordTranslation) {
            return (
              <OverlayTrigger
                key={`tooltip-${index}-${wordOnly}`}
                placement="top"
                overlay={
                  <Tooltip id={`tooltip-${index}-${wordOnly}`}>
                    {wordTranslation}
                  </Tooltip>
                }
              >
                {wordSpan}
              </OverlayTrigger>
            );
          } else {
            return wordSpan;
          }
        }
  
        // Return non-word segments as is
        return segment;
      });
    // Add dependencies for useCallback. These functions need to be defined before this point too.
    // Or, ensure they are stable (defined outside component or memoized themselves).
    // For now, assuming they are stable or defined above.
    }, [words, getWordData, getWordStyle, handleWordClick]); // Added dependencies
  
    // --- Functions and Data for Virtualized List ---
  
    // Function to get font family based on user settings (needed by getFontStyling)
    // Note: This is duplicated from renderAudioTranscript, consider refactoring later
    const getFontFamilyForList = useCallback(() => {
      switch (userSettings.textFont) {
        case 'serif': return "'Georgia', serif";
        case 'sans-serif': return "'Arial', sans-serif";
        case 'monospace': return "'Courier New', monospace";
        case 'dyslexic': return "'OpenDyslexic', sans-serif";
        default: return "inherit";
      }
    }, [userSettings.textFont]);
  
    // Function to pass font styling to TranscriptLine
    const getFontStyling = useCallback(() => ({
        fontSize: `${userSettings.textSize}px`,
        fontFamily: getFontFamilyForList(), // Use the specific getter
    }), [userSettings.textSize, getFontFamilyForList]);
  
    // Function to handle clicking on a line - seek audio
    const handleLineClick = useCallback((startTime) => {
        if (audioRef.current) {
            audioRef.current.currentTime = startTime;
        }
    }, []); // audioRef is stable
  
    // Prepare itemData for FixedSizeList
    const itemData = React.useMemo(() => ({
        lines: srtLines,
        currentLineId: currentSrtLineId,
        // Make sure processTextContent is stable or memoized if it causes issues
        processLineContent: processTextContent,
        handleLineClick: handleLineClick,
        getFontStyling: getFontStyling
    }), [srtLines, currentSrtLineId, handleLineClick, getFontStyling, processTextContent]);
  
    // --- End Functions and Data for Virtualized List ---
    
  // Add this useEffect for the resizable functionality
  useEffect(() => {
    const handleMouseDown = (e) => {
      setIsDragging(true);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    };

    const handleMouseMove = (e) => {
      if (!isDragging) return;
      
      const containerWidth = document.querySelector('.resizable-container').offsetWidth;
      const newWidth = (e.clientX / containerWidth) * 100;
      
      // Limit the width between 20% and 90%
      const limitedWidth = Math.min(Math.max(newWidth, 30), 90);
      setLeftPanelWidth(limitedWidth);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      document.body.style.cursor = 'default';
      document.body.style.userSelect = 'auto';
    };

    const divider = resizeDividerRef.current;
    if (divider) {
      divider.addEventListener('mousedown', handleMouseDown);
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      if (divider) {
        divider.removeEventListener('mousedown', handleMouseDown);
      }
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  // Add this as a new useEffect
  useEffect(() => {
    // Fetch user settings
    const fetchUserSettings = async () => {
      try {
        const settings = await getUserSettings();
        setUserSettings({
          textSize: settings.textSize || 16,
          textFont: settings.textFont || 'default',
          autoTranslateWords: settings.autoTranslateWords ?? true,
          highlightKnownWords: settings.highlightKnownWords ?? true,
          autoAdvanceToNextLesson: settings.autoAdvanceToNextLesson ?? false,
          showProgressStats: settings.showProgressStats ?? true
        });
      } catch (err) {
        console.error('Failed to load user settings:', err);
        // Use defaults if settings can't be loaded
      }
    };
    
    fetchUserSettings();
  }, []);

  useEffect(() => {
    const fetchText = async () => {
      setLoading(true);
      try {
        const data = await getText(textId);
        setText(data);
        setBook(data.book); // Note: data.book might not exist, handle potential null

        // --- Handle Audio Lesson Data ---
        if (data.isAudioLesson && data.audioFilePath && data.srtContent) {
          console.log("[Audio Lesson] Detected. Processing audio/SRT data.");
          setIsAudioLesson(true);
          // Construct the full URL for the audio file
          // Assuming API_URL base is where static files are served relative to wwwroot
          // Use the imported API_URL
          setAudioSrc(`${API_URL}/${data.audioFilePath}`);
          
          const parsedSrt = parseSrtContent(data.srtContent);
          setSrtLines(parsedSrt);
          setCurrentSrtLineId(null); // Reset active line
          setAudioCurrentTime(0); // Reset time
        } else {
           // Ensure audio states are reset if it's not an audio lesson
           setIsAudioLesson(false);
           setAudioSrc(null);
           setSrtLines([]);
           setCurrentSrtLineId(null);
           setAudioCurrentTime(0);
        }
        // --- End Audio Lesson Handling ---

        // Initialize with words from the text
        setWords(data.words || []);
        
        // Now also fetch words for this language globally
        if (data.languageId) {
          await fetchAllLanguageWords(data.languageId);
        }
        
        // Update last read position if this text is part of a book
        if (data.bookId) {
          try {
            await updateLastRead(data.bookId, data.textId);
            
            // Find the next text in the book if there is one
            const bookData = await getBook(data.bookId);
            if (bookData && bookData.parts) {
              const currentPartIndex = bookData.parts.findIndex(part => part.textId === parseInt(textId));
              if (currentPartIndex >= 0 && currentPartIndex < bookData.parts.length - 1) {
                // There is a next part
                setNextTextId(bookData.parts[currentPartIndex + 1].textId);
              }
            }
          } catch (err) {
            console.error('Failed to update last read position:', err);
            // Non-critical error, so don't display to user
          }
        }
      } catch (err) {
        setError(err.message || 'Failed to load text');
      } finally {
        setLoading(false);
      }
    };

    fetchText();
    
    // Clear state when component unmounts
    return () => {
      setText(null);
      setWords([]);
      setError('');
      setNextTextId(null);
    };
  }, [textId]);

  // --- Audio Synchronization Effect ---
  useEffect(() => {
    if (!isAudioLesson || srtLines.length === 0) {
      setCurrentSrtLineId(null); // Ensure it's null if not applicable
      return;
    }

    // Find the *index* of the current SRT line
    const currentLineIndex = srtLines.findIndex(line =>
        audioCurrentTime >= line.startTime && audioCurrentTime < line.endTime
    );
    const currentLine = currentLineIndex !== -1 ? srtLines[currentLineIndex] : null;

    if (currentLine) {
      if (currentLine.id !== currentSrtLineId) {
        setCurrentSrtLineId(currentLine.id);
        // Scroll the virtualized list to the active line's index
        if (listRef.current && currentLineIndex !== -1) {
          // Add a slight delay to ensure the state update has rendered before scrolling
          setTimeout(() => {
              if (listRef.current) { // Check ref again inside timeout
                 listRef.current.scrollToItem(currentLineIndex, 'center'); // 'center' alignment
              }
          }, 50); // Small delay (e.g., 50ms)
        }
      }
    } else {
      // If no line matches (e.g., between lines or before the first one)
      if (currentSrtLineId !== null) {
         // Uncomment below if you want highlighting to disappear between lines
         // setCurrentSrtLineId(null);
      }
    }
    // Dependencies: Include listRef.current? No, refs don't trigger re-renders.
    // audioCurrentTime, srtLines, isAudioLesson, currentSrtLineId are correct.
  }, [audioCurrentTime, srtLines, isAudioLesson, currentSrtLineId]);


  // Fetch all words for the current language
  const fetchAllLanguageWords = async (languageId) => {
    try {
      // Call a new API endpoint to get all words for a language
      const response = await fetch(`http://localhost:5000/api/words/language/${languageId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Accept': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch language words');
      }
      
      const allLanguageWords = await response.json();
      
      // Merge with existing words, avoiding duplicates
      setWords(prevWords => {
        const existingWordIds = new Set(prevWords.map(w => w.wordId));
        const newWords = allLanguageWords.filter(w => !existingWordIds.has(w.wordId));
        return [...prevWords, ...newWords];
      });
      
    } catch (error) {
      console.error('Error fetching language words:', error);
      // Don't set error state here as it's not critical
    }
  };


  const handleSaveWord = async (status) => {
    if (!selectedWord || processingWord || isTranslating) return;
    
    setSaveSuccess(false); // Reset success message
    setProcessingWord(true);
    
    try {
      // Convert status to numeric value
      const numericStatus = parseInt(status, 10);
      
      if (isNaN(numericStatus) || numericStatus < 1 || numericStatus > 5) {
        throw new Error(`Invalid status: ${status}. Must be a number between 1-5.`);
      }
      
      // Find if the word already exists in our words list - use normalization
      const normalizedWord = selectedWord.normalize('NFC').toLowerCase();
      const existingWord = words.find(w => 
        w.term && 
        w.term.normalize('NFC').toLowerCase() === normalizedWord
      );
      
      if (existingWord) {
        // Update existing word
        await updateWord(existingWord.wordId, numericStatus, translation); // Remove unused assignment
        
        // Update the words list
        setWords(prevWords => 
          prevWords.map(word => 
            word.wordId === existingWord.wordId 
              ? { ...word, status: numericStatus, translation } 
              : word
          )
        );
        
        // Update the displayed word in the side panel
        setDisplayedWord({
          term: existingWord.term,
          translation: translation,
          status: numericStatus
        });
      } else {
        // Create new word
        const newWord = await createWord(textId, selectedWord, numericStatus, translation);
        
        // Add the new word to the words list
        setWords(prevWords => [...prevWords, newWord]);
        
        // Update the displayed word in the side panel
        setDisplayedWord({
          term: selectedWord,
          translation: translation,
          status: numericStatus
        });
      }
      
      // Show success message
      setSaveSuccess(true);
      
      // Hide success message after 2 seconds
      setTimeout(() => setSaveSuccess(false), 2000);
      
    } catch (error) {
      console.error('Error saving word:', error);
      alert(`Failed to save word: ${error.message}`);
    } finally {
      setProcessingWord(false);
    }
  };

  // Renamed function to handle any text selection (single word or phrase)
  const handleTextSelection = useCallback((text) => {
    const selectedText = text.trim();
    if (!selectedText) return;

    // Reuse selectedWord state for the selected phrase/word
    setSelectedWord(selectedText);
    // Clear previous translation and error
    setTranslation('');
    setWordTranslationError('');

    // Find if this exact phrase/word exists
    const existingWord = words.find(w => w.term && w.term.toLowerCase() === selectedText.toLowerCase());

    if (existingWord) {
      // Phrase/word exists, display its data
      console.log('Found existing term:', existingWord);
      setDisplayedWord(existingWord);
      setTranslation(existingWord.translation || '');
      // Trigger translation if existing but untranslated (respects user setting)
      if (!existingWord.translation) {
         triggerAutoTranslation(selectedText);
      }
    } else {
      // New phrase/word selected
      console.log('New term selected:', selectedText);
      setDisplayedWord({
        term: selectedText,
        status: 0, // Treat as untracked initially
        translation: '',
        isNew: true
      });
      // Trigger auto-translation (respects user setting)
      triggerAutoTranslation(selectedText);
    }
  // Dependencies: words state, trigger function, and relevant setters
  }, [words, triggerAutoTranslation, setSelectedWord, setTranslation, setWordTranslationError, setDisplayedWord]);
  
  // Function to request full text translation
  const handleFullTextTranslation = async () => {
    if (!text || !text.content) {
      console.error("No text content available for translation");
      return;
    }
    
    const sourceLanguageCode = text.languageCode || 'auto';
    console.log(`Initiating full text translation from ${sourceLanguageCode} to en`);
    console.log(`Text content length: ${text.content.length} characters`);
    
    // Open popup first, then start translation
    setShowTranslationPopup(true);
    setIsFullTextTranslating(true);
    setFullTextTranslation(''); // Clear any previous translation
    
    try {
      console.log(`Sending text for translation: "${text.content.substring(0, 100)}..."`);
      const response = await translateFullText(text.content, sourceLanguageCode, 'en');
      console.log('Full text translation response:', response);
      
      if (response && response.translatedText) {
        setFullTextTranslation(response.translatedText);
        console.log(`Full translation received, length: ${response.translatedText.length} characters`);
      } else {
        console.error('Translation response missing translatedText:', response);
        setFullTextTranslation('Translation failed: Invalid response');
      }
    } catch (error) {
      console.error('Error translating full text:', error);
      setFullTextTranslation(`Translation failed: ${error.message || 'Unknown error'}`);
    } finally {
      setIsFullTextTranslating(false);
    }
  };

  // Function to handle translating all unknown words
  const handleTranslateUnknownWords = async () => {
    if (!text || !text.content || !text.languageId) {
      setTranslateUnknownError("Text content or language information is missing.");
      return;
    }

    setTranslatingUnknown(true);
    setTranslateUnknownError('');

    try {
      // 1. Identify unknown words
      // Simple word splitting (adjust regex as needed for the language)
      // Consider using a more robust tokenizer if available
      const textWords = text.content.match(/[\w'-]+/g) || [];
      const uniqueWordsInText = [...new Set(textWords.map(w => w.toLowerCase()))];

      const wordsMap = new Map(words.map(w => [w.term.toLowerCase(), w]));
      
      const unknownWords = uniqueWordsInText.filter(word => {
        const existing = wordsMap.get(word);
        // Consider unknown if:
        // 1. Not present in the words list at all
        // 2. Present but status is New (1) or Learning (2) AND has no translation yet
        return !existing || (existing.status <= 2 && !existing.translation);
      });

      if (unknownWords.length === 0) {
        alert("No unknown words found to translate.");
        setTranslatingUnknown(false);
        return;
      }

      console.log(`Found ${unknownWords.length} unique unknown words to translate.`);

      // 2. Call Batch Translation API (Need to create this function in api.js)
      // Assuming target language is English ('EN') - make this configurable if needed
      const targetLang = 'EN';
      const sourceLang = text.languageCode; // e.g., 'FR'

      // Create batchTranslateWords in api.js similar to translateText
      const translations = await batchTranslateWords(unknownWords, targetLang, sourceLang);

      if (!translations || Object.keys(translations).length === 0) {
          throw new Error("Batch translation returned no results.");
      }

      console.log(`Received ${Object.keys(translations).length} translations.`);
      
      // 3. Prepare data for Batch Add Terms API
      const termsToAdd = unknownWords
        .map(word => ({
          term: word, // Use the original case? DeepL might return lower. Let's stick to lower for consistency? Or find original case.
                      // Let's find the original case from the first occurrence in textWords for better display
          translation: translations[word.toLowerCase()] || '' // Match translation using lowercase key
        }))
        .filter(term => term.translation); // Only include terms that got a translation

      // Find original casing (could be improved for performance)
      const originalCaseMap = new Map();
      textWords.forEach(w => {
          const lower = w.toLowerCase();
          if (!originalCaseMap.has(lower)) {
              originalCaseMap.set(lower, w);
          }
      });
      
      const termsToAddWithOriginalCase = termsToAdd.map(t => ({
          ...t,
          term: originalCaseMap.get(t.term.toLowerCase()) || t.term // Fallback if not found
      }));


      if (termsToAddWithOriginalCase.length === 0) {
          throw new Error("No valid translations received to add as terms.");
      }

      console.log(`Prepared ${termsToAddWithOriginalCase.length} terms to add/update.`);

      // 4. Call Batch Add Terms API (Need to create this function in api.js)
      // Create addTermsBatch in api.js
      await addTermsBatch(text.languageId, termsToAddWithOriginalCase);

      // 5. Update local state (Refetch or merge)
      // Easiest is to refetch all words for the language to ensure consistency
      await fetchAllLanguageWords(text.languageId);
      
      alert(`Successfully translated and updated ${termsToAddWithOriginalCase.length} unknown words.`);

    } catch (err) {
      console.error("Error translating unknown words:", err);
      setTranslateUnknownError(`Failed: ${err.message}`);
      alert(`Error: ${err.message}`); // Show error to user
    } finally {
      setTranslatingUnknown(false);
    }
  };

  // Improved event listener setup
  useEffect(() => {
    console.log("Setting up text selection event listener");
    
    // Function to handle text selection via mouseup event
    const handleMouseUp = (event) => {
      // Give a small delay to ensure selection is complete
      setTimeout(() => {
        const selected = window.getSelection().toString();
        // Only trigger if selection is not just whitespace and is likely more than a single word click
        // (handleWordClick handles single words)
        if (selected && selected.trim().length > 0 && selected.includes(' ')) {
          console.log(`Selection detected: "${selected}" (${selected.length} chars)`);
          handleTextSelection(selected); // Call the renamed function
        }
      }, 100);
    };
    
    // Add the event listener to the document
    document.addEventListener('mouseup', handleMouseUp);
    
    // Cleanup
    return () => {
      console.log("Removing text selection event listener");
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [text, handleTextSelection]); // Added handleTextSelection


    // Process the content to create formatted text
    // Moved here to be in scope for both renderTextContent and renderAudioTranscript


  // --- End Shared Content Processing Logic ---
  
  
 // --- Transcript Line Component for React Window ---
 // Memoized component to render each line efficiently
 const TranscriptLine = React.memo(({ index, style, data }) => {
   // Destructure data passed from the List component
   const {
     lines,             // Array of all SRT lines
     currentLineId,     // ID of the currently active line
     processLineContent,// Function to process text into highlighted spans
     handleLineClick,   // Function to handle clicking on a line
     getFontStyling     // Function to get current font styles
   } = data;
 
   // Get the specific line data for this row
   const line = lines[index];
 
   // Safety check in case line data is missing
   if (!line) return null;
 
   // Render the row content inside the div provided by react-window
   return (
     <div style={style}> {/* Apply positioning styles from react-window */}
       <p
         id={`srt-line-${line.id}`} // ID for potential scrolling
         className={`srt-line ${line.id === currentLineId ? 'active-srt-line' : ''}`} // Apply active class
         style={{
           ...getFontStyling(), // Apply dynamic font size/family
           marginBottom: '0.8rem', // Consistent margin
           padding: '0.3rem 0.5rem', // Padding
           borderRadius: '4px',      // Rounded corners
           transition: 'background-color 0.3s ease', // Smooth background transition
           // Highlight background if active
           backgroundColor: line.id === currentLineId ? 'var(--active-srt-line-bg, rgba(255, 223, 186, 0.7))' : 'transparent',
           cursor: 'pointer', // Indicate clickable
           margin: 0 // Remove default paragraph margin to fit within react-window's div
         }}
         // Seek audio to the start time of this line when clicked
         onClick={() => handleLineClick(line.startTime)}
       >
         {/* Process the line's text content for word highlighting */}
         {processLineContent(line.text)}
       </p>
     </div>
   );
 });
 // --- End Transcript Line Component ---
 
 
  // --- Audio Transcript Rendering ---
  const renderAudioTranscript = () => {
    if (!srtLines || srtLines.length === 0) return <p className="p-3">Loading transcript...</p>;

    // Define estimated item size (adjust based on typical line height + margin)
    // Consider making this dynamic based on font size if needed, but fixed is simpler
    const ITEM_SIZE = 45; // Increased estimate for padding/margins

    // Define container height (adjust as needed, e.g., calculate based on viewport)
    // Placeholder - calculation might be complex, start fixed
    // TODO: Calculate LIST_HEIGHT dynamically based on available space
    const LIST_HEIGHT = 600;

    return (
      <div
        className="audio-transcript-container"
        style={{
          // Container style remains simple, List handles scrolling
          padding: '15px', // Keep padding outside the List for spacing
          height: `${LIST_HEIGHT}px`, // Set explicit height for List
          overflow: 'hidden' // List component handles internal scrolling
        }}
      >
        <List
            height={LIST_HEIGHT} // Height of the list container
            itemCount={srtLines.length} // Number of items
            itemSize={ITEM_SIZE} // Height of each item
            width="100%" // Width of the list
            itemData={itemData} // Pass data to the Row component
            overscanCount={5} // Render a few extra items for smoother scrolling
            ref={listRef} // Attach the ref here
        >
            {TranscriptLine}
        </List>
      </div>
    );
  };
  // --- End Audio Transcript Rendering ---


  // Update the renderTextContent function
  const renderTextContent = () => {
     // --- Add check for Audio Lesson ---
     // Note: This relies on processTextContent being defined below, which might need refactoring
     // if renderAudioTranscript was moved *completely* outside TextDisplay component scope.
     // Since it's defined within TextDisplay, it should be fine.
     if (isAudioLesson) {
       return renderAudioTranscript();
     }
     // --- End check ---

    if (!text || !text.content) return null;
    
    // Get font family based on user settings
    const getFontFamily = () => {
      switch (userSettings.textFont) {
        case 'serif':
          return "'Georgia', serif";
        case 'sans-serif':
          return "'Arial', sans-serif";
        case 'monospace':
          return "'Courier New', monospace";
        case 'dyslexic':
          return "'OpenDyslexic', sans-serif";
        default:
          return "inherit";
      }
    };
    
    // Split the content into paragraphs
    const processParagraphs = (content) => {
      // Split by common paragraph breaks (multiple spaces, newlines, etc.)
      // This improved regex better handles various paragraph formats
      const paragraphs = content.split(/(\n\s*\n|\r\n\s*\r\n|\r\s*\r)/g)
        .filter(p => p.trim().length > 0);
      
      return paragraphs.map((paragraph, index) => {
        if (paragraph.trim().length === 0) return null;
        
        return (
          <p key={`para-${index}`} className="mb-2" style={{ textIndent: '1.5em' }}>
            {processTextContent(paragraph)}
          </p>
        );
      }).filter(p => p !== null);
    };
    
    // Function to highlight the selected sentence
    const highlightSelectedSentence = (content) => {
      if (!selectedSentence || selectedSentence.length === 0) {
        return processParagraphs(content);
      }
      
      // Escape special characters for use in regex
      const escapedSentence = selectedSentence.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      
      // Check if the selected sentence contains paragraph breaks
      if (selectedSentence.includes('\n')) {
        // If it does, process paragraphs normally but highlight the whole selection
        return processParagraphs(content);
      }
      
      // For the paragraph containing the selected sentence, highlight just that part
      const paragraphs = content.split(/\n+/);
      
      return paragraphs.map((paragraph, index) => {
        if (paragraph.trim().length === 0) return <br key={`para-empty-${index}`} />;
        
        if (paragraph.includes(selectedSentence)) {
          // This paragraph contains the selected sentence
          const parts = paragraph.split(new RegExp(`(${escapedSentence})`, 'g'));
          
          return (
            <p key={`para-${index}`} className="mb-3" style={{ textIndent: '1.5em' }}>
              {parts.map((part, partIndex) => {
                if (part === selectedSentence) {
                  return (
                    <span 
                      key={`sentence-${partIndex}`}
                      style={styles.selectedSentence}
                      // Removed onClick={() => handleSentenceClick(part)} as selection is handled by mouseup
                    >
                      {processTextContent(part)}
                    </span>
                  );
                }
                return processTextContent(part);
              })}
            </p>
          );
        }
        
        // Paragraph doesn't contain the selection, process normally
        return (
          <p key={`para-${index}`} className="mb-3" style={{ textIndent: '1.5em' }}>
            {processTextContent(paragraph)}
          </p>
        );
      });
    };
    
    // NOTE: processTextContent moved before renderAudioTranscript to fix scope issue

    const detectSentences = (content) => {
      return processParagraphs(content);
    };
    
    return (
      <div className="text-content-wrapper">
        <div 
          ref={textContentRef}
          className="text-content" 
          style={{ 
            fontSize: `${userSettings.textSize}px`, 
            lineHeight: '1.6', 
            textAlign: 'left',
            fontFamily: getFontFamily(),
            maxWidth: '100%',
            padding: '0'
          }}
        >
          {selectedSentence ? highlightSelectedSentence(text.content) : detectSentences(text.content)}
        </div>
      </div>
    );
  };

  // Replacement for the previous modal content in the side panel
  const renderSidePanel = () => {
    if (!displayedWord) {
      return <p>Click on a word in the text to see its information here.</p>;
    }

    return (
      <div>
        <h5 className="fw-bold mb-2">{displayedWord.term}</h5>
        
        {saveSuccess && (
          <Alert variant="success" className="py-1 px-2 mb-2">
            Word saved successfully!
          </Alert>
        )}
        
        {displayedWord.status > 0 ? (
          <div className="mb-2">
            <div className="py-1 px-2 mb-1 small border-start border-3 border-primary">
              Status: {
                displayedWord.status === 1 ? 'New' :
                displayedWord.status === 2 ? 'Learning' :
                displayedWord.status === 3 ? 'Familiar' :
                displayedWord.status === 4 ? 'Advanced' : 'Known'
              }
            </div>
          </div>
        ) : (
          <div className="mb-2">
            <div className="py-1 px-2 mb-1 small border-start border-3 border-info">
              Status: Not tracked yet
            </div>
          </div>
        )}

        {/* Display translation error if any */}
        {wordTranslationError && (
          <Alert variant="danger" className="py-1 px-2 mb-2 small">
            {wordTranslationError}
          </Alert>
        )}
        
        <Form>
          <Form.Group className="mb-2">
            <Form.Label className="mb-1 small">Translation</Form.Label>
            <div className="position-relative">
              <Form.Control
                as="textarea"
                rows={2}
                value={translation}
                onChange={(e) => setTranslation(e.target.value)}
                placeholder="Enter translation or notes"
                disabled={isTranslating}
                className="py-1"
                size="sm"
              />
              {isTranslating && (
                <div className="position-absolute top-50 end-0 translate-middle-y me-3">
                  <Spinner animation="border" size="sm" />
                  <span className="ms-2 small">Translating...</span>
                </div>
              )}
            </div>
          </Form.Group>
        </Form>
        
        <div className="d-flex flex-wrap gap-1 mt-2">
          <Button 
            variant="danger" 
            onClick={() => handleSaveWord(1)}
            disabled={processingWord || isTranslating || !selectedWord}
            style={{ backgroundColor: styles.wordStatus1.backgroundColor, color: 'black' }}
            size="sm"
            className="py-0 px-2"
          >
            New (1)
          </Button>
          <Button 
            variant="warning" 
            onClick={() => handleSaveWord(2)}
            disabled={processingWord || isTranslating || !selectedWord}
            style={{ backgroundColor: styles.wordStatus2.backgroundColor, color: 'black' }}
            size="sm"
            className="py-0 px-2"
          >
            Learning (2)
          </Button>
          <Button 
            variant="info" 
            onClick={() => handleSaveWord(3)}
            disabled={processingWord || isTranslating || !selectedWord}
            style={{ backgroundColor: styles.wordStatus3.backgroundColor, color: 'black' }}
            size="sm"
            className="py-0 px-2"
          >
            Familiar (3)
          </Button>
          <Button 
            variant="info" 
            onClick={() => handleSaveWord(4)}
            disabled={processingWord || isTranslating || !selectedWord}
            style={{ backgroundColor: styles.wordStatus4.backgroundColor, color: 'black' }}
            size="sm"
            className="py-0 px-2"
          >
            Advanced (4)
          </Button>
          <Button 
            variant="success" 
            onClick={() => handleSaveWord(5)}
            disabled={processingWord || isTranslating || !selectedWord}
            style={{ backgroundColor: styles.wordStatus5.backgroundColor, border: '1px solid #ccc', color: 'black' }}
            size="sm"
            className="py-0 px-2"
          >
            Known (5)
          </Button>
        </div>
      </div>
    );
  };

  // Update handleCompleteLesson to respect auto-advance setting
  const handleCompleteLesson = async () => {
    if (!text?.bookId) return;
    
    setCompleting(true);
    
    try {
      const bookStats = await completeLesson(text.bookId, text.textId);
      
      // Only show stats if the setting is enabled
      if (userSettings.showProgressStats) {
        setStats(bookStats);
        setShowStatsModal(true);
      } else if (userSettings.autoAdvanceToNextLesson && nextTextId) {
        // Auto advance to next lesson if setting is enabled
        navigate(`/texts/${nextTextId}`);
      } else {
        // Just navigate back to the book
        navigate(`/books/${text.bookId}`);
      }
    } catch (error) {
      console.error('Error completing lesson:', error);
      alert(`Failed to complete lesson: ${error.message}`);
    } finally {
      setCompleting(false);
    }
  };


  if (loading) {
    return (
      <Container className="py-5 text-center">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
      </Container>
    );
  }

  if (error) {
    return (
      <Container className="py-5">
        <Alert variant="danger">
          {error}
          <div className="mt-3">
            <Button variant="outline-primary" onClick={() => navigate('/texts')}>
              Back to Texts
            </Button>
          </div>
        </Alert>
      </Container>
    );
  }

  if (!text) {
    return (
      <Container className="py-5">
        <Alert variant="warning">
          Text not found
          <div className="mt-3">
            <Button variant="outline-primary" onClick={() => navigate('/texts')}>
              Back to Texts
            </Button>
          </div>
        </Alert>
      </Container>
    );
  }

  return (
    <div className="text-display-wrapper px-0 mx-0 w-100">
      <Card className="shadow-sm mb-1 border-0 rounded-0">
        <Card.Body className="py-1 px-2">
          <div className="d-flex justify-content-between align-items-center flex-wrap">
            <div>
              <h2 className="mb-1">{text.title}</h2>
              <p className="text-muted mb-0 small">
                Language: {text.languageName || 'Unknown'} | 
                Words: {words.length} | 
                Learning: {words.filter(w => w.status <= 2).length} | 
                Known: {words.filter(w => w.status >= 4).length}
              </p>
            </div>
            <div className="d-flex gap-2 flex-wrap mt-2 mt-sm-0">
              {/* Text size controls */}
              <div className="btn-group me-1">
                <Button
                  variant="outline-secondary"
                  size="sm"
                  onClick={() => setUserSettings(prev => ({
                    ...prev,
                    textSize: Math.max(12, prev.textSize - 2)
                  }))}
                  title="Decrease text size"
                >
                  A-
                </Button>
                <Button
                  variant="outline-secondary"
                  size="sm"
                  onClick={() => setUserSettings(prev => ({
                    ...prev,
                    textSize: Math.min(32, prev.textSize + 2)
                  }))}
                  title="Increase text size"
                >
                  A+
                </Button>
              </div>
              
              {/* Panel size controls */}
              <div className="btn-group me-1">
                <Button 
                  variant="outline-secondary" 
                  size="sm"
                  onClick={() => setLeftPanelWidth(Math.min(leftPanelWidth + 5, 95))}
                  title="Increase reading area"
                >
                  ◀
                </Button>
                <Button 
                  variant="outline-secondary" 
                  size="sm"
                  onClick={() => setLeftPanelWidth(Math.max(leftPanelWidth - 5, 25))}
                  title="Decrease reading area"
                >
                  ▶
                </Button>
              </div>
              
              {/* Translation buttons moved to header */}
              {text && !loading && (
                <Button 
                  variant="info" 
                  size="sm"
                  onClick={handleFullTextTranslation}
                  data-testid="translate-full-text-btn"
                  className="me-1"
                >
                  Translate Text
                </Button>
              )}
              {/* Add Translate Unknown Button Here */}
               {text && !loading && (
                  <Button
                      variant="secondary"
                      size="sm"
                      onClick={handleTranslateUnknownWords}
                      disabled={translatingUnknown}
                      className="ms-1" // Use ms-1 for spacing
                      title="Translate all unknown/learning words in this lesson using DeepL"
                  >
                      {translatingUnknown ? <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" /> : 'Translate Unknown'}
                  </Button>
               )}
               {translateUnknownError && <Alert variant="danger" className="mt-2 p-1 small">{translateUnknownError}</Alert>} {/* Display error */}
             
             {/* Navigation buttons */}
              {text?.bookId && (
                <Button 
                  variant="outline-primary" 
                  size="sm"
                  onClick={() => navigate(`/books/${text.bookId}`)}
                >
                  Back to Book
                </Button>
              )}
              
              {!text?.bookId && (
                <Button 
                  variant="outline-secondary" 
                  size="sm"
                  onClick={() => navigate('/texts')}
                >
                  Back to Texts
                </Button>
              )}
            </div>
          </div>
        </Card.Body>
      </Card>

      {/* Audio Player for Audio Lessons */}
      {isAudioLesson && audioSrc && (
        <div className="audio-player-container p-2 bg-light border-bottom">
          <audio
            ref={audioRef}
            controls
            src={audioSrc}
            onTimeUpdate={(e) => setAudioCurrentTime(e.target.currentTime)}
            style={{ width: '100%' }}
          >
            Your browser does not support the audio element.
          </audio>
        </div>
      )}

      <div className="resizable-container">
        {/* Text reading panel (left side) */}
        <div 
          className="left-panel" 
          style={{ 
            width: `${leftPanelWidth}%`,
            height: 'calc(100vh - 90px)',
            overflowY: 'auto',
            padding: '0',
            position: 'relative'
          }}
        >
          <div className="d-flex flex-column" style={{ minHeight: '100%' }}>
            <div className="flex-grow-1">
              {renderTextContent()}
            </div>
            
            {/* Complete Lesson button below the text */}
            {text?.bookId && (
              <div className="mt-2 pt-2 border-top text-end px-2">
                <Button
                  variant="success"
                  onClick={handleCompleteLesson}
                  disabled={completing}
                  size="sm"
                >
                  {completing ? <Spinner animation="border" size="sm" /> : null}
                  {' '}
                  {nextTextId === null ? 'Finish Book' : 'Complete Lesson'}
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Resize divider */}
        <div 
          ref={resizeDividerRef}
          className="resize-divider"
          title="Drag to resize panels"
        ></div>

        {/* Translation panel (right side) */}
        <div 
          className="right-panel" 
          style={{ 
            width: `${100 - leftPanelWidth}%`,
            height: 'calc(100vh - 90px)',
            overflowY: 'auto',
            padding: '6px',
            position: 'relative'
          }}
        >
          <Card className="border-0">
            <Card.Body className="p-2">
              <h5 className="mb-2">Word Info</h5>
              {renderSidePanel()}
            </Card.Body>
          </Card>
        </div>
      </div>

      {/* Statistics Modal */}
      <Modal 
        show={showStatsModal} 
        onHide={() => setShowStatsModal(false)}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>Lesson Completed!</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {stats && (
            <div className="text-center">
              <h5>Book Progress</h5>
              <div className="mb-3">
                <div className="mb-2">
                  <ProgressBar 
                    now={stats.CompletionPercentage || stats.completionPercentage} 
                    label={`${(stats.CompletionPercentage || stats.completionPercentage || 0).toFixed(2)}%`} 
                    variant={
                      (stats.CompletionPercentage || stats.completionPercentage) < 25 ? 'danger' : 
                      (stats.CompletionPercentage || stats.completionPercentage) < 50 ? 'warning' : 
                      (stats.CompletionPercentage || stats.completionPercentage) < 75 ? 'info' : 'success'
                    }
                  />
                </div>
              </div>
              
              <Row className="text-center mb-3">
                <Col>
                  <h6>Known Words</h6>
                  <Badge bg="success" className="p-2">{stats.knownWords}</Badge>
                </Col>
                <Col>
                  <h6>Learning Words</h6>
                  <Badge bg="warning" className="p-2">{stats.learningWords}</Badge>
                </Col>
                <Col>
                  <h6>Total Words</h6>
                  <Badge bg="info" className="p-2">{stats.totalWords}</Badge>
                </Col>
              </Row>
              
              <p className="mt-3">
                Keep going! You're making great progress with your language learning.
              </p>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowStatsModal(false)}>
            Close
          </Button>
          {nextTextId && (
            <Button 
              variant="success" 
              onClick={() => {
                setShowStatsModal(false);
                navigate(`/texts/${nextTextId}`);
              }}
            >
              Next Lesson
            </Button>
          )}
          {text?.bookId && (
            <Button 
              variant="primary" 
              onClick={() => navigate(`/books/${text.bookId}`)}
            >
              Back to Book
            </Button>
          )}
        </Modal.Footer>
      </Modal>
      
      {/* Add the full text translation popup */}
      <TranslationPopup
        show={showTranslationPopup}
        handleClose={() => setShowTranslationPopup(false)}
        originalText={selectedSentence.length > 0 ? selectedSentence : (text?.content || '')}
        translatedText={fullTextTranslation}
        isTranslating={isFullTextTranslating}
        sourceLanguage={text?.languageCode || ''}
        targetLanguage="en"
      />
    </div>
  );
};

export default TextDisplay; 