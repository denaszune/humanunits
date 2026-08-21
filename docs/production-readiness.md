# Production readiness

Use this as the release gate after the automated and manual regression checks. The owner-managed Cloudflare settings are documented in [the deployment guide](deployment.md).

## Required before promotion

- [ ] Confirm `main` deploys to `https://humanunits.com` without a `BASE_PATH` environment variable.
- [ ] Confirm `staging` deploys to `https://staging.humanunits.com` and returns `X-Robots-Tag: noindex, nofollow`.
- [ ] Require the CI workflow to pass before merging to the production branch.
- [ ] Protect the production environment with appropriate reviewer and branch rules.
- [ ] Confirm the host serves HTTPS and does not rewrite or strip the generated manifest, icons, or service worker.
- [ ] Confirm Cloudflare applies the security and cache policies from `public/_headers`. The generated CSP meta policy remains defense in depth.
- [ ] Run `pnpm install --frozen-lockfile`, `pnpm audit --prod`, `pnpm test`, `pnpm build`, `pnpm size`, and `pnpm test:e2e` from a clean checkout, then repeat the build and browser suite with `BASE_PATH=/humanunits/` as a portability check.
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
