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
    <Container className="py-5 main-content-padding"> {/* Added main-content-padding */}
      <div className="d-flex justify-content-between align-items-center mb-4"> {/* Added align-items-center */}
        <h2 className="mb-0">My Books</h2> {/* Removed default h2 margin */}
        <Button
          onClick={() => navigate('/books/create')}
          className="btn-primary" // Ensure it uses global styles
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

      <Row xs={1} md={2} lg={3} className="g-4"> {/* g-4 provides spacing between cards */}
        {books.map((book) => (
          <Col key={book.bookId}>
            <Card className="h-100 d-flex flex-column book-card"> {/* Added d-flex flex-column for footer behavior, book-card is existing */}
              <Card.Body className="d-flex flex-column flex-grow-1"> {/* flex-grow-1 to push footer down */}
                <Card.Title as="h5" className="text-truncate mb-1">{book.title}</Card.Title> {/* Reduced margin slightly */}
                <Card.Subtitle className="mb-3 text-muted"> {/* Increased margin */}
                  {book.languageName}
                </Card.Subtitle>
                <Card.Text className="text-truncate mb-3"> {/* Added margin */}
                  {book.description || 'No description provided'}
                </Card.Text>

                {/* Reading statistics */}
                <div className="mb-3"> {/* Increased margin */}
                  <small className="text-muted d-block mb-1">Reading progress:</small>
                  <ProgressBar
                    now={book.completionPercentage}
                    label={`${book.completionPercentage}%`}
                    className="themed-progress-bar" // Added custom class
                  />
                </div>

                {book.totalWords > 0 && (
                  <div className="text-muted small mb-3"> {/* Increased margin */}
                    <Row>
                      <Col>Known: {book.knownWords}</Col>
                      <Col>Learning: {book.learningWords}</Col>
                      <Col>Total: {book.totalWords}</Col>
                    </Row>
                  </div>
                )}

                <div className="text-muted small mt-auto"> {/* mt-auto to push to bottom if content is short */}
                  Parts: {book.partCount} | Added: {formatDate(book.createdAt)}
                  {book.lastReadAt && (
                    <> | Last read: {formatDate(book.lastReadAt)}</>
                  )}
                </div>
              </Card.Body>
              <Card.Footer className="d-flex p-3"> {/* Removed bg-white, added padding */}
                <Link
                  to={`/books/${book.bookId}`}
                  className="btn btn-outline-primary flex-grow-1 me-2" // me-2 for spacing
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
                    className="btn-primary flex-grow-1" // Ensure it uses global styles
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