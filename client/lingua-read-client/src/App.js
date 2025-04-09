import React, { useEffect } from 'react';
// Removed redundant Router import
import { Routes, Route, Navigate } from 'react-router-dom';
import { /*Container*/ } from 'react-bootstrap'; // Removed unused Container
import { useAuthStore } from './utils/store';
import { jwtDecode } from 'jwt-decode';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';
import { SettingsProvider } from './contexts/SettingsContext'; // Import SettingsProvider

// Components
import Navigation from './components/Navigation';

// Pages
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import TextList from './pages/TextList';
import TextCreate from './pages/TextCreate';
import TextDisplay from './pages/TextDisplay';
import BookList from './pages/BookList';
import BookCreate from './pages/BookCreate';
import BookDetail from './pages/BookDetail';
import Statistics from './pages/Statistics';
import UserSettings from './pages/UserSettings';
import CreateAudioLesson from './pages/CreateAudioLesson';
import LanguagesPage from './components/settings/LanguagesPage'; // <-- Import the new component
import BatchAudioCreate from './pages/BatchAudioCreate'; // Import the batch create page
import TermsPage from './pages/TermsPage'; // Import the new Terms page
function App() {
  const { token, setToken, clearToken } = useAuthStore();

  // Check if token is valid on app load
  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    if (storedToken) {
      try {
        const decodedToken = jwtDecode(storedToken);
        const currentTime = Date.now() / 1000;
        
        if (decodedToken.exp < currentTime) {
          // Token has expired
          clearToken();
        } else {
          // Token is valid
          setToken(storedToken);
        }
      }
      catch (error) {
        // Invalid token
        clearToken();
      }
    }
  }, [setToken, clearToken]);

  // Check for theme in localStorage and apply on initial load
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'light'; // Default to light if nothing saved

    const applyTheme = (theme) => {
      if (theme === 'dark') {
        document.body.classList.add('dark-theme');
        document.body.classList.remove('light-theme');
      } else if (theme === 'light') {
        document.body.classList.remove('dark-theme');
        document.body.classList.add('light-theme');
      } else { // System theme
        const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        document.body.classList.toggle('dark-theme', prefersDark);
        document.body.classList.toggle('light-theme', !prefersDark);
      }
    };

    applyTheme(savedTheme);

    // Listener for system theme changes if 'system' is selected
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemThemeChange = (e) => {
      if (localStorage.getItem('theme') === 'system') {
        applyTheme('system');
      }
    };

    mediaQuery.addEventListener('change', handleSystemThemeChange);

    // Cleanup listener on component unmount
    return () => {
      mediaQuery.removeEventListener('change', handleSystemThemeChange);
    };
  }, []);

  // Wrap the main content with SettingsProvider
  // Also ensure Router is wrapping the provider and content
  return (
      <SettingsProvider>
        <div className="App">
          <Navigation />
          <div className="container-fluid p-0 m-0">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={!token ? <Login /> : <Navigate to="/books" />} />
              <Route path="/register" element={!token ? <Register /> : <Navigate to="/books" />} />

              {/* Book routes */}
              <Route path="/books" element={token ? <BookList /> : <Navigate to="/login" />} />
              <Route path="/books/create" element={token ? <BookCreate /> : <Navigate to="/login" />} />
              <Route path="/books/:bookId" element={token ? <BookDetail /> : <Navigate to="/login" />} />

              {/* Text routes */}
              <Route path="/texts" element={token ? <TextList /> : <Navigate to="/login" />} />
              <Route path="/texts/create" element={token ? <TextCreate /> : <Navigate to="/login" />} />
              <Route path="/texts/:textId" element={token ? <TextDisplay /> : <Navigate to="/login" />} />
              <Route path="/texts/create-audio" element={token ? <CreateAudioLesson /> : <Navigate to="/login" />} />
              <Route path="/texts/create-batch-audio" element={token ? <BatchAudioCreate /> : <Navigate to="/login" />} /> {/* Add route for batch audio creation */}

              {/* Statistics route */}
              <Route path="/statistics" element={token ? <Statistics /> : <Navigate to="/login" />} />
              <Route path="/terms" element={token ? <TermsPage /> : <Navigate to="/login" />} /> {/* Add route for Terms page */}
              {/* Settings route */}
              <Route path="/settings" element={token ? <UserSettings /> : <Navigate to="/login" />} />
              <Route path="/settings/languages" element={token ? <LanguagesPage /> : <Navigate to="/login" />} /> {/* <-- Add route for Languages page */}
            </Routes>
          </div>
        </div>
      </SettingsProvider>
  );
}

export default App; 