/* ============================================================
   Dirt Free Carpet — Browser-only Chat Assistant
   No LLM, no per-message cost. Deterministic knowledge base +
   guided lead-capture flows. Lead/transcript POSTs to /api/lead.
   ============================================================ */
(function () {
  'use strict';
  if (window.__dfcChatLoaded) return;
  window.__dfcChatLoaded = true;

  var COMPANY = {
    name: 'Dirt Free Carpet',
    phone: '(713) 730-2782',
    tel: '7137302782',
    since: '1989',
    hours: 'Mon–Fri 8am–6pm · Sun 10am–4pm',
    bookUrl: '/book/'
  };
  var LEAD_ENDPOINT = '/api/lead';
  var STORE_KEY = 'dfc_chat_v1';
  var STORE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days

  /* ---------------- Knowledge base ---------------- */
  var KB = [
    { id: 'special', kw: ['149','$149','special','deal','offer','promo','promotion','discount','coupon','10%','10 percent','percent off'],
      utt: ['whats the special','do you have a deal','any discounts','tell me about the offer','3 rooms for 149','how much is the special'],
      r: "Right now we have two specials:\n\n• **3 rooms for $149**\n• Or **10% off all other services**\n\nFree test spot in your worst area before you owe a thing. Want me to get you booked?",
      qr: ['Book a cleaning', 'What do you clean?', 'Talk to a human'] },

    { id: 'pricing', kw: ['price','pricing','cost','how much','rate','rates','quote','estimate','per room','charge'],
      utt: ['how much does it cost','what are your prices','how much per room','can i get a quote','what do you charge'],
      r: "Pricing is simple and honest:\n\n• **3 rooms for $149** (our special)\n• Each additional room **$40**\n• Standard rate **$55 per room**\n• Or **10% off all other services**\n\nThe test spot in your worst area is always free. Want a free quote?",
      qr: ['Book a cleaning', 'Talk to a human'] },

    { id: 'services', kw: ['service','services','clean','cleaning','what do you do','what do you clean','offer'],
      utt: ['what do you clean','what services do you offer','what do you do','what can you clean'],
      r: "We clean it all:\n\n• Carpet Cleaning\n• Tile & Grout\n• Upholstery\n• Air Duct\n• Pet Spot & Odor\n• Water Damage\n• Area Rugs\n• Natural Stone\n• Commercial\n\nWhich one can I help with?",
      qr: ['Carpet cleaning', 'Pet spot & odor', 'Book a cleaning'] },

    { id: 'book', kw: ['book','booking','schedule','appointment','reserve','set up','sign up','come out'],
      utt: ['how do i book','i want to schedule','can i make an appointment','how do i set up a cleaning','book me'],
      r: "Happy to help you book! You can grab the **3 rooms for $149** special on our [booking page](" + COMPANY.bookUrl + "), or I can take your info right here and a Dirt Free tech will call to confirm.",
      qr: ['Book here in chat', 'Open booking page', 'Talk to a human'] },

    { id: 'drytime', kw: ['dry','dry time','drying','how long','walk on','wet'],
      utt: ['how long does it take to dry','when can i walk on my carpet','is it wet for long','drying time'],
      r: "Most carpets are dry in **1 to 6 hours** — not days. Our truck-mounted system pulls out the moisture, so you're back to normal fast. Carpet so clean it dries before dinner.",
      qr: ['Book a cleaning', "What's the $149 special?"] },

    { id: 'safety', kw: ['safe','safety','chemical','chemicals','toxic','kids','children','baby','pets','pet safe','green','organic','soap'],
      utt: ['is it safe for pets','do you use chemicals','is it safe for kids','are your products toxic','is it green'],
      r: "Completely safe. We use **water, steam, and patented organic cleaners** — no harsh soaps, no sticky residue, nothing toxic left behind. Safe for kids and pets.",
      qr: ['Pet spot & odor', 'Book a cleaning'] },

    { id: 'pet', kw: ['pet','pets','dog','cat','urine','pee','odor','smell','stain','accident'],
      utt: ['can you remove pet odor','my dog had an accident','pet urine smell','remove pet stains','get rid of pet smell'],
      r: "Yes — our **Pet Spot & Odor** treatment removes the stain *and* the odor at the source, not just the surface. Safe for your pets too. Want to get it scheduled?",
      qr: ['Book a cleaning', 'How much?', 'Talk to a human'] },

    { id: 'areas', kw: ['area','areas','where','serve','service area','my city','near me','location','come to'],
      utt: ['what areas do you serve','do you service my area','where are you located','do you come to my city'],
      r: "We serve the **Greater Houston** area — including Katy, Cypress, Tomball, Spring, Sugar Land, Pearland, and The Woodlands. Tell me your city or ZIP and I'll confirm.",
      qr: ['Book a cleaning', 'Talk to a human'] },

    { id: 'water', kw: ['water','water damage','flood','flooded','emergency','restoration','leak','burst'],
      utt: ['i have water damage','my house flooded','do you do water damage','emergency cleanup','water emergency'],
      r: "We offer **24/7 emergency water damage response** across Greater Houston. If it's urgent, the fastest path is to call us now at **" + COMPANY.phone + "**. Want me to connect you with a person?",
      qr: ['Call now', 'Talk to a human'] },

    { id: 'method', kw: ['how','method','truck','truck mounted','steam','process','hot water','extraction'],
      utt: ['how do you clean carpet','what method do you use','do you use steam','whats your process'],
      r: "We use **truck-mounted hot water extraction** — powerful steam cleaning with patented organic solutions. It pulls dirt deep from the fibers and dries fast (1–6 hours).",
      qr: ['Book a cleaning', 'Is it safe?'] },

    { id: 'tile', kw: ['tile','grout','tile and grout','floor','stone','marble','travertine'],
      utt: ['do you clean tile','tile and grout cleaning','clean my grout','natural stone cleaning'],
      r: "Absolutely — we restore **tile & grout** and care for **natural stone** (marble, travertine). We can bring grout lines back to their original color. Want a free quote?",
      qr: ['Book a cleaning', 'How much?'] },

    { id: 'upholstery', kw: ['upholstery','sofa','couch','furniture','sectional','chair','cushion','mattress'],
      utt: ['do you clean couches','upholstery cleaning','clean my sofa','furniture cleaning'],
      r: "Yes — we deep-clean **upholstery**: sofas, sectionals, chairs and more, with the same safe process we use on carpet. Want it added to a booking?",
      qr: ['Book a cleaning', 'How much?'] },

    { id: 'commercial', kw: ['commercial','business','office','property','building','company'],
      utt: ['do you do commercial','clean my office','commercial carpet cleaning','business cleaning'],
      r: "We do **commercial** carpet and floor care for offices and businesses across Houston. Tell me a bit about your space and I'll have someone reach out.",
      qr: ['Talk to a human', 'Book a cleaning'] },

    { id: 'hours', kw: ['hours','open','close','closing','when are you open','availability','today'],
      utt: ['what are your hours','are you open','when are you open','what time do you close'],
      r: "Our hours are **" + COMPANY.hours + "**. You can book anytime online and we'll confirm a time that works for you.",
      qr: ['Book a cleaning', 'Talk to a human'] },

    { id: 'contact', kw: ['phone','call','number','contact','reach','talk','speak','human','person','representative','agent'],
      utt: ['can i talk to someone','i want to speak to a person','whats your phone number','how do i contact you','talk to a human'],
      r: "You can reach us at **" + COMPANY.phone + "** (" + COMPANY.hours + "). Want me to have someone call you instead? I just need a couple details.",
      qr: ['Have someone call me', 'Call now'] },

    { id: 'about', kw: ['who','about','history','family','owned','years','established','founded','trust','reviews','reputation'],
      utt: ['who are you','tell me about dirt free','how long have you been around','are you family owned'],
      r: "Dirt Free Carpet has been Houston's trusted, **family-owned** cleaner since **" + COMPANY.since + "** — 35+ years and 15,000+ homes cleaned. Truck-powered, chemical-free, no sticky residue.",
      qr: ['What do you clean?', 'Book a cleaning'] },

    { id: 'guarantee', kw: ['guarantee','warranty','risk','satisfaction','not happy','refund'],
      utt: ['do you have a guarantee','what if im not happy','is there a warranty'],
      r: "We run a **free test spot** in your worst area before you owe anything — if the result doesn't sell itself, we pack up and leave. No risk to you.",
      qr: ['Book a cleaning', 'How much?'] }
  ];

  var FALLBACKS = [
    { r: "I'm not totally sure on that one — but a real person can help. Want me to have someone reach out, or you can call us at **" + COMPANY.phone + "**.", qr: ['Have someone call me', 'What do you clean?', 'Book a cleaning'] },
    { r: "Good question — let me point you to a human for that. I can grab your info, or call **" + COMPANY.phone + "**.", qr: ['Have someone call me', "What's the $149 special?"] }
  ];

  /* ---------------- Page-aware greetings ---------------- */
  function greetingForPath(path) {
    if (/\/book/.test(path)) return { r: "Ready to book? 👋 Ask me anything about our specials or services, or I can get you scheduled right here.", qr: ["What's the $149 special?", 'Do you service my area?', 'Book a cleaning'] };
    if (/\/services/.test(path)) return { r: "Hi! 👋 Questions about a specific service? Ask away — or get the $149 special.", qr: ['How much?', 'Dry time?', 'Book a cleaning'] };
    if (/\/service-areas/.test(path)) return { r: "Hi! 👋 We serve the Greater Houston area. Ask me anything, or let's get you booked.", qr: ['Do you service my area?', "What's the $149 special?", 'Book a cleaning'] };
    return { r: "Hi there! 👋 I'm the Dirt Free Carpet assistant. Ask me about our **3 rooms for $149** special, what we clean, or book a cleaning.", qr: ["What's the $149 special?", 'What do you clean?', 'Book a cleaning'] };
  }

  /* ---------------- Flows (lead capture) ---------------- */
  var SERVICE_OPTIONS = ['Carpet Cleaning', 'Tile & Grout', 'Upholstery', 'Pet Spot & Odor', 'Water Damage', 'Other'];
  var FLOWS = {
    book: {
      start: 'service',
      steps: {
        service: { say: ["Let's get you booked — just a few quick questions. 👇\n\nWhat do you need cleaned?"], type: 'buttons', slot: 'service', options: SERVICE_OPTIONS, next: 'name' },
        name:    { say: ["Great choice. Who should we ask for?"], type: 'text', slot: 'name', placeholder: 'Your first name', next: 'contact' },
        contact: { say: ["Thanks {name}! What's the best phone or email to confirm your booking?"], type: 'contact', slot: 'contact', placeholder: 'Phone or email', retry: "Hmm, that doesn't look like a phone or email — mind checking?", next: 'zip' },
        zip:     { say: ["Last thing — what's your ZIP code or city? (so we confirm we cover you)"], type: 'text', slot: 'zip', placeholder: 'ZIP or city', next: 'done' },
        done:    { say: ["You're all set, {name}! 🎉 A Dirt Free tech will reach out within one business day to lock in your time. Want it sooner? Call us at **" + COMPANY.phone + "**."], final: true, leadType: 'booking' }
      }
    },
    human: {
      start: 'name',
      steps: {
        name:    { say: ["Absolutely — let me connect you with a real person. Who should they ask for?"], type: 'text', slot: 'name', placeholder: 'Your first name', next: 'contact' },
        contact: { say: ["Thanks {name}. Best phone or email for the team to reach you?"], type: 'contact', slot: 'contact', placeholder: 'Phone or email', retry: "That doesn't look like a phone or email — mind checking?", next: 'topic' },
        topic:   { say: ["Got it. Anything specific they should know? (or tap Skip)"], type: 'text', slot: 'topic', placeholder: "What's this about?", optional: true, next: 'done' },
        done:    { say: ["Done, {name}! A real person from Dirt Free will reach out within one business day. Anything else I can answer in the meantime?"], final: true, leadType: 'human' }
      }
    }
  };

  /* ---------------- Matching engine ---------------- */
  function norm(s) {
    return (s || '').toLowerCase()
      .replace(/[’']/g, "'")
      .replace(/\bwhat's\b/g, 'what is').replace(/\bhow's\b/g, 'how is')
      .replace(/\bdon't\b/g, 'do not').replace(/\bi'm\b/g, 'i am').replace(/\bu\b/g, 'you')
      .replace(/[^a-z0-9% ]/g, ' ').replace(/\s+/g, ' ').trim();
  }
  var STOP = { the:1,a:1,an:1,is:1,are:1,do:1,you:1,i:1,my:1,me:1,to:1,of:1,for:1,and:1,it:1,in:1,on:1,can:1,with:1,'%':0 };
  function lev(a, b) {
    if (a === b) return 0; if (!a.length) return b.length; if (!b.length) return a.length;
    var m = [], i, j;
    for (i = 0; i <= b.length; i++) m[i] = [i];
    for (j = 0; j <= a.length; j++) m[0][j] = j;
    for (i = 1; i <= b.length; i++) for (j = 1; j <= a.length; j++)
      m[i][j] = b[i-1] === a[j-1] ? m[i-1][j-1] : 1 + Math.min(m[i-1][j-1], m[i][j-1], m[i-1][j]);
    return m[b.length][a.length];
  }
  function match(query) {
    var q = norm(query);
    if (!q) return null;
    // exact-ish phrase hits on full keyword strings (e.g. "water damage", "10%")
    var best = null, bestScore = 0;
    for (var k = 0; k < KB.length; k++) {
      var e = KB[k], score = 0;
      for (var p = 0; p < e.kw.length; p++) { if (q.indexOf(e.kw[p]) !== -1) score += (e.kw[p].indexOf(' ') !== -1 ? 4 : 2); }
      for (var u = 0; u < e.utt.length; u++) { if (q === norm(e.utt[u])) score += 10; else if (q.indexOf(norm(e.utt[u])) !== -1) score += 6; }
      // token overlap + fuzzy
      var qt = q.split(' ');
      for (var t = 0; t < qt.length; t++) {
        var tok = qt[t]; if (tok.length < 3 || STOP[tok]) continue;
        for (var p2 = 0; p2 < e.kw.length; p2++) {
          var kw = e.kw[p2]; if (kw.indexOf(' ') !== -1) continue;
          if (kw === tok) score += 2;
          else if (tok.length >= 4 && lev(tok, kw) === 1) score += 1;
        }
      }
      if (score > bestScore) { bestScore = score; best = e; }
    }
    if (bestScore >= 4) return { entry: best, strong: true };
    if (bestScore >= 2) return { entry: best, strong: false };
    return null;
  }

  /* ---------------- State + persistence ---------------- */
  var state = { open: false, messages: [], lead: {}, flow: null, step: null, slots: {}, retried: false, sentLead: false };
  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify({ t: Date.now(), messages: state.messages.slice(-30), lead: state.lead })); } catch (e) {}
  }
  function load() {
    try {
      var raw = localStorage.getItem(STORE_KEY); if (!raw) return false;
      var d = JSON.parse(raw); if (!d || Date.now() - d.t > STORE_TTL) { localStorage.removeItem(STORE_KEY); return false; }
      state.messages = d.messages || []; state.lead = d.lead || {}; return state.messages.length > 0;
    } catch (e) { return false; }
  }

  /* ---------------- DOM ---------------- */
  var el = {};
  function h(tag, cls, html) { var n = document.createElement(tag); if (cls) n.className = cls; if (html != null) n.innerHTML = html; return n; }
  function fmt(s) {
    return (s || '')
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br>');
  }

  function build() {
    el.root = h('div', 'dfc-chat');
    el.launch = h('button', 'dfc-launch');
    el.launch.setAttribute('aria-label', 'Open chat');
    el.launch.innerHTML =
      '<span class="dfc-launch-open"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg></span>' +
      '<span class="dfc-launch-close"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></span>';

    el.panel = h('div', 'dfc-panel');
    el.panel.setAttribute('role', 'dialog');
    el.panel.setAttribute('aria-label', 'Dirt Free Carpet chat');
    el.panel.innerHTML =
      '<div class="dfc-head">' +
        '<span class="dfc-dot"></span>' +
        '<div class="dfc-head-txt"><div class="dfc-head-title">Dirt Free <em>Carpet</em></div>' +
        '<div class="dfc-head-sub">Replies in seconds · Since ' + COMPANY.since + '</div></div>' +
        '<button class="dfc-head-x" aria-label="Close">&times;</button>' +
      '</div>' +
      '<div class="dfc-body"></div>' +
      '<div class="dfc-qr"></div>' +
      '<div class="dfc-foot"><div class="dfc-inputrow">' +
        '<textarea class="dfc-input" rows="1" placeholder="Type your message..."></textarea>' +
        '<button class="dfc-send" aria-label="Send"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg></button>' +
      '</div><div class="dfc-trust">Instant answers · human follow-up within one business day</div></div>';

    el.root.appendChild(el.panel); el.root.appendChild(el.launch);
    document.body.appendChild(el.root);

    el.body = el.panel.querySelector('.dfc-body');
    el.qr = el.panel.querySelector('.dfc-qr');
    el.input = el.panel.querySelector('.dfc-input');
    el.send = el.panel.querySelector('.dfc-send');

    el.launch.addEventListener('click', toggle);
    el.panel.querySelector('.dfc-head-x').addEventListener('click', toggle);
    el.send.addEventListener('click', onSend);
    el.input.addEventListener('keydown', function (ev) { if (ev.key === 'Enter' && !ev.shiftKey) { ev.preventDefault(); onSend(); } });
    el.input.addEventListener('input', function () { el.input.style.height = 'auto'; el.input.style.height = Math.min(el.input.scrollHeight, 90) + 'px'; });
  }

  function scrollDown() { el.body.scrollTop = el.body.scrollHeight; }
  function renderMsg(role, text) { var n = h('div', 'dfc-msg dfc-' + role, fmt(text)); el.body.appendChild(n); scrollDown(); }
  function renderHistory() { el.body.innerHTML = ''; state.messages.forEach(function (m) { renderMsg(m.role, m.text); }); }

  function pushMsg(role, text) { state.messages.push({ role: role, text: text }); renderMsg(role, text); save(); }

  function setQuickReplies(list) {
    el.qr.innerHTML = '';
    (list || []).forEach(function (label) {
      var b = h('button', null, fmt(label));
      b.addEventListener('click', function () { handleUser(label); });
      el.qr.appendChild(b);
    });
  }

  function typing(cb, ms) {
    var t = h('div', 'dfc-typing', '<span></span><span></span><span></span>');
    el.body.appendChild(t); scrollDown();
    setTimeout(function () { t.remove(); cb(); }, ms || 650);
  }

  /* ---------------- Conversation logic ---------------- */
  function toggle() {
    state.open = !state.open;
    el.root.classList.toggle('dfc-open', state.open);
    if (state.open) {
      if (!state.messages.length) {
        var g = greetingForPath(location.pathname);
        typing(function () { pushMsg('bot', g.r); setQuickReplies(g.qr); }, 500);
      } else { setTimeout(scrollDown, 50); }
      setTimeout(function () { el.input.focus(); }, 250);
    }
  }

  function onSend() {
    var v = el.input.value.trim(); if (!v) return;
    el.input.value = ''; el.input.style.height = 'auto';
    handleUser(v);
  }

  function startFlow(name) {
    state.flow = name; state.slots = {}; state.retried = false; state.sentLead = false;
    goStep(FLOWS[name].start);
  }
  function goStep(stepId) {
    state.step = stepId;
    var step = FLOWS[state.flow].steps[stepId];
    setQuickReplies([]);
    var lines = step.say.map(function (s) { return interp(s); });
    (function next(i) {
      if (i >= lines.length) {
        if (step.final) finishFlow(step);
        else if (step.type === 'buttons') setQuickReplies(step.options);
        else if (step.optional) setQuickReplies(['Skip']);
        return;
      }
      typing(function () { pushMsg('bot', lines[i]); next(i + 1); }, i === 0 ? 500 : 700);
    })(0);
  }
  function interp(s) { return s.replace(/\{(\w+)\}/g, function (_, k) { return state.slots[k] || ''; }); }

  function validContact(v) { return /\S+@\S+\.\S+/.test(v) || /(\+?\d[\d\s().-]{6,})/.test(v); }

  function handleFlowInput(text) {
    var step = FLOWS[state.flow].steps[state.step];
    var skip = /^(skip|no thanks|nevermind|cancel)$/i.test(text.trim());
    pushMsg('user', text);
    if (step.type === 'contact' && !validContact(text) && !state.retried) {
      state.retried = true; typing(function () { pushMsg('bot', step.retry); }, 500); return;
    }
    state.retried = false;
    if (!(step.optional && skip)) state.slots[step.slot] = text;
    goStep(step.next);
  }

  function finishFlow(step) {
    // merge slots into lead
    state.lead = Object.assign({}, state.lead, state.slots, { type: step.leadType });
    save();
    if (!state.sentLead) { state.sentLead = true; sendLead(step.leadType); }
    var s = state.flow; state.flow = null; state.step = null;
    setQuickReplies(s === 'human' ? ['What do you clean?', "What's the $149 special?"] : ['Anything else?', 'What do you clean?']);
  }

  function sendLead(leadType) {
    var payload = {
      type: leadType,
      name: state.slots.name || state.lead.name || '',
      contact: state.slots.contact || state.lead.contact || '',
      service: state.slots.service || '',
      zip: state.slots.zip || '',
      topic: state.slots.topic || '',
      page: location.pathname,
      url: location.href,
      transcript: state.messages.slice(-24),
      ts: new Date().toISOString()
    };
    try {
      fetch(LEAD_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), keepalive: true })
        .catch(function () {});
    } catch (e) {}
  }

  function handleUser(text) {
    text = (text || '').trim(); if (!text) return;

    // In an active flow → treat input as the answer
    if (state.flow) {
      // allow bailing to human/booking by intent words mid-flow? keep simple: feed as input
      handleFlowInput(text);
      return;
    }

    pushMsg('user', text);
    setQuickReplies([]);

    var low = text.toLowerCase();

    // Intent: open booking page
    if (/open booking page/.test(low)) {
      typing(function () { pushMsg('bot', "Opening the booking page now — see you there! 🧼"); setTimeout(function(){ location.href = COMPANY.bookUrl; }, 600); }, 400);
      return;
    }
    // Intent: call now
    if (/^call now$/.test(low) || /\bcall now\b/.test(low)) {
      typing(function () { pushMsg('bot', "Tap to call: **" + COMPANY.phone + "**"); setTimeout(function(){ location.href = 'tel:' + COMPANY.tel; }, 500); }, 400);
      return;
    }
    // Intent: start booking flow
    if (/book (a )?(cleaning|here)|book me|booking|schedule|make an appointment|book here in chat/.test(low)) {
      typing(function () { startFlow('book'); }, 400); return;
    }
    // Intent: human handoff
    if (/talk to (a )?human|real person|speak to (someone|a person)|have someone call me|talk to someone|customer service/.test(low)) {
      typing(function () { startFlow('human'); }, 400); return;
    }

    // Knowledge base match
    var m = match(text);
    if (m && m.strong) {
      typing(function () { pushMsg('bot', m.entry.r); setQuickReplies(m.entry.qr); }, Math.min(1400, 500 + m.entry.r.length * 4));
    } else if (m) {
      typing(function () {
        pushMsg('bot', "Just to make sure I help with the right thing —");
        setQuickReplies([titleOf(m.entry), 'Book a cleaning', 'Talk to a human']);
      }, 500);
    } else {
      var fb = FALLBACKS[Math.floor(state.messages.length / 2) % FALLBACKS.length];
      typing(function () { pushMsg('bot', fb.r); setQuickReplies(fb.qr); }, 600);
    }
  }
  function titleOf(entry) {
    var map = { special: "What's the $149 special?", pricing: 'How much does it cost?', services: 'What do you clean?', drytime: 'How long to dry?', safety: 'Is it safe for kids & pets?', pet: 'Remove pet odor', areas: 'Do you serve my area?', water: 'Water damage help', book: 'Book a cleaning' };
    return map[entry.id] || 'Tell me more';
  }

  /* ---------------- Init ---------------- */
  function init() {
    build();
    if (load()) renderHistory(); // restore prior convo silently; greeting only on first open
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
