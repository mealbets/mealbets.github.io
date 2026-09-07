# Correct 404 responses

CloudFront must return the repository's `/404.html` body with an HTTP `404` status for missing pages. Do not use `/index.html` as a blanket error response; that creates soft 404s and makes unrelated URLs look like copies of the homepage.

## CloudFront console settings

Open the distribution, choose **Error pages**, and create these custom error responses:

| Origin error | Response page path | Viewer response code | Error caching minimum TTL |
| --- | --- | --- | --- |
| `404` | `/404.html` | `404` | `60` seconds |
| `403` | `/404.html` | `404` | `60` seconds |

The `403` mapping is needed when an S3 REST origin with Origin Access Control returns `403` for a missing object. If this distribution serves protected objects as well as the public website, use a separate public-site behavior or origin so genuine authorization errors are not converted to 404s.

Confirm that CloudFront can read `/404.html` through the configured origin access settings, then invalidate these paths:

```text
/404.html
/*
```

## Verification

After the distribution finishes deploying, run:

```sh
curl -sS -o /dev/null -w '%{http_code}\n' https://mealbets.com/a-page-that-does-not-exist
curl -sS https://mealbets.com/a-page-that-does-not-exist | grep 'Page Not Found'
```

The first command must print `404`, and the second must find text from `404.html` rather than homepage content.

