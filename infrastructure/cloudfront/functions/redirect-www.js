/**
 * CloudFront Function (JavaScript runtime 2.0), viewer-request event.
 * Redirects only www.mealbets.com to the canonical mealbets.com host.
 */
function handler(event) {
  var request = event.request;
  var hostHeader = request.headers.host;

  if (!hostHeader || hostHeader.value.toLowerCase() !== 'www.mealbets.com') {
    return request;
  }

  var rawQueryString = request.rawQueryString();
  var location = 'https://mealbets.com' + request.uri;

  if (rawQueryString !== undefined) {
    location += '?' + rawQueryString;
  }

  return {
    statusCode: 301,
    statusDescription: 'Moved Permanently',
    headers: {
      location: { value: location },
      'cache-control': { value: 'public, max-age=86400' }
    }
  };
}
