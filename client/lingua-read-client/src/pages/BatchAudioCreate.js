import React, { useState, useEffect } from 'react';
import { Container, Form, Button, Card, Alert, Spinner, ListGroup, ProgressBar } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { getLanguages, createAudioLessonsBatch } from '../utils/api'; // Import API functions

const BatchAudioCreate = () => {
    const [languageId, setLanguageId] = useState('');
    const [tag, setTag] = useState('');
    const [files, setFiles] = useState(null); // Holds FileList object
    const [languages, setLanguages] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [loadingLanguages, setLoadingLanguages] = useState(true);
    const [error, setError] = useState('');
    const [uploadProgress, setUploadProgress] = useState(0); // Basic progress state (can be enhanced)
    const [results, setResults] = useState(null); // To store { createdCount, skippedFiles }
    const navigate = useNavigate();

    // Fetch languages on component mount
    useEffect(() => {
        const fetchLanguages = async () => {
            setLoadingLanguages(true);
            try {
                const fetchedLanguages = await getLanguages();
                setLanguages(fetchedLanguages || []);
                if (fetchedLanguages && fetchedLanguages.length > 0) {
                    setLanguageId(fetchedLanguages[0].languageId); // Default to first language
                }
            } catch (err) {
                setError('Failed to load languages.');
                console.error(err);
            } finally {
                setLoadingLanguages(false);
            }
        };
        fetchLanguages();
    }, []);

    const handleFileChange = (event) => {
        setFiles(event.target.files); // Store the FileList
        setResults(null); // Clear previous results when files change
        setError('');
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setError('');
        setResults(null);
        setUploadProgress(0);

        if (!languageId) {
            setError('Please select a language.');
            return;
        }
        if (!files || files.length === 0) {
            setError('Please select files to upload.');
            return;
        }

        // --- Start: Fuzzy Pairing Validation using Normalization (with Debugging) ---
        console.log("[Debug Validation] Starting fuzzy pairing validation..."); // DEBUG LOG
        const fileList = Array.from(files);
        const mp3Files = fileList.filter(f => f.name.toLowerCase().endsWith('.mp3'));
        const srtFiles = fileList.filter(f => f.name.toLowerCase().endsWith('.srt'));
        console.log(`[Debug Validation] Found ${mp3Files.length} MP3s and ${srtFiles.length} SRTs.`); // DEBUG LOG

        // Function to normalize base names: trim trailing . or _, convert to lowercase
        const normalizeBaseName = (name) => {
            if (!name) return '';
            // Remove .mp3 or .srt extension first if present (though usually called on base names)
            let base = name.replace(/\.(mp3|srt)$/i, '');
            // Trim trailing dots and underscores repeatedly
            base = base.replace(/[._]+$/, '');
            return base.toLowerCase();
        };

        // Function to extract base name and lang from SRT: expects 'base_xx.srt' or 'base__xx.srt'
        const extractSrtInfo = (srtFileName) => {
             // Try matching double underscore first, then single
             let match = srtFileName.match(/^(.*?)__([a-z]{2})\.srt$/i);
             if (match) {
                 // Matched double underscore pattern
                 return { baseName: match[1], lang: match[2].toLowerCase(), originalFullName: srtFileName };
             }

             // Try matching single underscore pattern
             match = srtFileName.match(/^(.*?)_([a-z]{2})\.srt$/i);
             if (match) {
                 // Matched single underscore pattern
                 return { baseName: match[1], lang: match[2].toLowerCase(), originalFullName: srtFileName };
             }

             // If neither pattern matched, it's an invalid format
             return { error: 'Invalid Format (must end with _xx.srt or __xx.srt)', originalFullName: srtFileName };
        };

        const mp3sByNormalizedBase = new Map();
        const srtsByNormalizedBase = new Map();
        const problematicFiles = new Map(); // Store problems: fileName -> Set<reason>

        const addProblem = (fileName, reason) => {
            if (!problematicFiles.has(fileName)) problematicFiles.set(fileName, new Set());
            problematicFiles.get(fileName).add(reason);
        };

        // 1. Process and Normalize MP3s
        console.log("[Debug Validation] --- Processing MP3s ---"); // DEBUG LOG
        mp3Files.forEach(mp3File => {
            const rawBaseName = mp3File.name.substring(0, mp3File.name.lastIndexOf('.mp3'));
            const normalized = normalizeBaseName(rawBaseName);
            console.log(`[Debug MP3] File: ${mp3File.name}, Raw Base: "${rawBaseName}", Normalized: "${normalized}"`); // DEBUG LOG
            if (!mp3sByNormalizedBase.has(normalized)) mp3sByNormalizedBase.set(normalized, []);
            mp3sByNormalizedBase.get(normalized).push(mp3File);
        });

        // 2. Process, Validate Format, and Normalize SRTs
        console.log("[Debug Validation] --- Processing SRTs ---"); // DEBUG LOG
        srtFiles.forEach(srtFile => {
            const info = extractSrtInfo(srtFile.name);
            if (info.error) {
                console.log(`[Debug SRT] File: ${srtFile.name}, Format Error: ${info.error}`); // DEBUG LOG
                addProblem(srtFile.name, info.error);
            } else {
                const normalized = normalizeBaseName(info.baseName);
                console.log(`[Debug SRT] File: ${srtFile.name}, Raw Base: "${info.baseName}", Normalized: "${normalized}", Lang: ${info.lang}`); // DEBUG LOG
                if (!srtsByNormalizedBase.has(normalized)) srtsByNormalizedBase.set(normalized, []);
                // Store the original file along with extracted info
                 srtsByNormalizedBase.get(normalized).push({ ...info, file: srtFile });
            }
        });

        // 3. Attempt Pairing and Identify Issues
        console.log("[Debug Validation] --- Attempting Pairing ---"); // DEBUG LOG
        const pairedMp3s = new Set();
        const pairedSrts = new Set();
        const ambiguousMatches = new Set(); // Store normalized names with >1 MP3 or >1 SRT

        mp3sByNormalizedBase.forEach((mp3List, normalizedName) => {
            const matchingSrtList = srtsByNormalizedBase.get(normalizedName);
            console.log(`[Debug Pair Check] Normalized Name: "${normalizedName}", MP3s: ${mp3List.length}, SRTs: ${matchingSrtList ? matchingSrtList.length : 0}`); // DEBUG LOG

            // Check for ambiguity first
            let isAmbiguous = false;
            if (mp3List.length > 1) {
                 console.log(`[Debug Ambiguity] Normalized Name: "${normalizedName}" has ${mp3List.length} MP3s: ${mp3List.map(f=>f.name).join(', ')}`); // DEBUG LOG
                 ambiguousMatches.add(normalizedName);
                 mp3List.forEach(f => addProblem(f.name, `Ambiguous Match (multiple MP3s normalize to '${normalizedName}')`));
                 isAmbiguous = true;
            }
             if (matchingSrtList && matchingSrtList.length > 1) {
                 console.log(`[Debug Ambiguity] Normalized Name: "${normalizedName}" has ${matchingSrtList.length} SRTs: ${matchingSrtList.map(s=>s.originalFullName).join(', ')}`); // DEBUG LOG
                 ambiguousMatches.add(normalizedName);
                 matchingSrtList.forEach(s => addProblem(s.originalFullName, `Ambiguous Match (multiple SRTs normalize to '${normalizedName}')`));
                 isAmbiguous = true;
             }

            // Attempt pairing only if not ambiguous
            if (!isAmbiguous) {
                 if (mp3List.length === 1 && matchingSrtList && matchingSrtList.length === 1) {
                     // Perfect 1-to-1 match based on normalized name
                     console.log(`[Debug Pair Success] Normalized: "${normalizedName}", MP3: ${mp3List[0].name}, SRT: ${matchingSrtList[0].originalFullName}`); // DEBUG LOG
                     pairedMp3s.add(mp3List[0].name);
                     pairedSrts.add(matchingSrtList[0].originalFullName);
                 } else if (mp3List.length === 1 && !matchingSrtList) {
                     // MP3 exists, but no SRT normalizes to the same name (and MP3 wasn't ambiguous)
                     console.log(`[Debug Pair Fail] MP3 ${mp3List[0].name} (Normalized: "${normalizedName}") found no matching SRT.`); // DEBUG LOG
                     addProblem(mp3List[0].name, 'Missing Matching SRT');
                 }
                 // Note: The case where SRT exists but MP3 doesn't is handled in step 4
            }
        });

         // 4. Identify Unpaired SRTs (that weren't ambiguous or invalid format)
         console.log("[Debug Validation] --- Checking Unpaired SRTs ---"); // DEBUG LOG
         srtsByNormalizedBase.forEach((srtList, normalizedName) => {
             srtList.forEach(srtInfo => {
                 // Check if this SRT was successfully paired OR if it was already flagged (e.g., ambiguous, invalid format)
                 if (!pairedSrts.has(srtInfo.originalFullName) && !problematicFiles.has(srtInfo.originalFullName)) {
                      console.log(`[Debug Unpaired SRT Check] SRT: ${srtInfo.originalFullName} (Normalized: "${normalizedName}") was not paired and not previously flagged.`); // DEBUG LOG
                      // Determine the reason it wasn't paired
                      if (!mp3sByNormalizedBase.has(normalizedName)) {
                           // No MP3 existed with the same normalized name
                           console.log(`[Debug Unpaired SRT] Reason: No MP3 found with normalized name "${normalizedName}".`); // DEBUG LOG
                           addProblem(srtInfo.originalFullName, 'Missing Matching MP3');
                      } else if (ambiguousMatches.has(normalizedName)) {
                           // An MP3 existed, but it was part of an ambiguous match
                           console.log(`[Debug Unpaired SRT] Reason: Corresponding MP3(s) for normalized name "${normalizedName}" were ambiguous.`); // DEBUG LOG
                           addProblem(srtInfo.originalFullName, 'Unpaired (Related MP3 was ambiguous)');
                      } else {
                           // Should not happen if logic is correct: MP3 exists, is unique, SRT exists, is unique, but not paired?
                           console.warn(`[Debug Unpaired SRT] Unclear Reason: SRT ${srtInfo.originalFullName} not paired with MP3s for "${normalizedName}". MP3 list:`, mp3sByNormalizedBase.get(normalizedName)); // DEBUG LOG
                           addProblem(srtInfo.originalFullName, 'Unpaired (Reason unclear)');
                      }
                 }
             });
         });


        if (problematicFiles.size > 0) {
            console.log("[Debug Validation] Found problems:", problematicFiles); // DEBUG LOG
            const errorMessages = [];
            problematicFiles.forEach((reasons, fileName) => {
                errorMessages.push(`${fileName} (${Array.from(reasons).join(', ')})`);
            });
            errorMessages.sort();
            setError(`File validation errors: ${errorMessages.join('; ')}`);
            return;
        }

         // Optional: Add a check if the number of pairs doesn't match the expected count
         if (pairedMp3s.size !== mp3Files.length || pairedSrts.size !== srtFiles.length) {
              console.warn("[Debug Validation] Potential pairing issue: Final paired counts don't match initial file counts.", { pairedMp3s: pairedMp3s.size, pairedSrts: pairedSrts.size, mp3Files: mp3Files.length, srtFiles: srtFiles.length }); // DEBUG LOG
              // Decide if this should be a hard error or just a warning
              // setError("Could not reliably pair all files. Please check names.");
              // return;
         }
         console.log("[Debug Validation] Validation successful."); // DEBUG LOG

        // --- End: Fuzzy Pairing Validation using Normalization (with Debugging) ---


        setIsLoading(true);

        try {
            // TODO: Implement more granular progress tracking if backend supports it
            // For now, just show indeterminate progress or simple steps
            setUploadProgress(50); // Simulate progress

            // Pass the original FileList object, the backend should handle the pairing now
            const resultData = await createAudioLessonsBatch(languageId, tag || null, files);

            setUploadProgress(100);
            setResults(resultData); // Store results { createdCount, skippedFiles }
            setFiles(null); // Clear file input
            setTag(''); // Clear tag input
             // Reset file input visually (requires direct DOM manipulation or key change)
            event.target.reset();


        } catch (err) {
            setError(`Batch upload failed: ${err.message}`);
            console.error(err);
            setUploadProgress(0); // Reset progress on error
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Container className="py-5">
            <Card className="shadow-sm">
                <Card.Body className="p-4">
                    <h2 className="mb-4">Batch Create Audio Lessons</h2>
                    <p>Upload paired audio (.mp3) and subtitle (.srt) files. Files must follow the naming convention:</p>
                    <ul>
                        <li>Audio: <code>Lesson Name_.mp3</code></li>
                        <li>Subtitle: <code>Lesson Name__fr.srt</code> (or other language code)</li>
                    </ul>
                    <p>The part before the final <code>_</code> or <code>__</code> must match exactly for files to be paired.</p>

                    {loadingLanguages && <Spinner animation="border" size="sm" />}
                    {error && <Alert variant="danger">{error}</Alert>}

                    <Form onSubmit={handleSubmit}>
                        <Form.Group className="mb-3" controlId="language">
                            <Form.Label>Language (for all lessons in batch)</Form.Label>
                            <Form.Select
                                value={languageId}
                                onChange={(e) => setLanguageId(e.target.value)}
                                required
                                disabled={isLoading || loadingLanguages || languages.length === 0}
                            >
                                {languages.length === 0 && !loadingLanguages && <option value="">No languages available</option>}
                                {languages.map((lang) => (
                                    <option key={lang.languageId} value={lang.languageId}>
                                        {lang.name}
                                    </option>
                                ))}
                            </Form.Select>
                        </Form.Group>

                        <Form.Group className="mb-3" controlId="tag">
                            <Form.Label>Tag (Optional, for all lessons in batch)</Form.Label>
                            <Form.Control
                                type="text"
                                placeholder="Enter a tag (e.g., news, podcast)"
                                value={tag}
                                onChange={(e) => setTag(e.target.value)}
                                maxLength="100"
                                disabled={isLoading}
                            />
                        </Form.Group>

                        <Form.Group controlId="formFileMultiple" className="mb-3">
                            <Form.Label>Select Paired Audio (.mp3) and Subtitle (.srt) Files</Form.Label>
                            <Form.Control
                                type="file"
                                multiple
                                accept=".mp3,.srt"
                                onChange={handleFileChange}
                                required
                                disabled={isLoading}
                            />
                             {files && <div className="mt-2 text-muted">{files.length} file(s) selected</div>}
                        </Form.Group>

                        {isLoading && (
                             <ProgressBar animated now={uploadProgress} label={`${uploadProgress}%`} className="mb-3" />
                        )}

                        <div className="d-grid">
                            <Button variant="primary" type="submit" disabled={isLoading || loadingLanguages || !files || files.length === 0}>
                                {isLoading ? <Spinner animation="border" size="sm" /> : null} {isLoading ? 'Uploading & Processing...' : 'Create Batch Lessons'}
                            </Button>
                        </div>
                    </Form>

                    {results && (
                        <Alert variant={results.createdCount > 0 ? "success" : "warning"} className="mt-4">
                            <Alert.Heading>Batch Process Complete</Alert.Heading>
                            <p>Successfully created <strong>{results.createdCount}</strong> audio lessons.</p>
                            {results.skippedFiles && results.skippedFiles.length > 0 && (
                                <>
                                    <hr />
                                    <p className="mb-1"><strong>Skipped Files ({results.skippedFiles.length}):</strong></p>
                                    <ListGroup variant="flush">
                                        {results.skippedFiles.map((skipped, index) => (
                                            <ListGroup.Item key={index} className="py-1 px-0 border-0">
                                                <small>{skipped}</small>
                                            </ListGroup.Item>
                                        ))}
                                    </ListGroup>
                                </>
                            )}
                             <div className="d-flex justify-content-end mt-3">
                                <Button onClick={() => navigate('/texts')} variant="outline-secondary" size="sm">Go to My Texts</Button>
                             </div>
                        </Alert>
                    )}
                </Card.Body>
            </Card>
        </Container>
    );
};

export default BatchAudioCreate;