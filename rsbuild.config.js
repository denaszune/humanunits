import { defineConfig } from '@rsbuild/core';
import { pluginSolid } from '@rsbuild/plugin-solid';

const base = process.env.BASE_PATH || '/';
if (!base.startsWith('/') || !base.endsWith('/')) {
  throw new Error('BASE_PATH must begin and end with "/"');
}

export default defineConfig({
  plugins: [pluginSolid()],
  html: {
    title: 'Human Units',
    meta: {
      description: 'Fast, private, offline unit conversion in natural language',
      themeColor: '#173f35',
    },
    tags: [
      { tag: 'link', attrs: { rel: 'manifest', href: `${base}manifest.webmanifest` }, head: true },
      { tag: 'link', attrs: { rel: 'icon', href: `${base}icon.svg`, type: 'image/svg+xml' }, head: true },
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
    // Keep the parser setting explicit: the Solid transform runs after SWC,
    // so production builds must preserve JSX for the Solid plugin.
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
