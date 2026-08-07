import { access, readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';

const root = join(process.cwd(), 'dist');
const base = process.env.BASE_PATH || '/';
const html = await readFile(join(root, 'index.html'), 'utf8');

for (const asset of ['manifest.webmanifest', 'icon.svg']) {
  const expectedUrl = `${base}${asset}`;
  if (!html.includes(`href="${expectedUrl}"`)) {
    throw new Error(`Built HTML does not reference ${expectedUrl}`);
  }
  await access(join(root, asset));
}

const scriptsDirectory = join(root, 'static', 'js');
const scripts = await readdir(scriptsDirectory);
const sources = await Promise.all(
  scripts.filter(file => file.endsWith('.js')).map(file => readFile(join(scriptsDirectory, file), 'utf8')),
);

if (sources.some(source => source.includes('React.createElement'))) {
  throw new Error('Solid JSX was compiled as React.createElement');
}

console.log('Verified GitHub Pages asset paths and Solid JSX output.');
