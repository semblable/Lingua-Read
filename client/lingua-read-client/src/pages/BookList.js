import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Alert, Spinner, ProgressBar } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { getBooks } from '../utils/api';
import { formatDate } from '../utils/helpers';

const BookList = () => {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchBooks = async () => {
      try {
        const data = await getBooks();
        setBooks(data);
        setError('');
      } catch (err) {
        setError(err.message || 'Failed to load books');
      } finally {
        setLoading(false);
      }
    };

    fetchBooks();
  }, []);

  if (loading) {
    return (
      <Container className="py-5 text-center">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
      </Container>
    );
  }

  return (
    <Container className="py-5">
      <div className="d-flex justify-content-between mb-4">
        <h2>My Books</h2>
        <Button 
          variant="primary" 
          onClick={() => navigate('/books/create')}
        >
          Add New Book
        </Button>
      </div>

      {error && <Alert variant="danger">{error}</Alert>}

      {!loading && books.length === 0 && (
        <Alert variant="info">
          You haven't added any books yet. Click "Add New Book" to get started.
        </Alert>
      )}

      <Row xs={1} md={2} lg={3} className="g-4">
        {books.map((book) => (
          <Col key={book.bookId}>
            <Card className="h-100 shadow-sm book-card">
              <Card.Body>
                <Card.Title as="h5" className="text-truncate">{book.title}</Card.Title>
                <Card.Subtitle className="mb-2 text-muted">
                  {book.languageName}
                </Card.Subtitle>
                <Card.Text className="text-truncate">
                  {book.description || 'No description provided'}
                </Card.Text>
                
                {/* Reading statistics */}
                <div className="mb-2">
                  <small className="text-muted d-block mb-1">Reading progress:</small>
                  <ProgressBar 
                    now={book.completionPercentage} 
                    label={`${book.completionPercentage}%`} 
                    variant={
                      book.completionPercentage < 25 ? 'danger' : 
                      book.completionPercentage < 50 ? 'warning' : 
                      book.completionPercentage < 75 ? 'info' : 'success'
                    }
                  />
                </div>
                
                {book.totalWords > 0 && (
                  <div className="text-muted small mb-2">
                    <Row>
                      <Col>Known: {book.knownWords}</Col>
                      <Col>Learning: {book.learningWords}</Col>
                      <Col>Total: {book.totalWords}</Col>
                    </Row>
                  </div>
                )}
                
                <div className="text-muted small mb-3">
                  Parts: {book.partCount} | Added: {formatDate(book.createdAt)}
                  {book.lastReadAt && (
                    <> | Last read: {formatDate(book.lastReadAt)}</>
                  )}
                </div>
              </Card.Body>
              <Card.Footer className="bg-white d-flex">
                <Link 
                  to={`/books/${book.bookId}`} 
                  className="btn btn-outline-primary flex-grow-1 me-2"
                >
                  View Book
                </Link>
                {book.lastReadTextId ? (
                  <Link 
                    to={`/texts/${book.lastReadTextId}`} 
                    className="btn btn-primary flex-grow-1"
                  >
                    Continue Reading
                  </Link>
                ) : book.partCount > 0 ? (
                  <Button 
                    variant="primary"
                    className="flex-grow-1"
                    onClick={() => navigate(`/texts/${book.parts?.[0]?.textId || ''}`)}
                    disabled={!book.parts?.[0]?.textId}
                  >
                    Start Reading
                  </Button>
                ) : null}
              </Card.Footer>
            </Card>
          </Col>
        ))}
      </Row>

      <div className="mt-4 text-center">
        <Button
          variant="outline-secondary"
          onClick={() => navigate('/texts')}
        >
          View Individual Texts
        </Button>
      </div>
    </Container>
  );
};

export default BookList; 