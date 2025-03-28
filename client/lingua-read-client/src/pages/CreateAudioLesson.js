import React from 'react';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getLanguages, createAudioLesson } from '../utils/api'; // Import API functions

function CreateAudioLesson() {
    const [title, setTitle] = useState('');
    const [languageId, setLanguageId] = useState('');
    const [audioFile, setAudioFile] = useState(null);
    const [srtFile, setSrtFile] = useState(null);
    const [languages, setLanguages] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    // const navigate = useNavigate(); // Removed unused navigate

    // Fetch languages on component mount
    useEffect(() => {
        const fetchLanguages = async () => {
            try {
                const fetchedLanguages = await getLanguages();
                setLanguages(fetchedLanguages || []);
                if (fetchedLanguages && fetchedLanguages.length > 0) {
                    setLanguageId(fetchedLanguages[0].languageId); // Default to first language
                }
            } catch (err) {
                setError('Failed to load languages.');
                console.error(err);
            }
        };
        fetchLanguages();
    }, []);

    const handleAudioFileChange = (event) => {
        setAudioFile(event.target.files[0]);
    };

    const handleSrtFileChange = (event) => {
        setSrtFile(event.target.files[0]);
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setError('');
        setSuccessMessage('');

        if (!title || !languageId || !audioFile || !srtFile) {
            setError('Please fill in all fields and select both files.');
            return;
        }

        // Basic file type validation (more robust checks can be added)
        if (!audioFile.type.startsWith('audio/')) {
            setError('Invalid audio file type. Please select an audio file.');
            return;
        }
         if (!srtFile.name.toLowerCase().endsWith('.srt')) {
             setError('Invalid subtitle file type. Please select a .srt file.');
             return;
         }


        setIsLoading(true);

        try {
            const result = await createAudioLesson(title, languageId, audioFile, srtFile);
            setSuccessMessage(`Audio lesson "${result.title}" created successfully!`);
            // Optionally, navigate to the new lesson or library page
            // navigate(`/texts/${result.textId}`); // Example navigation
            setTitle('');
            setLanguageId(languages.length > 0 ? languages[0].languageId : '');
            setAudioFile(null);
            setSrtFile(null);
            // Clear file inputs (requires handling refs or resetting form)
            event.target.reset();

        } catch (err) {
            setError(`Failed to create audio lesson: ${err.message}`);
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="create-audio-lesson-container">
            <h2>Create New Audio Lesson</h2>
            {error && <p className="error-message">{error}</p>}
            {successMessage && <p className="success-message">{successMessage}</p>}
            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <label htmlFor="title">Lesson Title:</label>
                    <input
                        type="text"
                        id="title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        required
                        disabled={isLoading}
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="language">Language:</label>
                    <select
                        id="language"
                        value={languageId}
                        onChange={(e) => setLanguageId(e.target.value)}
                        required
                        disabled={isLoading || languages.length === 0}
                    >
                        {languages.length === 0 && <option>Loading languages...</option>}
                        {languages.map((lang) => (
                            <option key={lang.languageId} value={lang.languageId}>
                                {lang.name}
                            </option>
                        ))}
                    </select>
                </div>
                <div className="form-group">
                    <label htmlFor="audioFile">Audio File:</label>
                    <input
                        type="file"
                        id="audioFile"
                        accept="audio/*"
                        onChange={handleAudioFileChange}
                        required
                        disabled={isLoading}
                    />
                     {audioFile && <span>Selected: {audioFile.name}</span>}
                </div>
                <div className="form-group">
                    <label htmlFor="srtFile">SRT Subtitle File:</label>
                    <input
                        type="file"
                        id="srtFile"
                        accept=".srt"
                        onChange={handleSrtFileChange}
                        required
                        disabled={isLoading}
                    />
                    {srtFile && <span>Selected: {srtFile.name}</span>}
                </div>
                <button type="submit" disabled={isLoading}>
                    {isLoading ? 'Creating...' : 'Create Lesson'}
                </button>
            </form>
            {/* Basic styling (consider moving to a CSS file) */}
            <style jsx>{`
                .create-audio-lesson-container {
                    max-width: 600px;
                    margin: 2rem auto;
                    padding: 2rem;
                    border: 1px solid #ccc;
                    border-radius: 8px;
                }
                .form-group {
                    margin-bottom: 1rem;
                }
                .form-group label {
                    display: block;
                    margin-bottom: 0.5rem;
                }
                .form-group input[type="text"],
                .form-group select,
                .form-group input[type="file"] {
                    width: 100%;
                    padding: 0.5rem;
                    margin-bottom: 0.5rem; /* Add space below input */
                }
                 .form-group span {
                    font-size: 0.9em;
                    color: #555;
                 }
                .error-message {
                    color: red;
                    margin-bottom: 1rem;
                }
                .success-message {
                    color: green;
                    margin-bottom: 1rem;
                }
                button {
                    padding: 0.75rem 1.5rem;
                    cursor: pointer;
                }
                button:disabled {
                    cursor: not-allowed;
                    opacity: 0.6;
                }
            `}</style>
        </div>
    );
}

export default CreateAudioLesson;