/* Shared in-page English / Simplified Chinese localization. No external service. */
(() => {
  'use strict';
  const excluded = /\/(?:privacy-policy|terms-and-conditions)\.html$/;
  if (excluded.test(location.pathname)) return;
  const dictionary = window.MEALBETS_ZH;
  if (!dictionary) return;
  const storageKey = 'mealbets-language';
  const normalize = value => value.replace(/\s+/g, ' ').trim();
  const canonicalLanguage = value => value === 'zh' || value === 'zh-Hans' ? 'zh-Hans' : value === 'en' || value === 'en-CA' ? 'en-CA' : null;
  const originals = new WeakMap();
  const attributes = ['alt', 'title', 'placeholder', 'aria-label'];
  const ignored = 'script, style, noscript, svg, [translate="no"], [data-language-switcher]';
  let language;
  let scheduled = false;
  let saved;
  try { saved = localStorage.getItem(storageKey); } catch { /* Storage may be disabled. */ }

  const switcher = document.createElement('nav');
  switcher.dataset.languageSwitcher = '';
  switcher.className = 'mb-language-switcher';
  switcher.setAttribute('aria-label', 'Language / 语言');
  switcher.innerHTML = '<span aria-hidden="true">文 / A</span><button type="button" lang="en-CA" data-language="en-CA">English</button><button type="button" lang="zh-Hans" data-language="zh-Hans">简体中文</button>';
  const status = document.createElement('span');
  status.className = 'mb-language-status';
  status.setAttribute('role', 'status');
  switcher.append(status);
  document.body.append(switcher);
  document.body.classList.add('mb-has-language-switcher');

  function translated(value) {
    const key = normalize(value);
    if (language !== 'zh-Hans' || !Object.hasOwn(dictionary, key)) return value;
    const leading = value.match(/^\s*/)[0];
    const trailing = value.match(/\s*$/)[0];
    return leading + dictionary[key] + trailing;
  }

  function update(node, key, read, write) {
    let records = originals.get(node);
    if (!records) { records = new Map(); originals.set(node, records); }
    const current = read();
    let record = records.get(key);
    // A page script may replace text (for example, the copy-code confirmation).
    if (!record || current !== record.rendered) record = { english: current, rendered: current };
    const next = translated(record.english);
    if (current !== next) write(next);
    record.rendered = next;
    records.set(key, record);
  }

  const observer = new MutationObserver(() => {
    if (scheduled) return;
    scheduled = true;
    queueMicrotask(() => { scheduled = false; render(); });
  });

  function render() {
    observer.disconnect();
    const walker = document.createTreeWalker(document.documentElement, NodeFilter.SHOW_TEXT, {
      acceptNode: node => node.parentElement?.closest(ignored) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT
    });
    let node;
    while ((node = walker.nextNode())) {
      const textNode = node;
      if (textNode.nodeValue.trim()) update(textNode, 'text', () => textNode.nodeValue, value => { textNode.nodeValue = value; });
    }
    document.querySelectorAll('[alt], [title], [placeholder], [aria-label]').forEach(element => {
      if (element.closest(ignored)) return;
      attributes.forEach(attribute => {
        if (element.hasAttribute(attribute)) update(element, attribute, () => element.getAttribute(attribute), value => element.setAttribute(attribute, value));
      });
    });
    document.documentElement.lang = language;
    switcher.querySelectorAll('button').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.language === language)));
    observer.observe(document.documentElement, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: attributes });
  }

  function select(value, announce = false) {
    language = value;
    try { localStorage.setItem(storageKey, language); } catch { /* URL still preserves the selection. */ }
    const url = new URL(location.href);
    url.searchParams.set('lang', language);
    try { history.replaceState(history.state, '', url); } catch { /* Local file previews may restrict history. */ }
    render();
    if (announce) status.textContent = language === 'zh-Hans' ? '已切换为简体中文' : 'Switched to English';
  }

  switcher.addEventListener('click', event => {
    const button = event.target.closest('button[data-language]');
    if (button) select(button.dataset.language, true);
  });
  // Preserve language even when storage is unavailable. Do not modify downloads,
  // external links, anchors, or the excluded English-only legal pages.
  document.addEventListener('click', event => {
    const link = event.target.closest('a[href]');
    if (!link || link.hasAttribute('download') || link.getAttribute('href').startsWith('#')) return;
    const url = new URL(link.href, location.href);
    if (url.origin !== location.origin || !['http:', 'https:', 'file:'].includes(url.protocol) || excluded.test(url.pathname)) return;
    if (!url.pathname.endsWith('/') && !url.pathname.endsWith('.html')) return;
    url.searchParams.set('lang', language);
    link.href = url.href;
  });
  window.addEventListener('storage', event => {
    if (event.key === storageKey && canonicalLanguage(event.newValue)) select(canonicalLanguage(event.newValue));
  });
  window.addEventListener('popstate', () => select(canonicalLanguage(new URLSearchParams(location.search).get('lang')) || 'en-CA'));
  select(canonicalLanguage(new URLSearchParams(location.search).get('lang')) || canonicalLanguage(saved) || 'en-CA');
})();
