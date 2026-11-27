/* ==========================================================================
   Male 360 — Shared Core Module (Zero-Build ES5/ES2020 Browser Bundle)
   Exposes window.MaleCore across index.html, gym/index.html & nutri/index.html
   ========================================================================== */
(function (global) {
  'use strict';

  const FIREBASE_CONFIG = {
    apiKey: "AIzaSyDFUAfIjjff9Luw2-1uaznN7bK0ZuHmGEk",
    authDomain: "male-app.firebaseapp.com",
    databaseURL: "https://male-app-default-rtdb.firebaseio.com",
    projectId: "male-app",
    storageBucket: "male-app.firebasestorage.app",
    messagingSenderId: "82609798929",
    appId: "1:82609798929:web:ddb6851a1894fb652fd6b0",
    measurementId: "G-TYSRXXCY3Y"
  };

  const GEMINI_KEY = atob("QVEuQWI4Uk42SlVnMkZaQmd5THlkMWRSTkNJRGhmN0pRZTE1bU9iY2RIRDA3WWVUNC1wekE=");
  const MODELS = ['gemini-3.5-flash-lite', 'gemini-flash-lite-latest', 'gemini-3.1-flash-lite', 'gemini-3.6-flash'];
  const POST_WEDDING_DATE = '2026-12-14';

  let _dbInstance = null;
  function initFirebase() {
    if (_dbInstance) return _dbInstance;
    if (typeof global.firebase !== 'undefined') {
      if (!global.firebase.apps || !global.firebase.apps.length) {
        global.firebase.initializeApp(FIREBASE_CONFIG);
      }
      _dbInstance = global.firebase.database();
    }
    return _dbInstance;
  }

  function getTodayKey(d = new Date()) {
    const dt = d instanceof Date ? d : new Date(d);
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, '0');
    const day = String(dt.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  function getTomorrowKey(now = new Date()) {
    const dt = now instanceof Date ? now : new Date(now);
    const tom = new Date(dt.getTime() + 24 * 60 * 60 * 1000);
    return getTodayKey(tom);
  }

  function daysBetweenDateKeys(fromKey, toKey) {
    if (!fromKey || !toKey) return null;
    const a = new Date(fromKey + 'T12:00:00');
    const b = new Date(toKey + 'T12:00:00');
    if (isNaN(a.getTime()) || isNaN(b.getTime())) return null;
    return Math.max(0, Math.round((b.getTime() - a.getTime()) / 86400000));
  }

  function getCreatineDay(date = new Date()) {
    const dt = date instanceof Date ? date : new Date(date);
    const anchor = new Date(2026, 8, 22); // Martes 22 Sept 2026 = Día 18
    anchor.setHours(0, 0, 0, 0);
    const target = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());
    const diffDays = Math.floor((target.getTime() - anchor.getTime()) / 86400000);
    return Math.max(1, 18 + diffDays);
  }

  function isPostWeddingPhase(dateKey = getTodayKey()) {
    return String(dateKey || getTodayKey()) >= POST_WEDDING_DATE;
  }

  function getWaterTarget(trainedToday = false) {
    const trained = !!trainedToday;
    return trained
      ? { ml: 3000, litersStr: '3.0', cups: 12, isBoost: true }
      : { ml: 2500, litersStr: '2.5', cups: 10, isBoost: false };
  }

  function getCalorieTarget(opts = {}) {
    const dateKey = opts.dateKey || getTodayKey();
    const trainedToday = !!opts.trainedToday;
    const isLowerBody = !!opts.isLowerBody;
    const fase2 = isPostWeddingPhase(dateKey);
    if (trainedToday) {
      if (fase2) return isLowerBody ? 1700 : 1630;
      return isLowerBody ? 1550 : 1520;
    }
    return fase2 ? 1580 : 1500;
  }

  function escapeHtml(str) {
    const entityMap = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
    return String(str == null ? '' : str).replace(/[&<>"']/g, s => entityMap[s]);
  }

  function formatMarkdown(text, opts = {}) {
    if (!text) return '';
    const isDark = typeof opts.dark === 'boolean'
      ? opts.dark
      : (typeof document !== 'undefined' && document.documentElement.classList.contains('dark'));

    let safe = escapeHtml(text);
    const boldCls = isDark ? 'text-white font-extrabold' : 'font-bold text-slate-900';

    safe = safe.replace(/\*\*(.+?)\*\*/g, `<strong class="${boldCls}">$1</strong>`);
    safe = safe.replace(/__(.+?)__/g, `<strong class="${boldCls}">$1</strong>`);
    safe = safe.replace(/(^|[^*])\*([^*\n]+)\*([^*]|$)/g, '$1<em class="italic">$2</em>$3');

    if (opts.compact) {
      return safe.replace(/\n/g, '<br>');
    }

    const bulletColor = isDark ? 'text-rose-400' : 'text-rose-500';
    const numColor = isDark ? 'text-amber-300' : 'text-purple-600';

    safe = safe.replace(/^[\*\-\•]\s+(.+)$/gm,
      `<div class="flex items-start gap-2 my-1 ml-0.5"><span class="${bulletColor} font-bold shrink-0 leading-tight">•</span><span class="leading-relaxed font-medium">$1</span></div>`);
    safe = safe.replace(/^(\d+)\.\s+(.+)$/gm,
      `<div class="flex items-start gap-2 my-1 ml-0.5"><span class="${numColor} font-bold shrink-0 leading-tight">$1.</span><span class="leading-relaxed font-medium">$2</span></div>`);
    safe = safe.replace(/\n/g, '<br>');
    return safe;
  }

  let _toastTimer = null;
  function toast(message, opts = {}) {
    if (typeof document === 'undefined' || !document.body) return;
    let el = document.getElementById('mc-global-toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'mc-global-toast';
      el.setAttribute('role', 'status');
      el.setAttribute('aria-live', 'polite');
      document.body.appendChild(el);
    }

    const isDark = document.documentElement.classList.contains('dark');
    const variant = opts.variant || (isDark ? 'dark' : 'light');
    const validVariants = ['light', 'dark', 'emerald', 'rose', 'amber'];
    const vClass = validVariants.includes(variant) ? `mc-toast--${variant}` : 'mc-toast--light';

    el.textContent = String(message || '');
    el.className = `mc-toast ${vClass}`;
    // Force reflow so rapid consecutive toasts re-animate smoothly
    void el.offsetWidth;
    el.classList.add('mc-toast--show');

    clearTimeout(_toastTimer);
    const duration = Math.max(1200, Number(opts.duration) || 2700);
    _toastTimer = setTimeout(() => {
      el.classList.remove('mc-toast--show');
    }, duration);
  }

  // Reusable Native Bottom Sheet Controller
  let _sheetState = null;

  function _ensureSheetDom() {
    if (typeof document === 'undefined' || !document.body) return null;
    let backdrop = document.getElementById('mc-bottom-sheet-backdrop');
    if (backdrop) return backdrop;

    backdrop = document.createElement('div');
    backdrop.id = 'mc-bottom-sheet-backdrop';
    backdrop.className = 'mc-sheet-backdrop';
    backdrop.setAttribute('role', 'dialog');
    backdrop.setAttribute('aria-modal', 'true');
    backdrop.innerHTML = `
      <div id="mc-bottom-sheet-panel" class="mc-sheet-panel mc-sheet-panel--dark">
        <div id="mc-sheet-drag-zone" class="cursor-grab active:cursor-grabbing">
          <div class="mc-sheet-handle"></div>
          <div id="mc-sheet-header" class="flex items-start justify-between gap-2 pb-2.5 mb-2.5 border-b border-zinc-800/80">
            <div class="min-w-0">
              <h3 id="mc-sheet-title" class="text-sm font-black leading-snug"></h3>
              <p id="mc-sheet-subtitle" class="text-[11px] opacity-70 font-medium mt-0.5"></p>
            </div>
            <button type="button" id="mc-sheet-close-btn" aria-label="Cerrar" class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black shrink-0 bg-zinc-800/80 text-zinc-300">✕</button>
          </div>
        </div>
        <div id="mc-sheet-body" class="space-y-3"></div>
      </div>
    `;
    document.body.appendChild(backdrop);

    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) closeSheet(null);
    });

    const closeBtn = backdrop.querySelector('#mc-sheet-close-btn');
    if (closeBtn) closeBtn.addEventListener('click', () => closeSheet(null));

    const dragZone = backdrop.querySelector('#mc-sheet-drag-zone');
    const panel = backdrop.querySelector('#mc-bottom-sheet-panel');
    let touchStartY = null;
    if (dragZone && panel) {
      dragZone.addEventListener('touchstart', (e) => {
        touchStartY = e.touches && e.touches[0] ? e.touches[0].clientY : null;
      }, { passive: true });
      dragZone.addEventListener('touchmove', (e) => {
        if (touchStartY === null || !e.touches || !e.touches[0]) return;
        const dy = e.touches[0].clientY - touchStartY;
        if (dy > 0) panel.style.transform = `translateY(${Math.min(dy, 240)}px)`;
      }, { passive: true });
      dragZone.addEventListener('touchend', (e) => {
        if (touchStartY === null) return;
        const endY = e.changedTouches && e.changedTouches[0] ? e.changedTouches[0].clientY : touchStartY;
        panel.style.transform = '';
        if (endY - touchStartY > 65) closeSheet(null);
        touchStartY = null;
      }, { passive: true });
    }

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && _sheetState) closeSheet(null);
    });

    return backdrop;
  }

  function closeSheet(result = null) {
    const backdrop = typeof document !== 'undefined' ? document.getElementById('mc-bottom-sheet-backdrop') : null;
    if (backdrop) {
      backdrop.classList.remove('mc-sheet-backdrop--open');
    }
    const prev = _sheetState;
    _sheetState = null;
    if (prev) {
      if (typeof prev.onClose === 'function') {
        try { prev.onClose(result); } catch (e) {}
      }
      if (typeof prev.resolve === 'function') {
        prev.resolve(result);
      }
    }
  }

  function openSheet(opts = {}) {
    const backdrop = _ensureSheetDom();
    if (!backdrop) return Promise.resolve(null);

    if (_sheetState) {
      const prev = _sheetState;
      _sheetState = null;
      if (typeof prev.resolve === 'function') prev.resolve(null);
    }

    const isDark = typeof opts.dark === 'boolean'
      ? opts.dark
      : document.documentElement.classList.contains('dark');
    const panel = document.getElementById('mc-bottom-sheet-panel');
    const headerEl = document.getElementById('mc-sheet-header');
    const titleEl = document.getElementById('mc-sheet-title');
    const subEl = document.getElementById('mc-sheet-subtitle');
    const closeBtn = document.getElementById('mc-sheet-close-btn');
    const bodyEl = document.getElementById('mc-sheet-body');

    if (panel) {
      panel.style.transform = '';
      panel.className = `mc-sheet-panel ${isDark ? 'mc-sheet-panel--dark' : 'mc-sheet-panel--light'}`;
    }
    if (headerEl) {
      headerEl.className = `flex items-start justify-between gap-2 pb-2.5 mb-2.5 border-b ${isDark ? 'border-zinc-800/80' : 'border-rose-100'}`;
    }
    if (closeBtn) {
      closeBtn.className = `w-8 h-8 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${isDark ? 'bg-zinc-800 text-zinc-300' : 'bg-slate-100 text-slate-600'}`;
    }
    if (titleEl) titleEl.textContent = String(opts.title || '');
    if (subEl) {
      subEl.textContent = String(opts.subtitle || '');
      subEl.classList.toggle('hidden', !opts.subtitle);
    }
    if (bodyEl) bodyEl.innerHTML = String(opts.html || '');

    return new Promise((resolve) => {
      _sheetState = { resolve, onClose: opts.onClose };
      void backdrop.offsetWidth;
      backdrop.classList.add('mc-sheet-backdrop--open');
    });
  }

  function confirmSheet(opts = {}) {
    const isDark = typeof opts.dark === 'boolean'
      ? opts.dark
      : document.documentElement.classList.contains('dark');
    const msg = opts.message ? `<p class="text-xs leading-relaxed ${isDark ? 'text-zinc-300' : 'text-slate-600'}">${escapeHtml(opts.message)}</p>` : '';
    const confirmCls = opts.danger
      ? 'bg-rose-600 hover:bg-rose-500 text-white'
      : 'bg-emerald-500 hover:bg-emerald-400 text-zinc-950';
    const cancelCls = isDark ? 'bg-zinc-800 text-zinc-200 border border-zinc-700' : 'bg-slate-100 text-slate-700 border border-slate-200';
    const html = `
      ${msg}
      <div class="grid grid-cols-2 gap-2 pt-1">
        <button type="button" id="mc-sheet-cancel-btn" class="min-h-[44px] rounded-2xl text-xs font-bold ${cancelCls}">${escapeHtml(opts.cancelLabel || 'Cancelar')}</button>
        <button type="button" id="mc-sheet-ok-btn" class="min-h-[44px] rounded-2xl text-xs font-black ${confirmCls}">${escapeHtml(opts.confirmLabel || 'Confirmar')}</button>
      </div>
    `;
    const p = openSheet({
      title: opts.title || 'Confirmar',
      subtitle: opts.subtitle || '',
      html,
      dark: isDark
    });
    const okBtn = document.getElementById('mc-sheet-ok-btn');
    const cancelBtn = document.getElementById('mc-sheet-cancel-btn');
    if (okBtn) okBtn.onclick = () => closeSheet(true);
    if (cancelBtn) cancelBtn.onclick = () => closeSheet(false);
    return p.then(res => res === true);
  }

  function promptSheet(opts = {}) {
    const isDark = typeof opts.dark === 'boolean'
      ? opts.dark
      : document.documentElement.classList.contains('dark');
    const msg = opts.message ? `<p class="text-xs leading-relaxed ${isDark ? 'text-zinc-300' : 'text-slate-600'}">${escapeHtml(opts.message)}</p>` : '';
    const inputCls = isDark
      ? 'bg-zinc-950 border border-zinc-700 text-white placeholder-zinc-500 focus:border-rose-500'
      : 'bg-slate-50 border border-rose-200 text-slate-900 placeholder-slate-400 focus:border-rose-500';
    const cancelCls = isDark ? 'bg-zinc-800 text-zinc-200 border border-zinc-700' : 'bg-slate-100 text-slate-700 border border-slate-200';
    const inpType = opts.inputType || 'text';
    const inputMode = inpType === 'number' ? 'numeric' : (opts.inputMode || 'text');
    const html = `
      ${msg}
      <input id="mc-sheet-prompt-input" type="${escapeHtml(inpType)}" inputmode="${escapeHtml(inputMode)}"
        value="${escapeHtml(opts.defaultValue != null ? opts.defaultValue : '')}"
        placeholder="${escapeHtml(opts.placeholder || '')}"
        style="font-size: 16px;"
        class="w-full min-h-[44px] rounded-2xl px-3.5 py-2 font-black focus:outline-none ${inputCls}">
      <div class="grid grid-cols-2 gap-2 pt-1">
        <button type="button" id="mc-sheet-prompt-cancel" class="min-h-[44px] rounded-2xl text-xs font-bold ${cancelCls}">${escapeHtml(opts.cancelLabel || 'Cancelar')}</button>
        <button type="button" id="mc-sheet-prompt-ok" class="min-h-[44px] rounded-2xl text-xs font-black bg-rose-600 hover:bg-rose-500 text-white">${escapeHtml(opts.confirmLabel || 'Guardar')}</button>
      </div>
    `;
    const p = openSheet({
      title: opts.title || 'Ingresar valor',
      subtitle: opts.subtitle || '',
      html,
      dark: isDark
    });
    const inp = document.getElementById('mc-sheet-prompt-input');
    const okBtn = document.getElementById('mc-sheet-prompt-ok');
    const cancelBtn = document.getElementById('mc-sheet-prompt-cancel');
    const submitVal = () => closeSheet(inp ? inp.value : '');
    if (okBtn) okBtn.onclick = submitVal;
    if (cancelBtn) cancelBtn.onclick = () => closeSheet(null);
    if (inp) {
      inp.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); submitVal(); }
      });
      setTimeout(() => { try { inp.focus(); inp.select(); } catch (e) {} }, 60);
    }
    return p;
  }

  async function callGemini(options = {}) {
    const systemPrompt = String(options.systemPrompt || '').trim();
    const rawMessages = Array.isArray(options.messages)
      ? options.messages
      : (typeof options.messages === 'string' ? [{ role: 'user', text: options.messages }] : []);
    const timeoutMs = Math.max(2000, Number(options.timeoutMs) || 12000);
    const models = Array.isArray(options.models) && options.models.length ? options.models : MODELS;
    const generationConfig = {
      maxOutputTokens: Number(options.maxOutputTokens) || 1000
    };
    if (typeof options.temperature === 'number') {
      generationConfig.temperature = options.temperature;
    }

    const contents = rawMessages.map((msg, idx) => {
      const role = msg.role === 'model' ? 'model' : 'user';
      if (Array.isArray(msg.parts)) {
        return { role, parts: msg.parts };
      }
      const txt = String(msg.text || '');
      const combined = (idx === 0 && systemPrompt)
        ? (txt ? `${systemPrompt}\n\n${txt}` : systemPrompt)
        : txt;
      return { role, parts: [{ text: combined }] };
    });

    if (contents.length === 0 && systemPrompt) {
      contents.push({ role: 'user', parts: [{ text: systemPrompt }] });
    }

    const payload = { contents, generationConfig };

    const fetchModel = async (model, ms) => {
      const ctrl = new AbortController();
      const tId = setTimeout(() => ctrl.abort(), ms);
      try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_KEY}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: ctrl.signal
        });
        clearTimeout(tId);
        if (!res.ok) {
          const errBody = await res.text().catch(() => '');
          console.warn(`MaleCore.callGemini HTTP ${res.status} (${model}):`, errBody.slice(0, 200));
          return null;
        }
        const data = await res.json();
        const txt = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        return txt ? txt.trim() : null;
      } catch (e) {
        clearTimeout(tId);
        console.warn(`MaleCore.callGemini error (${model}):`, e && e.message ? e.message : e);
        return null;
      }
    };

    for (const m of models) {
      const reply = await fetchModel(m, timeoutMs);
      if (reply) return reply;
    }

    // 1 final retry on the fastest stable alias for mobile micro-drops
    const retryReply = await fetchModel('gemini-flash-lite-latest', Math.min(timeoutMs, 8000));
    return retryReply || null;
  }

  // Day-Change Watcher (Fixes midnight freeze on mobile PWAs kept open overnight)
  let _currentWatchedDayKey = getTodayKey();
  const _dayCallbacks = [];
  let _dayWatcherStarted = false;

  function _runDayCheck(simulatedNewKey) {
    const newKey = simulatedNewKey || getTodayKey();
    if (newKey && newKey !== _currentWatchedDayKey) {
      const prevKey = _currentWatchedDayKey;
      _currentWatchedDayKey = newKey;
      for (let i = 0; i < _dayCallbacks.length; i++) {
        try { _dayCallbacks[i](newKey, prevKey); } catch (e) { console.warn('watchDayChange cb error:', e); }
      }
      return true;
    }
    return false;
  }

  function watchDayChange(callback) {
    if (typeof callback === 'function') {
      _dayCallbacks.push(callback);
    }
    if (!_dayWatcherStarted && typeof global !== 'undefined' && typeof document !== 'undefined') {
      _dayWatcherStarted = true;
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') _runDayCheck();
      });
      global.addEventListener('pageshow', () => _runDayCheck());
      global.addEventListener('focus', () => _runDayCheck());
      setInterval(() => _runDayCheck(), 60000);
    }
  }

  // Global Floating Rest Timer Mini-Pill (synced with Gym's mg_active_rest_v1)
  const REST_STORAGE_KEY = 'mg_active_rest_v1';
  let _globalRestPillInterval = null;

  function _resolveGymHref() {
    if (typeof document === 'undefined') return './gym/index.html';
    const link = document.querySelector('a[href*="gym/index.html"]');
    return link ? link.getAttribute('href') : './gym/index.html';
  }

  function syncGlobalRestPill() {
    if (typeof document === 'undefined' || !document.body) return false;
    // Skip on Gym app itself (which renders the full rest timer bar)
    if (document.getElementById('rest-timer-bar')) return false;

    let saved = null;
    try {
      const raw = localStorage.getItem(REST_STORAGE_KEY);
      if (raw) saved = JSON.parse(raw);
    } catch (e) {}

    let pill = document.getElementById('mc-global-rest-pill');
    const now = Date.now();
    if (saved && Number(saved.endAt) > now) {
      if (!pill) {
        pill = document.createElement('a');
        pill.id = 'mc-global-rest-pill';
        pill.className = 'mc-rest-pill';
        pill.href = _resolveGymHref();
        document.body.appendChild(pill);
      } else {
        pill.href = _resolveGymHref();
      }
      const rem = Math.max(0, Math.ceil((Number(saved.endAt) - now) / 1000));
      const m = Math.floor(rem / 60);
      const s = String(rem % 60).padStart(2, '0');
      pill.innerHTML = `<span>⏱️ Descanso <strong class="tabular-nums text-rose-300">${m}:${s}</strong></span><span class="opacity-50">·</span><span class="text-emerald-300">Volver a Gym ➔</span>`;
      pill.classList.add('mc-rest-pill--show');

      if (!_globalRestPillInterval) {
        _globalRestPillInterval = setInterval(syncGlobalRestPill, 500);
      }
      return true;
    }

    if (saved && Number(saved.endAt) <= now) {
      try { localStorage.removeItem(REST_STORAGE_KEY); } catch (e) {}
    }
    if (pill) pill.classList.remove('mc-rest-pill--show');
    if (_globalRestPillInterval) {
      clearInterval(_globalRestPillInterval);
      _globalRestPillInterval = null;
    }
    return false;
  }

  if (typeof global !== 'undefined' && typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => syncGlobalRestPill());
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') syncGlobalRestPill();
    });
    global.addEventListener('pageshow', () => syncGlobalRestPill());
    global.addEventListener('storage', (ev) => {
      if (!ev || ev.key === REST_STORAGE_KEY) syncGlobalRestPill();
    });
  }

  // Reusable Web Speech API Dictation Helper (es-AR)
  let _activeSpeechRec = null;
  let _activeSpeechBtnId = null;
  let _activeSpeechIdleClass = '';

  function toggleVoiceDictation(opts = {}) {
    const SR = global.SpeechRecognition || global.webkitSpeechRecognition;
    if (!SR) {
      toast('Usá el micrófono de tu teclado para dictar 🎙️', { variant: 'amber' });
      return false;
    }

    if (_activeSpeechRec) {
      try { _activeSpeechRec.stop(); } catch (e) {}
      return false;
    }

    const btn = opts.btnId ? document.getElementById(opts.btnId) : null;
    const inp = opts.inputId ? document.getElementById(opts.inputId) : null;
    const idleClass = opts.idleClass || (btn ? btn.className : '');
    const activeClass = opts.activeClass || idleClass;

    const rec = new SR();
    rec.lang = opts.lang || 'es-AR';
    rec.interimResults = true;
    rec.continuous = false;

    let finalTranscript = '';
    _activeSpeechRec = rec;
    _activeSpeechBtnId = opts.btnId || null;
    _activeSpeechIdleClass = idleClass;

    if (btn) {
      btn.className = activeClass;
      btn.textContent = '🔴';
    }
    toast('🎙️ Escuchando... hablá tranquila');

    const resetBtn = () => {
      const curBtn = _activeSpeechBtnId ? document.getElementById(_activeSpeechBtnId) : null;
      if (curBtn) {
        curBtn.className = _activeSpeechIdleClass;
        curBtn.textContent = '🎤';
      }
      _activeSpeechRec = null;
      _activeSpeechBtnId = null;
    };

    rec.onresult = (ev) => {
      let interim = '';
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        const t = ev.results[i][0].transcript;
        if (ev.results[i].isFinal) finalTranscript += t + ' ';
        else interim += t;
      }
      if (inp) inp.value = (finalTranscript + interim).trim();
    };

    rec.onerror = () => resetBtn();
    rec.onend = () => {
      resetBtn();
      if (inp && inp.value.trim().length > 1 && typeof opts.onSubmit === 'function') {
        opts.onSubmit();
      }
    };

    try {
      rec.start();
      return true;
    } catch (e) {
      resetBtn();
      return false;
    }
  }

  function registerSW(swPath = './sw.js') {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
    if (typeof location !== 'undefined' && location.protocol !== 'https:' && location.protocol !== 'http:') return;
    global.addEventListener('load', () => {
      navigator.serviceWorker.register(swPath, { scope: '/' })
        .then(reg => {
          if (reg && reg.waiting) reg.waiting.postMessage({ type: 'SKIP_WAITING' });
        })
        .catch(() => {
          navigator.serviceWorker.register(swPath).catch(() => {});
        });
    });
  }

  const db = initFirebase();

  global.MaleCore = {
    FIREBASE_CONFIG,
    GEMINI_KEY,
    MODELS,
    POST_WEDDING_DATE,
    initFirebase,
    db,
    callGemini,
    getTodayKey,
    getTomorrowKey,
    daysBetweenDateKeys,
    getCreatineDay,
    isPostWeddingPhase,
    getWaterTarget,
    getCalorieTarget,
    watchDayChange,
    _runDayCheck,
    escapeHtml,
    formatMarkdown,
    toast,
    openSheet,
    closeSheet,
    confirmSheet,
    promptSheet,
    syncGlobalRestPill,
    toggleVoiceDictation,
    registerSW
  };
})(window);
