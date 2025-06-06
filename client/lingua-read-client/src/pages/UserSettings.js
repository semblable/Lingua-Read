import React, { useState, useEffect, useRef, useContext } from 'react'; // Added useRef, useContext
import { Container, Card, Form, Button, Alert, Spinner, Row, Col } from 'react-bootstrap';
import {
    getUserSettings, updateUserSettings, getAllLanguages, // Changed getLanguages to getAllLanguages
    backupDatabase, restoreDatabase, resetUserStatistics // Import new API functions
} from '../utils/api';
import { SettingsContext } from '../contexts/SettingsContext'; // Import SettingsContext
const UserSettings = () => {
  const [settings, setSettings] = useState({
    theme: 'light',
    textSize: 16,
    textFont: 'default',
    leftPanelWidth: 85, // Added initial state
    autoTranslateWords: true,
    highlightKnownWords: true,
    defaultLanguageId: 0,
    autoAdvanceToNextLesson: false,
    showProgressStats: true,
    lineSpacing: 1.5 // Added lineSpacing setting
  });

  const [languages, setLanguages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loadingLanguages, setLoadingLanguages] = useState(true);

  // --- State for Backup/Restore ---
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [backupMessage, setBackupMessage] = useState({ type: '', text: '' });
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreMessage, setRestoreMessage] = useState({ type: '', text: '' });
  const [restoreFile, setRestoreFile] = useState(null);
  const fileInputRef = useRef(null); // Ref for file input
  const [isResettingStats, setIsResettingStats] = useState(false);
  const [resetStatsMessage, setResetStatsMessage] = useState({ type: '', text: '' });
  // --- End Backup/Restore State ---

  // Removed unused isAdmin placeholder

  // Get updateSetting function from context
  const { updateSetting } = useContext(SettingsContext);

  useEffect(() => {
    const fetchSettings = async () => {
       try {
         const data = await getUserSettings();
         setSettings({
           theme: data.theme || 'light',
           textSize: data.textSize || 16,
           textFont: data.textFont || 'default',
           leftPanelWidth: data.leftPanelWidth || 85, // Fetch panel width
           autoTranslateWords: data.autoTranslateWords ?? true,
           highlightKnownWords: data.highlightKnownWords ?? true,
           defaultLanguageId: data.defaultLanguageId || 0,
           autoAdvanceToNextLesson: data.autoAdvanceToNextLesson ?? false,
           showProgressStats: data.showProgressStats ?? true,
           lineSpacing: data.lineSpacing || 1.5 // Fetch lineSpacing
         });
       } catch (err) {
         setError('Failed to load settings. Please try again later.');
       } finally {
         setLoading(false);
       }
    };

    const fetchLanguages = async () => {
       try {
         const data = await getAllLanguages(); // Use getAllLanguages
         setLanguages(data || []); // Ensure it's an array
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

     let processedValue = value;
     if (type === 'checkbox') {
       processedValue = checked;
     } else if (type === 'number' || name === 'defaultLanguageId') { // Treat defaultLanguageId as number
       processedValue = parseInt(value, 10);
       if (isNaN(processedValue)) { // Handle potential NaN if parsing fails (e.g., for "0")
          processedValue = 0; // Default to 0 if parsing fails or value is "0"
       }
     }

     setSettings(prevSettings => ({
       ...prevSettings,
       [name]: processedValue
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
       document.body.classList.remove('light-theme', 'dark-theme', 'classic-dark-theme'); // Clear existing theme classes

       if (settings.theme === 'dark') {
         document.body.classList.add('dark-theme');
       } else if (settings.theme === 'light') {
         document.body.classList.add('light-theme');
       } else if (settings.theme === 'classic-dark') {
         document.body.classList.add('classic-dark-theme');
       } else { // System theme (defaults to light/dark based on system)
         const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
         if (prefersDark) {
           document.body.classList.add('dark-theme'); // Or classic-dark-theme if preferred for system dark
         } else {
           document.body.classList.add('light-theme');
         }
       }
       
       // Update global context after successful API save
       updateSetting('theme', settings.theme);
       localStorage.setItem('theme', settings.theme); // Ensure theme is saved here too

       updateSetting('textSize', settings.textSize);
       localStorage.setItem('textSize', settings.textSize.toString());

       updateSetting('textFont', settings.textFont);
       localStorage.setItem('textFont', settings.textFont);

       updateSetting('leftPanelWidth', settings.leftPanelWidth);
       localStorage.setItem('leftPanelWidth', settings.leftPanelWidth.toString());

       updateSetting('autoTranslateWords', settings.autoTranslateWords);
       localStorage.setItem('autoTranslateWords', settings.autoTranslateWords.toString());

       updateSetting('highlightKnownWords', settings.highlightKnownWords);
       localStorage.setItem('highlightKnownWords', settings.highlightKnownWords.toString());

       updateSetting('defaultLanguageId', settings.defaultLanguageId);
       localStorage.setItem('defaultLanguageId', settings.defaultLanguageId.toString());

       updateSetting('autoAdvanceToNextLesson', settings.autoAdvanceToNextLesson);
       localStorage.setItem('autoAdvanceToNextLesson', settings.autoAdvanceToNextLesson.toString());

       updateSetting('showProgressStats', settings.showProgressStats);
       localStorage.setItem('showProgressStats', settings.showProgressStats.toString());
       
       updateSetting('lineSpacing', settings.lineSpacing); // Update context for lineSpacing
       localStorage.setItem('lineSpacing', settings.lineSpacing.toString()); // Save lineSpacing to localStorage

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

  // --- Backup/Restore Handlers ---
  const handleBackupClick = async () => {
    setIsBackingUp(true);
    setBackupMessage({ type: '', text: '' });
    try {
      const result = await backupDatabase();
      setBackupMessage({ type: 'success', text: result.message || 'Backup download started.' });
      // Clear message after a few seconds
      setTimeout(() => setBackupMessage({ type: '', text: '' }), 5000);
    } catch (err) {
      console.error("Backup failed:", err);
      setBackupMessage({ type: 'danger', text: `Backup failed: ${err.message}` });
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleRestoreFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setRestoreFile(e.target.files[0]);
      setRestoreMessage({ type: '', text: '' }); // Clear previous messages
    } else {
      setRestoreFile(null);
    }
  };

  const handleRestoreClick = async () => {
    if (!restoreFile) {
      setRestoreMessage({ type: 'warning', text: 'Please select a backup file to restore.' });
      return;
    }

    const confirmation = window.confirm(
      "WARNING: Restoring from this backup will completely overwrite the current database.\n\n" +
      "All data added since this backup was created WILL BE LOST.\n\n" +
      "This action is IRREVERSIBLE.\n\n" +
      "Are you absolutely sure you want to proceed?"
    );

    if (!confirmation) {
      setRestoreMessage({ type: 'info', text: 'Restore cancelled.' });
      return;
    }

    setIsRestoring(true);
    setRestoreMessage({ type: '', text: '' });

    try {
      const result = await restoreDatabase(restoreFile);
      setRestoreMessage({ type: 'success', text: result.message || 'Database restored successfully. Please refresh or restart the application.' });
      setRestoreFile(null); // Clear file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''; // Reset file input visually
      }
    } catch (err) {
      console.error("Restore failed:", err);
      setRestoreMessage({ type: 'danger', text: `Restore failed: ${err.message}` });
    } finally {
      setIsRestoring(false);
    }
  };
  // --- End Backup/Restore Handlers ---

  // --- Reset Statistics Handler ---
  const handleResetStatistics = async () => {
    const confirmation = window.confirm(
      "Are you sure you want to reset all your reading and listening statistics?\n\n" +
      "This includes activity history, words read counts, listening time, etc.\n\n" +
      "Your account, books, texts, and learned word statuses will NOT be affected.\n\n" +
      "This action cannot be undone."
    );

    if (!confirmation) {
      setResetStatsMessage({ type: 'info', text: 'Statistics reset cancelled.' });
      return;
    }

    setIsResettingStats(true);
    setResetStatsMessage({ type: '', text: '' });

    try {
      const result = await resetUserStatistics();
      setResetStatsMessage({ type: 'success', text: result.message || 'Statistics reset successfully.' });
      // Optionally clear message after a few seconds
      setTimeout(() => setResetStatsMessage({ type: '', text: '' }), 5000);
    } catch (err) {
      console.error("Reset statistics failed:", err);
      setResetStatsMessage({ type: 'danger', text: `Reset failed: ${err.message}` });
    } finally {
      setIsResettingStats(false);
    }
  };
  // --- End Reset Statistics Handler ---


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
            {/* --- Existing UI Preferences --- */}
            <h4 className="mt-4 mb-3">UI Preferences</h4>
            {/* ... (theme, text size, font) ... */}
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
                     <option value="classic-dark">Classic Dark</option>
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

             {/* Added Left Panel Width Slider */}
             <Form.Group className="mb-4" controlId="leftPanelWidth">
               <Form.Label>Reading Panel Width ({settings.leftPanelWidth}%)</Form.Label>
               <Form.Range
                 name="leftPanelWidth"
                 min={20}
                 max={85} // Increased max width to 85%
                 value={settings.leftPanelWidth}
                 onChange={handleChange}
               />
               <div className="d-flex justify-content-between">
                 <small>Narrow</small>
                 <small>Wide</small>
               </div>
             </Form.Group>

             <Form.Group className="mb-4" controlId="lineSpacing">
               <Form.Label>Line Spacing</Form.Label>
               <Form.Select
                 name="lineSpacing"
                 value={settings.lineSpacing}
                 onChange={handleChange}
               >
                 <option value={1.5}>Default</option>
                 <option value={1.75}>Relaxed</option>
                 <option value={2.0}>Spacious</option>
               </Form.Select>
             </Form.Group>


           {/* --- Existing Reading Preferences --- */}
           <h4 className="mt-4 mb-3">Reading Preferences</h4>
            {/* ... (auto translate, highlight, default language) ... */}
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


            {/* --- Existing Navigation Preferences --- */}
            <h4 className="mt-4 mb-3">Navigation Preferences</h4>
            {/* ... (auto advance, show stats) ... */}
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


            <div className="d-grid gap-2 mb-4"> {/* Added mb-4 */}
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

          {/* --- Data Management Section --- */}
          {/* Removed isAdmin check to make available to all users */}
            <>
              <hr />
              <h4 className="mt-4 mb-3">Data Management</h4> {/* Renamed Header */}
              <p className="text-muted small">Use these options with caution.</p>

              {/* Backup Section */}
              <Card className="mb-3">
                <Card.Body>
                  <Card.Title>Backup</Card.Title>
                  <Card.Text>Download a full backup of the application database.</Card.Text>
                  {backupMessage.text && <Alert variant={backupMessage.type} className="mt-2">{backupMessage.text}</Alert>}
                  <Button
                    variant="secondary"
                    onClick={handleBackupClick}
                    disabled={isBackingUp}
                  >
                    {isBackingUp ? (
                      <>
                        <Spinner animation="border" size="sm" className="me-2" />
                        Backing up...
                      </>
                    ) : 'Download Backup'}
                  </Button>
                </Card.Body>
              </Card>

              {/* Restore Section */}
              <Card>
                <Card.Body>
                  <Card.Title>Restore</Card.Title>
                  <Card.Text className="text-danger fw-bold">
                    WARNING: Restoring from a backup will overwrite ALL current data. This action is irreversible.
                  </Card.Text>
                  <Form.Group controlId="restoreFile" className="mb-3">
                    <Form.Label>Select Backup File (.backup)</Form.Label>
                    <Form.Control
                      type="file"
                      accept=".backup" // Suggest correct file type
                      onChange={handleRestoreFileChange}
                      ref={fileInputRef} // Assign ref
                      disabled={isRestoring}
                    />
                  </Form.Group>
                  {restoreMessage.text && <Alert variant={restoreMessage.type} className="mt-2">{restoreMessage.text}</Alert>}
                  <Button
                    variant="danger"
                    onClick={handleRestoreClick}
                    disabled={isRestoring || !restoreFile}
                  >
                    {isRestoring ? (
                      <>
                        <Spinner animation="border" size="sm" className="me-2" />
                        Restoring...
                      </>
                    ) : 'Restore from Backup'}
                  </Button>
                </Card.Body>
              </Card>

              {/* Reset Statistics Section */}
              <Card className="mt-3">
                <Card.Body>
                  <Card.Title>Reset Statistics</Card.Title>
                  <Card.Text className="text-warning fw-bold">
                    Reset all reading/listening history and aggregate counts (words read, time listened, texts/books completed). Your learned words status, books, and texts themselves will remain. This action is irreversible.
                  </Card.Text>
                  {resetStatsMessage.text && <Alert variant={resetStatsMessage.type} className="mt-2">{resetStatsMessage.text}</Alert>}
                  <Button
                    variant="warning" // Use warning color for caution
                    onClick={handleResetStatistics}
                    disabled={isResettingStats}
                  >
                    {isResettingStats ? (
                      <>
                        <Spinner animation="border" size="sm" className="me-2" />
                        Resetting...
                      </>
                    ) : 'Reset All Statistics'}
                  </Button>
                </Card.Body>
              </Card>
            </>
          {/* --- End Data Management Section --- */} {/* Updated comment */}

        </Card.Body>
      </Card>
    </Container>
  );
};

export default UserSettings;