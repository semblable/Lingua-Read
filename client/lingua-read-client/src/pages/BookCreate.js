import React, { useState, useEffect } from 'react';
import { Container, Form, Button, Card, Alert, Spinner, Row, Col } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { createBook, getLanguages } from '../utils/api';

const BookCreate = () => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [content, setContent] = useState('');
  const [languageId, setLanguageId] = useState('');
  const [splitMethod, setSplitMethod] = useState('paragraph');
  const [maxSegmentSize, setMaxSegmentSize] = useState(3000);
  const [languages, setLanguages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [loadingLanguages, setLoadingLanguages] = useState(true);
  
  const navigate = useNavigate();

  useEffect(() => {
    const fetchLanguages = async () => {
      try {
        const data = await getLanguages();
        setLanguages(data);
        if (data.length > 0) {
          setLanguageId(data[0].languageId.toString());
        }
      } catch (err) {
        setError('Failed to load languages. Please try again later.');
      } finally {
        setLoadingLanguages(false);
      }
    };

    fetchLanguages();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!title.trim()) {
      setError('Please enter a title');
      return;
    }
    
    if (!content.trim()) {
      setError('Please enter some content');
      return;
    }
    
    if (!languageId) {
      setError('Please select a language');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      const newBook = await createBook(
        title, 
        description, 
        parseInt(languageId, 10), 
        content,
        splitMethod,
        parseInt(maxSegmentSize, 10)
      );
      navigate(`/books/${newBook.bookId}`);
    } catch (err) {
      setError(err.message || 'Failed to create book. Please try again.');
      setLoading(false);
    }
  };

  if (loadingLanguages) {
    return (
      <Container className="py-5 text-center">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading languages...</span>
        </Spinner>
      </Container>
    );
  }

  return (
    <Container className="py-5">
      <Card className="shadow-sm">
        <Card.Body className="p-4">
          <h2 className="mb-4">Create New Book</h2>
          
          {error && <Alert variant="danger">{error}</Alert>}
          
          <Form onSubmit={handleSubmit}>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3" controlId="title">
                  <Form.Label>Book Title</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="Enter a title for your book"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                  />
                </Form.Group>
              </Col>
              
              <Col md={6}>
                <Form.Group className="mb-3" controlId="language">
                  <Form.Label>Language</Form.Label>
                  <Form.Select
                    value={languageId}
                    onChange={(e) => setLanguageId(e.target.value)}
                    required
                  >
                    {languages.length === 0 ? (
                      <option value="">No languages available</option>
                    ) : (
                      languages.map((language) => (
                        <option key={language.languageId} value={language.languageId.toString()}>
                          {language.name}
                        </option>
                      ))
                    )}
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-3" controlId="description">
              <Form.Label>Description (Optional)</Form.Label>
              <Form.Control
                as="textarea"
                rows={2}
                placeholder="Brief description of the book"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </Form.Group>

            <Row className="mb-3">
              <Col md={6}>
                <Form.Group controlId="splitMethod">
                  <Form.Label>Split Method</Form.Label>
                  <Form.Select
                    value={splitMethod}
                    onChange={(e) => setSplitMethod(e.target.value)}
                    required
                  >
                    <option value="paragraph">By Paragraphs</option>
                    <option value="sentence">By Sentences</option>
                    <option value="length">By Character Length</option>
                  </Form.Select>
                  <Form.Text className="text-muted">
                    Choose how to split the book into smaller sections.
                  </Form.Text>
                </Form.Group>
              </Col>
              
              <Col md={6}>
                <Form.Group controlId="maxSegmentSize">
                  <Form.Label>Maximum Size Per Section</Form.Label>
                  <Form.Control
                    type="number"
                    min="500"
                    max="50000"
                    value={maxSegmentSize}
                    onChange={(e) => setMaxSegmentSize(e.target.value)}
                    required
                  />
                  <Form.Text className="text-muted">
                    Maximum characters per section (500-50,000)
                  </Form.Text>
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-4" controlId="content">
              <Form.Label>Book Content</Form.Label>
              <Form.Control
                as="textarea"
                rows={12}
                placeholder="Paste or type your book content here"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                required
              />
              <Form.Text className="text-muted">
                Paste the full text of your book or story. It will be automatically split into smaller, 
                manageable sections for easier reading and vocabulary learning.
              </Form.Text>
            </Form.Group>

            <div className="d-grid gap-2">
              <Button variant="primary" type="submit" disabled={loading || languages.length === 0}>
                {loading ? 'Creating...' : 'Create Book with Auto-Split Sections'}
              </Button>
              <Button 
                variant="outline-secondary" 
                onClick={() => navigate('/books')}
                disabled={loading}
              >
                Cancel
              </Button>
            </div>
          </Form>
        </Card.Body>
      </Card>
    </Container>
  );
};

export default BookCreate; 