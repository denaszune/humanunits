import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(process.cwd(), 'dist');
const types = new Map([
  ['.css', 'text/css; charset=utf-8'],
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.png', 'image/png'],
  ['.svg', 'image/svg+xml'],
  ['.webmanifest', 'application/manifest+json; charset=utf-8'],
]);

export function startDistServer(port = 4173, mountPath = '/') {
  const mount = `/${mountPath.split('/').filter(Boolean).join('/')}${mountPath === '/' ? '' : '/'}`;
  const server = createServer(async (request, response) => {
    try {
      if (!['GET', 'HEAD'].includes(request.method)) {
        response.writeHead(405, { Allow: 'GET, HEAD' }).end();
        return;
      }
      const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
      if (!pathname.startsWith(mount)) {
        response.writeHead(404).end();
        return;
      }
      const mountedPath = pathname.slice(mount.length);
      // Cloudflare Pages canonicalizes index.html to the directory root. Keep
      // the local browser suite faithful to that production behavior.
      if (mountedPath === 'index.html') {
        response.writeHead(308, { Location: mount, 'Cache-Control': 'no-cache' }).end();
        return;
      }
      const file = resolve(root, mountedPath ? mountedPath : 'index.html');
      if (file !== root && !file.startsWith(`${root}${sep}`)) {
        response.writeHead(403).end();
        return;
      }
      const body = await readFile(file);
      response.writeHead(200, {
        'Content-Type': types.get(extname(file)) || 'application/octet-stream',
        'Cache-Control': 'no-cache',
      });
      response.end(request.method === 'HEAD' ? undefined : body);
    } catch (error) {
      response.writeHead(error?.code === 'ENOENT' ? 404 : 500).end();
    }
  });
  return new Promise((resolveReady, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', () => {
      server.off('error', reject);
      resolveReady(server);
    });
  });
}

if (resolve(process.argv[1] || '') === fileURLToPath(import.meta.url)) {
  const server = await startDistServer();
  for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => {
    server.closeAllConnections();
    server.close(() => process.exit());
  });
}
