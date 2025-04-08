import React from 'react';
import { Modal, Button, Spinner, Row, Col } from 'react-bootstrap';

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
      size="xl" /* Made modal wider */
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
            <div className="p-3 border rounded h-100" style={{ minHeight: '200px', overflowY: 'auto', lineHeight: '1.8' }}> {/* Increased lineHeight */}
              {originalText}
            </div>
          </Col>
          <Col md={6}>
            <h6>Translation:</h6>
            {isTranslating ? (
              <div className="d-flex justify-content-center align-items-center p-4 border rounded h-100" style={{ minHeight: '200px' }}> {/* Added h-100 and minHeight */}
                <Spinner animation="border" className="me-2" />
                <span>Translating text...</span>
              </div>
            ) : (
              <div className="p-3 border rounded h-100" style={{ minHeight: '200px', overflowY: 'auto', lineHeight: '1.8' }}> {/* Increased lineHeight */}
                {translatedText}
              </div>
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