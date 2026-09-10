# English / Simplified Chinese

All public HTML pages except `privacy-policy.html` and `terms-and-conditions.html`
load `zh-hans.js`, `language-switcher.js`, and `language-switcher.css`.

The bottom-left language control changes text in place without replacing elements,
forms, event listeners, or images. English HTML remains the source. Chinese strings
are maintained in `zh-hans.js`, keyed by English text with whitespace collapsed.
Proper names, addresses, contact details, promo codes, and store brands intentionally
retain their original spelling. Embedded images, maps, and PDFs are not translated.

Language precedence: explicit `?lang=en-CA` or `?lang=zh-Hans`, then saved preference,
then English. The switch preserves the URL's other parameters and anchor. Internal
page clicks carry the chosen language; policy pages remain English and have no switch.
No translation service, API key, or network request is needed for translation.

## Updating content

1. Edit the English HTML.
2. Add or update corresponding keys in `zh-hans.js`. Keep prices, dates, names and
   claims consistent with the English source. Translate each text fragment around
   inline links/emphasis so the complete sentence reads correctly.
3. Run `python3 scripts/i18n-check.py` and `node scripts/seo-check.mjs`.
4. Serve the repository locally, open `scripts/language-switcher.test.html`, and
   check for PASS. Review changed pages in both languages at desktop/mobile widths.

New pages need the same three asset tags (use paths relative to the page). The
coverage check discovers root and `school/` HTML automatically. Add translations
for dynamically generated messages too; the observer localizes supported messages.

This provides live viewing translations, not separate indexable Chinese HTML pages.
Canonical URLs and structured data stay English; no `hreflang` alternates are claimed.
