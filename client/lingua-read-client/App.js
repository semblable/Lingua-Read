import React from 'react';
import { registerRootComponent } from 'expo';
import { Platform } from 'react-native';
import WebApp from './src/App'; // Import your existing React web app
import NativeApp from './src/NativeApp'; // Import the native version

// Choose the appropriate app version based on platform
const App = () => {
  return Platform.OS === 'web' ? <WebApp /> : <NativeApp />;
};

// Register the root component
registerRootComponent(App);

// Export default for compatibility
export default App; 