import React, { useState, useEffect, useCallback } from 'react';
import { Container, Row, Col, Button, ListGroup, Card, Spinner, Alert } from 'react-bootstrap';
import LanguageForm from './LanguageForm'; // <-- Import the form component
import { getAllLanguages } from '../../utils/api'; // <-- Import API function
// TODO: Import Zustand store hook if needed

function LanguagesPage() {
    // TODO: Add state for languages list, selected language, loading, errors etc.
    const [languages, setLanguages] = useState([]);
    const [isLoading, setIsLoading] = useState(true); // Start loading initially
    const [error, setError] = useState(null);
    const [selectedLanguage, setSelectedLanguage] = useState(null); // To hold the language being edited/viewed

    // Function to fetch languages
    const fetchLanguages = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const data = await getAllLanguages();
            setLanguages(data || []); // Ensure languages is always an array
        } catch (err) {
            setError(err.message || 'Failed to fetch languages.');
            setLanguages([]); // Clear languages on error
        } finally {
            setIsLoading(false);
        }
    }, []); // No dependencies, fetch once on mount or when called manually

    useEffect(() => {
        fetchLanguages();
        // Example:
        // fetchLanguages();
    }, [fetchLanguages]); // Depend on fetchLanguages callback

    // --- Handlers for LanguageForm ---
    const handleSave = () => {
        console.log("Language saved (placeholder) - Refetching list and clearing selection.");
        setSelectedLanguage(null); // Clear selection after save
        fetchLanguages(); // Refetch the list to show changes
    };

    const handleCancel = () => {
        console.log("Form cancelled.");
        setSelectedLanguage(null); // Clear selection
    };

    const handleDelete = (languageId) => {
        // This function will be passed to LanguageForm, which calls it after confirmation
        console.log(`TODO: Call API to delete language ID: ${languageId}`);
        // Example:
        // try {
        //     await deleteLanguage(languageId);
        //     handleSave(); // Reuse save logic to refetch and clear selection
        // } catch (err) {
        //     setError(err.message || 'Failed to delete language.');
        // }
        handleSave(); // Temporarily just refetch and clear
    };

    // TODO: Implement functions for fetching, adding, updating, deleting languages

    return (
        <Container fluid className="mt-4">
            <Row>
                <Col>
                    <h2>Manage Languages</h2>
                    <p>Configure language settings, dictionaries, parsing rules, and translation availability.</p>
                    {isLoading && <Spinner animation="border" role="status"><span className="visually-hidden">Loading...</span></Spinner>}
                    {error && <Alert variant="danger">{error}</Alert>}
                    <hr />

                    <Row>
                        <Col md={4}>
                            <h4>Available Languages</h4>
                            {!isLoading && !error && (
                                <ListGroup>
                                    {languages.length > 0 ? languages.map(lang => (
                                        <ListGroup.Item
                                            key={lang.languageId}
                                            action
                                            active={selectedLanguage?.languageId === lang.languageId}
                                            onClick={() => setSelectedLanguage(lang)}
                                        >
                                            {lang.name} ({lang.code})
                                        </ListGroup.Item>
                                    )) : (
                                        <ListGroup.Item disabled>No languages found.</ListGroup.Item>
                                    )}
                                </ListGroup>
                            )}
                            <Button variant="primary" className="mt-3" onClick={() => setSelectedLanguage({ /* Create an empty object for 'new' state */ })}>Add New Language</Button>
                        </Col>
                        <Col md={8}>
                            <> {/* Start React Fragment */}
                                <h4>Language Details</h4>
                            {selectedLanguage ?
                                <LanguageForm
                                    key={selectedLanguage.languageId || 'new'} // Add key to force re-render on selection change
                                    language={selectedLanguage}
                                    onSave={handleSave}
                                    onCancel={handleCancel}
                                    onDelete={handleDelete} // Pass the delete handler
                                />
                            :
                                <Card>
                                    <Card.Body>
                                        <Card.Text>
                                            Select a language from the list to edit its details, or click "Add New Language".
                                        </Card.Text>
                                </Card.Body>
                            </Card>}
                            </> {/* End React Fragment */}
                        </Col>
                    </Row>
                </Col>
            </Row>
        </Container>
    );
}

export default LanguagesPage;