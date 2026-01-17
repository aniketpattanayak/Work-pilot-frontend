/**
 * WORK PILOT: SYSTEM ENTRY POINT v1.2
 * Architecture: React 18 Concurrent Rendering
 * Logic: Fixed ReferenceError by ensuring React is available for JSX transformation
 */

import React, { StrictMode } from 'react'; // Added explicit React import
import { createRoot } from 'react-dom/client';

/* Global Industrial Design Tokens & Tailwind Base */
import './index.css';

/* Core Application Orchestrator */
import App from './App.jsx';

// Identify the root DOM node
const container = document.getElementById('root');

// Initialize the High-Performance Render Root
const root = createRoot(container);

root.render(
  <StrictMode>
    <App />
  </StrictMode>
);