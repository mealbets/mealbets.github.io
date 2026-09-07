import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root = path.resolve(import.meta.dirname, '..');
const source = fs.readFileSync(path.join(root, 'assets/js/canonical-host.js'), 'utf8');

function redirectFor(url) {
  const currentUrl = new URL(url);
  let replacement;
  const location = {
    href: currentUrl.href,
    hostname: currentUrl.hostname,
    replace(value) {
      replacement = value;
    }
  };

  vm.runInNewContext(source, { URL, window: { location } });
  return replacement;
}

assert.equal(
  redirectFor('http://www.mealbets.com/school/sample-menu.html?utm_source=flyer#meals'),
  'https://mealbets.com/school/sample-menu.html?utm_source=flyer#meals'
);
assert.equal(redirectFor('https://www.mealbets.com/'), 'https://mealbets.com/');
assert.equal(redirectFor('https://mealbets.com/faq.html'), undefined);
assert.equal(redirectFor('https://www.mealbets.com.example/'), undefined);

const pages = [
  '404.html',
  'download.html',
  'faq.html',
  'index.html',
  'inf-download.html',
  'privacy-policy.html',
  'sample-inner-page.html',
  'school/flyer.html',
  'school/food-safety.html',
  'school/how-to-order.html',
  'school/pricing-and-portions.html',
  'school/sample-menu.html',
  'school/school-lunch-program.html',
  'school/service-areas.html',
  'terms-and-conditions.html'
];

for (const page of pages) {
  const html = fs.readFileSync(path.join(root, page), 'utf8');
  assert.match(html, /<script\s+src=["']\/assets\/js\/canonical-host\.js["']><\/script>/i, `${page}: missing canonical-host script`);
}

console.log('canonical-host browser redirect tests passed');
