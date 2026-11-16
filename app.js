(function () {
  "use strict";
  const D = window.ANCHORS_DATA;
  const VERSION = "2.0.0";
  const KEY = "anchors.v1";
  const SLOTS = [
    { id: "morning", name: "Morning", from: 0 },
    { id: "day", name: "Day", from: 12 },
    { id: "evening", name: "Evening", from: 18 },
    { id: "night", name: "Night", from: 21 },
  ];
  const SHORT = { wake: "Up", care: "Care", body: "Body", hard: "Hard 1st", fuel: "Food", python: "Python", drawing: "Draw", skin: "Shower", phone: "Phone", journal: "Journal", bed: "Bed", showedUp: "Showed up", courage: "Courage" };
  const JFIELDS = ["sleep", "learned", "did", "win", "voice", "evidence", "t1", "t2", "t3"];
  const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const DOW_LONG = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  // ---------- dates (phone's local time, so travel just works) ----------
  const pad = n => String(n).padStart(2, "0");
  const iso = d => d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  const parse = s => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
  const addDays = (s, n) => { const d = parse(s); d.setDate(d.getDate() + n); return iso(d); };
  const CUTOFF_H = 3; // a late night still belongs to the day before, until 03:00
  const todayIso = () => iso(new Date(Date.now() - CUTOFF_H * 3600000));
  const mondayOf = s => { const d = parse(s); d.setDate(d.getDate() - (d.getDay() + 6) % 7); return iso(d); };
  const weekDays = m => Array.from({ length: 7 }, (_, i) => addDays(m, i));
  const pretty = s => { const d = parse(s); return DOW_LONG[d.getDay()] + " " + d.getDate() + " " + MON[d.getMonth()]; };
  const short = s => { const d = parse(s); return d.getDate() + " " + MON[d.getMonth()]; };
  const dow = s => parse(s).getDay();
  const daysBetween = (a, b) => Math.round((parse(b) - parse(a)) / 86400000);
  const nowSlot = () => { const h = new Date().getHours(); if (h < CUTOFF_H) return "night"; let s = SLOTS[0].id; SLOTS.forEach(x => { if (h >= x.from) s = x.id; }); return s; };

  // ---------- state ----------
  function fresh() {
    const blocks = {};
    Object.keys(D.blocks).forEach(k => blocks[k] = D.blocks[k].start);
    return {
      v: 1,
      settings: { wake: "06:30", phone: "21:00", bed: "22:30", blocks, extras: { showedUp: false, courage: false }, weightGoal: null, poolLen: 25, lastExport: null, created: todayIso(), travel: false, book: "", welcomed: false },
      days: {}, weeks: {}, routinesCustom: [], routinesHidden: [], parking: [], timer: null, ui: { mins: 10, timerMins: 25 },
      menuCustom: [], menuHidden: [], books: [], habitEdits: {}, blockChecks: {},
    };
  }
  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return fresh();
      return migrate(JSON.parse(raw));
    } catch (e) { return fresh(); }
  }
  function migrate(s) {
    const f = fresh();
    s = Object.assign(f, s || {});
    s.settings = Object.assign(fresh().settings, s.settings || {});
    s.settings.blocks = Object.assign({}, fresh().settings.blocks, s.settings.blocks || {});
    s.settings.extras = Object.assign({}, fresh().settings.extras, s.settings.extras || {});
    s.ui = Object.assign({ mins: 10, timerMins: 25 }, s.ui || {});
    ["days", "weeks", "habitEdits", "blockChecks"].forEach(k => { if (!s[k] || typeof s[k] !== "object" || Array.isArray(s[k])) s[k] = {}; });
    ["routinesCustom", "routinesHidden", "parking", "menuCustom", "menuHidden", "books"].forEach(k => { if (!Array.isArray(s[k])) s[k] = []; });
    return s;
  }
  let S = load();
  let saveFailed = false;
  function persist() {
    try { localStorage.setItem(KEY, JSON.stringify(S)); saveFailed = false; }
    catch (e) { if (!saveFailed) banner("Your phone refused to save. Free some storage, then save a backup from More."); saveFailed = true; }
  }

  const view = { tab: "today", day: todayIso(), week: mondayOf(todayIso()), expanded: {}, openSlot: {}, threeEdit: false, free: null, prog: "week" };

  // ---------- helpers ----------
  const $ = id => document.getElementById(id);
  const $$ = sel => Array.from(document.querySelectorAll(sel));
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const fill = s => String(s || "").replace(/\{wake\}/g, S.settings.wake).replace(/\{bed\}/g, S.settings.bed).replace(/\{phone\}/g, S.settings.phone).replace(/\{book\}/g, S.settings.book || "The book by your bed");
  const day = date => S.days[date] || {};
  function edit(date, fn) {
    const d = S.days[date] || (S.days[date] = {});
    d.h = d.h || {}; d.j = d.j || {}; d.ex = d.ex || {};
    fn(d);
    persist();
  }
  const weekRec = m => S.weeks[m] || {};
  function editWeek(m, fn) { const w = S.weeks[m] || (S.weeks[m] = {}); fn(w); persist(); }
  const done = v => v === "full" || v === "min";
  function banner(msg, actionLabel, action) {
    const b = $("banner");
    if (!msg) { b.hidden = true; return; }
    b.innerHTML = "<span>" + esc(msg) + "</span>" + (actionLabel ? "<button>" + esc(actionLabel) + "</button>" : "");
    b.hidden = false;
    if (actionLabel) b.querySelector("button").onclick = action;
  }
  let toastT;
  function toast(msg) {
    const t = $("toast"); t.textContent = msg; t.hidden = false;
    clearTimeout(toastT); toastT = setTimeout(() => { t.hidden = true; }, 2200);
  }
  function setIfIdle(el, v) { v = v == null ? "" : String(v); if (document.activeElement !== el && el.value !== v) el.value = v; }
  function debounce(fn, ms) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }

  // ---------- blocks and habits ----------
  const blockStart = b => S.settings.blocks[b] || (D.blocks[b] && D.blocks[b].start) || "2000-01-01";
  const isActive = (h, date) => h.block === 0 || date >= blockStart(h.block) || (h.block === 1);
  const habits = () => D.habits.map(h => S.habitEdits[h.id] ? Object.assign({}, h, S.habitEdits[h.id]) : h);
  const activeHabits = date => habits().filter(h => isActive(h, date));
  function currentBlock(date) {
    let cur = 1;
    Object.keys(S.settings.blocks).map(Number).sort((a, b) => a - b).forEach(b => { if (date >= blockStart(b)) cur = b; });
    return cur;
  }
  const routines = () => D.routines.filter(r => !S.routinesHidden.includes(r.id)).concat(S.routinesCustom);
  const menu = () => D.menu.filter(m => !S.menuHidden.includes(m.id)).concat(S.menuCustom);
  // A minimum day is either switched on for that day, or the default while travel mode is on.
  const isMin = date => { const d = day(date); return d.minDay == null ? !!S.settings.travel : !!d.minDay; };
  const fmtMins = m => m >= 60 ? String(Math.round(m / 6) / 10) + " h" : m + " min";

  // Today's three: last night's "Tomorrow" lines, until they are touched today.
  function three(date) {
    const d = day(date);
    if (Array.isArray(d.three)) return d.three;
    const y = day(addDays(date, -1)).j || {};
    return [1, 2, 3].map(n => ({ t: String(y["t" + n] || "").trim(), goal: Number(y.goalItem) === n })).filter(x => x.t);
  }
  function editThree(date, fn) {
    const cur = three(date).map(x => Object.assign({}, x));
    edit(date, d => { d.three = cur; fn(d.three); });
  }
  const anyDone = x => Object.values((x && x.h) || {}).some(done);
  function dayScore(date) {
    const h = day(date).h;
    if (!h || !Object.keys(h).length) return null;
    const hs = activeHabits(date);
    return hs.filter(x => done(h[x.id])).length / Math.max(1, hs.length);
  }
  function lastActive(before) {
    let best = null;
    Object.keys(S.days).forEach(k => { if (k < before && (!best || k > best) && anyDone(S.days[k])) best = k; });
    return best;
  }
  // One line of the person's own evidence, for the moment before starting.
  function proofLine() {
    const pool = [];
    Object.keys(S.days).forEach(k => {
      const x = S.days[k], j = x.j || {};
      if (j.win) pool.push([k, j.win]);
      if (j.evidence) pool.push([k, j.evidence]);
      if (x.ship) pool.push([k, "Shipped: " + x.ship]);
    });
    if (!pool.length) return null;
    const p = pool[Math.floor(Math.random() * pool.length)];
    return short(p[0]) + ": " + p[1];
  }
  function totals() {
    let shown = 0, run = 0, best = 0, ships = 0, focus = 0, prev = null;
    Object.keys(S.days).sort().forEach(k => {
      const x = S.days[k];
      if (anyDone(x)) { shown++; run = prev && addDays(prev, 1) === k ? run + 1 : 1; prev = k; if (run > best) best = run; }
      if (String(x.ship || "").trim()) ships++;
      focus += x.focus || 0;
    });
    return { shown, best, ships, focus };
  }
  function pickFree(mins, avoid) {
    const doneIds = (day(todayIso()).free || []).map(x => x.id);
    let pool = menu().filter(m => m.mins === mins && !doneIds.includes(m.id));
    if (!pool.length) pool = menu().filter(m => m.mins === mins);
    view.freeSeen = view.freeSeen || [];
    let left = pool.filter(m => !view.freeSeen.includes(m.id));
    if (!left.length) { view.freeSeen = []; left = pool.length > 1 ? pool.filter(m => m.id !== avoid) : pool; }
    const m = left[Math.floor(Math.random() * left.length)] || null;
    if (m) view.freeSeen.push(m.id);
    return m;
  }
  // Block check: two days before the next block (and up to three days into it), look at whether the last one held.
  function blockCheckInfo(t) {
    const keys = Object.keys(S.settings.blocks).map(Number).sort((a, c) => a - c);
    const b = currentBlock(t);
    let next = null;
    if (b > 1 && t >= blockStart(b) && daysBetween(blockStart(b), t) <= 3 && !S.blockChecks[b]) next = b;
    else { const n = keys.find(k => k > b); if (n && t < blockStart(n) && daysBetween(t, blockStart(n)) <= 2 && !S.blockChecks[n]) next = n; }
    if (!next) return null;
    const prev = keys.filter(k => k < next).pop();
    if (!prev) return null;
    const end = t < blockStart(next) ? t : addDays(blockStart(next), -1);
    let start = addDays(end, -13);
    if (start < blockStart(prev)) start = blockStart(prev);
    const L = daysBetween(start, end) + 1;
    if (L < 1) return null;
    const need = Math.ceil(L * 5 / 7);
    const days = Array.from({ length: L }, (_, i) => addDays(start, i));
    const rows = habits().filter(x => x.block === prev).map(x => {
      const n = days.filter(k => done((day(k).h || {})[x.id])).length;
      return { name: x.name, n, ok: n >= need };
    });
    return { next, L, need, rows, go: rows.length > 0 && rows.filter(r => r.ok).length * 2 > rows.length, started: t >= blockStart(next) };
  }
  function blockCheckHtml(t) {
    const c = blockCheckInfo(t);
    if (!c) return "";
    const nm = (D.blocks[c.next] || {}).name || "the next habit";
    const goBtn = '<button class="btn small' + (c.go ? "" : " ghost") + '" data-bc="go" data-b="' + c.next + '">' + (c.started ? "Keep it going" : "Add it on " + short(blockStart(c.next))) + '</button>';
    const rpBtn = '<button class="btn small' + (c.go ? " ghost" : "") + '" data-bc="repeat" data-b="' + c.next + '">Repeat 2 more weeks</button>';
    return '<div class="check-card"><span class="eyebrow">Block check · ' + esc(nm) + (c.started ? " started " : " starts ") + short(blockStart(c.next)) + '</span>' +
      '<h3>' + (c.go ? "This block is holding. Add the next habit." : "Not holding yet. Repeat this block.") + '</h3>' +
      '<ul class="notes">' + c.rows.map(r => '<li><span class="d wide' + (r.ok ? " ok" : "") + '">' + r.n + '/' + c.L + '</span><span>' + esc(r.name) + '</span></li>').join("") + '</ul>' +
      '<p class="small muted">The bar is 5 days in 7, so ' + c.need + ' of these ' + c.L + '. Repeating a block is progress, not a failure.</p>' +
      '<div class="row">' + (c.go ? goBtn + rpBtn : rpBtn + goBtn) + '</div></div>';
  }

  function journalLevel(j) {
    return JFIELDS.some(k => k !== "sleep" && String(j[k] || "").trim()) ? "full" : null;
  }

  // ---------- views ----------
  const TABS = ["today", "journal", "body", "week", "more"];
  function show(tab) {
    if (!TABS.includes(tab)) tab = "today";
    view.tab = tab;
    $$(".view").forEach(s => s.hidden = s.id !== "v-" + tab);
    $$("nav.tabs a").forEach(a => a.setAttribute("aria-current", a.dataset.tab === tab ? "page" : "false"));
    render();
    window.scrollTo(0, 0);
  }
  function render() {
    renderTabs();
    if (view.tab === "today") renderToday();
    else if (view.tab === "journal") renderJournal();
    else if (view.tab === "body") renderBody();
    else if (view.tab === "week") renderWeek();
    else if (view.tab === "more") renderMore();
    renderStuckBtn();
    if (view.tab === "today" && !nudged && $("banner").hidden && Object.keys(S.days).length >= 7) {
      const le = S.settings.lastExport;
      if (!le || daysBetween(le, todayIso()) > 14) { nudged = true; banner(le ? "Two weeks since your last backup." : "A week of data and no backup yet.", "Back up", () => { banner(null); location.hash = "more"; }); }
    }
  }
  let nudged = false;
  function renderTabs() {
    const t = todayIso();
    const sundayDue = dow(t) === 0 && !weekRec(mondayOf(t)).reviewed;
    $("weekTab").innerHTML = "Progress" + (sundayDue ? '<span class="pip" aria-label="review due"></span>' : "");
  }
  function renderDayHead() {
    const date = view.day, t = todayIso();
    $$(".dayEyebrow").forEach(e => e.textContent = date === t ? "Today" : date === addDays(t, -1) ? "Yesterday" : "Logging an earlier day");
    $$(".dayTitle").forEach(e => e.textContent = pretty(date));
    $$(".nextDay").forEach(b => b.disabled = date >= t);
  }

  // ----- Today -----
  function nextHabit(date) {
    const d = day(date), hs = activeHabits(date), slot = nowSlot();
    const idx = SLOTS.findIndex(s => s.id === slot);
    const open = hs.filter(h => !(d.h || {})[h.id]);
    const due = open.filter(h => SLOTS.findIndex(s => s.id === h.slot) <= idx);
    if (due.length) return { h: due[0], soon: false };
    if (open.length) return { h: open[0], soon: true };
    return null;
  }
  const MEALS = [["b", "Breakfast"], ["l", "Lunch"], ["d", "Dinner"], ["s", "Snack"]];
  function renderToday() {
    renderDayHead();
    const date = view.day, t = todayIso(), d = day(date), h = d.h || {};
    const hs = activeHabits(date);
    const nDone = hs.filter(x => done(h[x.id])).length;
    $("dayBar").style.width = Math.round(nDone / Math.max(1, hs.length) * 100) + "%";
    $("dayCount").textContent = nDone + "/" + hs.length;
    const b = currentBlock(date);
    const dayIn = daysBetween(blockStart(b), date) + 1;
    $("dayMeta").textContent = date < blockStart(1) ? "Practice run, block 1 starts " + short(blockStart(1))
      : "Block " + b + (dayIn > 14 ? " again" : "") + ", day " + ((dayIn - 1) % 14 + 1) + " of 14";
    const minOn = isMin(date);
    $("minDay").setAttribute("aria-checked", String(minOn));
    $("minDayHint").textContent = S.settings.travel ? "Travel mode is on: every day starts as a minimum day." : "Travelling or a bad day: the minimum counts as done.";

    // first open
    $("welcome").innerHTML = S.settings.welcomed ? "" : '<div class="welcome"><span class="eyebrow">How this works</span>' +
      '<ol class="steps"><li><b>Do the green card.</b> It is always the one next thing.</li>' +
      '<li><b>The minimum counts.</b> Short on time or energy, tap Minimum and move on.</li>' +
      '<li><b>One line at night.</b> Write it in Journal and name tomorrow\'s three.</li></ol>' +
      '<p class="small muted">Everything you type stays on this phone. Progress keeps the trace of what you did.</p>' +
      '<button class="btn" data-welcome="1">Start</button></div>';

    // special day card, and the way back in after days away
    const md = date.slice(5);
    const sp = D.special.find(s => s.date === date || (s.every === "year" && s.date.slice(5) === md && date >= s.date));
    let spHtml = sp ? '<div class="special"><span class="eyebrow">' + esc(short(date)) + '</span><h3>' + esc(sp.title) + '</h3><p class="small">' + esc(sp.text) + '</p></div>' : "";
    if (date === t && !Object.keys(h).length) {
      const la = lastActive(t), gap = la ? daysBetween(la, t) - 1 : 0;
      if (gap >= 2) spHtml += '<div class="special"><span class="eyebrow">Welcome back</span><h3>' + gap + ' days away. Nothing to catch up.</h3><p class="small">Don\'t fill in the gap and don\'t restart the plan. Do the next thing below, minimum version. That is the whole comeback.</p></div>';
    }
    $("special").innerHTML = spHtml;
    $("blockCheck").innerHTML = date === t ? blockCheckHtml(t) : "";

    // the one next thing
    const nc = $("nextCard");
    if (date !== t) {
      nc.innerHTML = "";
    } else {
      const nx = nextHabit(date), th = three(date);
      if (!nx) {
        nc.innerHTML = '<div class="next-card done"><span class="eyebrow">All done</span><h2>Every anchor is in for today.</h2>' +
          '<p class="small">' + [nDone + "/" + hs.length + " anchors", th.length ? th.filter(x => x.done).length + "/" + th.length + " of your three" : "", d.focus ? fmtMins(d.focus) + " of focus" : ""].filter(Boolean).join(" · ") + '</p>' +
          '<p class="small muted">Rest counts too. Tomorrow starts at ' + esc(S.settings.wake) + '.</p></div>';
      } else {
        const x = nx.h;
        const what = minOn ? fill(x.min) : fill(x.full);
        nc.innerHTML = '<div class="next-card"><span class="eyebrow">' + (nx.soon ? "Coming up" : "Next") + (x.at ? " · " + esc(fill(x.at)) : "") + '</span>' +
          '<h2>' + esc(x.name) + '</h2><p class="what">' + esc(what) + '</p>' +
          (x.first ? '<p class="first">' + esc(x.first) + '</p>' : "") +
          (x.id === "bed" && S.settings.book ? '<p class="first">Tonight\'s book: ' + esc(S.settings.book) + '</p>' : "") +
          (x.link === "journal" ? '<button class="link" data-go="journal">Open the journal</button>' : "") +
          (x.link === "body" ? '<button class="link" data-go="body">Open today\'s routine</button>' : "") +
          (x.stuck ? '<button class="link" data-stuck="1">Stuck? Do the 3-minute unstick</button>' : "") +
          '<div class="acts">' +
          (minOn
            ? '<button data-tick="' + x.id + '" data-v="min" class="solo">Did the minimum</button>'
            : '<button data-tick="' + x.id + '" data-v="full">Done</button><button data-tick="' + x.id + '" data-v="min" class="alt">Minimum</button>') +
          '</div></div>';
      }
    }
    renderThree();

    // slots: earlier parts of the day fold away once everything in them is logged
    const prev = day(addDays(date, -1)).h || {};
    const cur = date === t ? nowSlot() : null;
    const curIdx = SLOTS.findIndex(s => s.id === cur);
    let html = "";
    SLOTS.forEach((s, si) => {
      const list = hs.filter(x => x.slot === s.id);
      if (!list.length) return;
      if (cur && si < curIdx && list.every(x => h[x.id]) && !view.openSlot[s.id]) {
        html += '<div class="slot"><button class="slot-c" data-slot="' + s.id + '" aria-expanded="false"><span class="eyebrow">' + s.name + ' · ' + list.filter(x => done(h[x.id])).length + '/' + list.length + ' in</span><span class="small">show</span></button></div>';
        return;
      }
      html += '<div class="slot"><div class="slot-h' + (s.id === cur ? " now" : "") + '"><span class="eyebrow">' + s.name + (s.id === cur ? " · now" : "") + '</span></div>';
      list.forEach(x => {
        const v = h[x.id], open = !!view.expanded[x.id];
        const nudge = prev[x.id] === "missed" && !v ? '<p class="nudge">Missed yesterday. Today is the one to win; the minimum is enough.</p>' : "";
        html += '<div class="habit' + (done(v) ? " is-done" : "") + '">' +
          '<div class="top"><button class="name" data-expand="' + x.id + '" aria-expanded="' + open + '"><b>' + esc(x.name) + '</b>' +
          '<span class="sub">' + esc(x.at ? fill(x.at) : (v === "min" ? "minimum" : v === "full" ? "done" : "tap for details")) + '</span></button>' +
          '<div class="tri" role="group" aria-label="' + esc(x.name) + '">' +
          [["full", "Full"], ["min", "Min"], ["missed", "✕"]].map(([k, l]) => '<button data-tick="' + x.id + '" data-v="' + k + '" aria-pressed="' + (v === k) + '" aria-label="' + (k === "missed" ? "Missed" : l) + '">' + l + '</button>').join("") +
          '</div></div>' +
          (x.id === "fuel" ? '<div class="meals" role="group" aria-label="Meals today">' + MEALS.map(([k, l]) => '<button data-meal="' + k + '" aria-pressed="' + !!(d.meals || {})[k] + '">' + l + '</button>').join("") + '</div>' : "") +
          (open ? '<div class="detail"><b>Full</b><span>' + esc(fill(x.full)) + '</span><b>Min</b><span>' + esc(fill(x.min)) + '</span>' + (x.first ? '<p class="first">' + esc(x.first) + '</p>' : "") + '</div>' : "") +
          nudge + '</div>';
      });
      html += '</div>';
    });
    // extras
    const ex = D.extras.filter(x => S.settings.extras[x.id]);
    if (ex.length) {
      html += '<div class="slot"><div class="slot-h"><span class="eyebrow">Extras</span></div>';
      ex.forEach(x => {
        const v = (d.ex || {})[x.id];
        html += '<div class="habit' + (v === true ? " is-done" : "") + '"><div class="top"><div class="name"><b>' + esc(x.name) + '</b><span class="sub">' + esc(x.desc) + '</span></div>' +
          '<div class="tri two" role="group" aria-label="' + esc(x.name) + '">' +
          '<button data-extra-v="' + x.id + '" data-v="full" aria-pressed="' + (v === true) + '">Yes</button>' +
          '<button data-extra-v="' + x.id + '" data-v="missed" aria-pressed="' + (v === false) + '">No</button></div></div></div>';
      });
      html += '</div>';
    }
    $("slots").innerHTML = html;
    renderFree();

    // weekly strip
    const m = mondayOf(date), wd = weekDays(m);
    const swims = wd.filter(x => (day(x).swim || {}).lengths > 0).length;
    const ships = wd.filter(x => String(day(x).ship || "").trim()).length;
    const wi = wd.map(x => day(x).weight).filter(Boolean);
    const isFri = dow(date) === 5, isSun = dow(date) === 0;
    $("weekly").innerHTML = '<div class="weekly">' +
      '<button class="wk' + (swims >= 2 ? " ok" : "") + '" data-go="body" data-anchor-to="swimPanel"><span class="eyebrow">Swim</span><span class="v">' + swims + '/2</span><span class="small muted">this week</span></button>' +
      '<button class="wk' + (ships ? " ok" : isFri ? " due" : "") + '" data-ship="1"><span class="eyebrow">Ship</span><span class="v">' + (ships ? "✓ " + ships : "–") + '</span><span class="small muted">' + (isFri && !ships ? "due today" : "by Friday") + '</span></button>' +
      '<button class="wk' + (wi.length ? " ok" : isSun ? " due" : "") + '" data-weigh="1"><span class="eyebrow">Weigh-in</span><span class="v">' + (wi.length ? esc(wi[wi.length - 1]) : "–") + '</span><span class="small muted">' + (isSun && !wi.length ? "this morning" : "Sunday") + '</span></button>' +
      '</div><div id="weeklyEdit"></div>';
    renderWeeklyEdit();

    // next block
    const up = habits().filter(x => x.block > 1 && date < blockStart(x.block)).sort((a, b2) => a.block - b2.block)[0];
    $("nextUp").innerHTML = up ? '<div class="next-up"><span class="eyebrow">Next block · ' + short(blockStart(up.block)) + '</span><b>' + esc(up.name) + '</b><span class="small muted">Starts only if this block holds on most days. Otherwise it repeats, and that is progress.</span></div>' : "";
  }
  function renderThree() {
    const date = view.day, list = three(date), box = $("three");
    const nDone = list.filter(x => x.done).length;
    let html = '<div class="panel"><div class="row between"><span class="eyebrow">' + (date === todayIso() ? "Your three for today" : "The three for this day") + '</span>' +
      (list.length ? '<span class="hrow2"><span class="small muted mono">' + nDone + '/' + list.length + '</span><button class="linkbtn" data-three-edit="1">' + (view.threeEdit ? "Done" : "Edit") + '</button></span>' : "") + '</div>';
    list.forEach((x, i) => {
      html += '<div class="titem' + (x.done ? " done" : "") + '"><button class="chk" data-three="' + i + '" aria-pressed="' + !!x.done + '" aria-label="' + (x.done ? "Done: " : "Mark done: ") + esc(x.t) + '">✓</button>' +
        '<span class="t">' + esc(x.t) + (x.goal ? '<span class="tag">goal</span>' : "") + '</span>' +
        (view.threeEdit ? '<button class="mini" data-three-del="' + i + '">Remove</button>' : x.done ? "<span></span>" : '<button class="mini" data-three-go="' + i + '">Start</button>') + '</div>';
    });
    if (!list.length) html += '<p class="small muted">Nothing was set last night. Name the one thing that would make today count.</p>';
    if (list.length < 3) html += '<form class="tmr two" id="threeForm"><input type="text" id="threeIn" placeholder="' + (list.length ? "Add another (three at most)" : "One thing for today") + '" aria-label="Add a thing for today"><button class="btn small" type="submit">Add</button></form>';
    box.innerHTML = html + '</div>';
    const f = $("threeForm");
    if (f) f.onsubmit = e => {
      e.preventDefault();
      const v = $("threeIn").value.trim();
      if (!v) return;
      editThree(date, l => { if (l.length < 3) l.push({ t: v }); });
      renderThree();
    };
  }
  function renderFree() {
    const box = $("free"), t = todayIso();
    if (view.day !== t) { box.innerHTML = ""; return; }
    const f = view.free, m = f && menu().find(x => x.id === f.id);
    const did = day(t).free || [];
    let html = '<div class="panel"><div class="field"><span class="lbl">Got free time?</span><span class="hint">Say how long. You get one thing to do, not a list to choose from.</span></div>' +
      '<div class="chips three" role="group" aria-label="Free time">' + [[10, "10 min"], [30, "30 min"], [60, "1 h +"]].map(([n, l]) => '<button data-free="' + n + '" aria-pressed="' + (!!f && f.mins === n) + '">' + l + '</button>').join("") + '</div>';
    if (m) html += '<div class="pick"><span class="eyebrow">' + esc(m.kind || "yours") + '</span><h3>' + esc(fill(m.name)) + '</h3>' + (m.how ? '<p class="small muted">' + esc(fill(m.how)) + '</p>' : "") +
      '<div class="row">' + (m.link === "body" ? '<button class="btn small" data-go="body">Open Body</button>' : m.timer === false ? "" : '<button class="btn small" data-free-start="1">Start timer</button>') +
      '<button class="btn ghost small" data-free-done="1">Did it</button><button class="btn ghost small" data-free-next="1">Another</button></div></div>';
    if (did.length) html += '<ul class="notes">' + did.map(x => '<li><span class="d ok">✓</span><span>' + esc(x.name) + '</span></li>').join("") + '</ul>';
    box.innerHTML = html + '</div>';
  }
  let weeklyEditMode = null;
  function renderWeeklyEdit() {
    const box = $("weeklyEdit"); if (!box) return;
    const date = view.day, d = day(date);
    if (weeklyEditMode === "ship") {
      box.innerHTML = '<div class="panel"><div class="field"><label for="shipIn">What did you finish and show?</label><span class="hint">A commit, a page, a drawing sent to your brother. Finished beats perfect.</span><input type="text" id="shipIn" placeholder="Pushed the cash-flow chart to the model"></div><div class="row"><button class="btn small" id="shipSave">Save</button><button class="btn ghost small" id="editClose">Close</button></div></div>';
      $("shipIn").value = d.ship || "";
      $("shipSave").onclick = () => { const v = $("shipIn").value.trim(); edit(date, x => { if (v) x.ship = v; else delete x.ship; }); weeklyEditMode = null; toast(v ? "Shipped. Counted." : "Cleared"); renderToday(); };
      $("editClose").onclick = () => { weeklyEditMode = null; renderToday(); };
    } else if (weeklyEditMode === "weigh") {
      box.innerHTML = '<div class="panel"><div class="field"><label for="weighIn">Weight this morning (kg)</label><span class="hint">Once a week, Sunday, before breakfast. The trend matters, not the day.</span><input type="number" id="weighIn" step="0.1" inputmode="decimal" placeholder="kg"></div><div class="row"><button class="btn small" id="weighSave">Save</button><button class="btn ghost small" id="editClose">Close</button></div></div>';
      $("weighIn").value = d.weight || "";
      $("weighSave").onclick = () => { const v = parseFloat($("weighIn").value); edit(date, x => { if (v > 20 && v < 250) x.weight = Math.round(v * 10) / 10; else delete x.weight; }); weeklyEditMode = null; toast("Saved"); renderToday(); };
      $("editClose").onclick = () => { weeklyEditMode = null; renderToday(); };
    } else box.innerHTML = "";
  }

  // ----- Journal -----
  function renderJournal() {
    renderDayHead();
    const date = view.day, d = day(date), j = d.j || {}, h = d.h || {};
    JFIELDS.forEach(k => setIfIdle(document.querySelector('[data-j="' + k + '"]'), j[k]));
    $$(".star").forEach(b => b.setAttribute("aria-pressed", String(String(j.goalItem) === b.dataset.star)));
    const hs = activeHabits(date);
    $("jPromises").textContent = hs.filter(x => done(h[x.id])).length + "/" + hs.length;
    const goal = weekRec(mondayOf(date)).goal;
    $("jGoalHint").textContent = goal ? "They become tomorrow's three on Today. This week's goal: " + goal + ". Tap Goal on the item that moves it." : "Three items. They become tomorrow's three on Today. Tap Goal on the one that moves this week's goal.";
    // unfinished items from this day's three can roll into tomorrow with one tap
    const slots = ["t1", "t2", "t3"].filter(k => !String(j[k] || "").trim());
    const left = three(date).filter(x => !x.done && ![j.t1, j.t2, j.t3].includes(x.t)).map(x => x.t).slice(0, slots.length);
    $("jCarry").innerHTML = left.length ? '<button class="linkbtn" id="carryBtn">Carry over ' + left.length + ' unfinished from today</button>' : "";
    const cb = $("carryBtn");
    if (cb) cb.onclick = () => {
      edit(date, x => { left.forEach((v, i) => { x.j[slots[i]] = v; }); if (!x.jManual) x.h.journal = "full"; });
      renderJournal();
    };
  }

  // ----- Body -----
  function pickRoutine(mins, avoid) {
    const pool = routines().filter(r => mins >= 25 ? r.pool : (!r.pool && (r.minutes || 10) <= mins));
    const best = pool.filter(r => (r.minutes || 10) === Math.max(...pool.map(p => p.minutes || 10)));
    let options = (mins >= 25 ? pool : (pool.filter(r => (r.minutes || 10) >= mins - 5).length ? pool.filter(r => (r.minutes || 10) >= mins - 5) : best)).filter(r => !avoid.includes(r.id));
    if (!options.length) options = pool;
    return options.length ? options[Math.floor(Math.random() * options.length)] : null;
  }
  function renderBody() {
    const t = todayIso(), d = day(t);
    $("bodyEyebrow").textContent = pretty(t);
    $$("#timeChips button").forEach(b => b.setAttribute("aria-pressed", String(Number(b.dataset.mins) === S.ui.mins)));
    let r = routines().find(x => x.id === d.routine);
    const fits = r && (S.ui.mins >= 25 ? r.pool : !r.pool && (r.minutes || 10) <= S.ui.mins);
    if (!fits) {
      const yesterday = day(addDays(t, -1)).routine;
      r = pickRoutine(S.ui.mins, [yesterday]);
      if (r && !d.routineDone) edit(t, x => { x.routine = r.id; });
    }
    const card = $("routineCard");
    if (!r) {
      card.innerHTML = '<div class="routine"><h2>No routine fits</h2><p class="muted">Add one under All routines.</p></div>';
    } else {
      const bodyLive = isActive(D.habits.find(x => x.id === "body"), t) && t >= blockStart(2);
      card.innerHTML = '<div class="routine' + (d.routineDone ? " done" : "") + '"><div class="eyebrow">' + esc(r.minutes || 10) + ' min' + (d.routineDone ? " · done today" : "") + '</div>' +
        '<h2>' + esc(r.name) + '</h2><ol>' + (r.moves || []).map(m => '<li>' + esc(m) + '</li>').join("") + '</ol>' +
        (r.note ? '<p class="small muted">' + esc(r.note) + '</p>' : "") +
        (!bodyLive ? '<p class="small" style="color:var(--dawn)">The morning body habit starts ' + short(blockStart(2)) + '. Doing it before then is a bonus.</p>' : "") +
        '<div class="acts"><button class="btn" id="routineDone">' + (d.routineDone ? "Done ✓" : "Mark done") + '</button><button class="btn ghost" id="routineShuffle" aria-label="Pick another routine">Another</button></div></div>';
      $("routineDone").onclick = () => {
        edit(t, x => {
          x.routineDone = !x.routineDone; x.routine = r.id;
          if (x.routineDone && t >= blockStart(2)) x.h.body = (r.minutes || 10) >= 10 ? "full" : "min";
        });
        if (day(t).routineDone) toast("Body done. Counted.");
        renderBody();
      };
      $("routineShuffle").onclick = () => {
        const n = pickRoutine(S.ui.mins, [r.id, day(addDays(t, -1)).routine]);
        if (n) edit(t, x => { x.routine = n.id; x.routineDone = false; });
        renderBody();
      };
    }
    // swim
    const len = Number(S.settings.poolLen) || 25;
    const wd = weekDays(mondayOf(t));
    const swims = wd.filter(x => (day(x).swim || {}).lengths > 0).length;
    $("swimWeek").textContent = swims + "/2 this week";
    let best = 0;
    Object.values(S.days).forEach(x => { const n = (x.swim || {}).nonstop || 0; if (n > best) best = n; });
    const bestM = best * len;
    $("swimBar").style.width = Math.min(100, Math.round(bestM / 1000 * 100)) + "%";
    $("swimBest").textContent = best ? "Best without stopping: " + best + " lengths (" + bestM + " m of 1,000)." : "Log your first swim to start the line toward 1 km.";
    const sw = d.swim || {};
    setIfIdle($("swimLengths"), sw.lengths || "");
    setIfIdle($("swimNonstop"), sw.nonstop || "");
    // pool list
    const all = routines();
    $("poolCount").textContent = "(" + all.length + ")";
    $("pool").innerHTML = all.map(x => '<div class="item"><div class="txt"><b>' + esc(x.name) + '</b><br><span class="small muted">' + esc(x.minutes || 10) + ' min · ' + (x.moves || []).length + ' moves</span></div>' +
      '<button class="btn danger" data-del="' + esc(x.id) + '">Remove</button></div>').join("") +
      (S.routinesHidden.length ? '<div class="item"><span class="small muted">' + S.routinesHidden.length + ' removed</span><button class="btn ghost small" id="restoreRoutines">Bring back</button></div>' : "");
    const rr = $("restoreRoutines"); if (rr) rr.onclick = () => { S.routinesHidden = []; persist(); renderBody(); };
  }

  // ----- Week -----
  function weekRows(m) {
    const wd = weekDays(m);
    return habits().filter(h => wd.some(x => isActive(h, x))).map(h => ({ id: h.id, kind: "h", name: h.name }))
      .concat(D.extras.filter(x => S.settings.extras[x.id]).map(x => ({ id: x.id, kind: "x", name: x.name })));
  }
  function heldCount(m, id) { return weekDays(m).filter(x => done((day(x).h || {})[id])).length; }
  function gridHtml(m) {
    const wd = weekDays(m), t = todayIso();
    let html = '<table class="grid"><thead><tr><th></th>' + wd.map(x => '<th class="' + (x === t ? "today" : "") + '">' + DOW[dow(x)] + '<br><span class="mono">' + parse(x).getDate() + '</span></th>').join("") + '<th>Held</th></tr></thead><tbody>';
    weekRows(m).forEach(r => {
      let n = 0;
      html += '<tr><td class="lab">' + esc(SHORT[r.id] || r.name) + '</td>' + wd.map(x => {
        const dd = day(x); let cls = "";
        if (r.kind === "h") { const v = (dd.h || {})[r.id]; if (v) cls = v; if (done(v)) n++; }
        else { const v = (dd.ex || {})[r.id]; if (v === true) { cls = "yes"; n++; } else if (v === false) cls = "no"; }
        return '<td><i class="dot ' + cls + '" title="' + esc(cls || "not logged") + '"></i></td>';
      }).join("") + '<td class="held' + (n >= 5 ? " ok" : "") + '">' + n + '/7</td></tr>';
    });
    return html + '</tbody></table>';
  }
  // A small line chart. pts: [{ d: "YYYY-MM-DD", v: number }]
  function lineChart(pts, o) {
    const goal = Number(o.goal) || null, step = o.step || 1, padV = o.pad == null ? 0.5 : o.pad;
    const W = 320, H = 120, pl = 34, pr = 8, pt = 12, pb = 18;
    const vs = pts.map(p => p.v).concat(goal ? [goal] : []);
    let lo = Math.floor((Math.min(...vs) - padV) / step) * step, hi = Math.ceil((Math.max(...vs) + padV) / step) * step;
    if (lo < 0) lo = 0;
    if (hi - lo < 2 * step) hi = lo + 2 * step;
    const x = i => pl + i * (W - pl - pr) / (pts.length - 1);
    const y = v => pt + (hi - v) * (H - pt - pb) / (hi - lo);
    const line = pts.map((p, i) => (i ? "L" : "M") + x(i).toFixed(1) + " " + y(p.v).toFixed(1)).join(" ");
    const area = line + " L" + x(pts.length - 1).toFixed(1) + " " + (H - pb) + " L" + x(0).toFixed(1) + " " + (H - pb) + " Z";
    let svg = '<svg class="chart" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(o.label || "Trend") + '">';
    [lo, (lo + hi) / 2, hi].forEach(v => { svg += '<line class="grid" x1="' + pl + '" x2="' + (W - pr) + '" y1="' + y(v) + '" y2="' + y(v) + '"/><text x="2" y="' + (y(v) + 3) + '">' + (Math.round(v * 10) / 10) + '</text>'; });
    if (goal) svg += '<line class="gl" x1="' + pl + '" x2="' + (W - pr) + '" y1="' + y(goal) + '" y2="' + y(goal) + '"/><text text-anchor="end" x="' + (W - pr - 2) + '" y="' + (y(goal) - 4) + '">' + esc(o.goalLabel || "goal") + ' ' + goal + '</text>';
    svg += '<path class="ar" d="' + area + '"/><path class="ln" d="' + line + '"/>';
    const last = pts.length - 1;
    svg += '<circle class="pt" cx="' + x(last) + '" cy="' + y(pts[last].v) + '" r="4"/>';
    svg += '<text x="' + pl + '" y="' + (H - 4) + '">' + short(pts[0].d) + '</text><text text-anchor="end" x="' + (W - pr) + '" y="' + (H - 4) + '">' + short(pts[last].d) + '</text>';
    return svg + '</svg>';
  }
  function series(fn, n) {
    return Object.keys(S.days).sort().map(k => ({ d: k, v: fn(S.days[k]) })).filter(p => p.v > 0).slice(-n);
  }
  function chartOrNote(pts, o, none, one) {
    if (pts.length >= 2) {
      const a = pts[0].v, z = pts[pts.length - 1].v, diff = Math.round((z - a) * 10) / 10;
      return lineChart(pts, o) + '<p class="small muted">' + esc(o.fmt(z)) + ' now, ' + (diff === 0 ? "level" : (diff > 0 ? "up " : "down ") + esc(o.fmt(Math.abs(diff)))) + ' since ' + short(pts[0].d) + '.</p>';
    }
    return '<p class="small muted">' + (pts.length ? one : none) + '</p>';
  }
  function renderWeek() {
    const sub = view.prog || "week";
    $$("#progSeg button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.prog === sub)));
    $("pWeek").hidden = sub !== "week"; $("pTrends").hidden = sub !== "trends"; $("pLog").hidden = sub !== "log";
    if (sub === "week") renderWeekSub(); else if (sub === "trends") renderTrends(); else renderLog();
  }
  function renderWeekSub() {
    const m = view.week, t = todayIso(), wd = weekDays(m);
    const isThis = m === mondayOf(t);
    $("weekEyebrow").textContent = isThis ? "This week" : m === mondayOf(addDays(t, -7)) ? "Last week" : "Week";
    $("weekTitle").textContent = short(m) + " to " + short(addDays(m, 6));
    $("nextWeek").disabled = m >= mondayOf(t);
    const rows = weekRows(m).filter(r => r.kind === "h");
    const held = rows.filter(r => heldCount(m, r.id) >= 5);
    $("weekSummary").innerHTML = held.length
      ? "<b>" + held.length + " of " + rows.length + " held</b> (5+ days): " + esc(held.map(r => r.name).join(", ")) + "."
      : (isThis && dow(t) !== 0 ? "<b>The week is still open.</b> Five days out of seven is the bar, not seven." : "<b>No habit reached 5 days.</b> That's information, not a verdict. Repeat the block.");
    $("weekGrid").innerHTML = gridHtml(m);
    const swims = wd.filter(x => (day(x).swim || {}).lengths > 0).length;
    const ships = wd.filter(x => String(day(x).ship || "").trim());
    const wi = wd.map(x => day(x).weight).filter(Boolean);
    const focus = wd.reduce((a, x) => a + (day(x).focus || 0), 0);
    $("wSwims").textContent = swims + "/2";
    $("wShips").textContent = String(ships.length);
    $("wFocus").textContent = focus ? fmtMins(focus) : "–";
    $("wWeight").textContent = wi.length ? wi[wi.length - 1] + " kg" : "–";
    const wins = wd.filter(x => (day(x).j || {}).win);
    $("weekWins").innerHTML = wins.length ? wins.map(x => '<li><span class="d">' + DOW[dow(x)] + '</span><span>' + esc(day(x).j.win) + '</span></li>').join("") : '<li class="muted">No wins written yet. They come from the Win line in the journal.</li>';
    $("weekShips").innerHTML = ships.length ? ships.map(x => '<li><span class="d">' + DOW[dow(x)] + '</span><span>' + esc(day(x).ship) + '</span></li>').join("") : '<li class="muted">Nothing shipped yet. Friday is the day. Tap Ship on Today.</li>';
    // review
    const r = weekRec(m), next = addDays(m, 7);
    $("reviewPanel").classList.toggle("sunday", isThis && dow(t) === 0 && !r.reviewed);
    $("reviewEyebrow").textContent = (isThis && dow(t) === 0 ? "Today · " : "") + "Sunday review · 15 min";
    $("revGoal").textContent = r.goal || "No goal was set for this week.";
    $("revGoal").className = r.goal ? "" : "muted";
    $$("[data-goalmet]").forEach(b => b.setAttribute("aria-pressed", String(r.goalMet === b.dataset.goalmet)));
    setIfIdle($("qHeld"), r.held); setIfIdle($("qBlocked"), r.blocked); setIfIdle($("qChange"), r.change);
    $("nextGoalLabel").textContent = "Goal for the week of " + short(next);
    setIfIdle($("qNextGoal"), weekRec(next).goal);
  }
  function milestones() {
    const keys = Object.keys(S.days).sort(), len = Number(S.settings.poolLen) || 25, hit = {};
    const mark = (id, k) => { if (!hit[id]) hit[id] = k; };
    let shown = 0, full = 0, ships = 0, focus = 0, journals = 0, swims = 0;
    keys.forEach(k => {
      const x = S.days[k], h = x.h || {};
      if (anyDone(x)) { shown++; [1, 7, 14, 30, 60, 100].forEach(n => { if (shown === n) mark("shown" + n, k); }); }
      const hs = activeHabits(k);
      if (hs.length && hs.every(a => done(h[a.id]))) { full++; if (full === 1) mark("full1", k); if (full === 10) mark("full10", k); }
      if (String(x.ship || "").trim()) { ships++; if (ships === 1) mark("ship1", k); if (ships === 4) mark("ship4", k); }
      const f0 = focus; focus += x.focus || 0;
      [60, 600, 1500].forEach(n => { if (f0 < n && focus >= n) mark("focus" + n, k); });
      if (done(h.journal)) { journals++; if (journals === 7) mark("j7", k); if (journals === 30) mark("j30", k); }
      const sw = x.swim || {};
      if (sw.lengths > 0) { swims++; if (swims === 1) mark("swim1", k); const mt = (sw.nonstop || 0) * len; if (mt >= 500) mark("swim500", k); if (mt >= 1000) mark("swim1000", k); }
      if (Array.isArray(x.three) && x.three.length === 3 && x.three.every(i => i.done)) mark("three1", k);
    });
    if (keys.length) {
      const t = todayIso();
      for (let m = mondayOf(keys[0]); m <= t && !hit.held1; m = addDays(m, 7)) {
        if (D.habits.some(h => heldCount(m, h.id) >= 5)) mark("held1", addDays(m, 6) > t ? t : addDays(m, 6));
      }
    }
    if (S.books.length) mark("book1", S.books[0].at);
    return [
      ["shown1", "First anchor in"], ["full1", "First day with every anchor in"], ["held1", "First anchor held for a week"],
      ["shown7", "7 days shown up"], ["j7", "7 nights journaled"], ["three1", "All three done in one day"], ["ship1", "First thing shipped"],
      ["swim1", "First swim logged"], ["focus60", "First hour of focus time"], ["shown14", "14 days shown up"], ["book1", "First book finished"],
      ["shown30", "30 days shown up"], ["ship4", "4 things shipped"], ["focus600", "10 hours of focus time"], ["swim500", "500 m without stopping"],
      ["full10", "10 days with every anchor in"], ["j30", "30 nights journaled"], ["shown60", "60 days shown up"], ["swim1000", "1 km without stopping"],
      ["focus1500", "25 hours of focus time"], ["shown100", "100 days shown up"],
    ].map(([id, label]) => ({ id, label, at: hit[id] || null }));
  }
  function renderTrends() {
    const t = todayIso(), T = totals();
    $("headline").innerHTML = [["Days shown up", T.shown], ["Longest run", T.best + (T.best === 1 ? " day" : " days")], ["Things shipped", T.ships], ["Focus time", T.focus ? fmtMins(T.focus) : "–"]]
      .map(([l, v]) => '<div><span class="eyebrow">' + l + '</span><span class="stat">' + esc(v) + '</span></div>').join("");
    // six weeks, one square per day
    const t0 = mondayOf(t);
    let heat = "";
    for (let w = 5; w >= 0; w--) {
      const wm = addDays(t0, -7 * w);
      heat += '<button class="hrow" data-week="' + wm + '" aria-label="Open the week of ' + short(wm) + '"><span>' + short(wm) + '</span>' + weekDays(wm).map(x => {
        if (x > t) return '<i class="fut"></i>';
        const sc = dayScore(x);
        return '<i class="' + (sc == null ? "" : sc >= 1 ? "l3" : sc >= 0.5 ? "l2" : sc > 0 ? "l1" : "") + (x === t ? " tod" : "") + '"></i>';
      }).join("") + '</button>';
    }
    $("heat").innerHTML = heat;
    const b = currentBlock(t), dIn = daysBetween(blockStart(b), t) + 1, toRe = daysBetween(t, D.recheck);
    $("whereNow").textContent = (t < blockStart(1) ? "Practice run before block 1" : "Block " + b + (dIn > 14 ? " again" : "") + ", day " + ((dIn - 1) % 14 + 1) + " of 14") + " · " +
      (toRe > 0 ? "recheck on " + short(D.recheck) + ", in " + toRe + (toRe === 1 ? " day" : " days") : toRe === 0 ? "recheck day is today" : "recheck was " + short(D.recheck));
    // each anchor over the last four weeks
    const keys = Object.keys(S.days).sort();
    const first = keys.length ? keys[0] : t;
    const win = Array.from({ length: 28 }, (_, i) => addDays(t, i - 27)).filter(k => k >= first);
    $("holdBars").innerHTML = activeHabits(t).map(h => {
      const el = win.filter(k => isActive(h, k)), n = el.filter(k => done((day(k).h || {})[h.id])).length;
      if (!el.length) return "";
      const pct = n / el.length;
      return '<div class="bar"><div class="top"><b>' + esc(h.name) + '</b><span class="' + (pct >= 5 / 7 ? "ok" : "") + '">' + n + '/' + el.length + '</span></div><div class="track"><i style="width:' + Math.round(pct * 100) + '%"></i></div></div>';
    }).join("") || '<p class="small muted">Tick your first anchor and the bars start.</p>';
    // charts
    const len = Number(S.settings.poolLen) || 25;
    $("sleepChart").innerHTML = chartOrNote(series(x => parseFloat((x.j || {}).sleep) || 0, 28), { label: "Hours of sleep", goal: 7.5, goalLabel: "aim", step: 1, fmt: v => v + " h" },
      "Fill in Sleep at the top of the journal and the line shows here.", "One night so far. The line starts with the second.");
    $("weightChart").innerHTML = chartOrNote(series(x => x.weight || 0, 16), { label: "Weight trend", goal: S.settings.weightGoal, step: 1, fmt: v => v + " kg" },
      "Weigh in on Sunday mornings and the trend shows here." + (S.settings.weightGoal ? "" : " Set your goal in More."), "One weigh-in so far. The line starts with the second.");
    $("swimChart").innerHTML = chartOrNote(series(x => ((x.swim || {}).nonstop || 0) * len, 16), { label: "Longest swim without stopping, in metres", goal: 1000, step: 100, pad: 0, fmt: v => v + " m" },
      "Log a swim in Body and the line toward 1 km starts.", "One swim so far. The line starts with the second.");
    // focus per week
    const fw = Array.from({ length: 6 }, (_, i) => { const wm = addDays(t0, -7 * (5 - i)); return { wm, v: weekDays(wm).reduce((a, x) => a + (day(x).focus || 0), 0) }; });
    const mx = Math.max(...fw.map(x => x.v));
    $("focusBars").innerHTML = mx ? '<div class="cols">' + fw.map(x => '<div class="c"><span>' + (x.v ? fmtMins(x.v).replace(" min", "m").replace(" h", "h") : "") + '</span><i class="' + (x.v ? "" : "zero") + '" style="height:' + Math.round(x.v / mx * 70) + '%"></i><span>' + short(x.wm) + '</span></div>').join("") + '</div>'
      : '<p class="small muted">Every timer you run from Stuck? or from your three is counted here.</p>';
    // milestones
    const ms = milestones(), got = ms.filter(x => x.at).sort((a, b) => a.at < b.at ? 1 : -1), nxt = ms.filter(x => !x.at).slice(0, 3);
    $("milestones").innerHTML = got.map(x => '<li><span class="d wide ok">' + short(x.at) + '</span><span>' + esc(x.label) + '</span></li>').join("") +
      nxt.map(x => '<li class="muted"><span class="d wide">next</span><span>' + esc(x.label) + '</span></li>').join("");
  }
  function logEntries(k) {
    const x = S.days[k] || {}, j = x.j || {}, out = [];
    if (j.win) out.push(["win", j.win]);
    if (x.ship) out.push(["shipped", x.ship]);
    (Array.isArray(x.three) ? x.three : []).filter(i => i.done).forEach(i => out.push(["done", i.t]));
    (x.free || []).forEach(i => out.push(["did", i.name]));
    if (j.did) out.push(["did", j.did]);
    if (j.learned) out.push(["learned", j.learned]);
    if (j.evidence) out.push(["proof", j.evidence]);
    if (x.swim && x.swim.lengths) out.push(["swim", x.swim.lengths + " lengths" + (x.swim.nonstop ? ", " + x.swim.nonstop + " without stopping" : "")]);
    if (x.routineDone) { const r = routines().find(q => q.id === x.routine); out.push(["body", r ? r.name : "Routine done"]); }
    if (x.focus) out.push(["focus", fmtMins(x.focus)]);
    if (x.weight) out.push(["weight", x.weight + " kg"]);
    S.books.filter(b => b.at === k).forEach(b => out.push(["book", "Finished " + b.title]));
    return out;
  }
  function renderLog() {
    const keys = Array.from(new Set(Object.keys(S.days).concat(S.books.map(b => b.at)))).sort().reverse();
    const blocks = [];
    keys.forEach(k => { const e = logEntries(k); if (e.length || anyDone(S.days[k])) blocks.push([k, e]); });
    const n = view.logN || 14;
    $("logList").innerHTML = blocks.length ? blocks.slice(0, n).map(([k, e]) => {
      const hs = activeHabits(k), h = (S.days[k] || {}).h || {}, nd = hs.filter(a => done(h[a.id])).length;
      return '<div class="dayb"><div class="hd"><button class="dl" data-logday="' + k + '" aria-label="Open ' + pretty(k) + '">' + pretty(k) + ' ›</button><span class="small muted mono">' + nd + '/' + hs.length + ' anchors</span></div>' +
        (e.length ? '<ul class="notes">' + e.map(([kind, txt]) => '<li><span class="k">' + kind + '</span><span>' + esc(txt) + '</span></li>').join("") + '</ul>' : "") + '</div>';
    }).join("") : '<p class="muted">Nothing here yet. Tick one anchor or write one line tonight, and the trace begins.</p>';
    $("logMore").hidden = blocks.length <= n;
  }
  function weekText(m) {
    const wd = weekDays(m), lines = [];
    lines.push("Anchors, week of " + short(m) + " to " + short(addDays(m, 6)));
    weekRows(m).filter(r => r.kind === "h").forEach(r => {
      const marks = wd.map(x => { const v = (day(x).h || {})[r.id]; return v === "full" ? "F" : v === "min" ? "m" : v === "missed" ? "x" : "."; }).join("");
      lines.push("- " + r.name + ": " + heldCount(m, r.id) + "/7 [" + marks + "]");
    });
    const swims = wd.map(x => day(x).swim).filter(s => s && s.lengths);
    lines.push("Swims: " + swims.length + (swims.length ? " (" + swims.map(s => s.lengths + " lengths, " + (s.nonstop || "?") + " nonstop").join("; ") + ")" : ""));
    const ships = wd.filter(x => day(x).ship).map(x => DOW[dow(x)] + ": " + day(x).ship);
    lines.push("Shipped: " + (ships.length ? ships.join("; ") : "nothing"));
    const th = wd.map(x => day(x).three).filter(Array.isArray);
    const tAll = th.reduce((a, l) => a + l.length, 0);
    if (tAll) lines.push("Daily three: " + th.reduce((a, l) => a + l.filter(i => i.done).length, 0) + "/" + tAll + " done");
    const focus = wd.reduce((a, x) => a + (day(x).focus || 0), 0);
    if (focus) lines.push("Focus time: " + fmtMins(focus));
    const fr = [];
    wd.forEach(x => (day(x).free || []).forEach(i => fr.push(i.name)));
    if (fr.length) lines.push("Free time used on: " + fr.join("; "));
    const wi = wd.filter(x => day(x).weight).map(x => day(x).weight + " kg");
    if (wi.length) lines.push("Weight: " + wi.join(", "));
    const sleep = wd.map(x => parseFloat((day(x).j || {}).sleep)).filter(n => n > 0);
    if (sleep.length) lines.push("Sleep avg: " + (sleep.reduce((a, b) => a + b, 0) / sleep.length).toFixed(1) + " h over " + sleep.length + " nights");
    const wins = wd.filter(x => (day(x).j || {}).win).map(x => DOW[dow(x)] + ": " + day(x).j.win);
    if (wins.length) lines.push("Wins: " + wins.join("; "));
    const r = weekRec(m);
    if (r.goal) lines.push("Goal: " + r.goal + (r.goalMet ? " (" + r.goalMet + ")" : ""));
    if (r.held) lines.push("What held: " + r.held);
    if (r.blocked) lines.push("In the way: " + r.blocked);
    if (r.change) lines.push("One change: " + r.change);
    return lines.join("\n");
  }
  function reportText() {
    const t = todayIso(), t0 = mondayOf(t), T = totals();
    const lines = ["Anchors, six-week report to " + short(t), "Totals: " + T.shown + " days shown up, longest run " + T.best + ", " + T.ships + " shipped, " + fmtMins(T.focus) + " of focus time"];
    for (let w = 5; w >= 0; w--) {
      const m = addDays(t0, -7 * w);
      if (weekDays(m).some(x => S.days[x])) lines.push("", weekText(m));
    }
    const ms = milestones().filter(x => x.at);
    if (ms.length) lines.push("", "Milestones: " + ms.map(x => x.label + " (" + short(x.at) + ")").join("; "));
    if (S.books.length) lines.push("Books finished: " + S.books.map(b => b.title).join("; "));
    if (S.parking.length) lines.push("Parked ideas: " + S.parking.map(p => p.text).join("; "));
    return lines.join("\n");
  }
  async function copyText(txt, okMsg) {
    try { await navigator.clipboard.writeText(txt); toast(okMsg); }
    catch (e) {
      try { if (navigator.share) { await navigator.share({ text: txt }); return; } } catch (e2) { return; }
      toast("Couldn't copy on this phone.");
    }
  }

  // ----- More -----
  function renderMore() {
    $$(".tWake").forEach(e => e.textContent = S.settings.wake);
    setIfIdle($("wakeTime"), S.settings.wake);
    setIfIdle($("phoneTime"), S.settings.phone);
    setIfIdle($("bedTime"), S.settings.bed);
    const [wh, wm] = S.settings.wake.split(":").map(Number), [bh, bm] = S.settings.bed.split(":").map(Number);
    let mins = (wh * 60 + wm) - (bh * 60 + bm); if (mins <= 0) mins += 1440;
    const hrs = mins / 60;
    $("sleepCalc").textContent = String(Math.round(hrs * 10) / 10) + " h in bed." + (hrs < 7 ? " Under 7 hours; aim for 7 to 8." : hrs > 9 ? " A long night; 7 to 8 is the aim." : " Right in the 7 to 8 hour range.");
    // blocks
    const t = todayIso();
    $("blockList").innerHTML = Object.keys(S.settings.blocks).map(Number).sort((a, b) => a - b).map(b => {
      const s = blockStart(b), live = t >= s;
      return '<div class="b"><div class="txt"><b>' + b + '. ' + esc((D.blocks[b] || {}).name || "") + '</b><br><span class="small muted">' + (live ? "since " : "from ") + short(s) + '</span></div>' +
        (b > 1 && !live ? '<button data-shift="' + b + '" data-n="-7">−1 wk</button><button data-shift="' + b + '" data-n="7">+1 wk</button>' : '<span></span><span></span>') + '</div>';
    }).join("");
    setIfIdle($("weightGoal"), S.settings.weightGoal || "");
    setIfIdle($("poolLen"), S.settings.poolLen || "");
    setIfIdle($("weightToday"), day(t).weight || "");
    $$("[data-extra]").forEach(b => b.setAttribute("aria-checked", String(!!S.settings.extras[b.dataset.extra])));
    // parking lot: the list waits for the recheck day
    $("recheckTxt").textContent = short(D.recheck);
    const open = t >= D.recheck || view.parkOpen;
    $("parkList").innerHTML = !S.parking.length ? '<li class="muted">Empty. Good.</li>'
      : open ? S.parking.map(p => '<li><span class="d">' + esc(short(p.at)) + '</span><span>' + esc(p.text) + '</span><button class="x" data-unpark="' + esc(p.id) + '" aria-label="Remove">×</button></li>').join("")
      : '<li><span>' + S.parking.length + ' parked. They wait for ' + short(D.recheck) + '.</span><button class="x" id="peek" aria-label="Show them anyway">show</button></li>';
    const pk = $("peek"); if (pk) pk.onclick = () => { view.parkOpen = true; renderMore(); };
    // backup age
    const le = S.settings.lastExport;
    const age = le ? daysBetween(le, t) : null;
    $("backupAge").textContent = le ? "Last backup: " + short(le) + (age > 14 ? ". That's over two weeks; save one now." : ".") : "No backup saved yet.";
    $("backupAge").style.color = !le || age > 14 ? "var(--dawn)" : "";
    $("travelMode").setAttribute("aria-checked", String(!!S.settings.travel));
    setIfIdle($("bookNow"), S.settings.book || "");
    $("bookList").innerHTML = S.books.length ? S.books.slice().reverse().map(b => '<li><span class="d wide">' + esc(short(b.at)) + '</span><span>' + esc(b.title) + '</span></li>').join("") : '<li class="muted">Finished books collect here.</li>';
    const mn = menu();
    $("menuCount").textContent = "(" + mn.length + ")";
    $("menuList").innerHTML = [10, 30, 60].map(n => mn.filter(m => m.mins === n).map(m => '<div class="item"><div class="txt"><b>' + esc(fill(m.name)) + '</b><br><span class="small muted">' + (n === 60 ? "1 h +" : n + " min") + '</span></div><button class="btn danger" data-mdel="' + esc(m.id) + '">Remove</button></div>').join("")).join("") +
      (S.menuHidden.length ? '<div class="item"><span class="small muted">' + S.menuHidden.length + ' removed</span><button class="btn ghost small" data-mrestore="1">Bring back</button></div>' : "");
    $$("#mMins button").forEach(b => b.setAttribute("aria-pressed", String(Number(b.dataset.mmins) === (view.mMins || 10))));
    const he = $("habitEdit");
    if (!he.contains(document.activeElement)) he.innerHTML = D.habits.map(h => {
      const e = S.habitEdits[h.id] || {}, v = k => esc(e[k] != null ? e[k] : h[k]);
      return '<div class="h"><input type="text" data-hedit="' + h.id + '" data-k="name" value="' + v("name") + '" aria-label="Name of the anchor">' +
        '<label class="small muted" for="hf-' + h.id + '">Full version</label><textarea id="hf-' + h.id + '" rows="3" data-hedit="' + h.id + '" data-k="full">' + v("full") + '</textarea>' +
        '<label class="small muted" for="hm-' + h.id + '">Minimum</label><textarea id="hm-' + h.id + '" rows="2" data-hedit="' + h.id + '" data-k="min">' + v("min") + '</textarea>' +
        (S.habitEdits[h.id] ? '<button class="linkbtn" data-hreset="' + h.id + '">Back to the original wording</button>' : "") + '</div>';
    }).join("");
    $("version").textContent = "Anchors " + VERSION + " · works offline · data on this phone only";
  }
  function renderTimes() {
    $$(".tPhone").forEach(e => e.textContent = S.settings.phone);
    $$(".tBed").forEach(e => e.textContent = S.settings.bed);
    $$(".tWake").forEach(e => e.textContent = S.settings.wake);
  }

  // ---------- stuck + timer ----------
  let actx = null;
  function primeAudio() { try { actx = actx || new (window.AudioContext || window.webkitAudioContext)(); if (actx.resume) actx.resume(); } catch (e) {} }
  function beep() {
    try {
      if (!actx) return;
      [0, 0.35, 0.7].forEach(o => {
        const os = actx.createOscillator(), g = actx.createGain(), t0 = actx.currentTime + o;
        os.frequency.value = 660; os.connect(g); g.connect(actx.destination);
        g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.25, t0 + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.28);
        os.start(t0); os.stop(t0 + 0.3);
      });
    } catch (e) {}
  }
  // Every timer leaves a trace: minutes of focus on the day it started.
  function logFocus(tm, mins) {
    if (!tm || tm.logged || mins < 1) return;
    tm.logged = true;
    edit(tm.day || todayIso(), d => { d.focus = (d.focus || 0) + mins; });
  }
  function renderStuckBtn() {
    const b = $("stuckBtn"), tm = S.timer;
    if (tm && tm.endsAt > Date.now()) {
      const left = Math.ceil((tm.endsAt - Date.now()) / 1000);
      b.textContent = pad(Math.floor(left / 60)) + ":" + pad(left % 60);
      b.classList.add("running");
    } else { b.textContent = "Stuck?"; b.classList.remove("running"); }
  }
  function openStuck(obj) {
    $("stuckSheet").hidden = false;
    const running = S.timer && S.timer.endsAt > Date.now();
    if (typeof obj === "string" && obj && !running) $("objective").value = obj;
    const p = proofLine();
    $("proof").hidden = !p;
    if (p) $("proof").textContent = "Proof you can. " + p;
    renderTimer();
    if (!running && !$("objective").value) setTimeout(() => $("objective").focus(), 50);
  }
  function closeStuck() { $("stuckSheet").hidden = true; }
  function renderTimer() {
    const tm = S.timer, running = tm && tm.endsAt > Date.now(), finished = tm && tm.endsAt <= Date.now() && !tm.acked;
    $("stuckSteps").hidden = !!(running || finished);
    $("timerView").hidden = !(running || finished);
    const mins = S.ui.timerMins || 25;
    $$("#timerChips button").forEach(b => b.setAttribute("aria-pressed", String(Number(b.dataset.tmins) === mins)));
    $("timerStart").textContent = "Start " + mins + " minutes";
    if (running || finished) {
      $("timerObjective").textContent = tm.objective || "The tiny objective";
      const left = Math.max(0, Math.ceil((tm.endsAt - Date.now()) / 1000));
      $("timerClock").textContent = pad(Math.floor(left / 60)) + ":" + pad(left % 60);
      const e = new Date(tm.endsAt);
      $("timerEnds").textContent = finished ? "Time. You may stop. You started, and that was the hard part." : "Ends at " + pad(e.getHours()) + ":" + pad(e.getMinutes()) + ". You may stop when it rings.";
      $("timerStop").textContent = finished ? "Close" : "Stop";
    }
  }
  function tick() {
    renderStuckBtn();
    if (!$("stuckSheet").hidden) renderTimer();
    const tm = S.timer;
    if (tm && tm.endsAt <= Date.now() && !tm.notified) {
      tm.notified = true;
      logFocus(tm, tm.mins || 25);
      persist();
      toast((tm.mins || 25) + " minutes. You may stop.");
      beep();
      try { navigator.vibrate && navigator.vibrate([200, 100, 200]); } catch (e) {}
      if ($("stuckSheet").hidden) openStuck();
      if (view.tab === "week") renderWeek();
    }
  }

  // ---------- events ----------
  document.addEventListener("click", e => {
    const b = e.target.closest("button, [data-go]");
    if (!b) return;
    const ds = b.dataset;
    if (ds.tick) {
      const id = ds.tick, v = ds.v, date = view.day;
      let now;
      edit(date, d => {
        if (d.h[id] === v && !b.closest(".next-card")) delete d.h[id]; else d.h[id] = v;
        now = d.h[id];
        if (id === "journal") d.jManual = !!d.h[id];
        if (id === "fuel") d.fuelAuto = false;
      });
      if (b.closest(".next-card")) toast(v === "min" ? "Minimum. That counts." : "Done.");
      else if (done(now) && date === todayIso() && activeHabits(date).every(x => done((day(date).h || {})[x.id]))) toast("Every anchor is in.");
      renderToday();
    } else if (ds.extraV) {
      const id = ds.extraV, v = ds.v === "full";
      edit(view.day, d => { if (d.ex[id] === v) delete d.ex[id]; else d.ex[id] = v; });
      renderToday();
    } else if (ds.expand) {
      view.expanded[ds.expand] = !view.expanded[ds.expand]; renderToday();
    } else if (ds.go) {
      location.hash = ds.go;
      if (ds.anchorTo) setTimeout(() => { const el = $(ds.anchorTo); if (el) el.scrollIntoView({ block: "start" }); }, 60);
    } else if (ds.ship) {
      weeklyEditMode = weeklyEditMode === "ship" ? null : "ship"; renderWeeklyEdit(); if (weeklyEditMode) $("shipIn").focus();
    } else if (ds.weigh) {
      weeklyEditMode = weeklyEditMode === "weigh" ? null : "weigh"; renderWeeklyEdit(); if (weeklyEditMode) $("weighIn").focus();
    } else if (ds.stuck) {
      openStuck();
    } else if (ds.star) {
      const n = Number(ds.star);
      edit(view.day, d => { d.j.goalItem = d.j.goalItem === n ? null : n; });
      renderJournal();
    } else if (ds.goalmet) {
      editWeek(view.week, w => { w.goalMet = w.goalMet === ds.goalmet ? null : ds.goalmet; w.reviewed = true; });
      renderWeek(); renderTabs();
    } else if (ds.mins) {
      S.ui.mins = Number(ds.mins); persist();
      const t = todayIso(); if (!day(t).routineDone) edit(t, x => { delete x.routine; });
      renderBody();
    } else if (ds.del) {
      if (ds.armed !== "1") { ds.armed = "1"; b.textContent = "Tap again"; setTimeout(() => { if (b.isConnected) { ds.armed = ""; b.textContent = "Remove"; } }, 3000); return; }
      const id = ds.del;
      if (S.routinesCustom.some(r => r.id === id)) S.routinesCustom = S.routinesCustom.filter(r => r.id !== id);
      else S.routinesHidden.push(id);
      persist(); renderBody();
    } else if (ds.shift) {
      const bnum = Number(ds.shift), n = Number(ds.n);
      Object.keys(S.settings.blocks).map(Number).filter(k => k >= bnum).forEach(k => {
        const nd = addDays(blockStart(k), n);
        if (nd > todayIso()) S.settings.blocks[k] = nd;
      });
      persist(); renderMore(); toast(n > 0 ? "Pushed back a week. Repeating is progress." : "Brought forward a week.");
    } else if (ds.extra) {
      S.settings.extras[ds.extra] = !S.settings.extras[ds.extra]; persist(); renderMore();
    } else if (ds.unpark) {
      S.parking = S.parking.filter(p => p.id !== ds.unpark); persist(); renderMore();
    } else if (ds.welcome) {
      S.settings.welcomed = true; persist(); renderToday();
    } else if (ds.three) {
      const i = Number(ds.three);
      editThree(view.day, l => { if (l[i]) l[i].done = !l[i].done; });
      const l = three(view.day);
      if (l[i] && l[i].done) toast(l.length === 3 && l.every(x => x.done) ? "All three. That's the day." : "Done. It's in the log.");
      renderThree();
    } else if (ds.threeGo) {
      const x = three(view.day)[Number(ds.threeGo)];
      if (x) openStuck(x.t);
    } else if (ds.threeDel) {
      editThree(view.day, l => { l.splice(Number(ds.threeDel), 1); });
      if (!three(view.day).length) view.threeEdit = false;
      renderThree();
    } else if (ds.threeEdit) {
      view.threeEdit = !view.threeEdit; renderThree();
    } else if (ds.meal) {
      edit(view.day, d => {
        const m = d.meals || (d.meals = {});
        if (m[ds.meal]) delete m[ds.meal]; else m[ds.meal] = true;
        if (m.b && m.l && m.d && m.s) { d.h.fuel = "full"; d.fuelAuto = true; }
        else if (m.s) { if (!d.h.fuel || d.fuelAuto) { d.h.fuel = "min"; d.fuelAuto = true; } }
        else if (d.fuelAuto) { delete d.h.fuel; d.fuelAuto = false; }
      });
      renderToday();
    } else if (ds.slot) {
      view.openSlot[ds.slot] = true; renderToday();
    } else if (ds.free || ds.freeNext) {
      const n = ds.free ? Number(ds.free) : view.free && view.free.mins;
      const m = n ? pickFree(n, view.free && view.free.id) : null;
      view.free = m ? { mins: n, id: m.id } : null;
      renderFree();
    } else if (ds.freeStart || ds.freeDone) {
      const m = view.free && menu().find(x => x.id === view.free.id);
      if (!m) return;
      if (ds.freeStart) {
        S.ui.timerMins = m.mins === 10 ? 10 : 25; persist();
        openStuck(fill(m.name));
      } else {
        edit(todayIso(), d => { (d.free = d.free || []).push({ id: m.id, name: fill(m.name), mins: m.mins }); });
        view.free = null; toast("Counted. Time well used."); renderFree();
      }
    } else if (ds.bc) {
      const n = Number(ds.b);
      if (ds.bc === "go") { S.blockChecks[n] = "go"; toast("Decided. One new habit, nothing else changes."); }
      else {
        Object.keys(S.settings.blocks).map(Number).filter(k => k >= n).forEach(k => { S.settings.blocks[k] = addDays(blockStart(k), 14); });
        toast("Two more weeks on this block. That is progress.");
      }
      persist(); renderToday();
    } else if (ds.logday) {
      view.day = ds.logday; location.hash = "today";
    } else if (ds.prog) {
      view.prog = ds.prog; renderWeek();
    } else if (ds.week) {
      view.week = ds.week; view.prog = "week"; renderWeek(); window.scrollTo(0, 0);
    } else if (ds.tmins) {
      S.ui.timerMins = Number(ds.tmins); persist(); renderTimer();
    } else if (ds.mdel) {
      if (S.menuCustom.some(m => m.id === ds.mdel)) S.menuCustom = S.menuCustom.filter(m => m.id !== ds.mdel);
      else S.menuHidden.push(ds.mdel);
      persist(); renderMore();
    } else if (ds.mrestore) {
      S.menuHidden = []; persist(); renderMore();
    } else if (ds.mmins) {
      view.mMins = Number(ds.mmins); renderMore();
    } else if (ds.hreset) {
      delete S.habitEdits[ds.hreset]; persist();
      if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
      renderMore(); toast("Back to the original wording.");
    } else if (b.classList.contains("prevDay")) {
      view.day = addDays(view.day, -1); weeklyEditMode = null; view.threeEdit = false; render();
    } else if (b.classList.contains("nextDay")) {
      if (view.day < todayIso()) { view.day = addDays(view.day, 1); weeklyEditMode = null; render(); }
    }
  });

  $("minDay").addEventListener("click", e => {
    e.preventDefault();
    const on = !isMin(view.day);
    edit(view.day, d => { d.minDay = on; });
    if (on) toast("Minimum day. Small still counts.");
    renderToday();
  });
  $("prevWeek").onclick = () => { view.week = addDays(view.week, -7); renderWeek(); };
  $("nextWeek").onclick = () => { if (view.week < mondayOf(todayIso())) { view.week = addDays(view.week, 7); renderWeek(); } };

  // journal
  const saveJournal = debounce(date => {
    edit(date, d => {
      JFIELDS.forEach(k => { const v = document.querySelector('[data-j="' + k + '"]').value; if (v) d.j[k] = v; else delete d.j[k]; });
      if (!d.jManual) { const lv = journalLevel(d.j); if (lv) d.h.journal = lv; else delete d.h.journal; }
    });
    $("jSaved").textContent = "Saved on this phone";
    renderJournal();
  }, 500);
  JFIELDS.forEach(k => document.querySelector('[data-j="' + k + '"]').addEventListener("input", () => { $("jSaved").textContent = "Saving…"; saveJournal(view.day); }));

  // swim
  const saveSwim = debounce(() => {
    const t = todayIso();
    const l = parseInt($("swimLengths").value, 10) || 0, n = parseInt($("swimNonstop").value, 10) || 0;
    edit(t, d => { if (l || n) d.swim = { lengths: Math.max(l, n), nonstop: Math.min(n || l, Math.max(l, n)) }; else delete d.swim; });
    $("swimSaved").textContent = "Saved";
    renderBody();
  }, 600);
  ["swimLengths", "swimNonstop"].forEach(id => $(id).addEventListener("input", () => { $("swimSaved").textContent = "Saving…"; saveSwim(); }));

  // review
  const saveReview = debounce(m => {
    editWeek(m, w => { w.held = $("qHeld").value; w.blocked = $("qBlocked").value; w.change = $("qChange").value; if (w.held || w.blocked || w.change) w.reviewed = true; });
    $("revSaved").textContent = "Saved";
    renderTabs();
  }, 600);
  ["qHeld", "qBlocked", "qChange"].forEach(id => $(id).addEventListener("input", () => { $("revSaved").textContent = "Saving…"; saveReview(view.week); }));
  const saveNextGoal = debounce(m => {
    editWeek(addDays(m, 7), w => { w.goal = $("qNextGoal").value; });
    $("revSaved").textContent = "Saved";
  }, 600);
  $("qNextGoal").addEventListener("input", () => { $("revSaved").textContent = "Saving…"; saveNextGoal(view.week); });
  $("copyWeek").onclick = () => copyText(weekText(view.week), "Copied. Paste it to Claude.");

  // routines
  $("addForm").addEventListener("submit", e => {
    e.preventDefault();
    const name = $("rName").value.trim(), moves = $("rMoves").value.split("\n").map(s => s.trim()).filter(Boolean);
    if (!name || !moves.length) return;
    const minutes = Math.max(1, Math.min(60, parseInt($("rMin").value, 10) || 10));
    S.routinesCustom.push({ id: "c-" + Date.now().toString(36), name, minutes, moves, pool: /pool|swim/i.test(name) });
    persist();
    $("rName").value = ""; $("rMoves").value = ""; $("addSaved").textContent = "Added";
    renderBody();
  });

  // more: times and numbers
  [["wakeTime", "wake"], ["phoneTime", "phone"], ["bedTime", "bed"]].forEach(([id, k]) => $(id).addEventListener("change", () => {
    const v = $(id).value; if (!/^\d\d:\d\d$/.test(v)) return;
    S.settings[k] = v; persist(); renderTimes(); renderMore();
  }));
  $("weightGoal").addEventListener("change", () => { const v = parseFloat($("weightGoal").value); S.settings.weightGoal = v > 20 ? v : null; persist(); });
  $("poolLen").addEventListener("change", () => { const v = parseInt($("poolLen").value, 10); S.settings.poolLen = v > 0 ? v : 25; persist(); });
  $("weightToday").addEventListener("change", () => {
    const v = parseFloat($("weightToday").value), t = todayIso();
    edit(t, d => { if (v > 20 && v < 250) d.weight = Math.round(v * 10) / 10; else delete d.weight; });
    toast("Saved");
  });

  // parking lot
  $("parkForm").addEventListener("submit", e => {
    e.preventDefault();
    const v = $("parkInput").value.trim(); if (!v) return;
    S.parking.push({ id: Date.now().toString(36), text: v, at: todayIso() });
    persist(); $("parkInput").value = "";
    toast("Parked. Back to the next thing.");
    renderMore();
  });

  // reading
  $("bookNow").addEventListener("change", () => { S.settings.book = $("bookNow").value.trim(); persist(); });
  $("bookForm").addEventListener("submit", e => {
    e.preventDefault();
    const v = $("bookNow").value.trim();
    if (!v) return;
    S.books.push({ title: v, at: todayIso() });
    S.settings.book = ""; $("bookNow").value = ""; persist();
    toast("Finished. It's in your log."); renderMore();
  });
  // free-time menu
  $("menuForm").addEventListener("submit", e => {
    e.preventDefault();
    const v = $("mName").value.trim();
    if (!v) return;
    S.menuCustom.push({ id: "m-" + Date.now().toString(36), name: v, mins: view.mMins || 10, kind: "yours" });
    persist(); $("mName").value = ""; toast("Added to the menu."); renderMore();
  });
  // wording of the anchors
  $("habitEdit").addEventListener("change", e => {
    const el = e.target, id = el.dataset.hedit, k = el.dataset.k;
    if (!id) return;
    const def = D.habits.find(h => h.id === id), v = el.value.trim(), ed = S.habitEdits[id] || {};
    if (!v || v === def[k]) { delete ed[k]; if (!v) el.value = def[k]; } else ed[k] = v;
    if (Object.keys(ed).length) S.habitEdits[id] = ed; else delete S.habitEdits[id];
    persist(); toast("Saved");
  });
  $("travelMode").onclick = () => {
    S.settings.travel = !S.settings.travel; persist(); renderMore();
    toast(S.settings.travel ? "Travel mode on. The minimum is the plan." : "Travel mode off. Welcome home.");
  };
  $("copyReport").onclick = () => copyText(reportText(), "Copied. Paste it to Claude.");
  $("logMore").onclick = () => { view.logN = (view.logN || 14) + 30; renderLog(); };

  // files: share sheet on the phone, plain download elsewhere
  async function saveFile(blob, name, title) {
    try {
      const file = new File([blob], name, { type: blob.type });
      if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title }); return true; }
    } catch (e) { if (e && e.name === "AbortError") return false; }
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    return true;
  }
  // The app can't ring on its own, so the reminders go into the phone's calendar.
  function icsText() {
    const t = todayIso(), until = D.chapterEnd.replace(/-/g, "") + "T235959";
    const ymd = s => s.replace(/-/g, ""), hm = s => s.replace(":", "") + "00";
    const minus = (s, m) => { const [h, mi] = s.split(":").map(Number), x = (h * 60 + mi - m + 1440) % 1440; return pad(Math.floor(x / 60)) + ":" + pad(x % 60); };
    const nextDow = n => addDays(t, (n - dow(t) + 7) % 7);
    const ev = (uid, date, time, rule, title, desc) => ["BEGIN:VEVENT", "UID:anchors-" + uid + "@anchors.app", "DTSTAMP:" + ymd(t) + "T000000Z", "DTSTART:" + ymd(date) + "T" + hm(time), "DURATION:PT10M",
      "RRULE:" + rule + ";UNTIL=" + until, "SUMMARY:" + title, "DESCRIPTION:" + desc, "BEGIN:VALARM", "ACTION:DISPLAY", "DESCRIPTION:" + title, "TRIGGER:PT0M", "END:VALARM", "END:VEVENT"];
    return ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Anchors//EN", "CALSCALE:GREGORIAN"]
      .concat(ev("phone", t, S.settings.phone, "FREQ=DAILY", "Phone out", "Downtime on. Phone on the charger outside the room."))
      .concat(ev("bed", t, minus(S.settings.bed, 30), "FREQ=DAILY", "Journal then bed", "One line in Anchors. Teeth. In bed with the book at " + S.settings.bed + "."))
      .concat(ev("ship", nextDow(5), "16:00", "FREQ=WEEKLY;BYDAY=FR", "Ship one thing", "Finish one thing and show it. Then log it in Anchors."))
      .concat(ev("review", nextDow(0), "18:00", "FREQ=WEEKLY;BYDAY=SU", "Sunday review", "15 minutes in Anchors: Progress then Week."))
      .concat(["END:VCALENDAR"]).join("\r\n");
  }
  $("icsBtn").onclick = async () => {
    const ok = await saveFile(new Blob([icsText()], { type: "text/calendar" }), "anchors-reminders.ics", "Anchors reminders");
    if (ok) $("icsMsg").textContent = "Open the file and choose Add All. The alerts run until " + short(D.chapterEnd) + " and follow the times above; change a time here, then add them again.";
  };

  // backup
  $("exportBtn").onclick = async () => {
    const t = todayIso();
    const blob = new Blob([JSON.stringify(S, null, 1)], { type: "application/json" });
    const name = "anchors-backup-" + t + ".json";
    if (!(await saveFile(blob, name, "Anchors backup"))) return;
    S.settings.lastExport = t; persist();
    $("backupMsg").textContent = "Backup saved as " + name + ".";
    renderMore();
  };
  let pendingImport = null;
  $("importFile").addEventListener("change", async e => {
    const f = e.target.files && e.target.files[0]; e.target.value = "";
    if (!f) return;
    try {
      const data = JSON.parse(await f.text());
      if (!data || data.v !== 1 || typeof data.days !== "object") throw new Error("not a backup");
      pendingImport = data;
      const n = Object.keys(data.days).length;
      $("backupMsg").innerHTML = "This backup has " + n + " days. Restoring replaces what's on this phone. <button class='btn small' id='confirmImport'>Replace</button>";
      $("confirmImport").onclick = () => { S = migrate(pendingImport); persist(); pendingImport = null; $("backupMsg").textContent = "Restored."; render(); };
    } catch (err) { $("backupMsg").textContent = "That file isn't an Anchors backup."; }
  });

  // stuck sheet
  $("stuckBtn").onclick = openStuck;
  $("stuckClose").onclick = closeStuck;
  $("stuckSheet").addEventListener("click", e => { if (e.target.id === "stuckSheet") closeStuck(); });
  $("timerStart").onclick = () => {
    const mins = S.ui.timerMins || 25;
    primeAudio();
    S.timer = { endsAt: Date.now() + mins * 60 * 1000, objective: $("objective").value.trim(), started: Date.now(), mins, day: todayIso() };
    persist(); $("objective").value = ""; renderTimer(); renderStuckBtn();
  };
  $("timerStop").onclick = () => {
    const tm = S.timer;
    if (tm && tm.endsAt > Date.now()) {
      const el = Math.floor((Date.now() - tm.started) / 60000);
      if (el >= 5) logFocus(tm, el);
      toast(el >= 5 ? "Stopped. " + el + " minutes counted." : "Stopped. You still started.");
    }
    S.timer = null; persist();
    renderTimer(); renderStuckBtn(); closeStuck();
    if (view.tab === "week") renderWeek();
  };
  document.addEventListener("keydown", e => { if (e.key === "Escape" && !$("stuckSheet").hidden) closeStuck(); });

  window.addEventListener("hashchange", () => show(location.hash.slice(1)));

  // new day while the app sits open
  let lastToday = todayIso();
  setInterval(() => {
    const t = todayIso();
    if (t !== lastToday) { if (view.day === lastToday) view.day = t; view.week = mondayOf(t); lastToday = t; render(); }
    tick();
  }, 1000);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) { const t = todayIso(); if (t !== lastToday) { view.day = t; view.week = mondayOf(t); lastToday = t; } render(); } });

  // ---------- offline ----------
  if ("serviceWorker" in navigator && location.protocol !== "file:") {
    navigator.serviceWorker.register("sw.js").then(reg => {
      const offer = w => banner("A new version of Anchors is ready.", "Update", () => { w.postMessage("skip"); });
      if (reg.waiting && navigator.serviceWorker.controller) offer(reg.waiting);
      reg.addEventListener("updatefound", () => {
        const w = reg.installing;
        w && w.addEventListener("statechange", () => { if (w.state === "installed" && navigator.serviceWorker.controller) offer(w); });
      });
    }).catch(() => {});
    let reloading = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => { if (!reloading) { reloading = true; location.reload(); } });
  }
  try { navigator.storage && navigator.storage.persist && navigator.storage.persist(); } catch (e) {}

  renderTimes();
  show(location.hash.slice(1) || "today");
})();
