# Cloudflare Pages deployment

Cloudflare Pages deploys this static application through its native GitHub integration. GitHub Actions verifies changes but does not deploy them to Cloudflare. Do not add Wrangler, a Pages Function, or a Worker unless the application later needs server-side behavior.

## Pages project settings

Configure the connected repository with these exact values:

| Setting | Value |
| --- | --- |
| Framework preset | None |
| Production branch | `main` |
| Preview branches | All non-production branches |
| Build command | `pnpm test && pnpm build && pnpm size` |
| Build output directory | `dist` |
| Root directory | Repository root |
| Environment variable | `NODE_VERSION=24` |
| Environment variable | `PNPM_VERSION=11.22.0` |

Do not define `BASE_PATH` in Cloudflare. The normal build targets the domain root. Pull requests and non-production branches receive automatic preview deployments.

## Branches and custom domains

- Assign `humanunits.com` to the production deployment from `main`.
- Keep `staging` as the permanent test branch and assign `staging.humanunits.com` to that branch. After the first successful `staging` deployment, add `staging.humanunits.com` under the Pages project's custom domains. Then edit the Cloudflare DNS CNAME for `staging` so its target is `staging.<project-name>.pages.dev` and ensure the record is proxied. An unproxied record can resolve to the production branch instead.
- Redirect `www.humanunits.com` permanently to `https://humanunits.com` with a Cloudflare Redirect Rule.
- Leave the generated `*.pages.dev` address available for platform operation, but publish and index only the production custom domain.

Cloudflare preview deployments already receive a search-engine `noindex` header. The checked-in `_headers` file adds the same protection to the permanent staging custom domain.

## Cloudflare dashboard settings

- Enable **Always Use HTTPS**, **HTTP/3**, and **TLS 1.3**.
- Keep **Cloudflare Web Analytics** disabled to preserve the app's no-tracking promise.
- Keep **Rocket Loader** disabled; it can change script execution and interfere with the application and service-worker lifecycle.
- Do not enable a global **Cache Everything** rule. Fingerprinted scripts, styles, icons, and favicons are immutable, while HTML, the manifest, and the service worker must revalidate according to `public/_headers`.

Cloudflare's setup references: [build configuration](https://developers.cloudflare.com/pages/configuration/build-configuration/), [custom domains](https://developers.cloudflare.com/pages/configuration/custom-domains/), [custom branch aliases](https://developers.cloudflare.com/pages/how-to/custom-branch-aliases/), [preview deployments](https://developers.cloudflare.com/pages/configuration/preview-deployments/), and [response headers](https://developers.cloudflare.com/pages/configuration/headers/).

## Search launch

After the production custom domain serves the release:

1. Add and verify `https://humanunits.com` in Google Search Console.
2. Submit `https://humanunits.com/sitemap.xml` and inspect the home URL.
3. Request indexing only after confirming the canonical URL, robots file, headers, and production content are correct.
4. Verify that `staging.humanunits.com` and preview deployments return `X-Robots-Tag: noindex`.

Indexing is controlled by search engines, so deployment and submission improve discoverability but cannot guarantee ranking or an immediate appearance in results.

## Creating the permanent staging branch

After this pull request is merged and the updated `main` is checked out locally, create `staging` from that exact commit if the branch does not already exist:

```sh
git switch main
git pull --ff-only origin main
git switch -c staging
git push --set-upstream origin staging
```

Then wait for its first Pages deployment before assigning `staging.humanunits.com` to the branch.

## Rollback

Cloudflare Pages retains earlier deployments that can be promoted or rolled back in the dashboard. The GitHub Pages workflow remains available only as a temporary manual legacy rollback; it is deliberately not triggered by pushes.
