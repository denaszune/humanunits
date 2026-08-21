import { defineConfig } from '@rsbuild/core';
import { pluginBabel } from '@rsbuild/plugin-babel';
import { pluginSolid } from '@rsbuild/plugin-solid';

// The relative default resolves at humanunits.com's domain root while keeping
// the build portable. BASE_PATH remains available for the legacy subpath check.
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
    title: 'Human Units — Fast, Private Unit Converter',
    meta: {
      description: 'Convert 500+ everyday, scientific, and specialist units in natural language. Human Units is fast, private, and works offline.',
      'theme-color': '#123c34',
      referrer: 'no-referrer',
      robots: 'index, follow',
    },
    tags: [
      { tag: 'meta', attrs: { 'http-equiv': 'Content-Security-Policy', content: "default-src 'self'; base-uri 'none'; object-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self'; font-src 'self'; media-src 'none'; manifest-src 'self'; connect-src 'self'; worker-src 'self'; child-src 'none'; frame-src 'none'; form-action 'self'" }, head: true },
      { tag: 'link', attrs: { rel: 'canonical', href: 'https://humanunits.com/' }, head: true },
      { tag: 'link', attrs: { rel: 'manifest', href: 'manifest.webmanifest' }, head: true },
      { tag: 'link', attrs: { rel: 'icon', href: 'icon-any.323fef38.svg', type: 'image/svg+xml' }, head: true },
      { tag: 'link', attrs: { rel: 'icon', href: 'favicon-32.b4790ade.png', type: 'image/png', sizes: '32x32' }, head: true },
      { tag: 'link', attrs: { rel: 'apple-touch-icon', href: 'apple-touch-180.625da17a.png', sizes: '180x180' }, head: true },
      { tag: 'meta', attrs: { property: 'og:type', content: 'website' }, head: true },
      { tag: 'meta', attrs: { property: 'og:site_name', content: 'Human Units' }, head: true },
      { tag: 'meta', attrs: { property: 'og:title', content: 'Human Units — Fast, Private Unit Converter' }, head: true },
      { tag: 'meta', attrs: { property: 'og:description', content: 'Convert 500+ everyday, scientific, and specialist units in natural language. Fast, private, and available offline.' }, head: true },
      { tag: 'meta', attrs: { property: 'og:url', content: 'https://humanunits.com/' }, head: true },
      { tag: 'meta', attrs: { property: 'og:image', content: 'https://humanunits.com/icon-any-512.3275eece.png' }, head: true },
      { tag: 'meta', attrs: { property: 'og:image:alt', content: 'Human Units app icon' }, head: true },
      { tag: 'meta', attrs: { name: 'twitter:card', content: 'summary' }, head: true },
      { tag: 'meta', attrs: { name: 'twitter:title', content: 'Human Units — Fast, Private Unit Converter' }, head: true },
      { tag: 'meta', attrs: { name: 'twitter:description', content: 'Convert 500+ units in natural language. Fast, private, and available offline.' }, head: true },
      { tag: 'meta', attrs: { name: 'twitter:image', content: 'https://humanunits.com/icon-any-512.3275eece.png' }, head: true },
      { tag: 'meta', attrs: { name: 'twitter:image:alt', content: 'Human Units app icon' }, head: true },
      { tag: 'script', attrs: { type: 'application/ld+json' }, children: JSON.stringify({ '@context': 'https://schema.org', '@type': 'WebApplication', name: 'Human Units', url: 'https://humanunits.com/', description: 'Fast, private, offline unit conversion in natural language', applicationCategory: 'UtilitiesApplication', operatingSystem: 'Any', isAccessibleForFree: true }), head: true },
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
