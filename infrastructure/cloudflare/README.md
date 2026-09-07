# Host MealBets on Cloudflare Pages with a server-side `www` redirect

This guide moves the static MealBets website from S3 + CloudFront to Cloudflare Pages and redirects `www.mealbets.com` to `https://mealbets.com` at Cloudflare's edge.

The redirect is an HTTP `301`, not JavaScript. It preserves the requested path and query string, so this request:

```text
https://www.mealbets.com/school/sample-menu.html?utm_source=flyer
```

becomes:

```text
https://mealbets.com/school/sample-menu.html?utm_source=flyer
```

## Cost and fit

This repository is a static HTML site, so it fits Cloudflare Pages Free. At the time this guide was written, the Free plan allows up to 20,000 files per Pages site, files up to 25 MiB, and 100 custom domains per Pages project. Static-asset requests are free and unlimited. This repository currently contains about 216 files and no file larger than 25 MiB.

Cloudflare's Free plan also includes Bulk Redirects: 5 lists, 15 rules, and 10,000 redirect entries. The single `www` redirect in this guide does not use a Worker or consume Workers request quota.

Before starting, review the current limits:

- [Cloudflare Pages limits](https://developers.cloudflare.com/pages/platform/limits/)
- [Cloudflare Pages pricing](https://developers.cloudflare.com/pages/functions/pricing/)
- [Cloudflare Redirect Rules availability](https://developers.cloudflare.com/rules/url-forwarding/)

## Before changing DNS

1. Keep the existing S3 + CloudFront site online until the Cloudflare Pages preview is correct.
2. Export or record every existing DNS entry at the current DNS provider. In particular, preserve email-related MX, SPF, DKIM, and DMARC records. Moving nameservers without recreating these records can interrupt email.
3. Confirm that the deploy branch contains the version you intend to publish. Do not connect a work-in-progress branch as the production branch.
4. The site has a top-level `index.html`; no build step is required.

## 1. Add the domain to Cloudflare

1. Create or sign in to a Cloudflare account and select **Add a domain**.
2. Add `mealbets.com` and select the **Free** plan.
3. Review the DNS records Cloudflare imports. Recreate any missing records before continuing.
4. At the domain registrar, replace the current authoritative nameservers with the two Cloudflare nameservers displayed in the Cloudflare dashboard.
5. Wait until the zone status is **Active** in Cloudflare.

Your registrar remains the domain registrar; only authoritative DNS moves to Cloudflare.

## 2. Deploy the static site to Cloudflare Pages

### Recommended: Git integration

1. In Cloudflare, open **Workers & Pages** → **Create application** → **Pages** → **Import an existing Git repository**.
2. Connect the repository that contains this site and select the production branch.
3. Use these build settings:

   | Setting | Value |
   | --- | --- |
   | Framework preset | None |
   | Root directory | Leave blank (the repository root) |
   | Build command | `exit 0` |
   | Build output directory | `.` |

4. Select **Save and Deploy**.
5. Open the generated `*.pages.dev` URL and check the homepage, `/school/how-to-order.html`, `/school/sample-menu.html`, and a few images before changing the production hostname.

Cloudflare's static HTML guide uses `exit 0` when no build is necessary. See [Deploy a static HTML site](https://developers.cloudflare.com/pages/framework-guides/deploy-anything/).

### Alternative: Direct Upload

Use this only if you do not want automatic deployments from Git. In **Workers & Pages**, select **Create application** → **Get started** → **Drag and drop your files**, then upload this repository's deploy-ready files. Cloudflare also supports `npx wrangler pages deploy . --project-name=mealbets` from the repository root.

Cloudflare does not let a Direct Upload project later switch to Git integration, so choose this approach deliberately. See [Direct Upload](https://developers.cloudflare.com/pages/get-started/direct-upload/).

## 3. Connect the canonical hostname

1. Open the new Pages project → **Custom domains** → **Set up a domain**.
2. Add `mealbets.com` only.
3. Allow Cloudflare to create or update the required proxied DNS record for the apex domain.
4. Wait for the custom-domain status to become active and verify:

   ```sh
   curl -sI https://mealbets.com/
   ```

   Expect `HTTP/2 200` (or an equivalent successful response) from the Pages-hosted site.

Do **not** add `www.mealbets.com` as a Pages custom domain. It will be an edge-only redirect source instead.

## 4. Create the free server-side `www` → apex redirect

Cloudflare's documented Pages method uses a Bulk Redirect. It runs before the request is sent to the origin, so the S3 bucket, Cloudflare Pages project, and browser never serve the duplicate `www` HTML.

### Create the redirect list

1. In Cloudflare, go to **Bulk Redirects** → **Create Bulk Redirect List**.
2. Name it `mealbets-www-to-apex`.
3. Add one redirect with these exact values:

   | Field | Value |
   | --- | --- |
   | Source URL | `www.mealbets.com` |
   | Target URL | `https://mealbets.com` |
   | Status | `301 — Permanent Redirect` |
   | Preserve query string | Enabled |
   | Subpath matching | Enabled |
   | Preserve path suffix | Enabled |
   | Include subdomains | Disabled |

4. Save the list.
5. Create a **Bulk Redirect Rule** that enables this list for the `mealbets.com` zone, then deploy it.

### Add the redirect-source DNS record

The redirect source must be proxied through Cloudflare for the rule to run.

1. Go to **DNS** → **Records**.
2. Remove the old `www` record that points to CloudFront.
3. Add this record:

   | Field | Value |
   | --- | --- |
   | Type | `A` |
   | Name | `www` |
   | IPv4 address | `192.0.2.1` |
   | Proxy status | **Proxied** (orange cloud) |

`192.0.2.1` is a reserved placeholder. Cloudflare receives the proxied request and returns the redirect before any connection to that address is attempted. Do not use **DNS only** for this record.

Cloudflare maintains a dedicated [www-to-apex Pages redirect guide](https://developers.cloudflare.com/pages/how-to/www-redirect/) and documents the requirement for proxied redirect-source DNS records in its [Bulk Redirects documentation](https://developers.cloudflare.com/rules/url-forwarding/bulk-redirects/create-dashboard/).

## 5. Verify before retiring CloudFront

Run these commands after DNS propagation:

```sh
curl -sI https://mealbets.com/school/sample-menu.html
curl -sI 'https://www.mealbets.com/school/sample-menu.html?utm_source=redirect-test'
curl -sIL 'https://www.mealbets.com/school/sample-menu.html?utm_source=redirect-test'
```

Expected result for the second command:

```text
HTTP/2 301
location: https://mealbets.com/school/sample-menu.html?utm_source=redirect-test
```

The final command should end with a successful `200` response from `mealbets.com`.

Also check:

- `https://mealbets.com/robots.txt`
- `https://mealbets.com/sitemap.xml`
- `https://mealbets.com/school/how-to-order.html`
- `https://mealbets.com/school/flyer.html`
- Images, app-store links, contact forms, and the Google Tag Manager preview/debug flow.

Only after these checks pass should you remove the old CloudFront DNS records or retire the CloudFront distribution.

## Important notes

- Keep the existing canonical tags, sitemap URLs, and internal absolute links on `https://mealbets.com`; they already match this redirect strategy.
- A Cloudflare Pages `_redirects` file is not the right tool for this hostname redirect. It matches paths, not the visitor hostname; use Bulk Redirects as above.
- A Cloudflare Worker is unnecessary for this simple redirect. If you later need conditional redirect logic, Workers Free has a 100,000-request daily limit, while the Bulk Redirect above does not invoke a Worker. See [Workers limits](https://developers.cloudflare.com/workers/platform/limits/).
- Recheck Cloudflare plan limits before launch; provider limits and product availability can change.

## Rollback

If the Pages deployment has an issue, keep the Cloudflare zone active, point the apex DNS record back to the existing CloudFront distribution, and disable the Bulk Redirect rule before restoring the old `www` CloudFront record. Keep the S3 + CloudFront distribution available until the new setup has been verified in production.
