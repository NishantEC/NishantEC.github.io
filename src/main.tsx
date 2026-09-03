import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import App from './App.tsx';
import { PanelProvider } from './components/panel/PanelProvider';
import { ThemeProvider } from './components/theme/ThemeProvider';
import { printConsoleGreeting } from './utils/console-greeting';
import './index.css';

printConsoleGreeting();

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <ThemeProvider>
      <PanelProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </PanelProvider>
    </ThemeProvider>
  </React.StrictMode>,
);
