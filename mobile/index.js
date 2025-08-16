import React from 'react';
import App from './App';

// For web, use React DOM directly
if (typeof window !== 'undefined') {
  const { createRoot } = require('react-dom/client');
  const container = document.getElementById('root');
  if (container) {
    const root = createRoot(container);
    root.render(React.createElement(App));
  } else {
    console.error('Root container not found');
  }
} else {
  // For React Native, use registerRootComponent
  const { registerRootComponent } = require('expo');
  registerRootComponent(App);
}