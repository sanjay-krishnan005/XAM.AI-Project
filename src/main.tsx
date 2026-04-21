import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Suppress benign environment-specific websocket errors in the preview
window.addEventListener('unhandledrejection', (event) => {
  const message = event.reason?.message || String(event.reason);
  if (message.includes('WebSocket') || message.includes('vite')) {
    event.preventDefault();
    console.warn('Caught environment-specific rejection:', message);
  }
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
