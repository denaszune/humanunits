# Production readiness

Use this as the release gate after the automated and manual regression checks. It deliberately does not configure deployment; production hosting and repository controls are owner-managed.

## Required before promotion

- [ ] Choose the production origin and confirm the intended `BASE_PATH`.
- [ ] Require the CI workflow to pass before merging to the production branch.
- [ ] Protect the production environment with appropriate reviewer and branch rules.
- [ ] Confirm the host serves HTTPS and does not rewrite or strip the generated manifest, icons, or service worker.
- [ ] Add host-level security headers where the platform supports them: `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`, `Permissions-Policy`, and a response-header CSP. The generated CSP meta policy is defense in depth, but response headers can additionally enforce directives such as `frame-ancestors`.
- [ ] Run `pnpm install --frozen-lockfile`, `pnpm test`, `pnpm build`, `pnpm size`, and `pnpm test:e2e` from a clean checkout, then repeat the build and browser suite with the production base path.
- [ ] Complete [the manual regression checklist](manual-regression-checklist.md) on at least current Chromium and one independent browser engine, including a phone-sized viewport and 400% zoom.
- [ ] Test first install, offline reload, and upgrade from the previously published service worker on the real HTTPS origin.
- [ ] Verify the production network log contains no third-party runtime requests.
- [ ] Record the released commit, build command, base path, browser evidence, and rollback procedure.

## Ongoing maintenance

- Review dependency updates and `pnpm audit` results before each release.
- Re-run the exhaustive generated-pair test whenever unit aliases, symbols, categories, or defaults change.
- Treat conversion-definition changes as data changes: cite the authoritative definition in the review and add a focused regression test.
- Periodically test quota-disabled and cleared-storage behavior, browser service-worker changes, and installability requirements.
- Keep the JavaScript, CSS, and combined gzip budgets enforced by `pnpm size`.
