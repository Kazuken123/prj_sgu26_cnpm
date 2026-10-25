import 'leaflet/dist/leaflet.css';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';
import './visitor.css';
import './experience.css';
import './discovery.css';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Không tìm thấy phần tử root trong DOM');
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <BrowserRouter basename={/^\/demo(?:\/|$)/.test(window.location.pathname) ? '/demo' : '/'}>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);

import './internal.css';

import './new-visitor.css';
import './visitor-motion.css';
