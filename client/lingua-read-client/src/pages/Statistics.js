import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Alert, Spinner, ProgressBar, Table, /*Badge,*/ Form, Button } from 'react-bootstrap'; // Removed unused Badge
import { useNavigate } from 'react-router-dom';
import { getUserStatistics, getReadingActivity } from '../utils/api';
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
                  <div className="border rounded p-3 bg-success bg-opacity-10">
                    <h2 className="mb-0">{stats.FinishedBooks}</h2>
                    <p className="text-muted">Finished Books</p>
                  </div>
                </Col>
              </Row>
              
              {/* Total Words Read section - using the safe calculation function */}
              <div className="mt-3 border rounded p-3 bg-info bg-opacity-10">
                <p className="mb-1 text-muted">Total Words Read:</p>
                <h3 className="mb-0">
                  {totalWordsRead}
                </h3>
              </div>
              
              <div className="mt-3">
                <p className="mb-1">Last activity:</p>
                <p className="fw-bold">{formatDate(stats.LastActivity || stats.lastActivity)}</p>
              </div>
              
              <div className="mt-3">
                <p className="mb-1">Languages:</p>
                <p className="fw-bold">{totalLanguages}</p>
              </div>
              
              {/* Books Pie Chart */}
              {booksData.length > 0 && stats.TotalBooks > 0 && (
                <div className="mt-4">
                  <h5>Books Status</h5>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={booksData}
                        cx="50%"
                        cy="50%"
                        labelLine={true}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={70}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {booksData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
      
      <Card>
        <Card.Header as="h4">
          <div className="d-flex justify-content-between align-items-center">
            <span>Language Statistics</span>
            {languageStats && languageStats.length > 0 ? (
              <Form.Select 
                style={{ width: 'auto' }} 
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
              >
                <option value="all">All Languages</option>
                {languageStats.map(lang => {
                  const langId = lang.LanguageId || lang.languageId;
                  const langName = lang.LanguageName || lang.languageName;
                  return langId && langName ? (
                    <option 
                      key={langId} 
                      value={langId.toString()}
                    >
                      {langName}
                    </option>
                  ) : null;
                }).filter(Boolean)}
              </Form.Select>
            ) : (
              <Button 
                variant="primary" 
                size="sm"
                onClick={handleInitializeLanguages}
                disabled={initializingLanguages}
              >
                {initializingLanguages ? 'Initializing...' : 'Initialize Languages'}
              </Button>
            )}
          </div>
        </Card.Header>
        <Card.Body>
          {filteredLanguageStats && filteredLanguageStats.length > 0 ? (
            <>
              <Table responsive striped hover>
                <thead>
                  <tr>
                    <th>Language</th>
                    <th>Word Count</th>
                    <th>Total Words Read</th>
                    <th>Books</th>
                    <th>Completed Books</th>
                    <th>Completion Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLanguageStats.map(lang => {
                    // Get values safely using both camelCase and PascalCase properties
                    const langId = lang.LanguageId || lang.languageId;
                    const langName = lang.LanguageName || lang.languageName;
                    const wordCount = lang.WordCount || lang.wordCount || 0;
                    const wordsRead = lang.TotalWordsRead || lang.totalWordsRead || 0;
                    const bookCount = lang.BookCount || lang.bookCount || 0;
                    const finishedBookCount = lang.FinishedBookCount || lang.finishedBookCount || 0;
                    
                    const bookCompletionRate = bookCount > 0 
                      ? Math.round((finishedBookCount / bookCount) * 100) 
                      : 0;
                    
                    return langId ? (
                      <tr key={langId}>
                        <td>{langName}</td>
                        <td>{wordCount}</td>
                        <td>{wordsRead}</td>
                        <td>{bookCount}</td>
                        <td>{finishedBookCount}</td>
                        <td>
                          <div className="d-flex align-items-center">
                            <ProgressBar 
                              now={bookCompletionRate} 
                              style={{ width: '100px', height: '10px' }} 
                              className="me-2" 
                            />
                            <span>{bookCompletionRate}%</span>
                          </div>
                        </td>
                      </tr>
                    ) : null;
                  })}
                </tbody>
              </Table>
              
              {/* Language Statistics Chart */}
              {languageStatsData.length > 0 && (
                <div className="mt-4">
                  <h5>Language Comparison</h5>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart
                      data={languageStatsData}
                      margin={{ top: 20, right: 30, left: 20, bottom: 70 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" angle={-45} textAnchor="end" height={70} />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="wordCount" name="Total Words" fill="#8884d8" />
                      <Bar dataKey="wordsRead" name="Words Read" fill="#82ca9d" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </>
          ) : (
            <div className="text-center">
              <p>No language statistics available.</p>
              <p>This could be because no languages exist in the database or you haven't logged any reading activity yet.</p>
              {(!languageStats || languageStats.length === 0) && (
                <Button 
                  variant="primary"
                  onClick={handleInitializeLanguages}
                  disabled={initializingLanguages}
                >
                  {initializingLanguages ? 'Initializing...' : 'Initialize Languages'}
                </Button>
              )}
            </div>
          )}
        </Card.Body>
      </Card>
      
      <Card className="mt-4">
        <Card.Header as="h4">
          <div className="d-flex justify-content-between align-items-center">
            <span>Reading Activity Over Time</span>
            <Form.Select 
              style={{ width: 'auto' }} 
              value={activityPeriod}
              onChange={(e) => setActivityPeriod(e.target.value)}
            >
              <option value="all">All Time</option>
              <option value="last_day">Today</option>
              <option value="last_week">Last 7 Days</option>
              <option value="last_month">Last 30 Days</option>
              {/* Removed unsupported options for now
              <option value="3months">Last 3 Months</option>
              <option value="6months">Last 6 Months</option>
              <option value="year">Last Year</option>
              */}
            </Form.Select>
          </div>
        </Card.Header>
        <Card.Body>
          {loadingActivity ? (
            <div className="text-center">
              <Spinner animation="border" size="sm" />
              <p>Loading activity data...</p>
            </div>
          ) : !readingActivity ? (
            <Alert variant="info">No reading activity data available.</Alert>
          ) : (
            <>
              <Row className="mb-4">
                <Col md={12}>
                  <div className="border rounded p-3 bg-light">
                    <h4 className="text-center">Total Words Read: {readingActivity?.TotalWordsRead || 0}</h4>
                  </div>
                </Col>
              </Row>
              
              <Row>
                <Col md={6} className="mb-4">
                  <h5>Activity by Date</h5>
                  {!readingActivity?.ActivityByDate || Object.keys(readingActivity.ActivityByDate).length === 0 ? (
                    <p>No data available for the selected period.</p>
                  ) : (
                    <>
                      {/* Activity by Date Line Chart */}
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart
                          data={activityByDateData}
                          margin={{ top: 5, right: 30, left: 20, bottom: 70 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis 
                            dataKey="date" 
                            angle={-45} 
                            textAnchor="end" 
                            height={70} 
                          />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Line 
                            type="monotone" 
                            dataKey="wordsRead" 
                            name="Words Read" 
                            stroke="#8884d8" 
                            activeDot={{ r: 8 }} 
                          />
                        </LineChart>
                      </ResponsiveContainer>
                      
                      <div className="mt-4">
                        <Table responsive striped hover>
                          <thead>
                            <tr>
                              <th>Date</th>
                              <th>Words Read</th>
                            </tr>
                          </thead>
                          <tbody>
                            {Object.entries(readingActivity.ActivityByDate)
                              .map(([date, count]) => (
                                <tr key={date}>
                                  <td>{date}</td>
                                  <td>{count}</td>
                                </tr>
                              ))}
                          </tbody>
                        </Table>
                      </div>
                    </>
                  )}
                </Col>
                
                <Col md={6}>
                  <h5>Activity by Language</h5>
                  {!readingActivity?.ActivityByLanguage || Object.keys(readingActivity.ActivityByLanguage).length === 0 ? (
                    <p>No data available for the selected period.</p>
                  ) : (
                    <>
                      {/* Activity by Language Bar Chart */}
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart
                          data={activityByLanguageData}
                          margin={{ top: 5, right: 30, left: 20, bottom: 70 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis 
                            dataKey="language" 
                            angle={-45} 
                            textAnchor="end" 
                            height={70} 
                          />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Bar 
                            dataKey="wordsRead" 
                            name="Words Read" 
                            fill="#82ca9d"
                          >
                            {activityByLanguageData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                      
                      <div className="mt-4">
                        <Table responsive striped hover>
                          <thead>
                            <tr>
                              <th>Language</th>
                              <th>Words Read</th>
                            </tr>
                          </thead>
                          <tbody>
                            {Object.entries(readingActivity.ActivityByLanguage)
                              .map(([language, count]) => (
                                <tr key={language}>
                                  <td>{language}</td>
                                  <td>{count}</td>
                                </tr>
                              ))}
                          </tbody>
                        </Table>
                      </div>
                    </>
                  )}
                </Col>
              </Row>
            </>
          )}
        </Card.Body>
      </Card>
    </Container>
  );
};

export default Statistics; 