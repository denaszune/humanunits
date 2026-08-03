import { readdir, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { gzipSync } from 'node:zlib';

const root = join(process.cwd(), 'dist');
async function filesIn(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  return (await Promise.all(entries.map(entry => entry.isDirectory() ? filesIn(join(directory, entry.name)) : [join(directory, entry.name)]))).flat();
}
const files = (await filesIn(root)).filter(file => /\.(?:js|css)$/.test(file) && !file.endsWith('service-worker.js'));
let jsGzip = 0;
for (const file of files) {
  const content = await readFile(file);
  const gzip = gzipSync(content, { level: 9 }).length;
  if (file.endsWith('.js')) jsGzip += gzip;
  console.log(`${relative(root, file)}: ${(content.length / 1024).toFixed(2)} kB raw, ${(gzip / 1024).toFixed(2)} kB gzip`);
}
console.log(`Initial JavaScript total: ${(jsGzip / 1024).toFixed(2)} kB gzip (budget: 50 kB)`);
if (jsGzip > 50 * 1024) process.exitCode = 1;
