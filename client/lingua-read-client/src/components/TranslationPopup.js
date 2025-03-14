import React from 'react';
import { Modal, Button, Spinner } from 'react-bootstrap';

const TranslationPopup = ({ 
  show, 
  handleClose, 
  originalText, 
  translatedText, 
  isTranslating,
  sourceLanguage,
  targetLanguage
}) => {
  return (
    <Modal
      show={show}
      onHide={handleClose}
      size="lg"
      aria-labelledby="translation-popup"
      centered
    >
      <Modal.Header closeButton>
        <Modal.Title id="translation-popup">
          Translation ({sourceLanguage} → {targetLanguage})
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div className="mb-3">
          <h6>Original Text:</h6>
          <div className="p-3 border rounded">
            {originalText}
          </div>
        </div>
        
        <div>
          <h6>Translation:</h6>
          {isTranslating ? (
            <div className="d-flex justify-content-center align-items-center p-4">
              <Spinner animation="border" className="me-2" />
              <span>Translating text...</span>
            </div>
          ) : (
            <div className="p-3 border rounded bg-light">
              {translatedText}
            </div>
          )}
        </div>
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