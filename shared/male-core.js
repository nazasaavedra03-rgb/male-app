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
    registerSW
  };
})(window);
