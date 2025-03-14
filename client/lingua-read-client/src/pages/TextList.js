import React, { useEffect } from 'react';
import { Container, Row, Col, Card, Button, Spinner, Alert } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { useTextsStore } from '../utils/store';
import { getTexts } from '../utils/api';

const TextList = () => {
  const { texts, loading, error, setTexts, setLoading, setError } = useTextsStore();

  useEffect(() => {
    const fetchTexts = async () => {
      setLoading(true);
      try {
        const data = await getTexts();
        setTexts(data);
      } catch (err) {
        setError(err.message || 'Failed to load texts');
      } finally {
        setLoading(false);
      }
    };

    fetchTexts();
  }, [setTexts, setLoading, setError]);

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
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1>My Texts</h1>
        <Button as={Link} to="/texts/create" variant="success">
          Add New Text
        </Button>
      </div>

      {error && <Alert variant="danger">{error}</Alert>}

      {texts.length === 0 ? (
        <Card className="text-center p-5">
          <Card.Body>
            <h3>You don't have any texts yet</h3>
            <p className="mb-4">Add your first text to start learning vocabulary</p>
            <Button as={Link} to="/texts/create" variant="primary">
              Add Your First Text
            </Button>
          </Card.Body>
        </Card>
      ) : (
        <Row>
          {texts.map((text) => (
            <Col md={4} key={text.textId} className="mb-4">
              <Card className="h-100 text-card shadow-sm">
                <Card.Body>
                  <Card.Title>{text.title}</Card.Title>
                  <Card.Subtitle className="mb-2 text-muted">
                    {text.languageName}
                  </Card.Subtitle>
                  <Card.Text>
                    {text.content ? text.content.substring(0, 100) + '...' : 'No content preview available'}
                  </Card.Text>
                  <div className="mt-3">
                    <small className="text-muted">
                      Created: {new Date(text.createdAt).toLocaleDateString()}
                    </small>
                  </div>
                </Card.Body>
                <Card.Footer className="bg-white border-top-0">
                  <Button 
                    as={Link} 
                    to={`/texts/${text.textId}`} 
                    variant="outline-primary" 
                    className="w-100"
                  >
                    Continue Reading
                  </Button>
                </Card.Footer>
              </Card>
            </Col>
          ))}
        </Row>
      )}
    </Container>
  );
};

export default TextList; 