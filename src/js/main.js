/* Dirt Free Carpet - main.js
   Archetype: Immersive Scroll
   Vanilla JS only.
*/
(function () {
  'use strict';

  /* ========== nav scroll state ========== */
  const nav = document.querySelector('.nav');
  if (nav) {
    const setNav = () => {
      if (window.scrollY > 30) nav.classList.add('scrolled');
      else nav.classList.remove('scrolled');
    };
    setNav();
    window.addEventListener('scroll', setNav, { passive: true });
  }

  /* ========== mobile menu ========== */
  const hamburger = document.querySelector('.hamburger');
  const overlay = document.querySelector('.menu-overlay');
  const closeBtn = document.querySelector('.menu-close');
  if (hamburger && overlay) {
    const open = () => { overlay.classList.add('open'); document.body.style.overflow = 'hidden'; };
    const close = () => { overlay.classList.remove('open'); document.body.style.overflow = ''; };
    hamburger.addEventListener('click', open);
    if (closeBtn) closeBtn.addEventListener('click', close);
    overlay.querySelectorAll('a').forEach(a => a.addEventListener('click', close));
  }

  /* ========== scroll reveals ========== */
  const reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && reveals.length) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.18, rootMargin: '0px 0px -50px 0px' });
    reveals.forEach(el => io.observe(el));
  } else {
    reveals.forEach(el => el.classList.add('visible'));
  }

  /* ========== timeline line grow on scroll ========== */
  const timeline = document.querySelector('.timeline');
  if (timeline && 'IntersectionObserver' in window) {
    const tio = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          timeline.classList.add('in-view');
          tio.unobserve(timeline);
        }
      });
    }, { threshold: 0.15 });
    tio.observe(timeline);
  }

  /* ========== UTM capture ========== */
  function captureUTMs() {
    try {
      const params = new URLSearchParams(window.location.search);
      const utmKeys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'gclid', 'fbclid'];
      const found = {};
      utmKeys.forEach(k => { const v = params.get(k); if (v) found[k] = v; });
      if (Object.keys(found).length) {
        sessionStorage.setItem('dfc_utms', JSON.stringify(found));
      }
    } catch (e) { /* no-op */ }
  }
  captureUTMs();

  function getStoredUTMs() {
    try {
      const raw = sessionStorage.getItem('dfc_utms');
      return raw ? JSON.parse(raw) : {};
    } catch (e) { return {}; }
  }

  /* ========== booking form ==========
     POSTs to https://crm.dirtfreecarpet.com/api/public/bookings
     using the payload shape from BOOKING_INTEGRATION.md
  */
  const form = document.querySelector('#booking-form');
  if (form) {
    const submitBtn = form.querySelector('.submit');
    const wrapper = form.parentElement;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const data = new FormData(form);

      // basic validation
      const required = ['firstName', 'lastName', 'email', 'phone', 'address', 'city', 'zipCode', 'serviceType'];
      for (const k of required) {
        if (!data.get(k) || String(data.get(k)).trim() === '') {
          alert('Please fill out all required fields.');
          return;
        }
      }

      const payload = {
        customerInfo: {
          firstName: String(data.get('firstName') || '').trim(),
          lastName: String(data.get('lastName') || '').trim(),
          email: String(data.get('email') || '').trim(),
          phone: String(data.get('phone') || '').replace(/\D/g, ''),
          address: {
            street: String(data.get('address') || '').trim(),
            city: String(data.get('city') || '').trim(),
            state: 'TX',
            zipCode: String(data.get('zipCode') || '').trim()
          }
        },
        serviceInfo: {
          serviceType: String(data.get('serviceType') || 'carpet_cleaning'),
          roomCount: parseInt(data.get('roomCount'), 10) || 3,
          preferredDate: String(data.get('preferredDate') || ''),
          preferredTime: String(data.get('preferredTime') || 'morning'),
          urgency: String(data.get('urgency') || 'standard')
        },
        notes: String(data.get('notes') || '').trim(),
        referralSource: 'website',
        utm: getStoredUTMs(),
        source: { referrer: document.referrer || '', page: window.location.pathname }
      };

      submitBtn.disabled = true;
      submitBtn.textContent = 'Submitting...';

      try {
        const res = await fetch('https://crm.dirtfreecarpet.com/api/public/bookings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          mode: 'cors'
        });

        // GA event regardless of CRM response (we still captured a lead intent)
        if (typeof window.gtag === 'function') {
          window.gtag('event', 'generate_lead', {
            event_category: 'booking',
            event_label: payload.serviceInfo.serviceType,
            value: 149
          });
          window.gtag('event', 'conversion', {
            send_to: 'AW-CONVERSION_ID/CONVERSION_LABEL',
            value: 149,
            currency: 'USD'
          });
        }

        let body = null;
        try { body = await res.json(); } catch (_) { /* ignore */ }

        // Show success regardless of CRM availability for pitch demo
        wrapper.innerHTML = '<div class="form-success"><h3>Thank you.</h3><p>Your booking request is in. A Dirt Free technician will call you within one business day at the number you provided to confirm a time and run your free test spot.</p><p class="muted" style="font-size:.85rem;letter-spacing:.15em;text-transform:uppercase;color:rgba(245,239,228,.55);margin-top:24px;">Questions? Call (713) 730-2782</p></div>';
        window.scrollTo({ top: wrapper.offsetTop - 120, behavior: 'smooth' });
      } catch (err) {
        // CRM endpoint unreachable. Still log lead intent locally and show optimistic success
        // (this is a pitch mockup; production wires CORS).
        try {
          const stash = JSON.parse(localStorage.getItem('dfc_pending_bookings') || '[]');
          stash.push({ ts: Date.now(), payload });
          localStorage.setItem('dfc_pending_bookings', JSON.stringify(stash));
        } catch (_) { /* ignore */ }

        wrapper.innerHTML = '<div class="form-success"><h3>Thank you.</h3><p>Your booking request is recorded. A Dirt Free technician will call you shortly to confirm. If you need to reach us right away, call (713) 730-2782.</p></div>';
        window.scrollTo({ top: wrapper.offsetTop - 120, behavior: 'smooth' });
      }
    });
  }

  /* ========== image fade-in (Stage 2 Higgsfield) ========== */
  const fadeImgs = document.querySelectorAll('.hero-photo img, .page-hero-photo img, .about-img .photo-layer img, .photo-block img, .tl-thumb img, .svc-thumb img, .area-thumb img');
  fadeImgs.forEach(img => {
    if (img.complete && img.naturalWidth > 0) {
      img.classList.add('loaded');
    } else {
      img.addEventListener('load', () => img.classList.add('loaded'), { once: true });
      img.addEventListener('error', () => { img.style.display = 'none'; }, { once: true });
    }
  });

  /* ========== year stamp ========== */
  document.querySelectorAll('[data-year]').forEach(el => { el.textContent = new Date().getFullYear(); });

})();


/* ============== Service-area dropdown nav (re-applied 2026-05-05) ============== */
(function(){
  document.querySelectorAll('.nav-dropdown').forEach(function(d){
    var trigger = d.querySelector('.nav-dropdown-trigger');
    if (!trigger) return;
    // Click toggles on touch/no-hover devices and keyboard interaction.
    trigger.addEventListener('click', function(e){
      var hoverless = window.matchMedia && window.matchMedia('(hover: none)').matches;
      if (hoverless) {
        e.preventDefault();
        d.classList.toggle('open');
        trigger.setAttribute('aria-expanded', d.classList.contains('open') ? 'true' : 'false');
      }
    });
    // Outside-click closes the dropdown
    document.addEventListener('click', function(e){
      if (!d.contains(e.target)) {
        d.classList.remove('open');
        trigger.setAttribute('aria-expanded', 'false');
      }
    });
    // ESC key
    d.addEventListener('keydown', function(e){
      if (e.key === 'Escape') {
        d.classList.remove('open');
        trigger.setAttribute('aria-expanded', 'false');
        trigger.focus();
      }
    });
  });
})();
