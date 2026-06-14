import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

const THEME_STORAGE_KEY = 'gap2grow-theme';

const applyTheme = (theme) => {
  const resolvedTheme = theme === 'dark' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', resolvedTheme);
  document.documentElement.style.colorScheme = resolvedTheme;
};

const savedTheme = window.localStorage.getItem(THEME_STORAGE_KEY) || 'light';
applyTheme(savedTheme);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
