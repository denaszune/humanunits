import { readdir, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { gzipSync } from 'node:zlib';

const root = join(process.cwd(), 'dist');
async function filesIn(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  return (await Promise.all(entries.map(entry => entry.isDirectory() ? filesIn(join(directory, entry.name)) : [join(directory, entry.name)]))).flat();
}
const files = (await filesIn(root)).filter(file => /\.(?:js|css)$/.test(file) && !file.endsWith('service-worker.js'));
const budgets = {
  JavaScript: 30 * 1024,
  CSS: 9 * 1024,
};
let jsGzip = 0;
let cssGzip = 0;
for (const file of files) {
  const content = await readFile(file);
  const gzip = gzipSync(content, { level: 9 }).length;
  if (file.endsWith('.js')) jsGzip += gzip;
  if (file.endsWith('.css')) cssGzip += gzip;
  console.log(`${relative(root, file)}: ${(content.length / 1024).toFixed(2)} kB raw, ${(gzip / 1024).toFixed(2)} kB gzip`);
}
const totals = {
  JavaScript: jsGzip,
  CSS: cssGzip,
};
for (const [name, size] of Object.entries(totals)) {
  console.log(`${name} total: ${(size / 1024).toFixed(2)} kB gzip (budget: ${budgets[name] / 1024} kB)`);
  if (size > budgets[name]) process.exitCode = 1;
}
console.log(`Combined total: ${((jsGzip + cssGzip) / 1024).toFixed(2)} kB gzip`);
