import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('./redirect-www.js', import.meta.url), 'utf8');
const context = vm.createContext({});
vm.runInContext(source, context);

function request(host, uri = '/', query = undefined) {
  return {
    headers: { host: { value: host } },
    uri,
    querystring: {},
    rawQueryString() {
      return query;
    }
  };
}

const apexRequest = request('mealbets.com', '/faq.html');
assert.equal(context.handler({ request: apexRequest }), apexRequest);

const redirect = context.handler({
  request: request('www.mealbets.com', '/school/sample-menu.html', 'utm_source=school&utm_medium=email')
});
assert.equal(redirect.statusCode, 301);
assert.equal(
  redirect.headers.location.value,
  'https://mealbets.com/school/sample-menu.html?utm_source=school&utm_medium=email'
);

const emptyQueryRedirect = context.handler({
  request: request('WWW.MEALBETS.COM', '/', '')
});
assert.equal(emptyQueryRedirect.headers.location.value, 'https://mealbets.com/?');

console.log('redirect-www CloudFront Function tests passed');
