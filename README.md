# Human Units

Human Units is a fast, accessible, mobile-first unit converter. Type a natural-language query such as `10 km in miles` or `72 f to c`; the result appears immediately. There are no accounts, advertisements, analytics, or network APIs.

## Setup

Requires a current Node.js LTS release and pnpm.

```sh
pnpm install
pnpm dev
```

Useful commands:

- `pnpm dev` starts the Rsbuild development server.
- `pnpm test` runs the conversion engine and parser tests.
- `pnpm build` creates an optimized build and its precaching service worker.
- `pnpm preview` serves the production output.
- `pnpm size` reports raw and gzip sizes for production JavaScript and CSS.

Set `BASE_PATH=/humanunits/ pnpm build` for GitHub Pages, or leave it unset for `/`. The base path must begin and end with `/`.

## Architecture

- `src/conversion.js` is a framework-independent parser and conversion engine. Units are represented as aliases and base-unit transformations.
- `src/App.jsx` contains the Solid interface and small local-storage helpers for history and pinned pairs.
- `src/styles.css` is the responsive visual system, with no framework or external assets.
- `scripts/generate-service-worker.js` inventories the completed production build and writes a small service worker with an exact app-shell precache.

Only Solid is shipped at runtime. Rsbuild and its official Solid plugin are development dependencies; tests use Node's built-in test runner.

## Privacy

All parsing and conversion happen in the browser. Recent conversions and pinned pairs are stored only in local storage on the current device. Human Units makes no requests to third-party services and includes no tracking.

## Offline behavior

The production service worker precaches every built asset during installation. After the first successful load, the interface and conversion engine work with the network disabled. A newly built service worker replaces old cached files and removes obsolete caches after activation.

Service workers require a secure context (`https://` or localhost). Test offline support using `pnpm build && pnpm preview`, not the development server.

## Contributing

Keep changes focused, dependency-light, and accessible. Add tests for parser or conversion changes, then run:

```sh
pnpm test
pnpm build
pnpm size
```

By contributing, you agree that your changes are provided under the existing MIT License.
