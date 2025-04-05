import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Alert, Spinner, ProgressBar, Table, /*Badge,*/ Form, Button } from 'react-bootstrap'; // Removed unused Badge
import { useNavigate } from 'react-router-dom';
import { getUserStatistics, getReadingActivity, getListeningActivity } from '../utils/api';
import { formatDate } from '../utils/helpers';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell, LineChart, Line, ResponsiveContainer
} from 'recharts';

// Custom colors for charts
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

const Statistics = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('all');
  const [initializingLanguages, setInitializingLanguages] = useState(false);
  const [readingActivity, setReadingActivity] = useState(null);
  const [activityPeriod, setActivityPeriod] = useState('all');
  const [loadingActivity, setLoadingActivity] = useState(false);
  const [listeningActivity, setListeningActivity] = useState(null); // State for listening data
  const [loadingListeningActivity, setLoadingListeningActivity] = useState(false); // Loading state for listening data
  const [usingFallbackData, setUsingFallbackData] = useState(false);
  const [networkStatus, setNetworkStatus] = useState('connecting');
  // const navigate = useNavigate(); // Removed unused navigate

  // Check API connectivity
  useEffect(() => {
    const checkConnectivity = async () => {
      try {
        const healthUrl = new URL('/api/health', 'http://localhost:5000').toString();
        const response = await fetch(healthUrl, {
          mode: 'cors',
          headers: { 'Accept': 'application/json' }
        });

        if (response.ok) {
          setNetworkStatus('connected');
          setUsingFallbackData(false);
        } else {
          setNetworkStatus('error');
          setUsingFallbackData(true);
        }
      } catch (error) {
        console.error('Network check failed:', error);
        setNetworkStatus('error');
        setUsingFallbackData(true);
      }
    };

    checkConnectivity();
  }, []);

  // Helper function to safely calculate total words read
  const calculateTotalWordsRead = (statistics) => {
    if (!statistics) {
      console.log('No statistics provided to calculateTotalWordsRead');
      return 0;
    }

    console.log('Calculating total words read from:', statistics);

    // First check if we have TotalWordsRead directly on the statistics object
    if (statistics.TotalWordsRead || statistics.totalWordsRead) {
      const directTotal = statistics.TotalWordsRead || statistics.totalWordsRead;
      console.log(`Using direct TotalWordsRead value: ${directTotal}`);
      return directTotal;
    }

    // Try to get language statistics, handling different case possibilities
    let langStats = [];

    if (Array.isArray(statistics.LanguageStatistics)) {
      langStats = statistics.LanguageStatistics;
      console.log('Using LanguageStatistics array (PascalCase)');
    } else if (Array.isArray(statistics.languageStatistics)) {
      langStats = statistics.languageStatistics;
      console.log('Using languageStatistics array (camelCase)');
    } else {
      console.log('No language statistics array found, trying to convert from object if present');
      // Try to handle if it's an object instead of an array
      if (statistics.LanguageStatistics && typeof statistics.LanguageStatistics === 'object') {
        langStats = Object.values(statistics.LanguageStatistics);
        console.log('Converted LanguageStatistics object to array');
      } else if (statistics.languageStatistics && typeof statistics.languageStatistics === 'object') {
        langStats = Object.values(statistics.languageStatistics);
        console.log('Converted languageStatistics object to array');
      }
    }

    // Log for debugging
    console.log('Language statistics for total words calculation:', langStats);

    // Handle both camelCase and PascalCase property names
    try {
      const total = langStats.reduce((total, lang) => {
        if (!lang) {
          console.log('Found null/undefined language entry in array');
          return total;
        }

        // Check for both camelCase and PascalCase versions of the property
        const wordsRead = lang.TotalWordsRead ||
                        lang.totalWordsRead ||
                        0;

        console.log(`Language ${lang.LanguageName || lang.languageName || 'unknown'}: ${wordsRead} words read`);
        return total + wordsRead;
      }, 0);

      console.log(`Total words read calculated from language stats: ${total}`);
      return total;
    } catch (err) {
      console.error('Error calculating total words read:', err);
      return 0;
    }
  };

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      setError(''); // Reset any existing errors

      try {
        console.log('Starting statistics fetch in Statistics component...');
        const data = await getUserStatistics();

        // Debug output for the raw data
        console.log('Statistics data received in component:', data);

        if (!data) {
          console.error('No data returned from getUserStatistics');
          setError('No statistics data available. The server might be offline or experiencing issues.');
          setStats(null);
          return;
        }

        // Fix case sensitivity issues - ensure we have properties in both formats
        if (data) {
          // Ensure LanguageStatistics exists in both cases
          if (data.languageStatistics && !data.LanguageStatistics) {
            data.LanguageStatistics = data.languageStatistics;
          } else if (data.LanguageStatistics && !data.languageStatistics) {
            data.languageStatistics = data.LanguageStatistics;
          }

          // Ensure we have an array for language statistics
          if (!data.LanguageStatistics) {
            data.LanguageStatistics = [];
          }

          // Ensure TotalWords and KnownWords properties exist
          data.TotalWords = data.TotalWords || data.totalWords || 0;
          data.KnownWords = data.KnownWords || data.knownWords || 0;
          data.LearningWords = data.LearningWords || data.learningWords || 0;
          data.TotalBooks = data.TotalBooks || data.totalBooks || 0;
          data.FinishedBooks = data.FinishedBooks || data.finishedBooks || 0;

          // Debug logging
          console.log('Normalized language statistics:', data.LanguageStatistics);
          console.log('Total languages:', data.TotalLanguages || data.totalLanguages || 0);
          console.log('Total words read calculation:', calculateTotalWordsRead(data));
        }

        setStats(data);
      } catch (err) {
        console.error('Failed to load statistics:', err);
        setError(err.message || 'Failed to load statistics. Please try again later.');
        // Ensure we still show a fallback UI even when error occurs
        setStats({
          TotalWords: 0,
          KnownWords: 0,
          LearningWords: 0,
          TotalBooks: 0,
          FinishedBooks: 0,
          LastActivity: new Date().toISOString(),
          TotalLanguages: 0,
          LanguageStatistics: []
        });
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  useEffect(() => {
    const fetchReadingActivity = async () => {
      setLoadingActivity(true);
      try {
        console.log(`Starting reading activity fetch in Statistics component for period: ${activityPeriod}`);
        const data = await getReadingActivity(activityPeriod);

        // Debug output for the raw data
        console.log('Reading activity data received in component:', data);

        if (!data) {
          console.error('No activity data returned from getReadingActivity');
          setReadingActivity({
            TotalWordsRead: 0,
            ActivityByDate: {},
            ActivityByLanguage: {}
          });
          return;
        }

        // Normalize data if it exists
        if (data) {
          // Ensure ActivityByDate exists
          data.ActivityByDate = data.ActivityByDate || data.activityByDate || {};

          // Ensure ActivityByLanguage exists
          data.ActivityByLanguage = data.ActivityByLanguage || data.activityByLanguage || {};

          // Ensure TotalWordsRead exists
          data.TotalWordsRead = data.TotalWordsRead || data.totalWordsRead || 0;

          console.log('Normalized reading activity data:', data);
        }

        setReadingActivity(data);
      } catch (err) {
        console.error('Failed to load reading activity', err);
        // Provide a fallback data structure
        setReadingActivity({
          TotalWordsRead: 0,
          ActivityByDate: {},
          ActivityByLanguage: {}
        });
      } finally {
        setLoadingActivity(false);
      }
    };

    fetchReadingActivity();
  }, [activityPeriod]);

 // Fetch Listening Activity Data
 useEffect(() => {
   console.log('[Stats Fetch useEffect] Triggered.'); // Log hook trigger
   const fetchListeningActivity = async () => {
     setLoadingListeningActivity(true);
     try {
       console.log(`[Stats Fetch] Starting INITIAL listening activity fetch for period: ${activityPeriod}`);
       const data = await getListeningActivity(activityPeriod);
       console.log('[Stats Fetch] Raw listening activity data received:', data);

       if (!data || data.error) {
         console.error('[Stats Fetch] No listening activity data or error in response:', data?.error);
         setListeningActivity({ // Provide fallback structure
           TotalListeningSeconds: 0,
           ListeningByDate: {},
           ListeningByLanguage: []
         });
       } else {
          // Normalize data to ensure properties exist
          data.TotalListeningSeconds = data.TotalListeningSeconds || data.totalListeningSeconds || 0;
          data.ListeningByDate = data.ListeningByDate || data.listeningByDate || {};
          // Ensure ListeningByLanguage is an array and normalize properties within it
          let langData = data.ListeningByLanguage || data.listeningByLanguage || [];
          if (!Array.isArray(langData)) {
              console.warn("ListeningByLanguage was not an array, attempting conversion or defaulting to empty array.");
              langData = []; // Default to empty if not array
          }
          data.ListeningByLanguage = langData.map(item => ({
              languageId: item.LanguageId || item.languageId,
              languageName: item.LanguageName || item.languageName || 'Unknown',
              totalSeconds: item.TotalSeconds || item.totalSeconds || 0
          }));

          console.log('[Stats Fetch] Normalized listening activity data:', JSON.stringify(data));
          console.log('[Stats Fetch] Setting listening activity state...');
          setListeningActivity(data);
          console.log('[Stats Fetch] Listening activity state SET.');
       }
     } catch (err) {
       console.error('[Stats Fetch] ERROR loading listening activity:', err);
       setListeningActivity({ // Provide fallback structure on error
           TotalListeningSeconds: 0,
           ListeningByDate: {},
           ListeningByLanguage: []
       });
     } finally {
       console.log('[Stats Fetch] Finished INITIAL listening activity fetch.');
       setLoadingListeningActivity(false);
     }
   };

   fetchListeningActivity();
 }, [activityPeriod]); // Initial fetch and fetch on period change

  // Re-fetch data when the page becomes visible again
  useEffect(() => {
    console.log('[Stats Visibility useEffect] Setting up visibility listener.'); // Log hook trigger
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('[Stats Visibility] Page became visible, triggering re-fetch...');
        // Re-trigger the fetch function (ensure it's defined or accessible)
        // We need to wrap the fetch logic in a callable function
        const fetchListeningActivity = async () => {
          console.log('[Stats Visibility Fetch] Starting re-fetch...');
          setLoadingListeningActivity(true);
          try {
            console.log(`[Stats Visibility Fetch] Re-fetching listening activity for period: ${activityPeriod}`);
            const data = await getListeningActivity(activityPeriod);
            console.log('[Stats Visibility Fetch] Raw re-fetched listening activity data received:', data);
            // Normalization logic copied from the other useEffect
            if (!data || data.error) {
              console.error('[Stats Visibility Fetch] Re-fetch: No listening activity data or error in response:', data?.error);
              setListeningActivity({ TotalListeningSeconds: 0, ListeningByDate: {}, ListeningByLanguage: [] });
            } else {
               data.TotalListeningSeconds = data.TotalListeningSeconds || data.totalListeningSeconds || 0;
               data.ListeningByDate = data.ListeningByDate || data.listeningByDate || {};
               let langData = data.ListeningByLanguage || data.listeningByLanguage || [];
               if (!Array.isArray(langData)) langData = [];
               data.ListeningByLanguage = langData.map(item => ({
                   languageId: item.LanguageId || item.languageId,
                   languageName: item.LanguageName || item.languageName || 'Unknown',
                   totalSeconds: item.TotalSeconds || item.totalSeconds || 0
               }));
               console.log('[Stats Visibility Fetch] Re-fetch: Normalized listening activity data:', JSON.stringify(data));
               console.log('[Stats Visibility Fetch] Setting listening activity state...');
               setListeningActivity(data);
               console.log('[Stats Visibility Fetch] Listening activity state SET.');
            }
          } catch (err) {
            console.error('[Stats Visibility Fetch] ERROR loading listening activity on re-fetch:', err);
            setListeningActivity({ TotalListeningSeconds: 0, ListeningByDate: {}, ListeningByLanguage: [] });
          } finally {
            console.log('[Stats Visibility Fetch] Finished re-fetch.');
            setLoadingListeningActivity(false);
          }
        };
        fetchListeningActivity(); // Call the fetch function
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Cleanup listener on component unmount
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [activityPeriod]); // Re-run if activityPeriod changes, to ensure the fetch uses the correct period
 
  // Function to initialize languages if none exist
  const handleInitializeLanguages = async () => {
    try {
      setInitializingLanguages(true);

      // Call the admin endpoint to initialize languages
      const response = await fetch('http://localhost:5000/api/admin/initialize-languages', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to initialize languages');
      }

      // Refresh the page to reload data
      window.location.reload();
    } catch (error) {
      console.error('Error initializing languages:', error);
      setError('Failed to initialize languages. Please try again.');
    } finally {
      setInitializingLanguages(false);
    }
  };

  // Helper function to prepare activity by date data for charts
  const prepareActivityByDateData = () => {
    if (!readingActivity?.ActivityByDate) return [];

    return Object.entries(readingActivity.ActivityByDate)
      .map(([date, count]) => ({
        date,
        wordsRead: count
      }))
      .sort((a, b) => new Date(a.date) - new Date(b.date)); // Sort by date ascending
  };

  // Helper function to prepare activity by language data for charts
  const prepareActivityByLanguageData = () => {
    if (!readingActivity?.ActivityByLanguage) return [];

    return Object.entries(readingActivity.ActivityByLanguage)
      .map(([language, count]) => ({
        language,
        wordsRead: count
      }))
      .sort((a, b) => b.wordsRead - a.wordsRead); // Sort by count descending
  };

  // Helper function to prepare language statistics data for charts
  const prepareLanguageStatsData = () => {
    if (!stats?.LanguageStatistics) return [];

    return stats.LanguageStatistics.map(lang => {
      const langName = lang.LanguageName || lang.languageName;
      const wordCount = lang.WordCount || lang.wordCount || 0;
      const wordsRead = lang.TotalWordsRead || lang.totalWordsRead || 0;

      return {
        name: langName,
        wordCount,
        wordsRead
      };
    }).sort((a, b) => b.wordCount - a.wordCount); // Sort by word count descending
  };

 // Helper function to format duration in seconds to HH:MM:SS or similar
 const formatDuration = (totalSeconds) => {
   if (totalSeconds === 0) return '0m';
   const hours = Math.floor(totalSeconds / 3600);
   const minutes = Math.floor((totalSeconds % 3600) / 60);
   const seconds = totalSeconds % 60;

   let formatted = '';
   if (hours > 0) formatted += `${hours}h `;
   if (minutes > 0 || hours > 0) formatted += `${minutes}m `; // Show minutes if hours exist or minutes > 0
   if (hours === 0 && minutes < 10) formatted += `${seconds}s`; // Only show seconds if duration is short

   return formatted.trim() || '0s'; // Handle case where duration is < 1s
 };

 // Helper function to prepare listening activity by date data for charts
 const prepareListeningActivityByDateData = () => {
   if (!listeningActivity?.ListeningByDate) return [];
   return Object.entries(listeningActivity.ListeningByDate)
     .map(([date, seconds]) => ({
       date,
       minutesListened: Math.round(seconds / 60) // Convert seconds to minutes for chart readability
     }))
     .sort((a, b) => new Date(a.date) - new Date(b.date)); // Sort by date ascending
 };

 // Helper function to prepare listening activity by language data for charts
 const prepareListeningActivityByLanguageData = () => {
   if (!listeningActivity?.ListeningByLanguage || !Array.isArray(listeningActivity.ListeningByLanguage)) return [];
   return listeningActivity.ListeningByLanguage
     .map(lang => ({
       language: lang.languageName || 'Unknown',
       minutesListened: Math.round(lang.totalSeconds / 60) // Convert seconds to minutes
     }))
     .filter(item => item.minutesListened > 0) // Only show languages with listening time
     .sort((a, b) => b.minutesListened - a.minutesListened); // Sort by duration descending
 };


  // Network Status Banner
  const renderNetworkBanner = () => {
    if (networkStatus === 'connected') {
      return null; // Don't show banner when connected
    }

    if (networkStatus === 'error') {
      return (
        <Alert variant="danger" className="mb-4">
          <strong>Error:</strong> Unable to connect to server. Some features may be limited.
        </Alert>
      );
    }

    // Default connecting message
    return (
      <Alert variant="info" className="mb-4">
        <strong>Connecting:</strong> Establishing connection to the server...
      </Alert>
    );
  };

  // Show appropriate loading UI
  if (loading) {
    return (
      <Container className="mt-4">
        {renderNetworkBanner()}
        <div className="text-center">
          <Spinner animation="border" />
          <p>Loading your statistics...</p>
        </div>
      </Container>
    );
  }

  // Show error UI with more context
  if (error) {
    return (
      <Container className="mt-4">
        {renderNetworkBanner()}
        <Alert variant="danger">
          <Alert.Heading>Error Loading Statistics</Alert.Heading>
          <p>{error}</p>
          {usingFallbackData && (
            <p>
              <strong>Note:</strong> Unable to connect to the statistics API.
              Try refreshing the page or checking your network connection.
            </p>
          )}
          <div className="d-flex justify-content-end">
            <Button variant="outline-danger" onClick={() => window.location.reload()}>
              Retry
            </Button>
          </div>
        </Alert>
      </Container>
    );
  }

  if (!stats) {
    return (
      <Container className="mt-4">
        {renderNetworkBanner()}
        <Alert variant="warning">
          <Alert.Heading>No Statistics Available</Alert.Heading>
          <p>We couldn't find any statistics data. This could be because:</p>
          <ul>
            <li>You haven't started reading any books yet</li>
            <li>The connection to the statistics server failed</li>
            <li>The statistics service is temporarily unavailable</li>
          </ul>
          <div className="d-flex justify-content-end">
            <Button variant="outline-warning" onClick={() => window.location.reload()}>
              Retry
            </Button>
          </div>
        </Alert>
      </Container>
    );
  }

  // Safely calculate percentages
  const completionPercentage = stats.TotalWords > 0
    ? Math.round((stats.KnownWords / stats.TotalWords) * 100)
    : 0;

  // Get language statistics safely
  const languageStats = stats?.LanguageStatistics || [];
  const totalLanguages = stats?.TotalLanguages || stats?.totalLanguages || 0;

  // Calculate total words read safely
  const totalWordsRead = calculateTotalWordsRead(stats);

  // Filter language statistics if a specific language is selected
  const filteredLanguageStats = selectedLanguage === 'all'
    ? languageStats
    : languageStats.filter(lang => {
        const langId = lang.LanguageId || lang.languageId;
        return langId && langId.toString() === selectedLanguage;
      });

  // Prepare data for vocabulary chart
  const vocabularyData = [
    { name: 'Known', value: stats.KnownWords },
    { name: 'Learning', value: stats.LearningWords },
    { name: 'Unknown', value: stats.TotalWords - stats.KnownWords - stats.LearningWords }
  ].filter(item => item.value > 0);

  // Prepare data for books chart
  const booksData = [
    { name: 'Finished', value: stats.FinishedBooks },
    { name: 'In Progress', value: stats.TotalBooks - stats.FinishedBooks }
  ].filter(item => item.value > 0);

  // Activity by date data
  const activityByDateData = prepareActivityByDateData();

  // Activity by language data
  const activityByLanguageData = prepareActivityByLanguageData();

  // Language statistics data for chart
  const languageStatsData = prepareLanguageStatsData();

   // Listening activity data
   const listeningByDateData = prepareListeningActivityByDateData();
   const listeningByLanguageData = prepareListeningActivityByLanguageData();
   const totalListeningTimeFormatted = formatDuration(listeningActivity?.TotalListeningSeconds || 0);


  return (
    <Container className="mt-4">
      {renderNetworkBanner()}
      <h1 className="mb-4">Learning Statistics</h1>

      <Row className="mb-4">
        <Col md={8} className="mb-4">
          <Card>
            <Card.Header as="h4">Overall Progress</Card.Header>
            <Card.Body>
              <h5>Vocabulary Knowledge</h5>
              <ProgressBar now={completionPercentage} label={`${completionPercentage}%`} className="mb-3" />

              <Row className="text-center mt-4">
                <Col xs={4}>
                  <div className="border rounded p-3 h-100">
                    <h2 className="mb-0">{stats.TotalWords}</h2>
                    <p className="text-muted">Total Words</p>
                  </div>
                </Col>
                <Col xs={4}>
                  <div className="border rounded p-3 h-100 bg-success bg-opacity-10">
                    <h2 className="mb-0">{stats.KnownWords}</h2>
                    <p className="text-muted">Known Words</p>
                  </div>
                </Col>
                <Col xs={4}>
                  <div className="border rounded p-3 h-100 bg-warning bg-opacity-10">
                    <h2 className="mb-0">{stats.LearningWords}</h2>
                    <p className="text-muted">Learning Words</p>
                  </div>
                </Col>
              </Row>

              {/* Vocabulary Pie Chart */}
              {vocabularyData.length > 0 && (
                <div className="mt-4">
                  <h5>Vocabulary Distribution</h5>
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={vocabularyData}
                        cx="50%"
                        cy="50%"
                        labelLine={true}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {vocabularyData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => value} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>

        <Col md={4} className="mb-4">
          <Card>
            <Card.Header as="h4">Reading Summary</Card.Header>
            <Card.Body>
              <Row className="text-center">
                <Col xs={6} className="mb-3">
                  <div className="border rounded p-3">
                    <h2 className="mb-0">{stats.TotalBooks}</h2>
                    <p className="text-muted">Total Books</p>
                  </div>
                </Col>
                <Col xs={6} className="mb-3">
                  <div className="border rounded p-3">
                    <h2 className="mb-0">{stats.FinishedBooks}</h2>
                    <p className="text-muted">Finished Books</p>
                  </div>
                </Col>
                <Col xs={6}>
                  <div className="border rounded p-3">
                    <h2 className="mb-0">{totalWordsRead}</h2>
                    <p className="text-muted">Words Read</p>
                  </div>
                </Col>
                <Col xs={6}>
                  <div className="border rounded p-3">
                    <h2 className="mb-0">{totalLanguages}</h2>
                    <p className="text-muted">Languages</p>
                  </div>
                </Col>
              </Row>

              {/* Books Pie Chart */}
              {booksData.length > 0 && (
                <div className="mt-4">
                  <h5>Book Status</h5>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={booksData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value }) => `${name}: ${value}`}
                        outerRadius={60}
                        fill="#82ca9d"
                        dataKey="value"
                      >
                        {booksData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index + 2 % COLORS.length]} /> // Offset colors
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => value} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Activity Section */}
      <Row className="mb-4">
        <Col>
          <Card>
            <Card.Header as="h4" className="d-flex justify-content-between align-items-center">
              <span>Activity Overview</span>
              <Form.Select size="sm" style={{ width: 'auto' }} value={activityPeriod} onChange={(e) => setActivityPeriod(e.target.value)}>
                <option value="all">All Time</option>
                <option value="last_180">Last 180 Days</option>
                <option value="last_90">Last 90 Days</option>
                <option value="last_month">Last 30 Days</option>
                <option value="last_week">Last 7 Days</option>
                <option value="last_day">Today</option>
              </Form.Select>
            </Card.Header>
            <Card.Body>
              {loadingActivity ? (
                <div className="text-center"><Spinner animation="border" size="sm" /> Loading activity data...</div>
              ) : readingActivity ? (
                <>
                  <h5 className="text-center mb-3">Total Words Read ({activityPeriod === 'all' ? 'All Time' : `Last ${activityPeriod.split('_')[1]}`}): {readingActivity.TotalWordsRead}</h5>
                  <Row>
                    {/* Reading Activity by Date (Line Chart) */}
                    <Col md={6} className="mb-4">
                      <h6>Words Read per Day</h6>
                      {activityByDateData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={300}>
                          <LineChart data={activityByDateData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                            <YAxis tick={{ fontSize: 12 }} />
                            <Tooltip />
                            <Legend />
                            <Line type="monotone" dataKey="wordsRead" name="Words Read" stroke="#8884d8" activeDot={{ r: 8 }} />
                          </LineChart>
                        </ResponsiveContainer>
                      ) : (<p className="text-muted text-center">No reading activity recorded for this period.</p>)}
                    </Col>

                    {/* Reading Activity by Language (Bar Chart) */}
                    <Col md={6} className="mb-4">
                      <h6>Words Read per Language</h6>
                      {activityByLanguageData.length > 0 ? (
                         <ResponsiveContainer width="100%" height={300}>
                           <BarChart data={activityByLanguageData} layout="vertical" margin={{ top: 5, right: 30, left: 30, bottom: 5 }}>
                             <CartesianGrid strokeDasharray="3 3" />
                             <XAxis type="number" tick={{ fontSize: 12 }} />
                             <YAxis dataKey="language" type="category" width={80} tick={{ fontSize: 12 }} />
                             <Tooltip />
                             <Legend />
                             <Bar dataKey="wordsRead" name="Words Read" fill="#82ca9d">
                               {activityByLanguageData.map((entry, index) => (
                                 <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                               ))}
                             </Bar>
                           </BarChart>
                         </ResponsiveContainer>
                      ) : (<p className="text-muted text-center">No reading activity recorded for this period.</p>)}
                    </Col>
                  </Row>
                </>
              ) : (
                <Alert variant="warning">Could not load reading activity data.</Alert>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Listening Activity Section */}
      <Row className="mb-4">
         <Col>
           <Card>
             <Card.Header as="h4">Listening Activity ({activityPeriod === 'all' ? 'All Time' : `Last ${activityPeriod.split('_')[1]}`})</Card.Header>
             <Card.Body>
               {loadingListeningActivity ? (
                 <div className="text-center"><Spinner animation="border" size="sm" /> Loading listening data...</div>
               ) : listeningActivity ? (
                 <>
                   <h5 className="text-center mb-3">Total Listening Time: {totalListeningTimeFormatted}</h5>
                   <Row>
                     {/* Listening Time by Date (Line Chart) */}
                     <Col md={6} className="mb-4">
                       <h6>Listening Time per Day (Minutes)</h6>
                       {listeningByDateData.length > 0 ? (
                         <ResponsiveContainer width="100%" height={300}>
                           <LineChart data={listeningByDateData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                             <CartesianGrid strokeDasharray="3 3" />
                             <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                             <YAxis tick={{ fontSize: 12 }} />
                             <Tooltip formatter={(value) => `${value} min`} />
                             <Legend />
                             <Line type="monotone" dataKey="minutesListened" name="Minutes Listened" stroke="#8884d8" activeDot={{ r: 8 }} />
                           </LineChart>
                         </ResponsiveContainer>
                       ) : (<p className="text-muted text-center">No listening activity recorded for this period.</p>)}
                     </Col>

                     {/* Listening Time by Language (Bar Chart) */}
                     <Col md={6} className="mb-4">
                       <h6>Listening Time per Language (Minutes)</h6>
                       {listeningByLanguageData.length > 0 ? (
                          <ResponsiveContainer width="100%" height={300}>
                            {/* Removed layout="vertical" and swapped X/Y Axis */}
                            <BarChart data={listeningByLanguageData} margin={{ top: 5, right: 20, left: 0, bottom: 20 }}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="language" tick={{ fontSize: 12 }} angle={-15} textAnchor="end" interval={0} />
                              <YAxis tick={{ fontSize: 12 }} />
                              <Tooltip formatter={(value) => `${value} min`} />
                              <Legend />
                              <Bar dataKey="minutesListened" name="Minutes Listened" fill="#82ca9d">
                                {listeningByLanguageData.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                       ) : (<p className="text-muted text-center">No listening activity recorded for this period.</p>)}
                     </Col>
                   </Row>
                 </>
               ) : (
                 <Alert variant="warning">Could not load listening activity data.</Alert>
               )}
             </Card.Body>
           </Card>
         </Col>
      </Row>

      {/* Language Specific Statistics */}
      <Row className="mb-4">
        <Col>
          <Card>
            <Card.Header as="h4" className="d-flex justify-content-between align-items-center">
              <span>Language Specific Statistics</span>
              {languageStats.length > 0 ? (
                <Form.Select size="sm" style={{ width: 'auto' }} value={selectedLanguage} onChange={(e) => setSelectedLanguage(e.target.value)}>
                  <option value="all">All Languages</option>
                  {languageStats.map(lang => (
                    <option key={lang.LanguageId || lang.languageId} value={lang.LanguageId || lang.languageId}>
                      {lang.LanguageName || lang.languageName}
                    </option>
                  ))}
                </Form.Select>
              ) : (
                <Button variant="primary" size="sm" onClick={handleInitializeLanguages} disabled={initializingLanguages}>
                  {initializingLanguages ? <Spinner animation="border" size="sm" /> : 'Initialize Languages'}
                </Button>
              )}
            </Card.Header>
            <Card.Body>
              {filteredLanguageStats.length > 0 ? (
                <>
                  {/* Language Stats Bar Chart */}
                  <Row className="mb-4">
                    <Col md={6}>
                      <h6>Vocabulary Count per Language</h6>
                       <ResponsiveContainer width="100%" height={300}>
                         <BarChart data={languageStatsData} layout="vertical" margin={{ top: 5, right: 30, left: 30, bottom: 5 }}>
                           <CartesianGrid strokeDasharray="3 3" />
                           <XAxis type="number" tick={{ fontSize: 12 }} />
                           <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 12 }} />
                           <Tooltip />
                           <Legend />
                           <Bar dataKey="wordCount" name="Total Words" fill="#8884d8">
                             {languageStatsData.map((entry, index) => (
                               <Cell key={`cell-vocab-${index}`} fill={COLORS[index % COLORS.length]} />
                             ))}
                           </Bar>
                         </BarChart>
                       </ResponsiveContainer>
                    </Col>
                    <Col md={6}>
                      <h6>Words Read per Language</h6>
                       <ResponsiveContainer width="100%" height={300}>
                         <BarChart data={languageStatsData} layout="vertical" margin={{ top: 5, right: 30, left: 30, bottom: 5 }}>
                           <CartesianGrid strokeDasharray="3 3" />
                           <XAxis type="number" tick={{ fontSize: 12 }} />
                           <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 12 }} />
                           <Tooltip />
                           <Legend />
                           <Bar dataKey="wordsRead" name="Words Read" fill="#82ca9d">
                             {languageStatsData.map((entry, index) => (
                               <Cell key={`cell-read-${index}`} fill={COLORS[index % COLORS.length]} />
                             ))}
                           </Bar>
                         </BarChart>
                       </ResponsiveContainer>
                    </Col>
                  </Row>

                  {/* Language Stats Table */}
                  <Table striped bordered hover responsive size="sm">
                    <thead>
                      <tr>
                        <th>Language</th>
                        <th>Total Words</th>
                        <th>Words Read</th>
                        <th>Books</th>
                        <th>Finished Books</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredLanguageStats.map(lang => (
                        <tr key={lang.LanguageId || lang.languageId}>
                          <td>{lang.LanguageName || lang.languageName}</td>
                          <td>{lang.WordCount || lang.wordCount || 0}</td>
                          <td>{lang.TotalWordsRead || lang.totalWordsRead || 0}</td>
                          <td>{lang.BookCount || lang.bookCount || 0}</td>
                          <td>{lang.FinishedBookCount || lang.finishedBookCount || 0}</td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </>
              ) : (
                <p className="text-muted">No language-specific statistics available{selectedLanguage !== 'all' ? ' for the selected language' : ''}.</p>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

    </Container>
  );
};

export default Statistics;