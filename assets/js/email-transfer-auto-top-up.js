(() => {
  'use strict';
  const button = document.getElementById('copy-email');
  const email = document.getElementById('transfer-email');
  const status = document.getElementById('copy-status');
  button.addEventListener('click', async () => {
    status.textContent = '';
    try {
      await navigator.clipboard.writeText(email.textContent.trim());
      status.textContent = 'Email address copied!';
    } catch {
      const range = document.createRange();
      range.selectNodeContents(email);
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
      status.textContent = 'Please copy the selected email address manually.';
    }
  });
})();
