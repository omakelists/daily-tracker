import './style.css';
import { createRoot } from 'react-dom/client';
import { jsx } from 'react/jsx-runtime';
import { StrictMode } from 'react';
import { initI18n } from './util/i18n';
import { App } from './App';

async function main() {
  await initI18n();
  createRoot(document.getElementById('root')).render(
    jsx(StrictMode, { children: jsx(App, {}) })
  );
}

main();
