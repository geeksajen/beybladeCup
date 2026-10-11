import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App';
import { EventProvider } from './providers/EventProvider';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HashRouter>
      <EventProvider>
        <App />
      </EventProvider>
    </HashRouter>
  </React.StrictMode>,
);
