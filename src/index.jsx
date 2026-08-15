import { render } from 'solid-js/web';
import App from './App.jsx';
import './styles.css';

render(() => <App />, document.getElementById('root'));

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_PATH}service-worker.js`, {
      scope: import.meta.env.BASE_PATH,
    }).then(registration => {
      let reloadRequested = false;
      const offerUpdate = () => {
        if (registration.waiting && navigator.serviceWorker.controller) {
          dispatchEvent(new Event('humanunits:update-ready'));
        }
      };
      const applyUpdate = () => {
        if (!registration.waiting || reloadRequested) return;
        reloadRequested = true;
        navigator.serviceWorker.addEventListener('controllerchange', () => location.reload(), { once: true });
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      };

      addEventListener('humanunits:apply-update', applyUpdate);
      offerUpdate();
      registration.addEventListener('updatefound', () => {
        const worker = registration.installing;
        worker?.addEventListener('statechange', () => {
          if (worker.state === 'installed') offerUpdate();
        });
      });
    }).catch(() => { /* The converter remains fully usable without installation. */ });
  });
}
