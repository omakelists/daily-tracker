import { createRoot } from 'react-dom/client';
import { jsx } from 'react/jsx-runtime';
import { StrictMode } from 'react';
import { initI18n } from './i18n.js';
import { App } from './App.js';

async function main() {
  await initI18n();
  createRoot(document.getElementById('root')).render(
    jsx(StrictMode, { children: jsx(App, {}) })
  );
}

main();
