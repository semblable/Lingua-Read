import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, ListGroup, Spinner, Alert } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../utils/store';
import { getRecentTexts } from '../utils/api'; // Import the new API function

const Home = () => {
  const { token } = useAuthStore();
  const [recentTexts, setRecentTexts] = useState([]);
  const [loadingRecent, setLoadingRecent] = useState(false);
  const [errorRecent, setErrorRecent] = useState('');

  useEffect(() => {
    const fetchRecent = async () => {
      if (!token) {
        setRecentTexts([]); // Clear recent texts if logged out
        return;
      }
      setLoadingRecent(true);
      setErrorRecent('');
      try {
        const data = await getRecentTexts();
        setRecentTexts(data || []); // Ensure data is an array
      } catch (err) {
        setErrorRecent('Failed to load recent texts. Please try again later.');
        console.error("Error fetching recent texts:", err);
      } finally {
        setLoadingRecent(false);
      }
    };

    fetchRecent();
  }, [token]); // Re-fetch when token changes (login/logout)

  const renderRecentTexts = () => {
    if (loadingRecent) {
      return <Spinner animation="border" size="sm" />;
    }
    if (errorRecent) {
      return <Alert variant="warning">{errorRecent}</Alert>;
    }
    if (recentTexts.length === 0) {
      return <p>No recently read texts found.</p>;
    }
    return (
      <ListGroup variant="flush">
        {recentTexts.map((text) => (
          <ListGroup.Item
            key={text.textId}
            action
            as={Link}
            to={`/texts/${text.textId}`}
            className="d-flex justify-content-between align-items-start"
          >
            <div className="ms-2 me-auto">
              <div className="fw-bold">
                {text.bookTitle ? `${text.bookTitle} - Part ${text.partNumber || '?'}` : text.title}
              </div>
              <small className="text-muted">{text.languageName}{text.isAudioLesson ? ' (Audio)' : ''}</small>
            </div>
            {/* Optional: Add last accessed time */}
            {/* <Badge bg="light" text="dark">
              {new Date(text.lastAccessedAt).toLocaleDateString()}
            </Badge> */}
          </ListGroup.Item>
        ))}
      </ListGroup>
    );
  };

  return (
    <Container className="py-5">
      <Row className="justify-content-center">
        <Col md={8} className="text-center">
          <h1 className="display-4 mb-4">Welcome to LinguaRead</h1>
          <p className="lead mb-5">
            Improve your language skills by reading texts and tracking your vocabulary progress.
            LinguaRead helps you learn new words in context and remember them better.
          </p>

          {/* --- Continue Reading Section --- */}
          {token && (
            <Row className="justify-content-center mb-5">
              <Col md={10}>
                <Card className="shadow-sm">
                  <Card.Header as="h5">Continue Reading</Card.Header>
                  <Card.Body>
                    {renderRecentTexts()}
                  </Card.Body>
                </Card>
              </Col>
            </Row>
          )}
          {/* --- End Continue Reading Section --- */}

          {token ? (
            <Row className="justify-content-center">
              {/* Existing logged-in cards */}
              <Col md={6} className="mb-4">
                <Card className="h-100 shadow-sm">
                  <Card.Body>
                    <Card.Title>My Books</Card.Title> {/* Changed from My Texts */}
                    <Card.Text>
                      View your imported books and standalone texts.
                    </Card.Text>
                    <Button as={Link} to="/books" variant="primary">Go to My Books</Button> {/* Changed link */}
                  </Card.Body>
                </Card>
              </Col>
              <Col md={6} className="mb-4">
                <Card className="h-100 shadow-sm">
                  <Card.Body>
                    <Card.Title>Add New Content</Card.Title>
                    <Card.Text>
                      Import a new book, create a text, or upload an audio lesson.
                    </Card.Text>
                    {/* Consider adding dropdown or separate buttons */}
                    <Button as={Link} to="/books/create" variant="success" className="me-2">Add Book</Button>
                    <Button as={Link} to="/texts/create-audio" variant="info">Add Audio Lesson</Button>
                  </Card.Body>
                </Card>
              </Col>
            </Row>
          ) : (
             // Existing logged-out cards
            <Row className="justify-content-center">
              <Col md={6} className="mb-4">
                <Card className="h-100 shadow-sm">
                  <Card.Body>
                    <Card.Title>Get Started</Card.Title>
                    <Card.Text>
                      Create an account to start tracking your language learning progress.
                    </Card.Text>
                    <Button as={Link} to="/register" variant="primary">Register</Button>
                  </Card.Body>
                </Card>
              </Col>
              <Col md={6} className="mb-4">
                <Card className="h-100 shadow-sm">
                  <Card.Body>
                    <Card.Title>Already a User?</Card.Title>
                    <Card.Text>
                      Log in to access your saved texts and continue learning.
                    </Card.Text>
                    <Button as={Link} to="/login" variant="outline-primary">Login</Button>
                  </Card.Body>
                </Card>
              </Col>
            </Row>
          )}

          <Row className="mt-5">
            <Col>
              <h2 className="mb-4">How It Works</h2>
              <Row className="text-start">
                <Col md={4} className="mb-4">
                  <h4>1. Add Content</h4> {/* Updated */}
                  <p>Import books, texts, or audio lessons in your target language.</p>
                </Col>
                <Col md={4} className="mb-4">
                  <h4>2. Mark Words</h4>
                  <p>Highlight words you're learning and track your progress.</p>
                </Col>
                <Col md={4} className="mb-4">
                  <h4>3. Review & Learn</h4>
                  <p>See your vocabulary growth over time as you read more.</p>
                </Col>
              </Row>
            </Col>
          </Row>
        </Col>
      </Row>
    </Container>
  );
};

export default Home;