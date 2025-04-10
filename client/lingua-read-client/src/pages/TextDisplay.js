import React, { useEffect, useState, useCallback, useRef, useMemo, useContext } from 'react'; // Added useContext
import { Container, Card, Spinner, Alert, Button, Modal, Form, Row, Col, Badge, ProgressBar, OverlayTrigger, Tooltip, ButtonGroup } from 'react-bootstrap';
import { useParams, useNavigate } from 'react-router-dom'; // Removed unused Link import
import { FixedSizeList as List } from 'react-window';
import {
  getText, createWord, updateWord, updateLastRead, completeText, getBook, // Replaced completeLesson with completeText
  translateText, /*translateSentence,*/ translateFullText, updateUserSettings, // Added updateUserSettings, removed unused getUserSettings
  batchTranslateWords, addTermsBatch, getLanguage, // Added getLanguage (Phase 3)
  API_URL
} from '../utils/api';
import TranslationPopup from '../components/TranslationPopup';
import AudiobookPlayer from '../components/AudiobookPlayer'; // Import AudiobookPlayer
import './TextDisplay.css';
import { SettingsContext } from '../contexts/SettingsContext'; // Import SettingsContext

// --- SRT Parsing Utilities ---
const parseSrtTime = (timeString) => {
  if (!timeString) return 0;
  const parts = timeString.split(':');
  const secondsParts = parts[2]?.split(',');
  if (!secondsParts || secondsParts.length < 2) return 0;
  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);
  const seconds = parseInt(secondsParts[0], 10);
  const milliseconds = parseInt(secondsParts[1], 10);
  if (isNaN(hours) || isNaN(minutes) || isNaN(seconds) || isNaN(milliseconds)) return 0;
  return hours * 3600 + minutes * 60 + seconds + milliseconds / 1000;
};

const parseSrtContent = (srtContent) => {
  if (!srtContent) return [];
  const lines = srtContent.trim().split(/\r?\n/);
  const entries = [];
  let currentEntry = null;
  let textBuffer = [];
  for (const line of lines) {
    const trimmedLine = line.trim();
    if (currentEntry === null) {
      if (/^\d+$/.test(trimmedLine)) {
        currentEntry = { id: parseInt(trimmedLine, 10), startTime: 0, endTime: 0, text: '' };
        textBuffer = [];
      }
    } else if (currentEntry.startTime === 0 && trimmedLine.includes('-->')) {
      const timeParts = trimmedLine.split(' --> ');
      if (timeParts.length === 2) {
        currentEntry.startTime = parseSrtTime(timeParts[0]);
        currentEntry.endTime = parseSrtTime(timeParts[1]);
      }
    } else if (trimmedLine === '') {
       if (currentEntry && currentEntry.startTime >= 0 && textBuffer.length > 0) { // Allow 0 start time
           currentEntry.text = textBuffer.join(' ').trim();
           entries.push(currentEntry);
           currentEntry = null;
           textBuffer = [];
       } else if (currentEntry && currentEntry.startTime >= 0) {
           currentEntry.text = '';
           entries.push(currentEntry);
           currentEntry = null;
           textBuffer = [];
       }
    } else if (currentEntry) {
      textBuffer.push(trimmedLine);
    }
  }
  if (currentEntry && currentEntry.startTime >= 0 && textBuffer.length > 0) {
    currentEntry.text = textBuffer.join(' ').trim();
    entries.push(currentEntry);
  }
  console.log(`[SRT Parser] Parsed ${entries.length} entries.`);
  return entries;
};
// --- End SRT Parsing Utilities ---

