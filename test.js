// Smoke test. Run `python3 -m http.server 8765` in this folder, then `node test.js`.
// Seeds five weeks of made-up data, walks every screen at phone size, then reloads offline.
const { chromium } = require('playwright');
const SHOTS = process.env.SHOTS || '';
const pad = n => String(n).padStart(2, '0');
const iso = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
const ago = n => { const d = new Date(Date.now() - 3 * 3600000); d.setDate(d.getDate() - n); return iso(d); };
function seed() {
  const days = {};
  for (let i = 34; i >= 1; i--) {
    if (i === 20 || i === 21) continue;
    const full = i % 5 !== 0;
    days[ago(i)] = {
      h: { wake: full ? 'full' : 'min', care: 'full', fuel: i % 3 ? 'full' : 'missed', skin: 'full', phone: full ? 'full' : 'missed', journal: 'full', bed: i % 4 ? 'full' : 'min' },
      j: { sleep: String(6.5 + (i % 4) * 0.5), win: 'Win number ' + i, did: 'Worked on the model', t1: 'Finish the chart', t2: 'Email the university', t3: 'Swim', goalItem: 1 },
      ex: {}, focus: i % 2 ? 25 : 0,
      ...(i % 7 === 0 ? { weight: 60 + (34 - i) / 20, ship: 'Shipped item ' + i } : {}),
      ...(i % 4 === 0 ? { swim: { lengths: 20 + (34 - i), nonstop: 4 + Math.floor((34 - i) / 2) } } : {}),
    };
  }
  const blocks = { 1: ago(13), 2: ago(-1), 3: ago(-15), 4: ago(-29), 5: ago(-43) };
  return { v: 1, settings: { wake: '06:30', phone: '21:00', bed: '22:30', blocks, extras: {}, weightGoal: 65, poolLen: 25, lastExport: null, created: ago(34), welcomed: true, book: 'Fortune\'s Formula' },
    days, weeks: {}, parking: [{ id: 'a', text: 'Gem map', at: ago(3) }], books: [{ title: 'A Man for All Markets', at: ago(9) }] };
}
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: SHOTS ? 2 : 1 });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push('pageerror: ' + e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
  const shot = async n => { if (SHOTS) await p.screenshot({ path: SHOTS + '/' + n + '.png', fullPage: true }); };
  const wide = async n => { const w = await p.evaluate(() => document.documentElement.scrollWidth); if (w > 390) errs.push('horizontal scroll on ' + n + ': ' + w); };
  const U = 'http://localhost:8765/';
  const out = {};

  // 1. first open, empty
  await p.goto(U); await p.waitForTimeout(600);
  out.welcome = await p.isVisible('.welcome');
  await shot('01-first-open'); await wide('first open');
  await p.click('[data-welcome]');
  await p.fill('#threeIn', 'Send the application email'); await p.click('#threeForm button');
  await p.click('.next-card .acts button');
  await p.click('[data-meal="b"]'); await p.click('[data-meal="l"]'); await p.click('[data-meal="d"]'); await p.click('[data-meal="s"]');
  out.fuel = await p.evaluate(() => Object.values(JSON.parse(localStorage.getItem('anchors.v1')).days)[0].h.fuel);
  await p.click('[data-free="10"]'); out.pick = await p.textContent('.pick h3');
  await p.click('[data-free-next]'); await p.click('[data-free-done]');
  await shot('02-today-used'); await wide('today');
  for (const tab of ['journal', 'body', 'week', 'more']) { await p.goto(U + '#' + tab); await p.waitForTimeout(200); await wide(tab + ' empty'); }
  await p.goto(U + '#week'); await p.click('[data-prog="trends"]'); await shot('03-trends-empty'); await wide('trends empty');
  await p.click('[data-prog="log"]'); await shot('04-log-day-one');

  // 2. five weeks in, block check due tomorrow
  await p.evaluate(s => localStorage.setItem('anchors.v1', JSON.stringify(s)), seed());
  await p.goto(U + '#today'); await p.reload(); await p.waitForTimeout(400);
  out.blockCheck = await p.textContent('.check-card h3').catch(() => null);
  out.three = await p.locator('.titem').count();
  await shot('05-today-seeded'); await wide('today seeded');
  await p.click('[data-three="0"]');
  await p.click('[data-three-go="1"]'); await p.waitForTimeout(100);
  out.objective = await p.inputValue('#objective'); out.proof = await p.textContent('#proof');
  await p.click('[data-tmins="10"]'); await shot('06-stuck'); await p.click('#timerStart'); await p.waitForTimeout(1100);
  await shot('07-timer'); await p.click('#timerStop');
  await p.click('[data-weekly="people"]'); await p.fill('#softIn', 'Walk after dinner'); await p.click('#softSave');
  await p.click('[data-weekly="fun"]'); await p.fill('#softIn', 'A film'); await p.click('#softSave');
  out.soft = await p.locator('.wk.half.ok').count();
  await p.click('[data-bc="repeat"]'); out.blockAfter = await p.locator('.check-card').count();
  await p.goto(U + '#journal'); await p.waitForTimeout(200);
  out.carry = await p.textContent('#carryBtn').catch(() => null);
  await p.click('#carryBtn'); await p.fill('#jWin', 'Tested the app'); await p.waitForTimeout(700); await shot('08-journal'); await wide('journal');
  await p.goto(U + '#body'); await p.waitForTimeout(200);
  await p.fill('#swimLengths', '40'); await p.fill('#swimNonstop', '24'); await p.waitForTimeout(800); await p.click('#routineDone'); await shot('09-body'); await wide('body');
  await p.goto(U + '#week'); await p.waitForTimeout(200); await shot('10-week'); await wide('week');
  await p.click('[data-prog="trends"]'); await p.waitForTimeout(100); await shot('11-trends'); await wide('trends');
  out.headline = await p.textContent('#headline'); out.milestones = await p.locator('#milestones li').count(); out.charts = await p.locator('#pTrends svg.chart').count();
  await p.click('[data-prog="log"]'); await shot('12-log'); await wide('log'); out.logDays = await p.locator('.dayb').count(); out.logSoft = await p.locator('.dayb >> nth=0').textContent();
  await p.click('#logMore'); out.logDaysMore = await p.locator('.dayb').count();
  await p.click('[data-prog="trends"]'); await p.click('.hrow >> nth=2'); out.weekJump = await p.textContent('#weekTitle');
  await p.goto(U + '#more'); await p.waitForTimeout(200);
  await p.click('#travelMode'); await p.click('#menuDetails summary'); await p.fill('#mName', 'Guitar'); await p.click('[data-mmins="30"]'); await p.click('#menuForm button[type=submit]');
  await p.click('#editDetails summary'); await p.fill('#hm-care', 'Teeth only'); await p.dispatchEvent('#hm-care', 'change');
  await shot('13-more'); await wide('more');
  out.ics = await p.evaluate(() => { let t = null; const o = URL.createObjectURL; URL.createObjectURL = b => { b.text().then(x => window.__ics = x); return o(b); }; document.getElementById('icsBtn').click(); return new Promise(r => setTimeout(() => r((window.__ics || '').split('\r\n').filter(l => /^(DTSTART|RRULE|SUMMARY)/.test(l)).join(' | ')), 300)); });
  await p.goto(U + '#today'); await p.waitForTimeout(200);
  out.travel = await p.getAttribute('#minDay', 'aria-checked'); out.careMin = await p.evaluate(() => JSON.parse(localStorage.getItem('anchors.v1')).habitEdits.care.min);

  // 3. back after four days away
  await p.evaluate(a => { const s = JSON.parse(localStorage.getItem('anchors.v1')); a.forEach(k => delete s.days[k]); localStorage.setItem('anchors.v1', JSON.stringify(s)); }, [ago(0), ago(1), ago(2), ago(3)]);
  await p.reload(); await p.waitForTimeout(300);
  out.comeback = await p.textContent('#special h3').catch(() => null); await shot('14-comeback');

  // 4. offline and dark
  await p.waitForTimeout(1200);
  out.sw = await p.evaluate(() => !!navigator.serviceWorker.controller);
  await ctx.setOffline(true); await p.reload(); await p.waitForTimeout(600);
  out.offlineTitle = await p.textContent('.dayTitle');
  await ctx.setOffline(false);
  await p.emulateMedia({ colorScheme: 'dark' }); await shot('15-dark-today');
  await p.goto(U + '#week'); await p.click('[data-prog="trends"]'); await shot('16-dark-trends');
  console.log(JSON.stringify(out, null, 1));
  console.log('errors:', errs);
  await b.close();
  process.exit(errs.length ? 1 : 0);
})();
