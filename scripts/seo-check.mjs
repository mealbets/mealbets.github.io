import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const canonicalOrigin = 'https://mealbets.com';
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

  for (const [index, match] of [...html.matchAll(/<script\s+type=["']application\/ld\+json["']>([\s\S]*?)<\/script>/gi)].entries()) {
    try {
      JSON.parse(match[1]);
    } catch (error) {
      throw new Error(`${relativeFile}: invalid JSON-LD block ${index + 1}: ${error.message}`);
    }
  }
}

const utilityPages = [
  'download.html',
  'inf-download.html',
  'sample-inner-page.html',
  'school/flyer.html'
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
