"""Check translation coverage and switch installation using only Python's standard library."""
import json
import re
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
EXCLUDED = {'privacy-policy.html', 'terms-and-conditions.html'}
source = (ROOT / 'assets/i18n/zh-hans.js').read_text()
dictionary = json.loads(source.split('window.MEALBETS_ZH = ', 1)[1].rstrip(';\n'))

class PageText(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.skip = 0
        self.text = set()

    def add(self, value):
        value = re.sub(r'\s+', ' ', value).strip()
        if re.search('[a-zA-Z]', value):
            self.text.add(value)

    def handle_starttag(self, tag, attrs):
        if tag in ('script', 'style', 'svg', 'noscript'):
            self.skip += 1
        if not self.skip:
            for key, value in attrs:
                if key in ('alt', 'title', 'placeholder', 'aria-label'):
                    self.add(value or '')

    def handle_endtag(self, tag):
        if tag in ('script', 'style', 'svg', 'noscript'):
            self.skip -= 1

    def handle_data(self, data):
        if not self.skip:
            self.add(data)

count = 0
for page in [*ROOT.glob('*.html'), *(ROOT / 'school').glob('*.html')]:
    html = page.read_text()
    if page.name in EXCLUDED:
        assert 'language-switcher' not in html, f'{page.name}: legal page must remain excluded'
        continue
    for asset in ('language-switcher.js', 'language-switcher.css', 'zh-hans.js'):
        assert html.count(asset) == 1, f'{page.name}: expected one {asset}'
    parser = PageText()
    parser.feed(html)
    missing = sorted(parser.text - dictionary.keys())
    assert not missing, f'{page.relative_to(ROOT)}: missing translations: {missing}'
    count += 1
assert all(isinstance(value, str) and value for value in dictionary.values())
print(f'Translation coverage passed for {count} pages; legal pages excluded.')
