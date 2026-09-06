# Caching and compression

Use short, revalidated caching for HTML and longer caching for static assets. The current asset filenames are not content-hashed, so do not mark them `immutable` yet.

## CloudFront behavior

For the public site behavior:

1. Set **Compress objects automatically** to **Yes**.
2. Attach a cache policy with both **Gzip** and **Brotli** support enabled. AWS managed policy `CachingOptimized` supports both formats.
3. Do not separately add `Accept-Encoding` to the origin request policy when Gzip/Brotli support is enabled in the cache policy.
4. Keep cookies and unnecessary headers out of the cache key for this static site.
5. Keep marketing query parameters out of the cache key unless the origin genuinely returns different HTML for them.

Set the distribution's default root object to `index.html`.

## S3 response metadata

Apply these `Cache-Control` values during deployment:

| Content | Recommended value |
| --- | --- |
| HTML | `public, max-age=300, s-maxage=600, must-revalidate` |
| `robots.txt`, `sitemap.xml` | `public, max-age=300, must-revalidate` |
| CSS, JavaScript, images, fonts | `public, max-age=604800, stale-while-revalidate=86400` |

Example deployment commands are below. Replace `YOUR_BUCKET` with the deployment bucket; review the includes before running them in CI.

```sh
aws s3 cp . s3://YOUR_BUCKET/ --recursive --exclude '*' --include '*.html' --cache-control 'public, max-age=300, s-maxage=600, must-revalidate'
aws s3 cp robots.txt s3://YOUR_BUCKET/robots.txt --cache-control 'public, max-age=300, must-revalidate'
aws s3 cp sitemap.xml s3://YOUR_BUCKET/sitemap.xml --cache-control 'public, max-age=300, must-revalidate'
aws s3 sync assets/ s3://YOUR_BUCKET/assets/ --cache-control 'public, max-age=604800, stale-while-revalidate=86400'
```

Upload the root favicon and any other public root files separately with the static-asset cache policy. Do not upload `.git`, `infrastructure`, or local test files as site content.

When asset filenames become content-hashed, change their cache metadata to:

```text
public, max-age=31536000, immutable
```

## Deployment verification

Invalidate changed HTML and metadata files after deployment, then verify the response headers:

```sh
curl -I -H 'Accept-Encoding: br,gzip' https://mealbets.com/
curl -I -H 'Accept-Encoding: br,gzip' https://mealbets.com/assets/css/main.css
curl -I https://mealbets.com/sitemap.xml
```

Check for the expected `Cache-Control`, `Content-Encoding`, `Content-Type`, and `Vary` values. A compressed response may be served only after CloudFront has generated and cached the compressed variant.

