import { render } from 'solid-js/web';
import App from './App.jsx';
import './styles.css';

render(() => <App />, document.getElementById('root'));

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_PATH}service-worker.js`, {
      scope: import.meta.env.BASE_PATH,
    }).then(registration => {
      registration.addEventListener('updatefound', () => {
        const worker = registration.installing;
        worker?.addEventListener('statechange', () => {
          if (worker.state === 'installed' && navigator.serviceWorker.controller) {
            dispatchEvent(new Event('humanunits:update-ready'));
          }
        });
      });
    }).catch(() => { /* The converter remains fully usable without installation. */ });
  });
}
