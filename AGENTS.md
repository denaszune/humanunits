# Human Units project rules

- Use JavaScript/JSX, SolidJS, Rsbuild, and plain CSS. Do not add TypeScript, Vite, UI frameworks, web fonts, analytics, or runtime network services.
- Keep the conversion engine independent from the UI and favor browser-native APIs and small, direct implementations.
- Preserve keyboard and screen-reader access and honor reduced-motion preferences.
- Any new conversion behavior must have engine tests.
- Do not configure deployment.

## Verification

Run before committing:

```sh
pnpm test
pnpm build
pnpm size
```
