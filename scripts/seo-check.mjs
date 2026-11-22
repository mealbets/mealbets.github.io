import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const canonicalOrigin = 'https://mealbets.com';
const robots = fs.readFileSync(path.join(root, 'robots.txt'), 'utf8');
const robotsDirectives = robots.split(/\r?\n/)
  .map((line) => line.replace(/#.*$/, '').trim())
  .filter(Boolean);

// Preserve the site's open crawler policy and canonical sitemap discovery.
assert.deepEqual(robotsDirectives, [
  'User-agent: *',
  'Allow: /',
  `Sitemap: ${canonicalOrigin}/sitemap.xml`
], 'robots.txt must allow all crawlers and advertise the canonical sitemap');

const sitemap = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');
const sitemapUrls = [...sitemap.matchAll(/<loc>(https:\/\/mealbets\.com(?:\/[^<]*)?)<\/loc>/g)].map((match) => match[1]);

assert.ok(sitemapUrls.length > 0, 'sitemap.xml must contain canonical URLs');
assert.equal(new Set(sitemapUrls).size, sitemapUrls.length, 'sitemap.xml contains duplicate URLs');

function localFileFor(url) {
  const pathname = new URL(url).pathname;
  return path.join(root, pathname === '/' ? 'index.html' : pathname.slice(1));
}

function contentValue(html, pattern, label, file) {
  const match = html.match(pattern);
  assert.ok(match, `${file}: missing ${label}`);
  return match[1].replace(/<[^>]*>/g, '').trim();
}

for (const url of sitemapUrls) {
  const file = localFileFor(url);
  const relativeFile = path.relative(root, file);
  assert.ok(fs.existsSync(file), `sitemap URL has no local file: ${relativeFile}`);

  const html = fs.readFileSync(file, 'utf8');
  const title = contentValue(html, /<title>([\s\S]*?)<\/title>/i, 'title', relativeFile);
  const description = contentValue(
    html,
    /<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i,
    'meta description',
    relativeFile
  );
  const canonical = contentValue(
    html,
    /<link\s+rel=["']canonical["']\s+href=["']([^"']+)["']/i,
    'canonical URL',
    relativeFile
  );
  const h1Count = (html.match(/<h1(?:\s|>)/gi) || []).length;

  assert.ok(title.length >= 20 && title.length <= 70, `${relativeFile}: title length is ${title.length}`);
  assert.ok(description.length >= 70 && description.length <= 170, `${relativeFile}: description length is ${description.length}`);
  assert.equal(canonical, url, `${relativeFile}: canonical must match its sitemap URL`);
  assert.equal(h1Count, 1, `${relativeFile}: expected exactly one h1, found ${h1Count}`);
  assert.ok(!/<meta\s+name=["']robots["'][^>]*noindex/i.test(html), `${relativeFile}: sitemap page is noindex`);
  assert.ok(!html.includes('https://www.mealbets.com'), `${relativeFile}: found a non-canonical www URL`);

  const htmlWithoutComments = html.replace(/<!--[\s\S]*?-->/g, '');
  for (const match of htmlWithoutComments.matchAll(/(?:href|src)=["']([^"']+)["']/gi)) {
    const reference = match[1].replaceAll('&amp;', '&');
    if (/^(?:#|mailto:|tel:|data:|javascript:)/i.test(reference)) continue;

    const resolved = new URL(reference, url);
    if (resolved.origin !== canonicalOrigin) continue;

    const linkedFile = localFileFor(resolved.href);
    assert.ok(
      fs.existsSync(linkedFile),
      `${relativeFile}: local reference does not exist: ${reference}`
    );
  }

  for (const [index, match] of [...html.matchAll(/<script\s+type=["']application\/ld\+json["']>([\s\S]*?)<\/script>/gi)].entries()) {
    try {
      JSON.parse(match[1]);
    } catch (error) {
      throw new Error(`${relativeFile}: invalid JSON-LD block ${index + 1}: ${error.message}`);
    }
  }
}

const campaignImages = new Set();
// This campaign is shared by its direct URL and intentionally has no inbound page links.
const standaloneCampaigns = new Set(['/campaign/monthly-giveaways.html']);
const publicPageUrls = ['', 'school', 'campaign'].flatMap((directory) =>
  fs.readdirSync(path.join(root, directory)).filter((file) => file.endsWith('.html'))
    .map((file) => new URL([directory, file].filter(Boolean).join('/'), `${canonicalOrigin}/`).href)
);
for (const url of sitemapUrls.filter((entry) => new URL(entry).pathname.startsWith('/campaign/'))) {
  const file = localFileFor(url);
  const label = path.relative(root, file);
  const html = fs.readFileSync(file, 'utf8');
  const tags = [...html.matchAll(/<meta\b[^>]*>/gi)].map(([tag]) => Object.fromEntries(
    [...tag.matchAll(/([\w:-]+)=["']([^"']*)["']/g)].map((match) => [match[1].toLowerCase(), match[2]])
  ));
  function meta(key) {
    const matches = tags.filter((tag) => tag.name === key || tag.property === key);
    assert.equal(matches.length, 1, `${label}: expected one ${key} meta tag`);
    assert.ok(matches[0].content, `${label}: empty ${key}`);
    return matches[0].content;
  }

  const title = contentValue(html, /<title>([\s\S]*?)<\/title>/i, 'title', label);
  assert.equal(meta('og:title'), title, `${label}: social title must match page title`);
  assert.equal(meta('twitter:title'), title, `${label}: Twitter title must match page title`);
  assert.equal(meta('og:url'), url, `${label}: social URL must match canonical`);
  assert.equal(meta('og:locale'), 'en_CA', `${label}: server-rendered locale must match English content`);
  assert.equal(meta('twitter:card'), 'summary_large_image', `${label}: expected large sharing card`);
  for (const key of ['og:description', 'twitter:description', 'og:image:alt', 'twitter:image:alt']) meta(key);
  assert.match(meta('robots'), /max-image-preview:large/, `${label}: expected large image previews`);

  const image = meta('og:image');
  assert.equal(new URL(image).origin, canonicalOrigin, `${label}: expected a locally hosted social image`);
  assert.equal(meta('twitter:image'), image, `${label}: sharing images must agree`);
  assert.ok(!campaignImages.has(image), `${label}: campaigns must have distinct sharing images`);
  campaignImages.add(image);
  assert.equal(meta('og:image:type'), 'image/png', `${label}: social image type must match PNG`);
  assert.equal(meta('og:image:width'), '1200', `${label}: social image width`);
  assert.equal(meta('og:image:height'), '630', `${label}: social image height`);
  assert.ok(fs.existsSync(localFileFor(image)), `${label}: missing social image`);
  const imageBytes = fs.readFileSync(localFileFor(image));
  assert.ok(imageBytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])), `${label}: invalid PNG`);
  assert.equal(imageBytes.readUInt32BE(16), 1200, `${label}: actual PNG width`);
  assert.equal(imageBytes.readUInt32BE(20), 630, `${label}: actual PNG height`);

  const graphs = [...html.matchAll(/<script\s+type=["']application\/ld\+json["']>([\s\S]*?)<\/script>/gi)]
    .flatMap((match) => { const data = JSON.parse(match[1]); return data['@graph'] || [data]; });
  const page = graphs.find((item) => item['@type'] === 'WebPage' && item.url === url);
  assert.ok(page, `${label}: missing canonical WebPage schema`);
  assert.equal(page.name, title, `${label}: schema title must match HTML`);
  const primaryImage = graphs.find((item) => item['@id'] === page.primaryImageOfPage?.['@id']);
  assert.equal(primaryImage?.url, image, `${label}: schema image must match sharing image`);
  assert.equal(primaryImage.width, 1200, `${label}: schema image width`);
  assert.equal(primaryImage.height, 630, `${label}: schema image height`);
  assert.ok(graphs.some((item) => item['@id'] === page.publisher?.['@id'] && item['@type'] === 'Organization'), `${label}: missing publisher`);
  assert.ok(graphs.some((item) => item['@id'] === page.isPartOf?.['@id'] && item['@type'] === 'WebSite'), `${label}: missing parent website`);

  const isStandalone = standaloneCampaigns.has(new URL(url).pathname);
  const hasIncomingLink = publicPageUrls.filter((source) => source !== url && (isStandalone || !new URL(source).pathname.startsWith('/campaign/'))).some((source) => {
    const sourceHtml = fs.readFileSync(localFileFor(source), 'utf8').replace(/<!--[\s\S]*?-->/g, '');
    return [...sourceHtml.matchAll(/<a\b[^>]*\bhref=["']([^"']+)["']/gi)].some((match) => {
      const linked = new URL(match[1].replaceAll('&amp;', '&'), source);
      linked.search = ''; linked.hash = '';
      return linked.href === url;
    });
  });
  if (isStandalone) {
    assert.ok(!hasIncomingLink, `${label}: standalone campaign must not have inbound page links`);
  } else {
    assert.ok(hasIncomingLink, `${label}: needs a crawlable link from a non-campaign page`);
  }
}

const utilityPages = [
  'download.html'
];

for (const relativeFile of utilityPages) {
  const html = fs.readFileSync(path.join(root, relativeFile), 'utf8');
  assert.match(html, /<meta\s+name=["']robots["'][^>]*noindex/i, `${relativeFile}: expected noindex`);
}

for (const relativeFile of fs.readdirSync(root).filter((file) => file.endsWith('.html'))) {
  const html = fs.readFileSync(path.join(root, relativeFile), 'utf8');
  assert.ok(!/<meta\s+name=["']keywords["']/i.test(html), `${relativeFile}: obsolete meta keywords found`);
}

console.log(`SEO checks passed for ${sitemapUrls.length} indexable pages`);
