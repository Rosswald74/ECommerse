// Flash sale slider + dots + countdown with animated track
(function () {
  const slider = document.getElementById('flashSlider');
  const track = slider && slider.querySelector('.flash-track');
  const dotsWrap = document.getElementById('flashDots');
  const timerEl = document.getElementById('flashTimer');
  const cartBtn = document.getElementById('cartBtn');
  if (!slider || !track || !dotsWrap) return;

  const slides = Array.from(track.children);
  const perPage = 2;
  const pages = Math.ceil(slides.length / perPage);

  // create dots for pages
  for (let i = 0; i < pages; i++) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.addEventListener('click', () => goTo(i));
    dotsWrap.appendChild(btn);
  }
  const dots = Array.from(dotsWrap.children);

  let page = 0;
  let autoplay = null;

  function updateTrack() {
    // compute actual slide width + gap so we align each page precisely
    const computed = getComputedStyle(track);
    const gap = parseFloat(computed.gap) || 12;
    const firstSlide = slides[0];
    const slideWidth = firstSlide
      ? firstSlide.getBoundingClientRect().width
      : (slider.clientWidth - gap) / perPage;

    const step = slideWidth + gap; // distance between slide starts
    const desired = page * perPage * step;
    const lastOffset = Math.max(0, (slides.length - perPage) * step);
    const offset = Math.min(desired, lastOffset);

    track.style.transform = `translateX(-${offset}px)`;
    dots.forEach((d, i) => d.classList.toggle('active', i === page));
  }

  function goTo(i) {
    page = ((i % pages) + pages) % pages;
    updateTrack();
    resetAutoplay();
  }

  function next() { goTo(page + 1); }

  function resetAutoplay() {
    if (autoplay) clearInterval(autoplay);
    autoplay = setInterval(next, 3000);
  }

  // respond to resize
  let resizeTimer = null;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(updateTrack, 120);
  });

  // promo button opens promo modal
  const promoBtn = document.getElementById('promoBtn');
  const promoModal = document.getElementById('promoModal');
  const cartModal = document.getElementById('cartModal');
  const authModal = document.getElementById('authModal');
  const appMessageModal = document.getElementById('appMessageModal');
  const appMessageTitle = document.getElementById('appMessageTitle');
  const appMessageText = document.getElementById('appMessageText');
  const appMessageMedia = document.getElementById('appMessageMedia');
  const appMessageImage = document.getElementById('appMessageImage');
  const cartBadge = document.getElementById('cartBadge');
  const loginBtn = document.getElementById('loginBtn');
  const checkoutBtn = document.getElementById('checkoutBtn');
  const checkoutModal = document.getElementById('checkoutModal');
  const cartTotalText = document.getElementById('cartTotalText');
  const deliveryAddressRow = document.getElementById('deliveryAddressRow');
  const deliveryPickupRow = document.getElementById('deliveryPickupRow');
  const deliveryAddressInput = document.getElementById('deliveryAddress');
  const checkoutTotalText = document.getElementById('checkoutTotalText');
  const checkoutDeliveryText = document.getElementById('checkoutDeliveryText');
  const checkoutQr = document.getElementById('checkoutQr');
  const checkoutQrHint = document.getElementById('checkoutQrHint');
  const paymentDoneBtn = document.getElementById('paymentDoneBtn');

  const deliveryState = {
    method: 'address',
    address: '',
  };

  function parseRpToNumber(value) {
    const digits = String(value || '').replace(/[^\d]/g, '');
    return digits ? Number(digits) : 0;
  }

  function formatRp(amount) {
    const n = Math.max(0, Math.round(Number(amount) || 0));
    return 'Rp' + n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }

  function computeCartTotal() {
    return cart.reduce((sum, item) => sum + parseRpToNumber(item && item.price), 0);
  }

  function updateCartSummaryUI() {
    const total = computeCartTotal();
    if (cartTotalText) cartTotalText.textContent = formatRp(total);

    if (deliveryAddressRow && deliveryPickupRow) {
      const isAddress = deliveryState.method === 'address';
      deliveryAddressRow.hidden = !isAddress;
      deliveryPickupRow.hidden = isAddress;
    }
  }

  function initDeliveryControls() {
    const radios = Array.from(document.querySelectorAll('input[name="deliveryMethod"]'));
    radios.forEach((r) => {
      r.addEventListener('change', () => {
        const next = r && r.checked ? r.value : null;
        if (next === 'address' || next === 'pickup') {
          deliveryState.method = next;
          updateCartSummaryUI();
        }
      });
    });

    if (deliveryAddressInput) {
      deliveryAddressInput.addEventListener('input', () => {
        deliveryState.address = String(deliveryAddressInput.value || '').trim();
      });
    }

    // set initial state
    updateCartSummaryUI();
  }

  function openModal(modal) {
    modal.setAttribute('aria-hidden', 'false');
  }
  function closeModal(modal) {
    modal.setAttribute('aria-hidden', 'true');
  }

  let appMessageOkHandler = null;

  function showAppMessage(message, title, options) {
    if (!appMessageModal || !appMessageText) return;
    if (appMessageTitle) appMessageTitle.textContent = title || 'Notice';
    appMessageText.textContent = String(message || '');
    appMessageOkHandler = options && typeof options.onOk === 'function' ? options.onOk : null;

    const imageSrc = options && typeof options.imageSrc === 'string' ? options.imageSrc.trim() : '';
    if (appMessageMedia && appMessageImage) {
      if (imageSrc) {
        appMessageImage.src = imageSrc;
        appMessageImage.alt = title ? String(title) : 'Message';
        appMessageMedia.hidden = false;
      } else {
        appMessageImage.removeAttribute('src');
        appMessageImage.alt = '';
        appMessageMedia.hidden = true;
      }
    }

    openModal(appMessageModal);
  }

  async function postJson(url, payload) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload || {}),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = data && data.message ? data.message : 'Request gagal.';
      const err = new Error(msg);
      err.status = res.status;
      err.errors = data && typeof data.errors === 'object' ? data.errors : null;
      throw err;
    }
    return data;
  }

  async function postNoBody(url) {
    const res = await fetch(url, { method: 'POST' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = data && data.message ? data.message : 'Request gagal.';
      throw new Error(msg);
    }
    return data;
  }

  // close handlers for app message modal
  if (appMessageModal) {
    const okBtn = appMessageModal.querySelector('[data-app-ok]');
    const closeEls = appMessageModal.querySelectorAll('[data-app-close]');

    if (okBtn) {
      okBtn.addEventListener('click', () => {
        const handler = appMessageOkHandler;
        appMessageOkHandler = null;
        closeModal(appMessageModal);
        if (handler) handler();
      });
    }

    closeEls.forEach((el) => {
      el.addEventListener('click', () => {
        appMessageOkHandler = null;
        closeModal(appMessageModal);
      });
    });
  }

  function safeGetAuthUser() {
    try {
      const raw = window.localStorage && window.localStorage.getItem('authUser');
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  function updateAuthUI() {
    const user = safeGetAuthUser();
    if (loginBtn) {
      loginBtn.textContent = user && user.username ? `Logout (${user.username})` : 'Login';
    }
  }

  function setAuthUser(user) {
    try {
      window.localStorage && window.localStorage.setItem('authUser', JSON.stringify(user));
    } catch {
      // ignore storage errors
    }

    if (typeof window.updateTypedGreetingUsername === 'function') {
      window.updateTypedGreetingUsername(user && user.username);
    }

    updateAuthUI();
  }

  function clearAuthUser() {
    try {
      window.localStorage && window.localStorage.removeItem('authUser');
    } catch {
      // ignore
    }

    if (typeof window.updateTypedGreetingUsername === 'function') {
      window.updateTypedGreetingUsername('');
    }

    updateAuthUI();
  }

  function openAuthLogin() {
    if (!authModal) return;
    const loginTab = authModal.querySelector('[data-auth-tab="login"]');
    if (loginTab) loginTab.click();
    openModal(authModal);
  }

  function requireLoginOrPrompt(message) {
    const user = safeGetAuthUser();
    if (user) return true;

    // show warning first; open login ONLY after user clicks OK
    showAppMessage(message || 'Kamu harus login dulu.', 'Info', { onOk: openAuthLogin });
    return false;
  }

  if (promoBtn && promoModal) {
    promoBtn.addEventListener('click', () => openModal(promoModal));
  }

  // cart button requires login
  if (cartBtn && cartModal) {
    cartBtn.addEventListener('click', () => {
      if (!requireLoginOrPrompt('Kamu harus login dulu untuk membuka keranjang.')) return;
      openModal(cartModal);
    });
  }

  // checkout requires login
  if (checkoutBtn) {
    checkoutBtn.addEventListener('click', () => {
      if (!requireLoginOrPrompt('Kamu harus login dulu untuk checkout.')) return;
      if (!cart.length) {
        showAppMessage('Keranjang masih kosong.', 'Info');
        return;
      }

      // validate delivery
      if (deliveryState.method === 'address') {
        const addr = String((deliveryAddressInput && deliveryAddressInput.value) || deliveryState.address || '').trim();
        deliveryState.address = addr;
        if (!addr) {
          showAppMessage('Silakan isi alamat pengiriman dulu.', 'Delivery');
          return;
        }
      }

      const total = computeCartTotal();
      if (checkoutTotalText) checkoutTotalText.textContent = formatRp(total);

      if (checkoutDeliveryText) {
        checkoutDeliveryText.textContent =
          deliveryState.method === 'pickup'
            ? 'Delivery: Pickup'
            : `Delivery: ${deliveryState.address}`;
      }

      if (checkoutQr) {
        const user = safeGetAuthUser();
        const payload = {
          username: user && user.username ? user.username : undefined,
          total: formatRp(total),
          method: deliveryState.method,
          address: deliveryState.method === 'address' ? deliveryState.address : undefined,
        };
        const data = encodeURIComponent(JSON.stringify(payload));
        checkoutQr.src = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${data}`;
        if (checkoutQrHint) checkoutQrHint.hidden = false;
        checkoutQr.onload = () => { if (checkoutQrHint) checkoutQrHint.hidden = true; };
        checkoutQr.onerror = () => { if (checkoutQrHint) checkoutQrHint.hidden = false; };
      }

      if (checkoutModal) openModal(checkoutModal);
    });
  }

  if (paymentDoneBtn) {
    paymentDoneBtn.addEventListener('click', async () => {
      if (!requireLoginOrPrompt('Kamu harus login dulu.')) return;
      if (!cart.length) {
        showAppMessage('Keranjang masih kosong.', 'Info');
        return;
      }

      // validate delivery one more time before creating order
      if (deliveryState.method === 'address') {
        const addr = String((deliveryAddressInput && deliveryAddressInput.value) || deliveryState.address || '').trim();
        deliveryState.address = addr;
        if (!addr) {
          showAppMessage('Silakan isi alamat pengiriman dulu.', 'Delivery');
          return;
        }
      }

      const user = safeGetAuthUser();
      const userId = user && (user.user_id ?? user.id);
      if (!userId) {
        showAppMessage('User belum login atau user id tidak ditemukan.', 'Info');
        return;
      }

      const btn = paymentDoneBtn;
      const prevText = btn.textContent;
      btn.disabled = true;
      btn.textContent = 'Memproses...';

      try {
        // Build order payload from cart
        // Note: current cart items only have {name, price}. Backend will resolve products by `produk.nama`.
        const items = cart.map((c) => ({
          name: c && c.name ? String(c.name) : '',
          quantity: 1,
        }));

        const result = await postJson('/orders', {
          userId,
          deliveryMethod: deliveryState.method,
          deliveryAddress: deliveryState.method === 'address' ? deliveryState.address : undefined,
          items,
          paymentMethod: 'qr',
        });

        if (checkoutModal) closeModal(checkoutModal);
        if (cartModal) closeModal(cartModal);

        // clear cart only after server confirms
        cart.length = 0;
        document.querySelectorAll('.add-cart.added').forEach((b) => b.classList.remove('added'));
        renderCartItems();
        updateCartUI();

        showAppMessage(
          `Pesanan tersimpan. Order ID: ${result && result.orderId ? result.orderId : '-'}\nTotal: ${formatRp(result && result.totalAmount ? result.totalAmount : computeCartTotal())}`,
          'Sukses',
          { imageSrc: 'image/Tak berjudul17_20251225154414.png' }
        );
      } catch (err) {
        showAppMessage(err && err.message ? err.message : 'Gagal menyimpan order.', 'Checkout');
      } finally {
        btn.disabled = false;
        btn.textContent = prevText;
      }
    });
  }

  // auth tab switching (login/register)
  if (authModal) {
    const tabs = Array.from(authModal.querySelectorAll('[data-auth-tab]'));
    const panels = Array.from(authModal.querySelectorAll('[data-auth-panel]'));

    function isValidEmail(value) {
      const v = String(value || '').trim();
      if (!v) return false;
      // simple email sanity check; avoid over-strict RFC parsing
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
    }

    function getOrCreateFieldErrorEl(input) {
      if (!input || !input.parentElement) return null;
      const next = input.nextElementSibling;
      if (next && next.classList && next.classList.contains('auth-field-error')) return next;
      const el = document.createElement('div');
      el.className = 'auth-field-error';
      el.setAttribute('role', 'alert');
      el.setAttribute('aria-live', 'polite');
      el.hidden = true;
      input.insertAdjacentElement('afterend', el);
      return el;
    }

    function clearFieldError(input) {
      if (!input) return;
      input.classList.remove('is-invalid');
      input.removeAttribute('aria-invalid');
      const next = input.nextElementSibling;
      if (next && next.classList && next.classList.contains('auth-field-error')) {
        next.textContent = '';
        next.hidden = true;
      }
    }

    function setFieldError(input, message) {
      if (!input) return;
      input.classList.add('is-invalid');
      input.setAttribute('aria-invalid', 'true');
      const el = getOrCreateFieldErrorEl(input);
      if (el) {
        el.textContent = String(message || 'Input tidak valid.');
        el.hidden = false;
      }
    }

    function getFormErrorEl(form) {
      if (!form) return null;
      return form.querySelector('[data-auth-form-error]');
    }

    function clearFormError(form) {
      const el = getFormErrorEl(form);
      if (!el) return;
      el.textContent = '';
      el.hidden = true;
    }

    function setFormError(form, message) {
      const el = getFormErrorEl(form);
      if (!el) return;
      el.textContent = String(message || 'Terjadi kesalahan.');
      el.hidden = false;
    }

    function clearAllAuthErrors(form) {
      if (!form) return;
      clearFormError(form);
      Array.from(form.querySelectorAll('input')).forEach(clearFieldError);
    }

    function attachClearOnInput(form) {
      if (!form) return;
      Array.from(form.querySelectorAll('input')).forEach((input) => {
        input.addEventListener('input', () => {
          clearFieldError(input);
          clearFormError(form);
        });
        input.addEventListener('blur', () => {
          // on blur, keep it permissive; only clear stale errors
          clearFieldError(input);
        });
      });
    }

    function applyServerErrorsToForm(form, errors) {
      if (!form || !errors || typeof errors !== 'object') return;
      Object.keys(errors).forEach((name) => {
        const input = form.querySelector(`input[name="${CSS.escape(name)}"]`);
        const msg = errors[name];
        if (input && msg) setFieldError(input, msg);
      });
    }

    function setAuthMode(mode) {
      tabs.forEach((t) => {
        const active = t.dataset.authTab === mode;
        t.classList.toggle('is-active', active);
        t.setAttribute('aria-selected', active ? 'true' : 'false');
      });

      panels.forEach((p) => {
        const isMatch = p.dataset.authPanel === mode;
        p.hidden = !isMatch;

        // clear errors when switching panels
        if (isMatch) {
          clearAllAuthErrors(p);
        }
      });
    }

    tabs.forEach((t) => t.addEventListener('click', () => setAuthMode(t.dataset.authTab)));
    setAuthMode('login');

    // login button = login (if logged out) OR logout (if logged in)
    if (loginBtn) {
      loginBtn.addEventListener('click', () => {
        const user = safeGetAuthUser();
        if (user) {
          clearAuthUser();
          if (authModal.getAttribute('aria-hidden') === 'false') closeModal(authModal);
          showAppMessage('Logout berhasil.', 'Info');
          return;
        }

        setAuthMode('login');
        openModal(authModal);
      });
    }

    // inline switches (e.g. "Sign up")
    authModal.querySelectorAll('[data-auth-switch]').forEach((el) => {
      el.addEventListener('click', () => {
        const mode = el.getAttribute('data-auth-switch');
        if (mode) setAuthMode(mode);
      });
    });

    // LOGIN submit
    const loginForm = authModal.querySelector('form[data-auth-panel="login"]');
    if (loginForm) {
      attachClearOnInput(loginForm);
      loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        clearAllAuthErrors(loginForm);
        const formData = new FormData(loginForm);
        const email = String(formData.get('email') || '').trim();
        const password = String(formData.get('password') || '').trim();

        let hasError = false;
        const emailInput = loginForm.querySelector('input[name="email"]');
        const passwordInput = loginForm.querySelector('input[name="password"]');

        if (!email) {
          setFieldError(emailInput, 'Email wajib diisi.');
          hasError = true;
        } else if (!isValidEmail(email)) {
          setFieldError(emailInput, 'Format email tidak valid.');
          hasError = true;
        }

        if (!password) {
          setFieldError(passwordInput, 'Password wajib diisi.');
          hasError = true;
        }

        if (hasError) return;

        try {
          const result = await postJson('/customer/login', { email, password });
          if (result && result.user) {
            setAuthUser(result.user);
          }
          closeModal(authModal);
        } catch (err) {
          if (err && err.errors) {
            applyServerErrorsToForm(loginForm, err.errors);
            setFormError(loginForm, err.message || 'Login gagal.');
            return;
          }
          setFormError(loginForm, err && err.message ? err.message : 'Login gagal.');
        }
      });
    }

    // REGISTER submit (sync with app.post("/customer/create"...))
    const registerForm = authModal.querySelector('form[data-auth-panel="register"]');
    if (registerForm) {
      attachClearOnInput(registerForm);
      registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        clearAllAuthErrors(registerForm);
        const formData = new FormData(registerForm);
        const username = String(formData.get('username') || '').trim();
        const email = String(formData.get('email') || '').trim();
        const password = String(formData.get('password') || '').trim();

        let hasError = false;
        const usernameInput = registerForm.querySelector('input[name="username"]');
        const emailInput = registerForm.querySelector('input[name="email"]');
        const passwordInput = registerForm.querySelector('input[name="password"]');

        if (!username) {
          setFieldError(usernameInput, 'Username wajib diisi.');
          hasError = true;
        } else if (username.length < 3) {
          setFieldError(usernameInput, 'Username minimal 3 karakter.');
          hasError = true;
        }

        if (!email) {
          setFieldError(emailInput, 'Email wajib diisi.');
          hasError = true;
        } else if (!isValidEmail(email)) {
          setFieldError(emailInput, 'Format email tidak valid.');
          hasError = true;
        }

        if (!password) {
          setFieldError(passwordInput, 'Password wajib diisi.');
          hasError = true;
        } else if (password.length < 6) {
          setFieldError(passwordInput, 'Password minimal 6 karakter.');
          hasError = true;
        }

        if (hasError) return;

        try {
          await postJson('/customer/create', { username, email, password });
          showAppMessage('Register berhasil. Silakan login.', 'Register');
          setAuthMode('login');
          registerForm.reset();
        } catch (err) {
          if (err && err.errors) {
            applyServerErrorsToForm(registerForm, err.errors);
            setFormError(registerForm, err.message || 'Register gagal.');
            return;
          }
          setFormError(registerForm, err && err.message ? err.message : 'Register gagal.');
        }
      });
    }
  }

  // init auth UI state on load
  updateAuthUI();

  // modal close handlers (overlay and close buttons)
  document.querySelectorAll('.modal [data-close]').forEach(el => {
    el.addEventListener('click', (e) => {
      const modal = el.closest('.modal');
      if (modal) closeModal(modal);
    });
  });

  // cart data & add-to-cart handling
  const cart = [];
  
  let pauseCartAnimPending = false;
  let cartAnimListenerAttached = false;
  let pendingCartIconSrc = null;

  function parseMatrix(transform) {
    if (!transform || transform === 'none') return { kind: 'none' };
    const m = transform.match(/^matrix\(([^)]+)\)$/);
    if (m) {
      const parts = m[1].split(',').map(s => Number(s.trim()));
      if (parts.length === 6 && parts.every(n => Number.isFinite(n))) {
        const [a, b, c, d, tx, ty] = parts;
        return { kind: '2d', a, b, c, d, tx, ty };
      }
    }
    const m3 = transform.match(/^matrix3d\(([^)]+)\)$/);
    if (m3) {
      const parts = m3[1].split(',').map(s => Number(s.trim()));
      if (parts.length === 16 && parts.every(n => Number.isFinite(n))) {
        // tx,ty,tz are indices 12,13,14 (m41,m42,m43)
        return { kind: '3d', a: parts[0], d: parts[5], tx: parts[12], ty: parts[13] };
      }
    }
    return { kind: 'unknown' };
  }

  function isAtCartAnimStart() {
    if (!cartBtn) return false;
    const img = cartBtn.querySelector('img');
    if (!img) return false;

    const btnT = parseMatrix(getComputedStyle(cartBtn).transform);
    const imgT = parseMatrix(getComputedStyle(img).transform);

    const btnAtOrigin =
      btnT.kind === 'none' ||
      (btnT.kind === '2d' && Math.abs(btnT.tx) < 0.5) ||
      (btnT.kind === '3d' && Math.abs(btnT.tx) < 0.5);

    // image not flipped when scaleX is positive (a ~ 1)
    const imgNotFlipped =
      imgT.kind === 'none' ||
      (imgT.kind === '2d' && imgT.a > 0.5) ||
      (imgT.kind === '3d' && imgT.a > 0.5);

    return btnAtOrigin && imgNotFlipped;
  }

  function pauseCartAnimNow() {
    if (!cartBtn) return;
    cartBtn.classList.add('is-paused');
    pauseCartAnimPending = false;
  }

  function applyPendingCartIcon() {
    if (!cartBtn) return;
    if (!pendingCartIconSrc) return;
    const img = cartBtn.querySelector('img');
    if (!img) return;
    img.src = pendingCartIconSrc;
    pendingCartIconSrc = null;
  }

  function ensureCartAnimIterationListener() {
    if (!cartBtn || cartAnimListenerAttached) return;
    cartAnimListenerAttached = true;
    cartBtn.addEventListener('animationiteration', () => {
      // wait a frame so the animation has reset to its 0% state,
      // then freeze it at the true "start" position.
      requestAnimationFrame(() => {
        // apply deferred icon swap at the reset point
        applyPendingCartIcon();

        // pause only after we reached the reset point
        if (pauseCartAnimPending) pauseCartAnimNow();
      });
    });
  }

  function updateCartUI() {
    if (cartBadge) {
      cartBadge.textContent = String(cart.length);
      cartBadge.style.display = cart.length ? 'inline-grid' : 'none';
    }
    if (cartBtn) {
      const desiredIconSrc = cart.length
        ? 'image/Tak berjudul20_20251225154303.png'
        : 'image/Tak berjudul21_20251225154252.png';

      // Change the icon ONLY when the animation is at its start/reset position.
      // This prevents the cart button from swapping images mid-animation.
      ensureCartAnimIterationListener();
      if (cartBtn.classList.contains('is-paused') || isAtCartAnimStart()) {
        pendingCartIconSrc = null;
        const img = cartBtn.querySelector('img');
        if (img) img.src = desiredIconSrc;
      } else {
        pendingCartIconSrc = desiredIconSrc;
      }

      // stop the cart button animation once cart has items,
      // but only when it reaches the start/reset position.
      if (cart.length) {
        if (!cartBtn.classList.contains('is-paused')) {
          if (isAtCartAnimStart()) {
            pauseCartAnimNow();
          } else {
            pauseCartAnimPending = true;
          }
        }
      } else {
        pauseCartAnimPending = false;
        cartBtn.classList.remove('is-paused');
      }
    }
  }

  document.querySelectorAll('.add-cart').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();

      if (!requireLoginOrPrompt('Kamu harus login dulu sebelum membeli item.')) return;

      const slide = btn.closest('.slide');
      if (!slide) return;
      const name = slide.dataset.name || 'Item';
      const price = slide.dataset.price || '';
      cart.push({ name, price });
      btn.classList.add('added');
      // brief pulse animation
      btn.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.06)' }, { transform: 'scale(1)' }], { duration: 240 });
      updateCartUI();
      // update cart modal list
      renderCartItems();

      // show cart toast popup animation near top-center
      if (cartBtn) {
        const toast = document.createElement('div');
        toast.className = 'cart-toast';
        toast.textContent = `Added: ${name}`;
        document.body.appendChild(toast);
        // position near cart button (calculate after appended)
        requestAnimationFrame(() => {
          const rect = cartBtn.getBoundingClientRect();
          const tRect = toast.getBoundingClientRect();
          // position center above cart button
          const left = Math.min(Math.max(rect.left + rect.width/2 - tRect.width/2, 8), window.innerWidth - tRect.width - 8);
          const top = Math.max(rect.top - tRect.height - 12, 12);
          toast.style.left = left + 'px';
          toast.style.top = top + 'px';
        });
        // remove after animation
        setTimeout(() => { toast.remove(); }, 900);
      }
    });
  });

  function renderCartItems() {
    const itemsWrap = document.getElementById('cartItems');
    if (!itemsWrap) return;
    if (!cart.length) {
      itemsWrap.innerHTML = '<div style="color:#666;padding:8px 0">Your cart is empty.</div>';
      updateCartSummaryUI();
      return;
    }
    itemsWrap.innerHTML = cart.map((c, i) => `
      <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid #f0f0f0">
        <div style="flex:1">
          <div style="font-weight:600">${c.name}</div>
          <div style="font-size:0.9rem;color:#777">${c.price}</div>
        </div>
        <div style="display:flex;gap:8px;align-items:center">
          <button class="cart-remove" data-index="${i}" aria-label="Remove item">×</button>
        </div>
      </div>
    `).join('');

    updateCartSummaryUI();

    // attach remove handlers
    itemsWrap.querySelectorAll('.cart-remove').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = Number(btn.dataset.index);
        if (Number.isFinite(idx)) {
          cart.splice(idx, 1);
          renderCartItems();
          updateCartUI();
        }
      });
    });
  }

  // init delivery controls once
  initDeliveryControls();

  updateCartUI();

  // init
  updateTrack();
  resetAutoplay();

  // Countdown timer — demo: ends in 2 hours from page load
  const saleEnd = new Date(Date.now() + 2 * 60 * 60 * 1000);
  function updateTimer() {
    const diff = saleEnd - Date.now();
    if (diff <= 0) {
      timerEl.textContent = '00:00:00';
      clearInterval(timerInterval);
      return;
    }
    const h = String(Math.floor(diff / (1000 * 60 * 60))).padStart(2, '0');
    const m = String(Math.floor((diff / (1000 * 60)) % 60)).padStart(2, '0');
    const s = String(Math.floor((diff / 1000) % 60)).padStart(2, '0');
    timerEl.textContent = `${h}:${m}:${s}`;
  }
  const timerInterval = setInterval(updateTimer, 500);
  updateTimer();
})();

// Hero tagline typing animation
(function () {
  const tagline = document.querySelector('.hero .hero-tagline');
  if (!tagline) return;

  const prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fullText = (tagline.getAttribute('data-text') || tagline.textContent || '').trim();
  if (!fullText) return;

  // Keep the full text as a fallback/source of truth.
  tagline.setAttribute('data-text', fullText);

  if (prefersReducedMotion) {
    tagline.textContent = fullText;
    return;
  }

  tagline.textContent = '';
  tagline.classList.add('is-typing');

  let i = 0;
  const minDelay = 18;
  const maxDelay = 42;

  function tick() {
    i += 1;
    tagline.textContent = fullText.slice(0, i);

    if (i >= fullText.length) {
      // keep blinking caret after finished
      return;
    }

    const jitter = Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay;
    window.setTimeout(tick, jitter);
  }

  // Small delay so it feels intentional when the page loads.
  window.setTimeout(tick, 250);
})();
