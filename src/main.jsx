import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

// Инициализация переменных высоты до рендера
const initViewportHeight = () => {
  const tg = window.Telegram?.WebApp;
  const height = tg?.viewportStableHeight || window.innerHeight || document.documentElement.clientHeight;
  
  document.documentElement.style.setProperty('--tg-viewport-height', `${height}px`);
  document.documentElement.style.setProperty('--app-height', `${height}px`);
  
  console.log('📐 Initial viewport height:', height);
};

// Вызываем инициализацию до создания root
initViewportHeight();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);