import React, { createContext, useState, useEffect, useCallback } from 'react';
import { getUserSettings } from '../utils/api'; // Assuming getUserSettings is in api.js

// Default settings structure
const defaultSettings = {
  theme: 'light',
  textSize: 16,
  textFont: 'default',
  leftPanelWidth: 85,
  autoTranslateWords: true,
  highlightKnownWords: true,
  defaultLanguageId: 0,
  autoAdvanceToNextLesson: false,
  showProgressStats: true,
  // Add other settings as needed
};

// Create the context
export const SettingsContext = createContext({
  settings: defaultSettings,
  loadingSettings: true,
  errorSettings: null,
  updateSetting: () => {}, // Placeholder function
  refetchSettings: async () => {}, // Placeholder function
});

// Create the provider component
export const SettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState(defaultSettings);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [errorSettings, setErrorSettings] = useState(null);

  const fetchSettings = useCallback(async () => {
    setLoadingSettings(true);
    setErrorSettings(null);
    console.log('[SettingsContext] Fetching settings...');
    try {
      const data = await getUserSettings();
      console.log('[SettingsContext] Settings fetched:', data);
      setSettings({
        theme: data.theme || defaultSettings.theme,
        textSize: data.textSize || defaultSettings.textSize,
        textFont: data.textFont || defaultSettings.textFont,
        leftPanelWidth: data.leftPanelWidth || defaultSettings.leftPanelWidth,
        autoTranslateWords: data.autoTranslateWords ?? defaultSettings.autoTranslateWords,
        highlightKnownWords: data.highlightKnownWords ?? defaultSettings.highlightKnownWords,
        defaultLanguageId: data.defaultLanguageId || defaultSettings.defaultLanguageId,
        autoAdvanceToNextLesson: data.autoAdvanceToNextLesson ?? defaultSettings.autoAdvanceToNextLesson,
        showProgressStats: data.showProgressStats ?? defaultSettings.showProgressStats,
      });
    } catch (err) {
      console.error('[SettingsContext] Failed to load settings:', err);
      setErrorSettings('Failed to load settings. Using defaults.');
      setSettings(defaultSettings); // Fallback to defaults on error
    } finally {
      setLoadingSettings(false);
    }
  }, []);

  useEffect(() => {
    // Fetch settings when the provider mounts
    // Check if user is logged in before fetching? Maybe fetchApi handles this?
    // Assuming fetchApi throws error if not logged in for protected routes like /usersettings
    const token = localStorage.getItem('token');
    if (token) { // Only fetch if token exists
        fetchSettings();
    } else {
        console.log('[SettingsContext] No token found, using default settings.');
        setSettings(defaultSettings);
        setLoadingSettings(false);
    }
  }, [fetchSettings]);

  // Function to update a specific setting locally
  const updateSetting = useCallback((key, value) => {
    console.log(`[SettingsContext] Updating setting locally - ${key}: ${value}`);
    setSettings(prevSettings => ({
      ...prevSettings,
      [key]: value,
    }));
    // Note: API update should be triggered from the component making the change
    // for better control over saving state (e.g., after debouncing).
  }, []);

  // Function to manually refetch settings if needed (e.g., after login/logout)
  const refetchSettings = useCallback(async () => {
      const token = localStorage.getItem('token');
      if (token) {
          await fetchSettings();
      } else {
          console.log('[SettingsContext] Refetch requested, but no token found. Resetting to defaults.');
          setSettings(defaultSettings);
          setLoadingSettings(false); // Ensure loading is false if reset
          setErrorSettings(null); // Clear any previous errors
      }
  }, [fetchSettings]);


  return (
    <SettingsContext.Provider value={{ settings, loadingSettings, errorSettings, updateSetting, refetchSettings }}>
      {children}
    </SettingsContext.Provider>
  );
};