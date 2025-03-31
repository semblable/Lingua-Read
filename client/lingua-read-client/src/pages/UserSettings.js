import React, { useState, useEffect } from 'react';
import { Container, Card, Form, Button, Alert, Spinner, Row, Col } from 'react-bootstrap';
import { getUserSettings, updateUserSettings, getLanguages } from '../utils/api';

const UserSettings = () => {
  const [settings, setSettings] = useState({
    theme: 'light',
    textSize: 16,
    textFont: 'default',
    autoTranslateWords: true,
    highlightKnownWords: true,
    defaultLanguageId: 0,
    autoAdvanceToNextLesson: false,
    showProgressStats: true
  });
  
  const [languages, setLanguages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loadingLanguages, setLoadingLanguages] = useState(true);
  
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const data = await getUserSettings();
        setSettings({
          theme: data.theme || 'light',
          textSize: data.textSize || 16,
          textFont: data.textFont || 'default',
          autoTranslateWords: data.autoTranslateWords ?? true,
          highlightKnownWords: data.highlightKnownWords ?? true,
          defaultLanguageId: data.defaultLanguageId || 0,
          autoAdvanceToNextLesson: data.autoAdvanceToNextLesson ?? false,
          showProgressStats: data.showProgressStats ?? true
        });
      } catch (err) {
        setError('Failed to load settings. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    const fetchLanguages = async () => {
      try {
        const data = await getLanguages();
        setLanguages(data);
      } catch (err) {
        console.error('Failed to load languages:', err);
      } finally {
        setLoadingLanguages(false);
      }
    };
    
    fetchSettings();
    fetchLanguages();
  }, []);
  
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    setSettings(prevSettings => ({
      ...prevSettings,
      [name]: type === 'checkbox' ? checked : (type === 'number' ? parseInt(value, 10) : value)
    }));
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess(false);
    
    try {
      await updateUserSettings(settings);

      // Apply theme change immediately and save to localStorage
      localStorage.setItem('theme', settings.theme);
      if (settings.theme === 'dark') {
        document.body.classList.add('dark-theme');
        document.body.classList.remove('light-theme'); // Ensure light theme is removed
      } else if (settings.theme === 'light') {
        document.body.classList.remove('dark-theme');
        document.body.classList.add('light-theme'); // Ensure light theme is added/kept
      } else { // System theme
        const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        document.body.classList.toggle('dark-theme', prefersDark);
        document.body.classList.toggle('light-theme', !prefersDark);
      }
      setSuccess(true);
      
      // Hide success message after 3 seconds
      setTimeout(() => {
        setSuccess(false);
      }, 3000);
    } catch (err) {
      setError(err.message || 'Failed to update settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };
  
  if (loading) {
    return (
      <Container className="py-5 text-center">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading settings...</span>
        </Spinner>
      </Container>
    );
  }
  
  return (
    <Container className="py-5">
      <Card className="shadow-sm">
        <Card.Body className="p-4">
          <h2 className="mb-4">User Settings</h2>
          
          {error && <Alert variant="danger">{error}</Alert>}
          {success && <Alert variant="success">Settings updated successfully!</Alert>}
          
          <Form onSubmit={handleSubmit}>
            <h4 className="mt-4 mb-3">UI Preferences</h4>
            
            <Row className="mb-3">
              <Col md={6}>
                <Form.Group controlId="theme">
                  <Form.Label>Theme</Form.Label>
                  <Form.Select 
                    name="theme"
                    value={settings.theme}
                    onChange={handleChange}
                  >
                    <option value="light">Light</option>
                    <option value="dark">Dark</option>
                    <option value="system">System Default</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              
              <Col md={6}>
                <Form.Group controlId="textSize">
                  <Form.Label>Text Size ({settings.textSize}px)</Form.Label>
                  <Form.Range
                    name="textSize"
                    min={10}
                    max={36}
                    value={settings.textSize}
                    onChange={handleChange}
                  />
                  <div className="d-flex justify-content-between">
                    <small>Small</small>
                    <small>Large</small>
                  </div>
                </Form.Group>
              </Col>
            </Row>
            
            <Form.Group className="mb-4" controlId="textFont">
              <Form.Label>Font Family</Form.Label>
              <Form.Select 
                name="textFont"
                value={settings.textFont}
                onChange={handleChange}
              >
                <option value="default">Default</option>
                <option value="serif">Serif</option>
                <option value="sans-serif">Sans Serif</option>
                <option value="monospace">Monospace</option>
                <option value="dyslexic">OpenDyslexic</option>
              </Form.Select>
            </Form.Group>
            
            <h4 className="mt-4 mb-3">Reading Preferences</h4>
            
            <Form.Group className="mb-3" controlId="autoTranslateWords">
              <Form.Check 
                type="checkbox"
                name="autoTranslateWords"
                label="Automatically translate words when clicked"
                checked={settings.autoTranslateWords}
                onChange={handleChange}
              />
            </Form.Group>
            
            <Form.Group className="mb-3" controlId="highlightKnownWords">
              <Form.Check 
                type="checkbox"
                name="highlightKnownWords"
                label="Highlight words based on knowledge level"
                checked={settings.highlightKnownWords}
                onChange={handleChange}
              />
            </Form.Group>
            
            <Form.Group className="mb-4" controlId="defaultLanguageId">
              <Form.Label>Default Language for New Texts</Form.Label>
              <Form.Select 
                name="defaultLanguageId"
                value={settings.defaultLanguageId}
                onChange={handleChange}
                disabled={loadingLanguages}
              >
                <option value={0}>No default (ask each time)</option>
                {languages.map(language => (
                  <option key={language.languageId} value={language.languageId}>
                    {language.name}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
            
            <h4 className="mt-4 mb-3">Navigation Preferences</h4>
            
            <Form.Group className="mb-3" controlId="autoAdvanceToNextLesson">
              <Form.Check 
                type="checkbox"
                name="autoAdvanceToNextLesson"
                label="Automatically advance to next lesson after completion"
                checked={settings.autoAdvanceToNextLesson}
                onChange={handleChange}
              />
            </Form.Group>
            
            <Form.Group className="mb-4" controlId="showProgressStats">
              <Form.Check 
                type="checkbox"
                name="showProgressStats"
                label="Show progress statistics after completing a lesson"
                checked={settings.showProgressStats}
                onChange={handleChange}
              />
            </Form.Group>
            
            <div className="d-grid gap-2">
              <Button 
                variant="primary" 
                type="submit" 
                disabled={saving}
              >
                {saving ? (
                  <>
                    <Spinner animation="border" size="sm" className="me-2" />
                    Saving...
                  </>
                ) : 'Save Settings'}
              </Button>
            </div>
          </Form>
        </Card.Body>
      </Card>
    </Container>
  );
};

export default UserSettings; 