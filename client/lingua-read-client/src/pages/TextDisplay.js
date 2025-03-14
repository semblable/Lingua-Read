import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Container, Card, Spinner, Alert, Button, Modal, Form, Row, Col, Badge, ProgressBar } from 'react-bootstrap';
import { useParams, useNavigate } from 'react-router-dom';
import { getText, createWord, updateWord, updateLastRead, completeLesson, getBook, translateText, translateSentence, translateFullText } from '../utils/api';
import TranslationPopup from '../components/TranslationPopup';

// CSS for word highlighting
const styles = {
  highlightedWord: {
    cursor: 'pointer',
    padding: '0 2px',
    margin: '0 1px',
    borderRadius: '3px',
  },
  wordStatus0: { color: '#000', backgroundColor: 'transparent' }, // Not tracked yet
  wordStatus1: { color: '#fff', backgroundColor: '#ff6666' },     // New (red)
  wordStatus2: { color: '#333', backgroundColor: '#ff9933' },     // Learning (orange)
  wordStatus3: { color: '#333', backgroundColor: '#ffdd66' },     // Familiar (yellow)
  wordStatus4: { color: '#333', backgroundColor: '#99dd66' },     // Advanced (light green)
  wordStatus5: { color: '#333', backgroundColor: '#66cc66' },     // Known (green)
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

  const handleWordClick = async (word) => {
    console.log(`Word clicked: "${word}"`);
    console.log(`Character codes: ${Array.from(word).map(c => c.charCodeAt(0))}`);
    setSelectedWord(word);
    
    // Find if the word exists in our words list - use direct comparison instead of normalization
    // which can potentially modify special characters
    const wordLower = word.toLowerCase();
    const existingWord = words.find(w => 
      w.term && 
      w.term.toLowerCase() === wordLower
    );
    
    if (existingWord) {
      console.log(`Word exists in database: ${existingWord.term}, translation: ${existingWord.translation || 'none'}`);
      // If word exists, set its translation in the form and side panel
      setTranslation(existingWord.translation || '');
      setDisplayedWord({
        term: existingWord.term,
        translation: existingWord.translation || '',
        status: existingWord.status
      });
      
      // If no translation exists for this word, try to translate it automatically
      if (!existingWord.translation) {
        try {
          // Access the book's language code from the state
          const bookLanguage = book?.language?.code || 'FR'; // Default to French if language code is not available
          const userLanguage = 'EN'; // Default to English as target language
          
          console.log(`Attempting to translate existing word: ${word} from ${bookLanguage} to ${userLanguage}`);
          setIsTranslating(true);
          const result = await translateText(word, bookLanguage, userLanguage);
          console.log('Translation result:', result);
          
          if (result?.translatedText) {
            console.log(`Translation successful: "${result.translatedText}"`);
            setTranslation(result.translatedText);
            // Update the displayed word with translation
            setDisplayedWord(prev => ({
              ...prev,
              translation: result.translatedText
            }));
          } else {
            console.log('Translation returned empty or undefined result');
          }
        } catch (err) {
          console.error('Translation failed:', err);
          // Don't show error to user, just silently fail and let them input translation manually
        } finally {
          setIsTranslating(false);
        }
      }
    } else {
      console.log(`Word not found in database: ${word}`);
      // For new words, clear translation field first
      setTranslation('');
      setDisplayedWord({
        term: word,
        translation: '',
        status: 0 // Untracked
      });
      
      // Try to translate the new word automatically
      try {
        // Access the book's language code from the state
        const bookLanguage = book?.language?.code || 'FR'; // Default to French if language code is not available
        const userLanguage = 'EN'; // Default to English as target language
        
        console.log(`Attempting to translate new word: ${word} from ${bookLanguage} to ${userLanguage}`);
        setIsTranslating(true);
        const result = await translateText(word, bookLanguage, userLanguage);
        console.log('Translation result:', result);
        
        if (result?.translatedText) {
          console.log(`Translation successful: "${result.translatedText}"`);
          setTranslation(result.translatedText);
          // Update the displayed word with translation
          setDisplayedWord(prev => ({
            ...prev,
            translation: result.translatedText
          }));
        } else {
          console.log('Translation returned empty or undefined result');
        }
      } catch (err) {
        console.error('Translation failed:', err);
        // Don't show error to user, just silently fail and let them input translation manually
      } finally {
        setIsTranslating(false);
      }
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

  // Add function to handle sentence selection
  const handleSentenceSelection = () => {
    console.log("Mouse up event detected");
    
    // Get the current selection
    const selection = window.getSelection();
    
    // Skip if the selection is empty or if it's a collapsed selection (just a cursor)
    if (selection.isCollapsed) {
      console.log("Selection is empty or collapsed");
      return;
    }
    
    // Get the selected text with original formatting preserved
    let selectedText = selection.toString();
    
    // Ensure we're getting the raw, unmodified text
    console.log(`Raw selected text: "${selectedText}"`);
    console.log(`Character codes: ${Array.from(selectedText).map(c => c.charCodeAt(0))}`);
    
    if (selectedText.length > 0) {
      // Store the unmodified text
      setSelectedSentence(selectedText);
      
      // Only proceed with translation if we have enough text
      if (selectedText.length >= 1) {
        // Show the translation popup
        setShowTranslationPopup(true);
        setIsFullTextTranslating(true);
        setFullTextTranslation('');
        
        // Use the full text translation API with the selected text
        translateSelectedTextInPopup(selectedText);
      }
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
          handleSentenceSelection();
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

  const renderTextContent = () => {
    if (!text || !text.content) return null;
    
    // Process the content to create formatted text
    const processTextContent = (content) => {
      // Use Unicode-aware regex that includes all letters from any language
      // This regex splits by spaces and punctuation except apostrophes and hyphens,
      // but preserves all Unicode letter characters including accented letters
      const words = content.split(/([^\p{L}''\-]+)/gu);
      
      console.log('Split words:', words);
      
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
              key={index}
              style={getWordStyle(wordStatus)}
              className="clickable-word"
              onClick={() => {
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
    
    return (
      <div>
        <div 
          ref={textContentRef}
          className="text-content" 
          style={{ fontSize: '1.1rem', lineHeight: '1.6', marginBottom: '70px' }}
        >
          {processTextContent(text.content)}
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
        <h3>{displayedWord.term}</h3>
        
        {saveSuccess && (
          <Alert variant="success" className="mt-2 mb-3">
            Word saved successfully!
          </Alert>
        )}
        
        {displayedWord.status > 0 ? (
          <div className="mb-3">
            <div 
              className="p-2 rounded mb-2" 
              style={{
                backgroundColor: styles[`wordStatus${displayedWord.status}`]?.backgroundColor || '#f8f9fa',
                color: styles[`wordStatus${displayedWord.status}`]?.color || '#333',
              }}
            >
              Status: {
                displayedWord.status === 1 ? 'New' :
                displayedWord.status === 2 ? 'Learning' :
                displayedWord.status === 3 ? 'Familiar' :
                displayedWord.status === 4 ? 'Advanced' : 'Known'
              }
            </div>
          </div>
        ) : (
          <div className="mb-3">
            <div className="p-2 rounded mb-2 bg-info text-white">
              Status: Not tracked yet
            </div>
          </div>
        )}
        
        <Form>
          <Form.Group className="mb-3">
            <Form.Label>Translation</Form.Label>
            <div className="position-relative">
              <Form.Control
                as="textarea"
                rows={3}
                value={translation}
                onChange={(e) => setTranslation(e.target.value)}
                placeholder="Enter translation or notes"
                disabled={isTranslating}
              />
              {isTranslating && (
                <div className="position-absolute top-50 end-0 translate-middle-y me-3">
                  <Spinner animation="border" size="sm" />
                  <span className="ms-2">Translating...</span>
                </div>
              )}
            </div>
          </Form.Group>
        </Form>
        
        <div className="d-flex flex-wrap gap-2 mt-3">
          <Button 
            variant="danger" 
            onClick={() => handleSaveWord(1)}
            disabled={processingWord || isTranslating || !selectedWord}
            style={{ backgroundColor: styles.wordStatus1.backgroundColor, color: 'white' }}
          >
            {processingWord ? 'Saving...' : 'New (1)'}
          </Button>
          <Button 
            variant="warning" 
            onClick={() => handleSaveWord(2)}
            disabled={processingWord || isTranslating || !selectedWord}
            style={{ backgroundColor: styles.wordStatus2.backgroundColor, color: 'black' }}
          >
            {processingWord ? 'Saving...' : 'Learning (2)'}
          </Button>
          <Button 
            variant="info" 
            onClick={() => handleSaveWord(3)}
            disabled={processingWord || isTranslating || !selectedWord}
            style={{ backgroundColor: styles.wordStatus3.backgroundColor, color: 'black' }}
          >
            {processingWord ? 'Saving...' : 'Familiar (3)'}
          </Button>
          <Button 
            variant="info" 
            onClick={() => handleSaveWord(4)}
            disabled={processingWord || isTranslating || !selectedWord}
            style={{ backgroundColor: styles.wordStatus4.backgroundColor, color: 'black' }}
          >
            {processingWord ? 'Saving...' : 'Advanced (4)'}
          </Button>
          <Button 
            variant="success" 
            onClick={() => handleSaveWord(5)}
            disabled={processingWord || isTranslating || !selectedWord}
            style={{ backgroundColor: styles.wordStatus5.backgroundColor, color: 'black' }}
          >
            {processingWord ? 'Saving...' : 'Known (5)'}
          </Button>
        </div>
      </div>
    );
  };

  const handleCompleteLesson = async () => {
    if (!text?.bookId) return;
    
    setCompleting(true);
    
    try {
      const bookStats = await completeLesson(text.bookId, text.textId);
      setStats(bookStats);
      setShowStatsModal(true);
    } catch (error) {
      console.error('Error completing lesson:', error);
      alert(`Failed to complete lesson: ${error.message}`);
    } finally {
      setCompleting(false);
    }
  };

  // Get style based on word status
  const getWordStyle = (status) => {
    return styles[`wordStatus${status}`] || styles.wordStatus0;
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
    <Container fluid className="py-3">
      <Card className="shadow-sm mb-3">
        <Card.Body>
          <div className="d-flex justify-content-between align-items-start">
            <div>
              <h2>{text.title}</h2>
              <p className="text-muted">
                Language: {text.languageName || 'Unknown'} | 
                Words: {words.length} | 
                Learning: {words.filter(w => w.status <= 2).length} | 
                Known: {words.filter(w => w.status >= 4).length}
              </p>
            </div>
            <div className="d-flex gap-2">
              {/* If text is part of a book, show complete lesson button and navigation */}
              {text?.bookId && (
                <>
                  <Button 
                    variant="outline-primary" 
                    onClick={() => navigate(`/books/${text.bookId}`)}
                  >
                    Back to Book
                  </Button>
                </>
              )}
              
              {/* If text is standalone (not part of a book) */}
              {!text?.bookId && (
                <Button 
                  variant="outline-secondary" 
                  onClick={() => navigate('/texts')}
                >
                  Back to Texts
                </Button>
              )}
            </div>
          </div>
        </Card.Body>
      </Card>

      <Row>
        {/* Text reading panel (left side) */}
        <Col md={7} style={styles.textContainer}>
          <div className="d-flex flex-column" style={{ minHeight: 'calc(100vh - 140px)' }}>
            <div className="flex-grow-1">
              {renderTextContent()}
            </div>
            
            {/* Complete Lesson button below the text */}
            {text?.bookId && (
              <div className="mt-3 mb-3 pt-2 border-top text-end">
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
        </Col>

        {/* Translation panel (right side) */}
        <Col md={5} style={styles.translationPanel}>
          <Card>
            <Card.Body>
              <h4>Word Information</h4>
              {renderSidePanel()}
            </Card.Body>
          </Card>
        </Col>
      </Row>

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

      {/* Add the Translate Full Text button */}
      {text && !loading && (
        <div className="mb-3">
          <Button 
            variant="info" 
            onClick={handleFullTextTranslation}
            data-testid="translate-full-text-btn"
          >
            Translate Full Text
          </Button>
        </div>
      )}
      
      {/* Add button to translate selected text manually */}
      {selectedSentence && (
        <div className="mb-3 mt-3">
          <Button 
            variant="outline-primary" 
            onClick={handleManualTranslation}
            data-testid="translate-selected-text-btn"
          >
            Translate Selected Text: "{selectedSentence.length > 20 ? selectedSentence.substring(0, 20) + '...' : selectedSentence}"
          </Button>
        </div>
      )}
      
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
    </Container>
  );
};

export default TextDisplay; 