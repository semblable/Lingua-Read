import React, { useEffect, useState } from 'react'; // Added useState
import { Routes, Route, Navigate, Outlet } from 'react-router-dom'; // Added Outlet
import { useAuthStore } from './utils/store';
import { jwtDecode } from 'jwt-decode';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';
import { SettingsProvider } from './contexts/SettingsContext';
import { login } from './utils/api'; // Import the login API function

// Components
import Navigation from './components/Navigation';

// Pages
import Home from './pages/Home';
// import Login from './pages/Login'; // Removed
// import Register from './pages/Register'; // Removed
import TextList from './pages/TextList';
import TextCreate from './pages/TextCreate';
import TextDisplay from './pages/TextDisplay';
import BookList from './pages/BookList';
import BookCreate from './pages/BookCreate';
import BookDetail from './pages/BookDetail';
import Statistics from './pages/Statistics';
import UserSettings from './pages/UserSettings';
import CreateAudioLesson from './pages/CreateAudioLesson';
import LanguagesPage from './components/settings/LanguagesPage';
import BatchAudioCreate from './pages/BatchAudioCreate';
import TermsPage from './pages/TermsPage';

// Simple loading component
const Loading = () => <div className="d-flex justify-content-center align-items-center vh-100">Loading...</div>;

// Protected Route Component
const ProtectedRoute = ({ token, isLoading }) => {
  if (isLoading) {
    return <Loading />; // Show loading indicator while checking auth
  }
  return token ? <Outlet /> : <Navigate to="/" />; // Redirect to home if not authenticated after check
};


function App() {
  const { token, setToken, clearToken } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true); // Add loading state

  // Check token and perform auto-login on app load
  useEffect(() => {
    const attemptAutoLogin = async () => {
      setIsLoading(true); // Start loading
      const storedToken = localStorage.getItem('token');
      let validTokenFound = false;

      if (storedToken) {
        try {
          const decodedToken = jwtDecode(storedToken);
          const currentTime = Date.now() / 1000;
          if (decodedToken.exp >= currentTime) {
            setToken(storedToken); // Set token in store
            validTokenFound = true;
            console.log("Valid token found in localStorage.");
          } else {
            console.log("Token expired, clearing.");
            localStorage.removeItem('token'); // Explicitly remove expired token
            clearToken();
          }
        } catch (error) {
          console.error("Invalid token found, clearing.", error);
          localStorage.removeItem('token'); // Explicitly remove invalid token
          clearToken();
        }
      }

      // If no valid token was found in storage, attempt auto-login
      if (!validTokenFound) {
        console.log("No valid token in storage, attempting auto-login...");
        try {
          const response = await login(); // Call the modified login endpoint (no args needed)
          if (response && response.token) {
            console.log("Auto-login successful.");
            const receivedToken = response.token; // Store in variable
            localStorage.setItem('token', receivedToken); // Store the new token
            setToken(receivedToken); // Set token in store
            console.log("Token set in store after auto-login:", receivedToken ? `(length: ${receivedToken.length})` : 'null/undefined');
          } else {
             console.error("Auto-login failed: No token received from API.");
             clearToken(); // Ensure state is clean if login fails
          }
        } catch (error) {
          console.error("Error during auto-login API call:", error);
          clearToken(); // Ensure state is clean on error
        }
      }
      // Log the token state *just before* setting loading to false
      const finalToken = useAuthStore.getState().token;
      console.log("State before setting isLoading=false - Token:", finalToken ? `(length: ${finalToken.length})` : 'null/undefined');
      setIsLoading(false); // Finish loading
    };

    attemptAutoLogin();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setToken, clearToken]); // Dependencies remain the same

  // Theme management useEffect (unchanged)
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'light';

    const applyTheme = (theme) => {
      if (theme === 'dark') {
        document.body.classList.add('dark-theme');
        document.body.classList.remove('light-theme');
      } else if (theme === 'light') {
        document.body.classList.remove('dark-theme');
        document.body.classList.add('light-theme');
      } else {
        const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        document.body.classList.toggle('dark-theme', prefersDark);
        document.body.classList.toggle('light-theme', !prefersDark);
      }
    };

    applyTheme(savedTheme);

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemThemeChange = (e) => {
      if (localStorage.getItem('theme') === 'system') {
        applyTheme('system');
      }
    };

    mediaQuery.addEventListener('change', handleSystemThemeChange);

    return () => {
      mediaQuery.removeEventListener('change', handleSystemThemeChange);
    };
  }, []);

  return (
      <SettingsProvider>
        <div className="App">
          {/* Conditionally render Navigation only when not loading and potentially authenticated */}
          {!isLoading && <Navigation />}
          <div className="container-fluid p-0 m-0">
            <Routes>
              {/* Root route: Show loading or Home component */}
              <Route
                path="/"
                element={
                  isLoading ? (
                    <Loading />
                  ) : (
                     // Always render Home component after loading,
                     // as user will be auto-logged in.
                     // ProtectedRoute handles guarding other routes.
                    <Home />
                  )
                }
              />
              {/* Removed /login and /register routes */}

              {/* Protected Routes */}
              {/* Ensure ProtectedRoute still redirects to "/" if token is somehow missing after loading */}
              <Route element={<ProtectedRoute token={token} isLoading={isLoading} />}>
                {/* Book routes */}
                <Route path="/books" element={<BookList />} />
                <Route path="/books/create" element={<BookCreate />} />
                <Route path="/books/:bookId" element={<BookDetail />} />

                {/* Text routes */}
                <Route path="/texts" element={<TextList />} />
                <Route path="/texts/create" element={<TextCreate />} />
                <Route path="/texts/:textId" element={<TextDisplay />} />
                <Route path="/texts/create-audio" element={<CreateAudioLesson />} />
                <Route path="/texts/create-batch-audio" element={<BatchAudioCreate />} />

                {/* Statistics route */}
                <Route path="/statistics" element={<Statistics />} />
                <Route path="/terms" element={<TermsPage />} />

                {/* Settings route */}
                <Route path="/settings" element={<UserSettings />} />
                <Route path="/settings/languages" element={<LanguagesPage />} />
              </Route>

              {/* Fallback for any other route - maybe redirect to home or show a 404 */}
              <Route path="*" element={<Navigate to="/" />} />

            </Routes>
          </div>
        </div>
      </SettingsProvider>
  );
}

export default App;