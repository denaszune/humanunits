import { startDistServer } from '../scripts/serve-dist.js';

export default async function globalSetup() {
  const server = await startDistServer(4173, process.env.TEST_BASE_PATH || '/');
  return async () => {
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
  };
}
