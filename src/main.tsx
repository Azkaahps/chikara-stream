import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App';
import { bootstrapBackup } from './lib/persist';
import './styles.css';

// Restore native-backed storage before first render so watch history and
// saved titles survive app updates / WebView storage cleanups.
bootstrapBackup().finally(() => {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <HashRouter>
        <App />
      </HashRouter>
    </React.StrictMode>,
  );
});
