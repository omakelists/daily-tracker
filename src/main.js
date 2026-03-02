import { html, render } from 'htm/preact';
import { initI18n } from './i18n.js';
import { App } from './App.js';

async function main() {
  await initI18n();
  render(html`<${App} />`, document.getElementById('root'));

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').catch(() => {});
    });
  }
}

main();
