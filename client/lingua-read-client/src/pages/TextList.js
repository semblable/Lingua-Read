import React, { useEffect, useState, useMemo } from 'react'; // Added useMemo, useState
import { Container, Row, Col, Card, Button, Spinner, Alert, Form, ButtonGroup } from 'react-bootstrap'; // Added Form, ButtonGroup
import { Link } from 'react-router-dom';
import { useTextsStore } from '../utils/store';
import { getTexts } from '../utils/api';

const TextList = () => {
  const { texts, loading, error, setTexts, setLoading, setError } = useTextsStore();
  const [sortKey, setSortKey] = useState('createdAt'); // Default sort by creation date
  const [sortOrder, setSortOrder] = useState('desc'); // Default descending (newest first)

  useEffect(() => {
    const fetchTexts = async () => {
      setLoading(true);
      try {
        const data = await getTexts();
        setTexts(data || []); // Ensure texts is always an array
      } catch (err) {
        setError(err.message || 'Failed to load texts');
        setTexts([]); // Set to empty array on error
      } finally {
        setLoading(false);
      }
    };

    fetchTexts();
  }, [setTexts, setLoading, setError]);

  // Sort texts based on current sortKey and sortOrder
  const sortedTexts = useMemo(() => {
    if (!texts || texts.length === 0) return []; // Return empty array if no texts
    return [...texts].sort((a, b) => {
      let valA = a[sortKey];
      let valB = b[sortKey];

      // Handle date sorting
      if (sortKey === 'createdAt') {
        // Ensure values are valid dates before comparing
        valA = valA ? new Date(valA) : new Date(0); // Fallback for invalid dates
        valB = valB ? new Date(valB) : new Date(0);
      }

      // Handle string sorting (case-insensitive)
      if (typeof valA === 'string') {
        valA = valA.toLowerCase();
      }
      if (typeof valB === 'string') {
        valB = valB.toLowerCase();
      }

      // Comparison logic
      if (valA < valB) {
        return sortOrder === 'asc' ? -1 : 1;
      }
      if (valA > valB) {
        return sortOrder === 'asc' ? 1 : -1;
      }
      return 0; // Values are equal
    });
  }, [texts, sortKey, sortOrder]);

  const handleSort = (key) => {
    if (key === sortKey) {
      // Toggle order if same key is clicked
      setSortOrder(prevOrder => prevOrder === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new key and default to descending for dates, ascending for titles
      setSortKey(key);
      setSortOrder(key === 'createdAt' ? 'desc' : 'asc');
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

  return (
    <Container className="py-5">
      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap">
        <h1>My Texts</h1>
        {/* Sorting Controls */}
        <div className="d-flex align-items-center gap-2">
           <span className="text-muted me-2">Sort by:</span>
           <ButtonGroup size="sm">
             <Button
               variant={sortKey === 'title' ? 'primary' : 'outline-secondary'}
               onClick={() => handleSort('title')}
             >
               Title {sortKey === 'title' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
             </Button>
             <Button
               variant={sortKey === 'createdAt' ? 'primary' : 'outline-secondary'}
               onClick={() => handleSort('createdAt')}
             >
               Date {sortKey === 'createdAt' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
             </Button>
           </ButtonGroup>
        </div>
        <Button as={Link} to="/texts/create" variant="success" className="mt-2 mt-md-0">
          Add New Text
        </Button>
      </div>

      {error && <Alert variant="danger">{error}</Alert>}

      {!loading && sortedTexts.length === 0 ? ( // Check sortedTexts after loading
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
          {sortedTexts.map((text) => ( // Map over sortedTexts
            <Col md={4} key={text.textId} className="mb-4">
              <Card className="h-100 text-card shadow-sm">
                <Card.Body>
                  <Card.Title>{text.title}</Card.Title>
                  <Card.Subtitle className="mb-2 text-muted">
                    {text.languageName}
                  </Card.Subtitle>
                  {/* Removed content preview as it's not available in the DTO */}
                  {/* <Card.Text>
                    {text.content ? text.content.substring(0, 100) + '...' : 'No content preview available'}
                  </Card.Text> */}
                  <div className="mt-3">
                    <small className="text-muted">
                      Created: {text.createdAt ? new Date(text.createdAt).toLocaleDateString() : 'N/A'}
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