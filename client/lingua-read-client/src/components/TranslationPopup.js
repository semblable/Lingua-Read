import React, { useMemo, useRef, useCallback, useEffect } from 'react'; // Added useEffect
import { Modal, Button, Spinner, Row, Col } from 'react-bootstrap';

// Parser for the <o s="N">...</o><t s="N">...</t> format
const parsePairedTranslation = (taggedText) => {
  if (!taggedText) return [];
  // Regex to capture pairs of <o> and <t> tags with the same sentence number
  const regex = /<o s="(\d+?)">(.*?)<\/o>\s*<t s="\1">(.*?)<\/t>/gs;
  const pairs = [];
  let match;
  while ((match = regex.exec(taggedText)) !== null) {
    pairs.push({
      number: parseInt(match[1], 10),
      original: match[2], // Content of <o> tag
      translated: match[3] // Content of <t> tag
    });
  }
  // Sort by number just in case the LLM doesn't return them in order
  pairs.sort((a, b) => a.number - b.number);
  console.log('[TranslationPopup] Parsed pairs:', pairs); // Debug log
  return pairs;
};


// Define 5 colors for cycling
const sentenceColors = [
  '#e3f2fd', // light blue
  '#fff9c4', // light yellow
  '#e8f5e9', // light green
  '#fce4ec', // light pink
  '#f3e5f5', // light purple
  // Removed 6th color
];

const TranslationPopup = ({
  show,
  handleClose, 
  originalText, 
  translatedText, 
  isTranslating,
  sourceLanguage,
  targetLanguage
}) => {
  const originalScrollRef = useRef(null);
  const translatedScrollRef = useRef(null);
  const isSyncingScroll = useRef(false); // Flag to prevent scroll loops

  // Memoize sentence processing to avoid re-calculation on every render
  const sentencePairs = useMemo(() => {
    // Parse the combined tagged text directly
    return parsePairedTranslation(translatedText);
    // No longer need originalText as a dependency here if it's embedded in translatedText
  }, [translatedText]);

  // Scroll synchronization handler
  const handleScroll = useCallback((source) => {
    if (isSyncingScroll.current) return; // Exit if already syncing

    isSyncingScroll.current = true; // Set flag

    const sourceEl = source === 'original' ? originalScrollRef.current : translatedScrollRef.current;
    // Removed duplicate sourceEl declaration
    const targetEl = source === 'original' ? translatedScrollRef.current : originalScrollRef.current;

    if (sourceEl && targetEl) {
      // Directly synchronize scrollTop
      targetEl.scrollTop = sourceEl.scrollTop;
    }

    // Reset the flag slightly later to allow the scroll event to settle
    requestAnimationFrame(() => {
       isSyncingScroll.current = false;
    });
  }, []); // No dependencies needed as refs are stable


  // Effect to synchronize sentence block heights
  useEffect(() => {
    if (sentencePairs.length > 0 && !isTranslating) {
      // Allow DOM to update before measuring
      requestAnimationFrame(() => {
        sentencePairs.forEach(pair => {
          const originalEl = document.getElementById(`orig-block-${pair.number}`);
          const translatedEl = document.getElementById(`trans-block-${pair.number}`);

          if (originalEl && translatedEl) {
            // Reset heights first to get natural height
            originalEl.style.minHeight = 'auto';
            translatedEl.style.minHeight = 'auto';

            const originalHeight = originalEl.scrollHeight;
            const translatedHeight = translatedEl.scrollHeight;
            const maxHeight = Math.max(originalHeight, translatedHeight);

            originalEl.style.minHeight = `${maxHeight}px`;
            translatedEl.style.minHeight = `${maxHeight}px`;
          }
        });
      });
    }
  }, [sentencePairs, isTranslating]); // Rerun when pairs change or translation finishes

  return (
    <Modal
      show={show}
      onHide={handleClose}
      size="lg" /* Changed from xl to lg */
      aria-labelledby="translation-popup"
      centered
      dialogClassName="translation-modal-wide" /* Custom class for wider modal */
    >
      <Modal.Header closeButton>
        <Modal.Title id="translation-popup">
          Translation ({sourceLanguage} → {targetLanguage})
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Row>
          <Col md={6}>
            <h6>Original Text:</h6>
            {/* Original Text Column - Add ref and onScroll */}
            <div
              ref={originalScrollRef}
              onScroll={() => handleScroll('original')}
              className="p-1 border rounded h-100"
              style={{ minHeight: '200px', maxHeight: '60vh', overflowY: 'auto', lineHeight: '1.8' }}
            >
              {isTranslating ? (
                 <div className="d-flex justify-content-center align-items-center p-4 h-100"><span>Loading...</span></div>
              ) : sentencePairs.length > 0 ? (
                 sentencePairs.map((pair, index) => (
                  <div
                    id={`orig-block-${pair.number}`} // Add ID
                    key={`orig-${pair.number}`}
                    className="p-2 mb-2 rounded sentence-block"
                    style={{ backgroundColor: sentenceColors[index % sentenceColors.length] }}
                    // Render original text, potentially decoding HTML entities if needed later
                  >
                    {pair.original}
                  </div>
                 ))
              ) : (
                 <div className="p-2 text-muted">Original text will appear here after translation.</div>
              )}
            </div>
          </Col>
          <Col md={6}>
            <h6>Translation:</h6>
            {/* Translation Column - Add ref and onScroll */}
            {isTranslating ? (
              <div className="d-flex justify-content-center align-items-center p-4 border rounded h-100" style={{ minHeight: '200px' }}>
                <Spinner animation="border" className="me-2" />
                <span>Translating text...</span>
              </div>
            ) : sentencePairs.length > 0 ? (
              <div
                ref={translatedScrollRef}
                onScroll={() => handleScroll('translated')}
                className="p-1 border rounded h-100"
                style={{ minHeight: '200px', maxHeight: '60vh', overflowY: 'auto', lineHeight: '1.8' }}
              >
                {sentencePairs.map((pair, index) => (
                  <div
                    id={`trans-block-${pair.number}`} // Add ID
                    key={`trans-${pair.number}`}
                    className="p-2 mb-2 rounded sentence-block"
                    style={{ backgroundColor: sentenceColors[index % sentenceColors.length] }}
                    // Render translated text, potentially decoding HTML entities if needed later
                  >
                    {pair.translated}
                  </div>
                ))}
              </div>
             ) : (
                 <div className="p-2 text-muted">Translation will appear here.</div>
             )}
          </Col>
        </Row>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={handleClose}>
          Close
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default TranslationPopup; 