import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import App from './App.tsx';
import { VisitorStatsProvider } from './components/analytics/VisitorStatsProvider';
import { PanelProvider } from './components/panel/PanelProvider';
import { ThemeProvider } from './components/theme/ThemeProvider';
import { startAnalytics } from './utils/analytics';
import { printConsoleGreeting } from './utils/console-greeting';
import './index.css';

printConsoleGreeting();
startAnalytics();

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <ThemeProvider>
      <PanelProvider>
        <BrowserRouter>
          <VisitorStatsProvider>
            <App />
          </VisitorStatsProvider>
        </BrowserRouter>
      </PanelProvider>
    </ThemeProvider>
  </React.StrictMode>,
);
