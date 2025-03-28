import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Alert, Spinner, ListGroup, Badge, ProgressBar, Modal } from 'react-bootstrap';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getBook, finishBook } from '../utils/api';
import { formatDate, /*calculateReadingTime*/ } from '../utils/helpers'; // Removed unused calculateReadingTime

const BookDetail = () => {
  const { bookId } = useParams();
  const [book, setBook] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const [finishingBook, setFinishingBook] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    const fetchBook = async () => {
      try {
        const data = await getBook(bookId);
        setBook(data);
        setError('');
      } catch (err) {
        setError(err.message || 'Failed to load book details');
      } finally {
        setLoading(false);
      }
    };

    fetchBook();
  }, [bookId]);

  const handleFinishBook = async () => {
    if (window.confirm('Are you sure you want to mark this book as finished? This will mark all words in the book as known.')) {
      setFinishingBook(true);
      try {
        const updatedStats = await finishBook(bookId);
        setStats(updatedStats);
        setShowStatsModal(true);
        
        // Update book with finished status
        setBook(prev => ({
          ...prev,
          isFinished: true
        }));
      } catch (err) {
        alert(`Failed to mark book as finished: ${err.message}`);
      } finally {
        setFinishingBook(false);
      }
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
            <Button variant="outline-primary" onClick={() => navigate('/books')}>
              Back to Books
            </Button>
          </div>
        </Alert>
      </Container>
    );
  }

  if (!book) {
    return (
      <Container className="py-5">
        <Alert variant="warning">
          Book not found
          <div className="mt-3">
            <Button variant="outline-primary" onClick={() => navigate('/books')}>
              Back to Books
            </Button>
          </div>
        </Alert>
      </Container>
    );
  }

  return (
    <Container className="py-5">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="mb-1">{book.title}</h1>
          <p className="text-muted mb-2">
            Language: {book.languageName} | 
            Parts: {book.parts.length} | 
            Added: {formatDate(book.createdAt)}
          </p>
          {book.description && (
            <p className="lead">{book.description}</p>
          )}
        </div>
        <div className="d-flex flex-column gap-2">
          {/* Add prominent reading button */}
          {book.parts.length > 0 && (
            book.lastReadTextId ? (
              <Button 
                variant="primary" 
                size="lg"
                onClick={() => navigate(`/texts/${book.lastReadTextId}`)}
              >
                Continue Reading
              </Button>
            ) : (
              <Button 
                variant="primary" 
                size="lg"
                onClick={() => navigate(`/texts/${book.parts[0].textId}`)}
              >
                Start Reading
              </Button>
            )
          )}
          <Button 
            variant="outline-secondary" 
            onClick={() => navigate('/books')}
          >
            Back to Books
          </Button>
        </div>
      </div>

      <Card className="shadow-sm mb-4">
        <Card.Header as="h5">Book Sections</Card.Header>
        <ListGroup variant="flush">
          {book.parts.map((part, index) => (
            <ListGroup.Item 
              key={part.textId}
              className="d-flex justify-content-between align-items-center"
              action
              as={Link}
              to={`/texts/${part.textId}`}
            >
              <div>
                <h6 className="mb-0">{part.title}</h6>
                <small className="text-muted">Added: {formatDate(part.createdAt)}</small>
              </div>
              <div>
                <Badge bg="primary" pill>
                  Part {part.partNumber}
                </Badge>
              </div>
            </ListGroup.Item>
          ))}
        </ListGroup>
      </Card>

      {book.parts.length === 0 && (
        <Alert variant="info">
          This book doesn't have any parts yet.
        </Alert>
      )}

      <div className="d-flex justify-content-between mb-4">
        {!book.isFinished && (
          <Button 
            variant="success" 
            onClick={handleFinishBook} 
            disabled={finishingBook}
          >
            {finishingBook ? <Spinner size="sm" animation="border" /> : null}
            {' '}
            Mark Book as Finished
          </Button>
        )}
      </div>

      {/* Stats Modal */}
      <Modal show={showStatsModal} onHide={() => setShowStatsModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Book Completed!</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {stats && (
            <div>
              <p className="mb-3">You've completed the book "<strong>{book.title}</strong>"!</p>
              <p className="mb-2">Progress:</p>
              <ProgressBar now={100} label={`100%`} className="mb-3" />
              
              <Row className="mb-3">
                <Col xs={6}>
                  <div className="d-flex flex-column align-items-center p-2 border rounded">
                    <div className="h2 mb-0">{stats.totalWords}</div>
                    <div>Total Words</div>
                  </div>
                </Col>
                <Col xs={6}>
                  <div className="d-flex flex-column align-items-center p-2 border rounded bg-success text-white">
                    <div className="h2 mb-0">{stats.knownWords}</div>
                    <div>Known Words</div>
                  </div>
                </Col>
              </Row>
              
              <p>All words in this book have been marked as known. Great job!</p>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="primary" onClick={() => setShowStatsModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default BookDetail; 