import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/global.css'
import App from './App.jsx'

// Basic error capture for production
window.onerror = function (msg, url, line, col, error) {
  document.body.innerHTML = `<div style="padding: 20px; font-family: sans-serif; color: #721c24; background: #f8d7da;">
    <h3>Fatal Error</h3>
    <p>${msg}</p>
    <small>${url} - line ${line}</small>
  </div>`;
  return false;
};

try {
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
} catch (e) {
  console.error('Render error:', e);
  document.body.innerHTML = `<div style="padding: 20px; color: red;">Failed to load app: ${e.message}</div>`;
}
