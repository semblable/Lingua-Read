import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Container, Card, Spinner, Alert, Button, Modal, Form, Row, Col, Badge, ProgressBar } from 'react-bootstrap';
import { useParams, useNavigate } from 'react-router-dom';
import { getText, createWord, updateWord, updateLastRead, completeLesson, getBook, translateText, translateSentence, translateFullText, getUserSettings } from '../utils/api';
import TranslationPopup from '../components/TranslationPopup';
import './TextDisplay.css';

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
  const [book, setBook] = useState(null);
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
  const [selectedSentence, setSelectedSentence] = useState('');
  const [sentenceTranslation, setSentenceTranslation] = useState('');
  const [isSentenceTranslating, setIsSentenceTranslating] = useState(false);
  
  // States for full text translation popup
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
        setBook(data.book);
        
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

  // Update the handleWordClick function to respect auto-translate setting
  const handleWordClick = useCallback(async (word) => {
    setSelectedWord(word);
    setProcessingWord(true);
    
    // Find if the word already exists in our state
    const existingWord = words.find(w => 
      w.term && w.term.toLowerCase() === word.toLowerCase()
    );
    
    if (existingWord) {
      console.log('Found existing word:', existingWord);
      // Set the currentWord for the side panel
      setDisplayedWord(existingWord);
      
      // Set the translation
      setTranslation(existingWord.translation || '');
      
      // Auto-translate if needed
      if (!existingWord.translation && userSettings.autoTranslateWords) {
        try {
          setIsTranslating(true);
          const result = await translateText(word, text.languageCode || 'FR', 'EN');
          
          if (result?.translatedText) {
            setTranslation(result.translatedText);
            // Update the displayed word with translation
            setDisplayedWord(prev => ({
              ...prev,
              translation: result.translatedText
            }));
          }
        } catch (err) {
          console.error('Translation failed:', err);
        } finally {
          setIsTranslating(false);
        }
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
      
      // Auto-translate if setting is enabled
      if (userSettings.autoTranslateWords) {
        try {
          setIsTranslating(true);
          const result = await translateText(word, text.languageCode || 'FR', 'EN');
          
          if (result?.translatedText) {
            setTranslation(result.translatedText);
            // Update the displayed word with translation
            setDisplayedWord(prev => ({
              ...prev,
              translation: result.translatedText
            }));
          }
        } catch (err) {
          console.error('Translation failed:', err);
        } finally {
          setIsTranslating(false);
        }
      }
    }
    
    setProcessingWord(false);
  }, [words, text, userSettings.autoTranslateWords]);

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
        const updatedWord = await updateWord(existingWord.wordId, numericStatus, translation);
        
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

  // Add this function for sentence selection
  const handleSentenceClick = (sentence) => {
    if (sentence.trim() === selectedSentence) {
      // If clicking the same sentence, deselect it
      setSelectedSentence('');
      setSentenceTranslation('');
    } else {
      // Select the new sentence
      setSelectedSentence(sentence.trim());
      setSentenceTranslation('');
    }
  };

  // Function to translate selected text in popup
  const translateSelectedTextInPopup = async (selectedText) => {
    if (!selectedText) {
      console.error("Missing text for translation");
      return;
    }
    
    const sourceLanguageCode = text?.languageCode || 'auto';
    console.log(`Attempting to translate selected text from ${sourceLanguageCode} to en`);
    console.log(`Text to translate: "${selectedText}"`);
    
    try {
      // Use full text translation for consistent experience
      const response = await translateFullText(selectedText, sourceLanguageCode, 'en');
      console.log('Translation response:', response);
      
      if (response && response.translatedText) {
        setFullTextTranslation(response.translatedText);
        console.log(`Translation result: "${response.translatedText}"`);
      } else {
        console.error('Translation response missing translatedText:', response);
        setFullTextTranslation('Translation failed: Invalid response');
      }
    } catch (error) {
      console.error('Error translating text:', error);
      setFullTextTranslation(`Translation failed: ${error.message || 'Unknown error'}`);
    } finally {
      setIsFullTextTranslating(false);
    }
  };

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

  // Add manual translation for selected text button in the UI
  const handleManualTranslation = () => {
    if (selectedSentence && selectedSentence.length > 0) {
      console.log(`Manually translating selected text: "${selectedSentence}"`);
      setShowTranslationPopup(true);
      setIsFullTextTranslating(true);
      setFullTextTranslation('');
      translateSelectedTextInPopup(selectedSentence);
    } else {
      console.log("No text selected for manual translation");
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
        if (selected && selected.length > 0) {
          console.log(`Selection detected: "${selected}" (${selected.length} chars)`);
          handleSentenceClick(selected);
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
  }, [text]); // Only re-attach when text changes

  // Update the renderTextContent function
  const renderTextContent = () => {
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
                      onClick={() => handleSentenceClick(part)}
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
    
    // Process the content to create formatted text
    const processTextContent = (content) => {
      // Use Unicode-aware regex that includes all letters from any language
      // This regex splits by spaces and punctuation except apostrophes and hyphens,
      // but preserves all Unicode letter characters including accented letters
      const words = content.split(/([^\p{L}''\-]+)/gu);
      
      return words.map((segment, index) => {
        const trimmed = segment.trim();
        if (trimmed.length === 0) {
          return segment; // Return spaces and punctuation as is
        }
        
        // If this is a word (contains letters from any language, apostrophes or hyphens)
        if (/[\p{L}''\-]/u.test(segment)) {
          const wordOnly = segment;
          
          // Skip very short segments that don't contain at least one letter
          if (wordOnly.length <= 1 && !/[\p{L}]/u.test(wordOnly)) {
            return segment;
          }
          
          const wordStatus = getWordStatus(wordOnly);
          
          return (
            <span
              key={`word-${index}-${wordOnly}`}
              style={{
                ...styles.highlightedWord,
                ...getWordStyle(wordStatus)
              }}
              className={`clickable-word word-status-${wordStatus}`}
              onClick={(e) => {
                e.stopPropagation(); // Prevent triggering sentence click
                console.log(`Clicked on word: "${wordOnly}" (${Array.from(wordOnly).map(c => c.charCodeAt(0))})`);
                handleWordClick(wordOnly);
              }}
            >
              {segment}
            </span>
          );
        }
        
        // Return non-word segments as is
        return segment;
      });
    };
    
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

  // Render the sentence translation panel
  const renderSentenceTranslationPanel = () => {
    if (!selectedSentence) {
      return null;
    }

    return (
      <div className="mt-4 p-3 border rounded">
        <h5>Selected Text:</h5>
        <p>{selectedSentence}</p>
        
        <h5 className="mt-3">Translation:</h5>
        {isSentenceTranslating ? (
          <div className="d-flex align-items-center">
            <Spinner animation="border" size="sm" className="me-2" />
            <span>Translating...</span>
          </div>
        ) : (
          <p>{sentenceTranslation || 'No translation available'}</p>
        )}
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

  // Update the getWordStyle function to respect highlighting setting
  const getWordStyle = (word) => {
    // Base style with hover effect
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
    if (word === 5) {
      return {
        ...baseStyle,
        backgroundColor: 'transparent',
        color: 'inherit'
      };
    }

    // Status-based styling
    const statusStyles = {
      0: { backgroundColor: 'var(--status-0-color)', color: '#000' },
      1: { backgroundColor: 'var(--status-1-color)', color: '#000' },
      2: { backgroundColor: 'var(--status-2-color)', color: '#000' },
      3: { backgroundColor: 'var(--status-3-color)', color: '#000' },
      4: { backgroundColor: 'var(--status-4-color)', color: '#000' },
      5: { backgroundColor: 'transparent', color: 'inherit' },
    };

    // Return style based on word status
    return {
      ...baseStyle,
      ...(statusStyles[word] || {})
    };
  };

  // Helper function to get the status of a word
  const getWordStatus = (word) => {
    if (!word) return 0;
    
    // Make case-insensitive search without normalization that could alter special characters
    const wordLower = word.toLowerCase();
    const foundWord = words.find(w => 
      w.term && 
      w.term.toLowerCase() === wordLower
    );
    
    return foundWord ? foundWord.status : 0;
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
              
              {selectedSentence && (
                <Button 
                  variant="outline-primary" 
                  size="sm"
                  onClick={handleManualTranslation}
                  data-testid="translate-selected-text-btn"
                  className="me-1"
                >
                  Translate Selection
                </Button>
              )}
              
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
                  Complete Lesson
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
      
      {/* Add the sentence translation panel */}
      {renderSentenceTranslationPanel()}
      
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