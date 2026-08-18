import { defineConfig } from '@rsbuild/core';
import { pluginBabel } from '@rsbuild/plugin-babel';
import { pluginSolid } from '@rsbuild/plugin-solid';

// Relative URLs make the default build portable between a domain root and a
// project subdirectory (such as GitHub Pages) without deployment-specific
// configuration. An explicit absolute base remains available when needed.
const base = process.env.BASE_PATH || './';
if (base !== './' && (!base.startsWith('/') || !base.endsWith('/'))) {
  throw new Error('BASE_PATH must be "./" or begin and end with "/"');
}

export default defineConfig({
  // Configure the Solid preset explicitly so JSX never falls back to SWC's
  // React.createElement transform in production builds.
  plugins: [
    pluginBabel({ babelLoaderOptions: { presets: ['babel-preset-solid'] } }),
    pluginSolid(),
  ],
  html: {
    template: './index.html',
    title: 'Human Units',
    meta: {
      description: 'Fast, private, offline unit conversion in natural language',
      'theme-color': '#123c34',
    },
    tags: [
      { tag: 'link', attrs: { rel: 'manifest', href: 'manifest.webmanifest' }, head: true },
      { tag: 'link', attrs: { rel: 'icon', href: 'icon-any.323fef38.svg', type: 'image/svg+xml' }, head: true },
      { tag: 'link', attrs: { rel: 'icon', href: 'favicon-32.42bba446.png', type: 'image/png', sizes: '32x32' }, head: true },
      { tag: 'link', attrs: { rel: 'apple-touch-icon', href: 'apple-touch-180.72eade88.png', sizes: '180x180' }, head: true },
    ],
  },
  output: {
    assetPrefix: base,
  },
  source: {
    define: {
      'import.meta.env.BASE_PATH': JSON.stringify(base),
    },
  },
  tools: {
    // Keep the parser setting explicit so SWC can parse .jsx after Babel has
    // compiled Solid's JSX expressions.
    swc: {
      jsc: {
        parser: {
          syntax: 'ecmascript',
          jsx: true,
        },
      },
    },
  },
});
