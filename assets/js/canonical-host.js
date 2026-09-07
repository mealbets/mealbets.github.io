(() => {
  const canonicalHost = "mealbets.com";

  if (window.location.hostname.toLowerCase() !== `www.${canonicalHost}`) {
    return;
  }

  const canonicalUrl = new URL(window.location.href);
  canonicalUrl.protocol = "https:";
  canonicalUrl.hostname = canonicalHost;
  canonicalUrl.port = "";

  window.location.replace(canonicalUrl.href);
})();
