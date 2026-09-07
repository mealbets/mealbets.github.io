# MealBets CloudFront SEO configuration

These files document the edge configuration that cannot be activated by uploading the static website to S3. Apply the settings to the CloudFront distribution that serves `mealbets.com`.

## Canonical host redirect

The viewer-request function in [`functions/redirect-www.js`](functions/redirect-www.js) redirects only `www.mealbets.com` to `https://mealbets.com`. It preserves the requested path and the original query string.

1. Keep both `mealbets.com` and `www.mealbets.com` as alternate domain names on the distribution and certificate.
2. In CloudFront, create a Function using JavaScript runtime 2.0.
3. Paste in `functions/redirect-www.js`, save it, and publish it to the `LIVE` stage.
4. Associate the function with the default cache behavior on the **Viewer request** event.
5. Invalidate `/*` after publishing the association.

Test the function locally before publishing:

```sh
node infrastructure/cloudfront/functions/redirect-www.test.mjs
```

Verify after deployment:

```sh
curl -I https://www.mealbets.com/school/sample-menu.html?utm_source=test
curl -I https://mealbets.com/school/sample-menu.html?utm_source=test
```

The first request should return `301` with a `Location` on `https://mealbets.com`; the second should return the page normally.

## Related configuration

- [Correct 404 responses](404-errors.md)
- [Caching and compression](caching-compression.md)

