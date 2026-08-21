# Human Units

**Fast, private unit conversion in natural language.**

Type a conversion such as `10 km in miles`, `72 °F to °C`, or `7:30 min/mi in min/km` and get the result immediately.

**[Open Human Units →](https://humanunits.com/)**

Human Units supports 507 units and result formats across 59 everyday, scientific, computing, and specialist categories. It works offline, requires no account, and includes no advertising, analytics, tracking, or third-party services.

<!-- Add a final product screenshot here:
![Human Units converter](docs/screenshots/converter.png)
-->

## Features

* **Natural-language input:** Enter conversions the way you would ask for them.
* **Broad coverage:** Browse 507 units and result formats across 59 categories.
* **Specialized conversion logic:** Handles temperature, pace, fuel economy, calendar durations, and other non-linear conversions.
* **Adjustable precision:** Display results with 6, 10, or 15 significant digits.
* **Pinned pairs:** Save and arrange frequently used unit pairs for quick reuse.
* **Recent conversions:** Reopen intentional conversions without saving every intermediate keystroke.
* **Private by design:** All parsing and conversion happen locally in the browser.
* **Offline and installable:** Use Human Units as a progressive web app after its first successful load.
* **Accessible and responsive:** Designed for keyboard, screen-reader, desktop, and mobile use.

## Examples

| Input                      | Result                           |
| -------------------------- | -------------------------------- |
| `10 km in mi`              | `6.21371192237334 mi`            |
| `72 °F in °C`              | `22.2222222222222 °C`            |
| `7:30 min/mi in min/km`    | `4:39.62 min/km`                 |
| `1 US gal in Imperial gal` | `0.832674184628989 Imperial gal` |

Aliases, scientific notation, Unicode symbols, compound units, and clock-style pace values are supported.

## Run locally

Requires Node.js 24 and pnpm 11.22.0.

```sh
pnpm install
pnpm dev
```

Then open the local address shown by the development server.

The browser smoke suite requires Playwright Chromium once per machine:

```sh
pnpm exec playwright install chromium
pnpm build
pnpm test:e2e
```

## Commands

| Command        | Purpose                                                     |
| -------------- | ----------------------------------------------------------- |
| `pnpm dev`     | Start the Rsbuild development server                        |
| `pnpm test`    | Run parser and conversion-engine tests                      |
| `pnpm test:e2e`| Run production browser, routing, storage, and offline tests  |
| `pnpm build`   | Create the optimized production build and service worker    |
| `pnpm preview` | Serve the completed production build locally                |
| `pnpm size`    | Report raw and gzip sizes for production JavaScript and CSS |

## Architecture

Human Units deliberately keeps its architecture small and dependency-light:

* `src/conversion.js` contains the framework-independent parser and conversion engine.
* `src/App.jsx` contains the Solid interface and local-storage behavior.
* `src/storage.js` validates all data crossing the local-storage boundary.
* `src/styles.css` contains the responsive visual system without a CSS framework or external assets.
* `scripts/generate-service-worker.js` inventories the production build and generates the app-shell precache.

Only Solid is shipped as a runtime dependency. Rsbuild and its official Solid plugin are used for development, while tests run with Node’s built-in test runner.

## Privacy and storage

All queries are parsed and converted locally. Recent conversions and pinned pairs are stored only in the browser’s local storage on the current device.

Human Units includes no accounts, advertisements, analytics, tracking, remote fonts, or conversion APIs.

## Offline behavior

The production service worker precaches the built application. After the first successful load, repeat visits start from the cached interface immediately, even without a network connection.

New service-worker versions replace outdated assets and remove obsolete caches after activation. Because service workers require HTTPS or localhost, test offline behavior using:

```sh
pnpm build
pnpm preview
```

## Deployment

Production deploys from `main` to `https://humanunits.com` through Cloudflare Pages' native GitHub integration. The permanent `staging` branch deploys to `https://staging.humanunits.com`, and pull requests receive preview deployments.

The Cloudflare production build must not define `BASE_PATH`. Relative asset URLs also keep the build portable, and CI retains this explicit legacy subpath compatibility check:

```sh
BASE_PATH=/humanunits/ pnpm build
```

An explicit base path must begin and end with `/`.

See [the Cloudflare Pages deployment guide](docs/deployment.md) for the exact build, domain, caching, security, and search-launch settings.

## Contributing

Keep changes focused, accessible, and dependency-light. Add regression tests for parser or conversion-engine changes, then run:

```sh
pnpm test
pnpm build
pnpm size
pnpm test:e2e
```

By contributing, you agree that your changes are provided under the project’s existing license.

## License

Human Units is open source under the [MIT License](LICENSE).
