import React, { useState, useEffect } from 'react';
import { Container, Form, Button, Card, Alert, Spinner, Row, Col, Tabs, Tab } from 'react-bootstrap'; // Added Tabs, Tab
import { useNavigate } from 'react-router-dom';
import { createBook, uploadBook, getLanguages } from '../utils/api'; // Added uploadBook

const BookCreate = () => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [content, setContent] = useState('');
  const [languageId, setLanguageId] = useState('');
  const [tags, setTags] = useState(''); // Renamed from tag, expect comma-separated string
  const [file, setFile] = useState(null); // State for uploaded file
  const [activeTab, setActiveTab] = useState('manual'); // State for active tab
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
    
    // Content/File validation depends on the active tab
    if (activeTab === 'manual' && !content.trim()) {
      setError('Please enter book content');
      return;
    }
    if (activeTab === 'upload' && !file) {
       setError('Please select a file to upload');
       return;
    }
    
    if (!languageId) {
      setError('Please select a language');
      return;
    }
    
    setLoading(true);
    setError('');
    
    // Prepare tags array
    const tagsArray = tags.split(',').map(tag => tag.trim()).filter(tag => tag);

    try {
      let newBook;
      if (activeTab === 'manual') {
        newBook = await createBook(
          title,
          description,
          parseInt(languageId, 10),
          content,
          splitMethod,
          parseInt(maxSegmentSize, 10),
          tagsArray // Pass tags array
        );
      } else { // activeTab === 'upload'
        const formData = new FormData();
        formData.append('File', file);
        formData.append('LanguageId', languageId);
        formData.append('SplitMethod', splitMethod);
        formData.append('MaxSegmentSize', maxSegmentSize.toString());
        // Append tags individually if backend expects multiple entries, or join if it expects a single string/array
        tagsArray.forEach(tag => formData.append('Tags', tag));
        // Optional: Add TitleOverride if needed, otherwise backend uses filename
        // formData.append('TitleOverride', title);

        newBook = await uploadBook(formData);
      }

      navigate(`/books/${newBook.bookId}`);
    } catch (err) {
       const errorMsg = err.response?.data?.message || err.message || `Failed to ${activeTab === 'manual' ? 'create' : 'upload'} book. Please try again.`;
       setError(errorMsg);
    } finally {
       setLoading(false);
    } // <-- Add missing closing brace for try/catch/finally
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

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      // Optionally set title from filename if title is empty
      if (!title.trim()) {
         setTitle(e.target.files[0].name.replace(/\.[^/.]+$/, "")); // Remove extension
      }
    } else {
      setFile(null);
    }
  };

  return (
    <Container className="py-5">
      <Card className="shadow-sm">
        <Card.Body className="p-4">
          <h2 className="mb-4">Create New Book</h2>

          {error && <Alert variant="danger">{error}</Alert>}

          {/* Use a single form, handle submit based on active tab */}
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

             {/* Tags Input */}
            <Form.Group className="mb-3" controlId="tags">
              <Form.Label>Tags (Optional)</Form.Label>
              <Form.Control
                type="text"
                placeholder="Enter tags separated by commas"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
              />
              <Form.Text className="text-muted">
                Separate multiple tags with commas (e.g., fiction, sci-fi, classic).
              </Form.Text>
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
                    Choose how to split the book content. Applies to both manual input and file uploads.
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
                    onChange={(e) => setMaxSegmentSize(parseInt(e.target.value, 10) || 500)} // Ensure it's a number
                    required
                  />
                  <Form.Text className="text-muted">
                    Max characters per section (500-50,000). Applies to both methods.
                  </Form.Text>
                </Form.Group>
              </Col>
            </Row>

            {/* Tabs for Manual Input / Upload */}
            <Tabs
              activeKey={activeTab}
              onSelect={(k) => setActiveTab(k)}
              className="mb-3"
              id="book-create-tabs"
            >
              <Tab eventKey="manual" title="Enter Text Manually">
                <Form.Group className="mb-4" controlId="content">
                  <Form.Label>Book Content</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={12}
                    placeholder="Paste or type your book content here"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    required={activeTab === 'manual'} // Required only if this tab is active
                  />
                  <Form.Text className="text-muted">
                    Paste the full text of your book. It will be split based on the method above.
                  </Form.Text>
                </Form.Group>
              </Tab>
              <Tab eventKey="upload" title="Upload File (.txt, .epub)">
                 <Form.Group controlId="formFile" className="mb-3 mt-3">
                    <Form.Label>Select Book File</Form.Label>
                    <Form.Control
                      type="file"
                      accept=".txt,.epub"
                      onChange={handleFileChange}
                      required={activeTab === 'upload'} // Required only if this tab is active
                    />
                     <Form.Text className="text-muted">
                        Upload a .txt or .epub file. Content will be extracted and split.
                     </Form.Text>
                  </Form.Group>
              </Tab>
            </Tabs>

            <div className="d-grid gap-2">
              {/* Submit button outside tabs */}
              <Button variant="primary" type="submit" disabled={loading || languages.length === 0 || (activeTab === 'upload' && !file)}>
                {loading ? (activeTab === 'upload' ? 'Uploading...' : 'Creating...') : `Create Book ${activeTab === 'upload' ? 'from File' : 'from Text'}`}
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