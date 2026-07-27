import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './styles.css';

const bootstrap = window.__TICKERDOCK_BOOTSTRAP__;
if (!bootstrap) throw new Error('TickerDock Webview bootstrap data is missing.');
createRoot(document.getElementById('root')!).render(<React.StrictMode><App bootstrap={bootstrap} /></React.StrictMode>);