// --- Styles ---
const styles = {
  highlightedWord: { cursor: 'pointer', padding: '0 2px', margin: '0 1px', borderRadius: '3px', transition: 'all 0.2s ease' },
  wordStatus1: { color: '#000', backgroundColor: '#ff6666' }, // New (red)
  wordStatus2: { color: '#000', backgroundColor: '#ff9933' }, // Learning (orange)
  wordStatus3: { color: '#000', backgroundColor: '#ffdd66' }, // Familiar (yellow)
  wordStatus4: { color: '#000', backgroundColor: '#99dd66' }, // Advanced (light green)
  wordStatus5: { color: 'inherit', backgroundColor: 'transparent' }, // Known - no highlighting
  selectedSentence: { backgroundColor: 'rgba(0, 123, 255, 0.1)', padding: '0.25rem', borderRadius: '0.25rem', border: '1px dashed rgba(0, 123, 255, 0.5)' },
  untrackedWord: { cursor: 'pointer', color: '#007bff', textDecoration: 'underline' },
  textContainer: { height: 'calc(100vh - 120px)', overflowY: 'auto', padding: '15px', borderRight: '1px solid #eee' },
  translationPanel: { height: 'calc(100vh - 120px)', padding: '15px' },
  wordPanel: { marginTop: '20px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '8px' },
  modalHeader: { backgroundColor: '#f8f9fa', borderBottom: '1px solid #dee2e6' }
};
// --- End Styles ---


// --- Transcript Line Component for React Window ---
// Defined outside TextDisplay as it doesn't need access to its state directly, props come via itemData
const TranscriptLine = React.memo(({ index, style, data }) => {
  const {
    lines, currentLineId, processLineContent, handleLineClick, getFontStyling
  } = data;
  const line = lines[index];
  if (!line) return null;

  return (
    <div style={style}>
      <p
        id={`srt-line-${line.id}`}
        className={`srt-line ${line.id === currentLineId ? 'active-srt-line' : ''}`}
        style={{
          ...getFontStyling(),
          marginBottom: '0.8rem',
          padding: '0.3rem 0.5rem',
          borderRadius: '4px',
          transition: 'background-color 0.3s ease',
          /* backgroundColor removed to allow CSS file to control it */
          cursor: 'pointer',
          margin: 0
        }}
        onClick={() => handleLineClick(line.startTime)}
      >
        {processLineContent(line.text)}
      </p>
    </div>
  );
});
// --- End Transcript Line Component ---


const TextDisplay = () => {
  const { textId } = useParams();
  const navigate = useNavigate();
  const textContentRef = useRef(null);
  const audioRef = useRef(null);
  const listRef = useRef(null);
  // Removed resizeDividerRef
  const lastSaveTimeRef = useRef(Date.now()); // Ref for throttling position saves
  const saveInterval = 5000; // Save position every 5 seconds
  const startTimeRef = useRef(null); // Ref for tracking listening start time
  const accumulatedDurationRef = useRef(0); // Ref for tracking total listening duration in ms for the session

  // --- State Declarations ---
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [text, setText] = useState(null);
  const [book, setBook] = useState(null);
  const [words, setWords] = useState([]);
  const [selectedWord, setSelectedWord] = useState('');
  const [hoveredWordTerm, setHoveredWordTerm] = useState(null);
  const [translation, setTranslation] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);
  const [processingWord, setProcessingWord] = useState(false);
  const [displayedWord, setDisplayedWord] = useState(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [wordTranslationError, setWordTranslationError] = useState('');
  const [translatingUnknown, setTranslatingUnknown] = useState(false);
  const [translateUnknownError, setTranslateUnknownError] = useState('');
  const [isMarkingAll, setIsMarkingAll] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [stats, setStats] = useState(null);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [nextTextId, setNextTextId] = useState(null);
  const [showTranslationPopup, setShowTranslationPopup] = useState(false);
  const [fullTextTranslation, setFullTextTranslation] = useState('');
  const [isFullTextTranslating, setIsFullTextTranslating] = useState(false);
  // Use SettingsContext instead of local state for settings that are now global
  const { settings: globalSettings, updateSetting } = useContext(SettingsContext);
  // Local state only for panel width, as it's specific to this component's layout control
  const [leftPanelWidth, setLeftPanelWidth] = useState(globalSettings.leftPanelWidth || 85);
  // Local state for userSettings specific to TextDisplay (like textSize) if needed, or use globalSettings directly
  // For simplicity, let's assume textSize is also managed globally via context now.
  // If TextDisplay needs its own independent textSize, keep a local state for it.
  // Let's use globalSettings directly for textSize for now.
  // Removed isDragging state
  const [isAudioLesson, setIsAudioLesson] = useState(false);
  const [audioSrc, setAudioSrc] = useState(null);
  const [srtLines, setSrtLines] = useState([]);
  const [currentSrtLineId, setCurrentSrtLineId] = useState(null);
  const [audioCurrentTime, setAudioCurrentTime] = useState(0);
  const [displayMode, setDisplayMode] = useState('audio');
  const [initialAudioTime, setInitialAudioTime] = useState(null); // State for restored time
  const [playbackRate, setPlaybackRate] = useState(1.0); // State for playback speed
  const [languageConfig, setLanguageConfig] = useState(null); // State for language settings (Phase 3)
  const [embeddedUrl, setEmbeddedUrl] = useState(null); // State for embedded dictionary iframe URL (Phase 3)
  // --- End State Declarations ---

  // --- Helper Functions & Memoized Values (Define BEFORE useEffects that use them) ---

  const fetchAllLanguageWords = useCallback(async (languageId) => {
    if (!languageId) return; // Guard against missing languageId
    try {
      const response = await fetch(`${API_URL}/api/words/language/${languageId}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}`, 'Accept': 'application/json' }
      });
      if (!response.ok) throw new Error('Failed to fetch language words');
      const allLanguageWords = await response.json();
      setWords(prevWords => {
          const prevWordMap = new Map(prevWords.map(w => [w.term.toLowerCase(), w]));
          allLanguageWords.forEach(langWord => {
              const key = langWord.term.toLowerCase();
              // Only add if not already present from the initial text fetch, or update if needed (though API returns full state)
              if (!prevWordMap.has(key)) {
                  prevWordMap.set(key, langWord);
              }
          });
          return Array.from(prevWordMap.values());
      });
    } catch (error) { console.error('Error fetching language words:', error); }
  }, [setWords]); // Dependency: setWords

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const getWordData = useCallback((word) => {
    if (!word) return null;
    const wordLower = word.toLowerCase();
    return words.find(w => w.term && w.term.toLowerCase() === wordLower) || null;
  }, [words]);

  const getWordStyle = useCallback((wordStatus) => {
    const baseStyle = { cursor: 'pointer', padding: '2px 0', margin: '0 2px', borderRadius: '3px', transition: 'all 0.2s' };
    // Use globalSettings from context
    if (!globalSettings?.highlightKnownWords && wordStatus === 5) return { ...baseStyle, backgroundColor: 'transparent', color: 'inherit' };
    if (wordStatus === 5) return { ...baseStyle, backgroundColor: 'transparent', color: 'inherit' };
    const statusStyles = {
      0: { backgroundColor: 'var(--status-0-color, #e0e0e0)', color: '#000' },
      1: { backgroundColor: 'var(--status-1-color, #ff6666)', color: '#000' },
      2: { backgroundColor: 'var(--status-2-color, #ff9933)', color: '#000' },
      3: { backgroundColor: 'var(--status-3-color, #ffdd66)', color: '#000' },
      4: { backgroundColor: 'var(--status-4-color, #99dd66)', color: '#000' },
    };
    return { ...baseStyle, ...(statusStyles[wordStatus] || statusStyles[0]) };
  }, [globalSettings?.highlightKnownWords]); // Use globalSettings from context

  const triggerAutoTranslation = useCallback(async (termToTranslate) => {
    // Use globalSettings from context
    if (!termToTranslate || !globalSettings.autoTranslateWords || !text?.languageCode) return;
    setIsTranslating(true);
    setWordTranslationError('');
    try {
      const result = await translateText(termToTranslate, text.languageCode, 'EN');
      if (result?.translatedText) {
        setTranslation(result.translatedText);
        setDisplayedWord(prev => (prev && prev.term === termToTranslate ? { ...prev, translation: result.translatedText } : prev));
      } else {
        setWordTranslationError('Translation not found.');
      }
    } catch (err) {
      console.error('Auto-translation failed:', err);
      setWordTranslationError(`Translation failed: ${err.message}`);
    } finally {
      setIsTranslating(false);
    }
  }, [globalSettings.autoTranslateWords, text?.languageCode, setTranslation, setDisplayedWord, setIsTranslating, setWordTranslationError]); // Use globalSettings from context

  const handleWordClick = useCallback((word) => {
    setSelectedWord(word);
    setProcessingWord(false);
    setWordTranslationError('');
    const existingWord = getWordData(word);
    if (existingWord) {
      setDisplayedWord(existingWord);
      setTranslation(existingWord.translation || '');
      if (!existingWord.translation) triggerAutoTranslation(word);
    } else {
      const newWord = { term: word, status: 0, translation: '', isNew: true };
      setDisplayedWord(newWord);
      setTranslation('');
      triggerAutoTranslation(word);
    }
  }, [getWordData, triggerAutoTranslation, setSelectedWord, setTranslation, setWordTranslationError, setDisplayedWord]); // Dependencies using globalSettings don't need it listed if context handles updates

  // ** Define handleTextSelection HERE, before the useEffect that uses it **
  const handleTextSelection = useCallback((selectedTextRaw) => {
    const selectedText = selectedTextRaw.trim();
    if (!selectedText) return;
    handleWordClick(selectedText);
  }, [handleWordClick]);

  const processTextContent = useCallback((content) => {
    if (!content) return [];
    const tokenRegex = new RegExp(
      [
        "\\p{L}+(['-]\\p{L}+)*", // words with hyphens/apostrophes
        "[.,!?;:\"“”‘’…—–-]",    // punctuation
        "\\s+"                   // whitespace
      ].join("|"),
      "gu"
    );
    const tokens = content.match(tokenRegex) || [];
    let currentKeyIndex = 0;
    const wordPattern = /^\p{L}+(['-]\p{L}+)*$/u;
    return tokens.map((token) => {
      if (!token) return null;
      if (wordPattern.test(token)) {
        const wordOnly = token;
        const wordData = getWordData(wordOnly);
        const wordStatus = wordData ? wordData.status : 0;
        const wordTranslation = wordData ? wordData.translation : null;
        const wordSpan = (
          <span
            key={`word-${currentKeyIndex++}-${wordOnly}`}
            style={{ ...styles.highlightedWord, ...getWordStyle(wordStatus) }}
            className={`clickable-word word-status-${wordStatus}`}
            onClick={(e) => { e.stopPropagation(); handleWordClick(wordOnly); }}
            onMouseEnter={() => setHoveredWordTerm(wordOnly)}
            onMouseLeave={() => setHoveredWordTerm(null)}
          >
            {token}
          </span>
        );
        return wordTranslation ? (
          <OverlayTrigger key={`tooltip-${currentKeyIndex++}-${wordOnly}`} placement="top" overlay={<Tooltip id={`tooltip-${currentKeyIndex}-${wordOnly}`}>{wordTranslation}</Tooltip>}>
            {wordSpan}
          </OverlayTrigger>
        ) : wordSpan;
      } else {
        return <React.Fragment key={`sep-${currentKeyIndex++}`}>{token}</React.Fragment>;
      }
    }).filter(Boolean);
  }, [getWordData, getWordStyle, handleWordClick, setHoveredWordTerm]);


  const getFontFamilyForList = useCallback(() => {
    switch (globalSettings.textFont) { // Use globalSettings from context
      case 'serif': return "'Georgia', serif";
      case 'sans-serif': return "'Arial', sans-serif";
      case 'monospace': return "'Courier New', monospace";
      case 'dyslexic': return "'OpenDyslexic', sans-serif";
      default: return "inherit";
    }
  }, [globalSettings.textFont]); // Use globalSettings from context

  // Use globalSettings from context
  const getFontStyling = useCallback(() => ({
      fontSize: `${globalSettings.textSize}px`,
      fontFamily: getFontFamilyForList(), // Assumes getFontFamilyForList uses globalSettings.textFont
  }), [globalSettings.textSize, getFontFamilyForList]);

  const handleLineClick = useCallback((startTime) => {
      console.log(`[handleLineClick] Attempting seek to: ${startTime} (Type: ${typeof startTime})`);
      if (audioRef.current) {
          console.log(`[handleLineClick] audioRef found. Current time before seek: ${audioRef.current.currentTime}`);
          audioRef.current.currentTime = startTime;
          setTimeout(() => {
             if(audioRef.current) { console.log(`[handleLineClick] audioRef current time after seek attempt: ${audioRef.current.currentTime}`); }
          }, 0);
      } else {
          console.log('[handleLineClick] audioRef.current is null!');
      }
  }, []);

  const itemData = useMemo(() => ({
      lines: srtLines,
      currentLineId: currentSrtLineId,
      processLineContent: processTextContent,
      handleLineClick: handleLineClick,
      getFontStyling: getFontStyling
  }), [srtLines, currentSrtLineId, processTextContent, handleLineClick, getFontStyling]);
  // --- End Helper Functions & Memoized Values ---


  // --- Effect Hooks ---

  // Removed separate fetchUserSettings effect, handled by SettingsContext

  // Fetch Text Data, Restore Audio Time & Playback Rate
  useEffect(() => {
    // --- Restore Playback Rate ---
    const savedRate = localStorage.getItem('audioPlaybackRate');
    if (savedRate && !isNaN(parseFloat(savedRate))) {
        const rate = parseFloat(savedRate);
        // Clamp rate between 0.5 and 2.0 on load
        setPlaybackRate(Math.max(0.5, Math.min(rate, 2.0)));
        console.log(`[Playback Rate Restore] Restored rate: ${rate}`);
    }
    // --- End Restore Playback Rate ---

    // --- Set initial panel width from global settings ---
    // This ensures panel width resets if global settings change while component is mounted
    setLeftPanelWidth(globalSettings.leftPanelWidth || 85);
    // --- End Set initial panel width ---

    const fetchText = async () => {
      setLoading(true); setError(''); setBook(null); setNextTextId(null); setInitialAudioTime(null); // Reset initial time
      try {
        const data = await getText(textId);
        setText(data);
        setWords(data.words || []);
        if (data.isAudioLesson && data.audioFilePath && data.srtContent) {
          setIsAudioLesson(true);
          setAudioSrc(`${API_URL}/${data.audioFilePath}`);
          setSrtLines(parseSrtContent(data.srtContent));
          setDisplayMode('audio');

          // --- Restore Audio Time ---
          const savedTime = localStorage.getItem(`audioTime-${textId}`);
          if (savedTime && !isNaN(parseFloat(savedTime))) {
             console.log(`[Audio Restore] Found saved time: ${savedTime}`);
             setInitialAudioTime(parseFloat(savedTime));
          } else {
             console.log(`[Audio Restore] No valid saved time found for textId: ${textId}`);
          }
          // --- End Restore Audio Time ---

        } else {
          setIsAudioLesson(false); setAudioSrc(null); setSrtLines([]); setDisplayMode('text');
        }
        // Fetch all words for the language AND the language configuration itself (Phase 3)
        if (data.languageId) {
           await fetchAllLanguageWords(data.languageId);
           try {
               // Assuming getLanguage exists in api.js from Phase 1/2
               const langConfigData = await getLanguage(data.languageId); // Make sure getLanguage is imported
               setLanguageConfig(langConfigData);
               console.log('[Language Config] Fetched:', langConfigData);
           } catch (langErr) {
               console.error('Failed to fetch language configuration:', langErr);
               setError(prev => `${prev} (Warning: Failed to load language config)`);
               setLanguageConfig(null); // Ensure it's null on error
           }
        } else {
            setLanguageConfig(null); // Reset if no languageId
        }
        if (data.bookId) {
          try {
            await updateLastRead(data.bookId, data.textId);
            const bookData = await getBook(data.bookId);
             setBook(bookData);
            if (bookData?.parts) {
              const currentPartIndex = bookData.parts.findIndex(part => part.textId === parseInt(textId));
              setNextTextId(currentPartIndex >= 0 && currentPartIndex < bookData.parts.length - 1 ? bookData.parts[currentPartIndex + 1].textId : null);
            }
          } catch (bookErr) {
               console.error('Failed to get book data:', bookErr);
               // Don't block text display if book fetch fails, but player won't show
          }
        }
      } catch (err) { setError(err.message || 'Failed to load text'); }
      finally { setLoading(false); }
    };
    fetchText();

    // Store audioRef.current in a variable inside the effect scope
    const currentAudioElement = audioRef.current;

    // Cleanup function to save time and log duration on unmount
    return () => {
      console.log('[TextDisplay Cleanup] Running cleanup function...');
      // Log critical state values *at the time of cleanup*
      console.log(`[TextDisplay Cleanup] State at cleanup: isAudioLesson=${isAudioLesson}, text exists=${!!text}, languageId=${text?.languageId}`);
      try {
        // Save Current Playback Position using the variable captured in the effect scope
        if (currentAudioElement && isAudioLesson) {
          const currentTime = currentAudioElement.currentTime;
          if (currentTime > 0) {
            console.log(`[Audio Save - Unmount] Saving position: ${currentTime} for textId: ${textId}`);
            localStorage.setItem(`audioTime-${textId}`, currentTime.toString());
          }
        }

        // Log Listening Duration
        if (isAudioLesson && text?.languageId) {
            console.log('[Audio Log - Unmount] Starting duration calculation...');
            console.log(`[Audio Log - Unmount] Accumulated duration (ms): ${accumulatedDurationRef.current}`);
            let finalDurationMs = accumulatedDurationRef.current;
            // If audio was playing when unmounted, add the last segment
            if (startTimeRef.current) {
                const lastSegmentMs = Date.now() - startTimeRef.current;
                console.log(`[Audio Log - Unmount] Audio was playing. Adding last segment (ms): ${lastSegmentMs}`);
                finalDurationMs += lastSegmentMs;
            } else {
                console.log('[Audio Log - Unmount] Audio was paused/ended.');
            }
            const durationInSeconds = Math.round(finalDurationMs / 1000);
            console.log(`[Audio Log - Unmount] Calculated total duration (s): ${durationInSeconds} for languageId: ${text.languageId}`);

            console.log(`[Audio Log - Unmount] Checking duration threshold (> 5s)... Duration is ${durationInSeconds}s.`);

            if (durationInSeconds > 5) { // Only log if listened for more than 5 seconds
                console.log('[Audio Log - Unmount] Duration > 5s. Preparing API call...');
                const token = localStorage.getItem('token');
                const payload = {
                  languageId: text.languageId,
                  durationSeconds: durationInSeconds
                };
                console.log('[Audio Log - Unmount] API Payload:', payload);
                console.log('[Audio Log - Unmount] Making fetch call to logListening...');
                fetch(`${API_URL}/api/activity/logListening`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(payload)
                })
                .then(response => {
                    if (!response.ok) {
                        console.error('[Audio Log - Unmount] API call failed:', response.statusText);
                    } else {
                        console.log('[Audio Log - Unmount] API call successful.');
                    }
                })
                .catch(error => {
                    console.error('[Audio Log - Unmount] API call error:', error);
                });
            } else {
                console.log('[Audio Log - Unmount] Duration <= 5s. Skipping API call.');
            }
        } else {
             console.log('[Audio Log - Unmount] Skipping duration log: Not an audio lesson or no languageId.');
        }
        // Reset refs for safety, although component is unmounting
        accumulatedDurationRef.current = 0;
        startTimeRef.current = null;
        console.log('[TextDisplay Cleanup] Refs reset.');

      } catch (cleanupError) { // Add catch block
          console.error('[TextDisplay Cleanup] Error during cleanup:', cleanupError);
      } finally { // Add finally block
          // Move ref resetting inside finally
          accumulatedDurationRef.current = 0;
          startTimeRef.current = null;
          console.log('[TextDisplay Cleanup] Finished cleanup function and reset refs.');
      }
    }; // End of return function
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [textId, fetchAllLanguageWords, isAudioLesson]); // 'text' is intentionally omitted to prevent loops; cleanup captures correct 'text' via closure.


  // Audio Sync & Scroll
  useEffect(() => {
    if (!isAudioLesson || srtLines.length === 0 || displayMode !== 'audio') { setCurrentSrtLineId(null); return; }
    const currentLineIndex = srtLines.findIndex(line => audioCurrentTime >= line.startTime && audioCurrentTime < line.endTime);
    const currentLine = currentLineIndex !== -1 ? srtLines[currentLineIndex] : null;
    if (currentLine && currentLine.id !== currentSrtLineId) {
      setCurrentSrtLineId(currentLine.id);
      if (listRef.current && currentLineIndex !== -1) {
        setTimeout(() => { if (listRef.current) listRef.current.scrollToItem(currentLineIndex, 'center'); }, 50);
      }
    }
  }, [audioCurrentTime, srtLines, isAudioLesson, currentSrtLineId, displayMode]);

  // Resizable Panel
  // Removed useEffect for drag-to-resize functionality

  // --- Apply Playback Rate ---
  useEffect(() => {
      if (audioRef.current) {
          audioRef.current.playbackRate = playbackRate;
          console.log(`[Playback Rate Apply] Set audio playbackRate to: ${playbackRate}`);
      }
  }, [playbackRate]); // Apply whenever playbackRate state changes
  // --- End Apply Playback Rate ---

  // --- Save Audio Time Periodically ---
  useEffect(() => {
      if (isAudioLesson && audioCurrentTime > 0) { // Only save if playing and valid time
          const now = Date.now();
          if (now - lastSaveTimeRef.current > saveInterval) {
              console.log(`[Audio Save - Throttled] Saving time: ${audioCurrentTime} for textId: ${textId}`);
              localStorage.setItem(`audioTime-${textId}`, audioCurrentTime.toString());
              lastSaveTimeRef.current = now;
          }
      }
  }, [audioCurrentTime, isAudioLesson, textId]); // Depend on time, lesson status, and textId
  // --- End Save Audio Time ---


  // --- Keyboard Shortcuts ---
  useEffect(() => { // Spacebar
    const handleKeyDown = (event) => {
        // Ignore if typing in an input or textarea
        if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
            return;
        }
        // Toggle play/pause for audio lessons when space is pressed
        if (isAudioLesson && displayMode === 'audio' && event.code === 'Space') {
            event.preventDefault(); // Prevent default space behavior (like scrolling)
            if (audioRef.current) {
                if (audioRef.current.paused) {
                    audioRef.current.play();
                } else {
                    audioRef.current.pause();
                }
            }
        }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAudioLesson, displayMode]); // Add dependencies

  useEffect(() => { // 1-5 keys
    const handleKeyDown = (event) => {
      if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA' || event.ctrlKey || event.altKey || event.metaKey) return;
      if (hoveredWordTerm && !processingWord && !isTranslating) {
        const key = parseInt(event.key, 10);
        if (key >= 1 && key <= 5) {
          event.preventDefault();
          const wordData = getWordData(hoveredWordTerm);
          if (wordData) {
            updateWord(wordData.wordId, key, wordData.translation || '')
              .then(() => {
                setWords(prevWords => prevWords.map(w => w.wordId === wordData.wordId ? { ...w, status: key } : w));
                if (selectedWord === hoveredWordTerm && displayedWord?.term === hoveredWordTerm) setDisplayedWord(prev => ({...prev, status: key }));
              })
              .catch(err => console.error(`[Keyboard Shortcut] Failed update for ${hoveredWordTerm}:`, err));
          } else {
             createWord(text.textId, hoveredWordTerm, key, '')
                .then(newWordData => {
                    setWords(prevWords => [...prevWords, newWordData]);
                    if(globalSettings.autoTranslateWords) triggerAutoTranslation(hoveredWordTerm); // Use globalSettings
                })
                .catch(err => console.error(`[Keyboard Shortcut] Failed to create word ${hoveredWordTerm}:`, err));
          }
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hoveredWordTerm, processingWord, isTranslating, getWordData, setWords, selectedWord, displayedWord, text?.textId, globalSettings.autoTranslateWords, triggerAutoTranslation]); // Use globalSettings
  // --- End Keyboard Shortcuts ---

  // Text selection listener (for phrases)
  useEffect(() => {
    const handleMouseUp = () => {
        const selected = window.getSelection()?.toString();
        if (selected && selected.trim().length > 0 && selected.includes(' ')) {
           handleTextSelection(selected); // Now defined before this hook
        }
     };
    document.addEventListener('mouseup', handleMouseUp);
    return () => document.removeEventListener('mouseup', handleMouseUp);
  }, [text, handleTextSelection]); // handleTextSelection dependency is correct
  // --- End Effect Hooks ---


  // --- Event Handlers ---
   const handleSaveWord = async (status) => {
     if (!selectedWord || processingWord || isTranslating) return;
     setSaveSuccess(false); setProcessingWord(true);
     try {
       const numericStatus = parseInt(status, 10);
       if (isNaN(numericStatus) || numericStatus < 1 || numericStatus > 5) throw new Error(`Invalid status: ${status}.`);
       const existingWord = getWordData(selectedWord);
       if (existingWord) {
         await updateWord(existingWord.wordId, numericStatus, translation);
         const updatedWords = words.map(w => w.wordId === existingWord.wordId ? { ...w, status: numericStatus, translation } : w);
         setWords(updatedWords);
         setDisplayedWord(prev => (prev?.term === selectedWord ? { ...prev, status: numericStatus, translation } : prev));
       } else {
         const newWordData = await createWord(text.textId, selectedWord, numericStatus, translation);
         setWords(prevWords => [...prevWords, newWordData]);
         setDisplayedWord({ ...newWordData, isNew: false });
       }
       setSaveSuccess(true); setTimeout(() => setSaveSuccess(false), 2000);
     } catch (error) { console.error('Error saving word:', error); alert(`Failed to save word: ${error.message}`); }
     finally { setProcessingWord(false); }
   };

   const handleFullTextTranslation = async () => {
      if (!text || !text.content) return;
      setShowTranslationPopup(true); setIsFullTextTranslating(true); setFullTextTranslation('');
      try {
        const response = await translateFullText(text.content, text.languageCode || 'auto', 'en');
        setFullTextTranslation(response?.translatedText || 'Translation failed.');
      } catch (error) { setFullTextTranslation(`Translation failed: ${error.message}`); }
      finally { setIsFullTextTranslating(false); }
    };

   const handleTranslateUnknownWords = async () => {
      if (!text || !text.content || !text.languageId) return;
      setTranslatingUnknown(true); setTranslateUnknownError('');
      try {
        const wordsRegex = /\p{L}+(['-]\p{L}+)*/gu;
        const textWords = text.content.match(wordsRegex) || [];
        const uniqueWordsInText = [...new Set(textWords.map(w => w.toLowerCase()))];
        const wordsMap = new Map(words.map(w => [w.term.toLowerCase(), w]));
        const unknownWords = uniqueWordsInText.filter(word => !wordsMap.has(word) || (wordsMap.get(word)?.status <= 2 && !wordsMap.get(word)?.translation));
        if (unknownWords.length === 0) { alert("No words found needing translation."); setTranslatingUnknown(false); return; } // Exit early
        const translations = await batchTranslateWords(unknownWords, 'EN', text.languageCode);
        const originalCaseMap = new Map();
        textWords.forEach(w => { const lower = w.toLowerCase(); if (!originalCaseMap.has(lower)) { originalCaseMap.set(lower, w); } });
        const termsToAdd = unknownWords.map(word => ({ term: originalCaseMap.get(word) || word, translation: translations[word.toLowerCase()] || '' })).filter(t => t.translation);
        if (termsToAdd.length === 0) { alert("No translations received."); setTranslatingUnknown(false); return; } // Exit early
        await addTermsBatch(text.languageId, termsToAdd);
        await fetchAllLanguageWords(text.languageId);
        alert(`Successfully translated and updated ${termsToAdd.length} words.`);
      } catch (err) { console.error("Error translating unknown words:", err); setTranslateUnknownError(`Failed: ${err.message}`); alert(`Error: ${err.message}`); }
      finally { setTranslatingUnknown(false); }
    };

   const handleMarkAllUnknownAsKnown = async () => {
      if (!text || !text.content || !text.languageId || !text.textId) return;
      setIsMarkingAll(true); setError('');
      try {
        const wordsRegex = /\p{L}+(['-]\p{L}+)*/gu;
        const textWords = text.content.match(wordsRegex) || [];
        const uniqueWordsInText = [...new Set(textWords.map(w => w.toLowerCase()))];
        const wordsMap = new Map(words.map(w => [w.term.toLowerCase(), w]));
        const unknownWords = uniqueWordsInText.filter(word => !wordsMap.has(word));
        if (unknownWords.length === 0) { alert("No untracked words found."); setIsMarkingAll(false); return; } // Exit early
        const originalCaseMap = new Map();
        textWords.forEach(w => { const lower = w.toLowerCase(); if (!originalCaseMap.has(lower)) { originalCaseMap.set(lower, w); } });
        const termsToMark = unknownWords.map(word => ({ term: originalCaseMap.get(word) || word, translation: null }));
        await addTermsBatch(text.languageId, termsToMark);
        await fetchAllLanguageWords(text.languageId);
        alert(`Attempted to mark ${unknownWords.length} words as Known.`);
      } catch (err) { console.error("Error marking all unknown as known:", err); setError(`Failed: ${err.message}`); alert(`Error: ${err.message}`); }
      finally { setIsMarkingAll(false); }
    };

   const handleCompleteLesson = async () => {
      if (!text?.textId) return; // Require at least textId
      setCompleting(true);
      try {
        // Call the correct API endpoint using the imported completeText function
        const textStats = await completeText(text.textId);
        // If standalone text, always go back to texts page after completion
        if (!text?.bookId) {
            navigate('/texts');
        } else if (globalSettings.autoAdvanceToNextLesson && nextTextId) {
            navigate(`/texts/${nextTextId}`);
        } else if (globalSettings.showProgressStats) {
            setStats(textStats); // Use the stats returned from completeText
            setShowStatsModal(true);
        } else {
            navigate(`/books/${text.bookId}`);
        }
      } catch (error) { alert(`Failed to complete lesson: ${error.message}`); }
      finally { setCompleting(false); }
    };

  // --- New Handler for Audio Metadata Load ---
  const handleAudioMetadataLoaded = () => {
      console.log(`[Audio Metadata] Loaded. Initial time from state: ${initialAudioTime}`);
      // Apply initial playback rate when metadata loads
      if (audioRef.current) {
          audioRef.current.playbackRate = playbackRate;
      }
      if (audioRef.current && initialAudioTime !== null && initialAudioTime > 0) {
          console.log(`[Audio Metadata] Setting current time to: ${initialAudioTime}`);
          audioRef.current.currentTime = initialAudioTime;
          // Reset initial time state after applying it once
          setInitialAudioTime(null);
      } else if (audioRef.current) {
          console.log(`[Audio Metadata] No initial time to set or initial time is 0. Current time: ${audioRef.current.currentTime}`);
      }
  };

  // --- Handlers for Playback Speed ---
  const changePlaybackRate = (delta) => {
      setPlaybackRate(prevRate => {
          const newRate = parseFloat((prevRate + delta).toFixed(2));
          const clampedRate = Math.max(0.5, Math.min(newRate, 2.0)); // Clamp between 0.5x and 2.0x
          localStorage.setItem('audioPlaybackRate', clampedRate.toString()); // Save preference
          console.log(`[Playback Rate Change] New rate: ${clampedRate}`);
          return clampedRate;
      });
  };
  // --- End Event Handlers ---

  // --- Audio Play/Pause/End Handlers for Duration Tracking ---
  const handlePlay = () => {
      if (!startTimeRef.current) { // Start timer only if not already started
          startTimeRef.current = Date.now();
          console.log('[Audio Tracking] Play started/resumed. Start time:', startTimeRef.current);
      }
  };

  const handlePauseOrEnd = () => {
      if (startTimeRef.current) {
          const elapsed = Date.now() - startTimeRef.current;
          accumulatedDurationRef.current += elapsed;
          console.log(`[Audio Tracking] Paused/Ended. Elapsed: ${elapsed}ms. Accumulated: ${accumulatedDurationRef.current}ms`);
          startTimeRef.current = null; // Reset start time

          // --- Attempt to log duration here ---
          const durationInSeconds = Math.round(accumulatedDurationRef.current / 1000);
          console.log(`[Audio Tracking - Pause/End] Checking duration threshold (> 5s)... Duration is ${durationInSeconds}s.`);

          if (durationInSeconds > 5 && isAudioLesson && text?.languageId) { // Check conditions again
              console.log('[Audio Tracking - Pause/End] Duration > 5s. Preparing API call...');
              const token = localStorage.getItem('token');
              const payload = {
                languageId: text.languageId,
                // Send the *accumulated* duration up to this point
                durationSeconds: durationInSeconds
              };
              console.log('[Audio Tracking - Pause/End] API Payload:', payload);
              console.log('[Audio Tracking - Pause/End] Making fetch call to logListening...');
              fetch(`${API_URL}/api/activity/logListening`, {
                  method: 'POST',
                  headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${token}`
                  },
                  body: JSON.stringify(payload)
              })
              .then(response => {
                  if (!response.ok) {
                      console.error('[Audio Tracking - Pause/End] API call failed:', response.statusText);
                  } else {
                      console.log('[Audio Tracking - Pause/End] API call successful (Note: This might log multiple times per session).');
                      // Optionally reset accumulated duration after successful log?
                      // accumulatedDurationRef.current = 0; // Consider implications
                  }
              })
              .catch(error => {
                  console.error('[Audio Tracking - Pause/End] API call error:', error);
              });
          } else {
               console.log('[Audio Tracking - Pause/End] Duration <= 5s or not audio lesson/no languageId. Skipping API call.');
          }
          // --- End duration logging attempt ---
      }
  };
  // --- End Audio Tracking Handlers ---


  // --- Rendering Logic ---
  const renderAudioTranscript = () => {
    if (!srtLines || srtLines.length === 0) return <p className="p-3">Loading transcript...</p>;
    const ITEM_SIZE = 45;
    const LIST_HEIGHT = textContentRef.current ? textContentRef.current.clientHeight - 30 : 600;
    return (
      <div className="audio-transcript-container" style={{ padding: '15px 0', height: '100%', overflow: 'hidden' }}>
        <List height={LIST_HEIGHT} itemCount={srtLines.length} itemSize={ITEM_SIZE} width="100%" itemData={itemData} overscanCount={5} ref={listRef} style={{ paddingRight: '15px', paddingLeft: '15px' }}>
            {TranscriptLine}
        </List>
      </div>
    );
  };

  const renderStandardText = () => {
    if (!text?.content) return null;
    const paragraphs = text.content.split(/(\n\s*){2,}/g).filter(p => p?.trim().length > 0);
    return (
       <div className="text-content" style={{ fontSize: `${globalSettings.textSize}px`, lineHeight: '1.6', fontFamily: getFontFamilyForList(), padding: '15px' }}> {/* Use globalSettings */}
        {paragraphs.map((paragraph, index) => (
          <p key={`para-${index}`} className="mb-3" style={{ textIndent: '1.5em' }}>
            {processTextContent(paragraph)}
          </p>
        ))}
      </div>
    );
  };

  const renderSidePanel = () => {
     if (!displayedWord) return <p>Click/hover on a word.</p>;
     return (
        <div>
          <h5 className="fw-bold mb-2">{displayedWord.term}</h5>
          {saveSuccess && <Alert variant="success" size="sm">Saved!</Alert>}
          <p className="mb-1 small">Status: {displayedWord.status > 0 ? ['New','Learning','Familiar','Advanced','Known'][displayedWord.status-1] : 'Untracked'}</p>
          <Form.Control as="textarea" rows={2} value={translation} onChange={(e) => setTranslation(e.target.value)} placeholder="Translation/Notes" disabled={isTranslating} size="sm"/>
          {isTranslating && <Spinner size="sm"/>}
          {wordTranslationError && <Alert variant="danger" size="sm">{wordTranslationError}</Alert>}
          <div className="d-flex flex-wrap gap-1 mt-2">
             {[1, 2, 3, 4, 5].map(s => <Button key={s} variant="outline-secondary" size="sm" className="py-0 px-2" onClick={() => handleSaveWord(s)} disabled={processingWord || isTranslating || !selectedWord}>{s}</Button>)}
          </div>

          {/* --- Phase 3: Dictionary Buttons --- */}
          {languageConfig?.dictionaries && selectedWord && (
            <div className="mt-3 pt-2 border-top">
              <h6 className="mb-2 small text-muted">Dictionaries</h6>
              <div className="d-flex flex-wrap gap-1">
                {languageConfig.dictionaries
                  .filter(dict => dict.isActive && dict.purpose === 'terms')
                  .sort((a, b) => a.sortOrder - b.sortOrder)
                  .map(dict => {
                    const handleDictClick = () => {
                      if (!selectedWord) return;
                      const term = encodeURIComponent(selectedWord); // Ensure encoding
                      const url = dict.urlTemplate.replace('###', term);
                      console.log(`[Dictionary] Clicked: ${dict.dictionaryId}, Type: ${dict.displayType}, URL: ${url}`);
                      if (dict.displayType === 'popup') {
                        window.open(url, '_blank', 'noopener,noreferrer');
                        setEmbeddedUrl(null); // Clear any existing embedded view
                      } else if (dict.displayType === 'embedded') {
                        setEmbeddedUrl(url);
                      }
                    };
                    // Attempt to get a simple name from the URL
                    let buttonText = `Dict ${dict.sortOrder}`;
                    try {
                        const urlObj = new URL(dict.urlTemplate);
                        buttonText = urlObj.hostname.replace(/^www\./, '').split('.')[0];
                        buttonText = buttonText.charAt(0).toUpperCase() + buttonText.slice(1);
                    } catch (e) { /* Ignore invalid URL for naming */ }

                    return (
                      <Button key={dict.dictionaryId} variant="outline-info" size="sm" onClick={handleDictClick} title={dict.urlTemplate}>
                        {buttonText}
                      </Button>
                    );
                  })}
              </div>
            </div>
          )}
          {/* --- End Phase 3 --- */}

        </div>
     );
  };
  // --- End Rendering Logic ---
  // --- Loading/Error/NotFound States ---
  if (loading) { return <Container className="py-5 text-center"><Spinner animation="border" /></Container>; }
  if (error) { return <Container className="py-5"><Alert variant="danger">{error}<Button onClick={() => navigate(-1)}>Back</Button></Alert></Container>; }
  if (!text) { return <Container className="py-5"><Alert variant="warning">Text not found<Button onClick={() => navigate('/texts')}>Back</Button></Alert></Container>; }
  // --- End Loading/Error States ---

      // DEBUG: Log isAudioLesson state before rendering
      console.log(`[Render Check] isAudioLesson state: ${isAudioLesson}`);

  // --- Main Return JSX ---
  return (
    <div className="text-display-wrapper px-0 mx-0 w-100">
      {/* Header Card - Add Playback Speed Controls */}
      <Card className="shadow-sm mb-1 border-0 rounded-0">
        <Card.Body className="py-1 px-2">
           <div className="d-flex justify-content-between align-items-center flex-wrap">
             <div>
               <h2 className="mb-1">{text.title}</h2>
               <p className="text-muted mb-0 small">Lang: {text.languageName || 'N/A'} | Words: {words.length}</p>
             </div>
             <div className="d-flex gap-2 flex-wrap mt-2 mt-md-0 align-items-center">
               {/* Audiobook Player Integration */}
               {book && book.audiobookTracks && book.audiobookTracks.length > 0 && (
                 <div className="flex-grow-1 mx-2" style={{ minWidth: '450px' }}> {/* Increased minWidth significantly */}
                    <AudiobookPlayer book={book} />
                 </div>
               )}
               {/* Playback Speed Controls */}
               {isAudioLesson && displayMode === 'audio' && (
                 <ButtonGroup size="sm" className="me-1" title={`Playback Speed: ${playbackRate.toFixed(2)}x`}>
                   <Button variant="outline-secondary" onClick={() => changePlaybackRate(-0.05)} disabled={playbackRate <= 0.5}>-</Button>
                   <Button variant="outline-secondary" disabled style={{ minWidth: '45px', textAlign: 'center' }}>{playbackRate.toFixed(2)}x</Button>
                   <Button variant="outline-secondary" onClick={() => changePlaybackRate(0.05)} disabled={playbackRate >= 2.0}>+</Button>
                 </ButtonGroup>
               )}
               {/* Existing Controls */}
               <ButtonGroup size="sm" className="me-1">
                  {/* Update font size via API and context */}
                  <Button variant="outline-secondary" onClick={() => {
                      const newSize = Math.max(12, globalSettings.textSize - 2);
                      console.log('[Save Settings] Saving Text Size via API:', newSize);
                      updateSetting('textSize', newSize); // Update context immediately
                      updateUserSettings({ textSize: newSize }) // Call API
                          .catch(err => console.error('[Save Settings] Failed to save text size via API:', err));
                  }} title="Decrease text size">A-</Button>
                  <Button variant="outline-secondary" onClick={() => {
                      const newSize = Math.min(32, globalSettings.textSize + 2);
                      console.log('[Save Settings] Saving Text Size via API:', newSize);
                      updateSetting('textSize', newSize); // Update context immediately
                      updateUserSettings({ textSize: newSize }) // Call API
                          .catch(err => console.error('[Save Settings] Failed to save text size via API:', err));
                  }} title="Increase text size">A+</Button>
               </ButtonGroup>
               {/* Re-added Panel resize buttons */}
               <ButtonGroup size="sm" className="me-1">
                 <Button variant="outline-secondary" onClick={() => {
                     const newWidth = Math.min(leftPanelWidth + 5, 85); // Increase width, max 85
                     setLeftPanelWidth(newWidth);
                     updateSetting('leftPanelWidth', newWidth); // Update context
                     updateUserSettings({ leftPanelWidth: newWidth }) // Save via API
                         .catch(err => console.error('[Save Settings] Failed to save panel width via API:', err));
                 }} title="Increase reading area (Wider)">◀</Button>
                 <Button variant="outline-secondary" onClick={() => {
                     const newWidth = Math.max(leftPanelWidth - 5, 20); // Decrease width, min 20
                     setLeftPanelWidth(newWidth);
                     updateSetting('leftPanelWidth', newWidth); // Update context
                     updateUserSettings({ leftPanelWidth: newWidth }) // Save via API
                         .catch(err => console.error('[Save Settings] Failed to save panel width via API:', err));
                 }} title="Decrease reading area (Narrower)">▶</Button>
               </ButtonGroup>
               {isAudioLesson && ( <Button variant="outline-info" size="sm" onClick={() => setDisplayMode(p => p === 'audio' ? 'text' : 'audio')} title={displayMode === 'audio' ? 'Text View' : 'Audio View'} className="me-1">{displayMode === 'audio' ? 'Text' : 'Audio'} View</Button> )}
               {text && !loading && ( <Button variant="info" size="sm" onClick={handleFullTextTranslation} className="me-1">Translate Text</Button> )}
               {text && !loading && ( <Button variant="secondary" size="sm" onClick={handleTranslateUnknownWords} disabled={translatingUnknown} className="ms-1" title="Translate unknown/learning words">{translatingUnknown ? <Spinner size="sm"/> : 'Translate ?'}</Button> )}
               {text && !loading && ( <Button variant="outline-success" size="sm" onClick={handleMarkAllUnknownAsKnown} disabled={isMarkingAll} className="ms-1" title="Mark all untracked words as Known">{isMarkingAll ? <Spinner size="sm"/> : 'Mark All Known'}</Button> )}
               {/* Add Complete Lesson button here specifically for Audio Lessons */}
               {/* Show top button ONLY for standalone audio lessons */}
               {isAudioLesson && !text?.bookId && (
                   <Button variant="success" onClick={handleCompleteLesson} disabled={completing} size="sm" className="ms-1">
                       {completing ? <Spinner animation="border" size="sm" /> : (nextTextId === null ? 'Finish Book' : 'Complete Lesson')}
                   </Button>
               )}
               {text?.bookId && ( <Button variant="outline-primary" size="sm" onClick={() => navigate(`/books/${text.bookId}`)} className="ms-1">Back to Book</Button> )}
               {!text?.bookId && ( <Button variant="outline-secondary" size="sm" onClick={() => navigate('/texts')} className="ms-1">Back to Texts</Button> )}
             </div>
           </div>
           {translateUnknownError && <Alert variant="danger" className="mt-1 mb-0 p-1 small">{translateUnknownError}</Alert>}
        </Card.Body>
      </Card>

      {/* Audiobook Player rendering removed from here to fix duplication */}

      {/* Audio Player */}
      {isAudioLesson && audioSrc && displayMode === 'audio' && (
        <div className="audio-player-container p-2 bg-light border-bottom">
          <audio
            ref={audioRef}
            controls
            src={audioSrc}
            onTimeUpdate={(e) => setAudioCurrentTime(e.target.currentTime)}
            onLoadedMetadata={handleAudioMetadataLoaded}
            onPlay={handlePlay} // Track play start
            onPause={handlePauseOrEnd} // Track pause
            onEnded={handlePauseOrEnd} // Track end
            style={{ width: '100%' }}
          >
            Your browser does not support the audio element.
          </audio>
        </div>
      )}

      {/* Audiobook Player rendering removed from here to fix duplication */}

      {/* Main Content Area */}
      <div className="resizable-container">
        {/* Left Panel (Reading Area) */}
        <div className="left-panel" style={{ width: `${leftPanelWidth}%`, height: 'calc(100vh - 130px)', overflowY: 'auto', padding: '0', position: 'relative' }}>
           <div className="d-flex flex-column" style={{ minHeight: '100%' }}>
             <div className="flex-grow-1" ref={textContentRef}>
               {isAudioLesson && displayMode === 'audio' ? renderAudioTranscript() : renderStandardText()}
             </div>
             {/* Show bottom button for regular texts OR any text within a book */}
             {(!isAudioLesson || text?.bookId) && (
                <div className="mt-auto pt-2 text-end px-2 pb-2">
                    <Button variant="success" onClick={handleCompleteLesson} disabled={completing} size="sm">
                        {completing ? <Spinner animation="border" size="sm" /> : (nextTextId === null ? 'Finish Book' : 'Complete Lesson')}
                    </Button>
                </div>
             )}
           </div>
        </div>

        {/* Removed Resize Divider */}

        {/* Right Panel (Word Info) */}
        <div className="right-panel" style={{ width: `${100 - leftPanelWidth}%`, height: 'calc(100vh - 130px)', overflowY: 'auto', padding: '6px', position: 'relative' }}>
           <Card className="border-0 h-100"><Card.Body className="p-2 d-flex flex-column">
             <h5 className="mb-2 flex-shrink-0">Word Info</h5>
             <div className="flex-grow-1" style={{ overflowY: 'auto', paddingBottom: '5px' }}>{renderSidePanel()}</div>

             {/* --- Phase 3: Embedded Dictionary Iframe --- */}
             {embeddedUrl && (
                <div className="mt-2 pt-2 border-top flex-shrink-0" style={{ position: 'relative', height: '40%', minHeight: '150px' }}>
                   <Button
                     variant="light"
                     size="sm"
                     onClick={() => setEmbeddedUrl(null)}
                     style={{ position: 'absolute', top: '5px', right: '5px', zIndex: 10, padding: '0.1rem 0.3rem', lineHeight: 1 }}
                     title="Close Dictionary View"
                   >
                     &times; {/* Close icon */}
                   </Button>
                   <iframe
                     src={embeddedUrl}
                     title="Embedded Dictionary"
                     style={{ width: '100%', height: '100%', border: 'none' }}
                     sandbox="allow-scripts allow-same-origin allow-popups allow-forms" // Security sandbox
                     referrerPolicy="no-referrer" // Privacy
                   ></iframe>
                </div>
             )}
             {/* --- End Phase 3 --- */}
           </Card.Body></Card>
        </div>
      </div>

      {/* Modals */}
      <Modal show={showStatsModal} onHide={() => setShowStatsModal(false)} centered>
         <Modal.Header closeButton><Modal.Title>Lesson Completed!</Modal.Title></Modal.Header>
         <Modal.Body>
              {stats && (
                <div className="text-center">
                  <h5>Book Progress</h5>
                  <ProgressBar now={stats.completionPercentage || 0} label={`${(stats.completionPercentage || 0).toFixed(1)}%`} className="mb-3" />
                  <Row>
                    <Col>Known: <Badge bg="success">{stats.knownWords}</Badge></Col>
                    <Col>Learning: <Badge bg="warning">{stats.learningWords}</Badge></Col>
                    <Col>Total: <Badge bg="info">{stats.totalWords}</Badge></Col>
                  </Row>
                </div>
              )}
         </Modal.Body>
         <Modal.Footer>
             <Button variant="secondary" onClick={() => setShowStatsModal(false)}>Close</Button>
             {nextTextId && <Button variant="success" onClick={() => { setShowStatsModal(false); navigate(`/texts/${nextTextId}`); }}>Next Lesson</Button>}
             {text?.bookId && <Button variant="primary" onClick={() => navigate(`/books/${text.bookId}`)}>Back to Book</Button>}
         </Modal.Footer>
      </Modal>
      <TranslationPopup show={showTranslationPopup} handleClose={() => setShowTranslationPopup(false)} originalText={text?.content || ''} translatedText={fullTextTranslation} isTranslating={isFullTextTranslating} />

    </div>
  );
};

export default TextDisplay;