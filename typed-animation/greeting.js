(function () {
  const target = document.getElementById('typedGreeting') || document.querySelector('.site-title .accent');
  if (!target) return;

  const caret = document.getElementById('typedCaret');

  // Prevent double-initialization if multiple scripts run
  if (target.dataset.typedInit === 'true') return;
  target.dataset.typedInit = 'true';

  function safeParseUser() {
    try {
      const raw = window.localStorage && window.localStorage.getItem('authUser');
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  function buildGreeting(username) {
    const clean = String(username || '').trim();
    return clean ? `Hi there ! ${clean}` : 'Hi there !';
  }

  function runTyping(finalText) {
    // allow re-run
    target.textContent = '';
    if (caret) caret.style.display = 'inline-block';

    let i = 0;
    const minDelay = 150;
    const maxDelay = 170;

    function tick() {
      i += 1;
      target.textContent = finalText.slice(0, i);

      if (i >= finalText.length) {
        target.textContent = finalText;
        return;
      }

      const jitter = Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay;
      window.setTimeout(tick, jitter);
    }

    window.setTimeout(tick, 250);
  }

  // expose for script.js to call after login
  window.updateTypedGreetingUsername = function (username) {
    runTyping(buildGreeting(username));
  };

  const existingUser = safeParseUser();
  const finalText = buildGreeting(existingUser && existingUser.username);

  runTyping(finalText);
})();
