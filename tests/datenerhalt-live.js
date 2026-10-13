// Prüft, dass gespeicherte Daten ein Update überstehen (gegen die Live-Seite).
// Phase 1 (VOR dem Push):  node tests/datenerhalt-live.js vorher
// Phase 2 (NACH dem Push): node tests/datenerhalt-live.js nachher <neue-version>
// Nutzt ein dauerhaftes Browser-Profil (alter Service Worker + localStorage bleiben erhalten).
'use strict';
const fs = require('fs');
const path = require('path');
const { chromium } = require(process.env.PLAYWRIGHT_PFAD || 'playwright');
const BASIS = process.env.BASIS || 'https://solerooo.github.io/mampf-dojo/';
const PROFIL = process.env.PROFIL_DIR || path.join(__dirname, '..', '.shots', 'datenerhalt-profil');
const SNAPSHOT = PROFIL + '-snapshot.json';
const [phase, neueVersion] = process.argv.slice(2);
const warte = ms => new Promise(r => setTimeout(r, ms));
const zustand = page => page.evaluate(() => {
  const roh = localStorage.getItem('mampfDojo.v1');
  const sp = berechneSpielstand(Z);
  return { roh, xp: sp.xp, level: sp.level, streak: sp.streak, version: APP_VERSION, gewichte: Z.gewichte.length, wochen: Z.wochen.length };
});

(async () => {
  const ctx = await chromium.launchPersistentContext(PROFIL, { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: 'de-DE' });
  const page = ctx.pages()[0] || await ctx.newPage();
  const fehler = [];
  page.on('pageerror', e => fehler.push(e.message));
  page.on('console', m => { if (m.type() === 'error') fehler.push(m.text()); });
  await page.goto(BASIS);
  await page.evaluate(() => navigator.serviceWorker.ready);
  if (phase === 'vorher') {
    await page.evaluate(() => {
      const z = leererZustand();
      z.profil = Object.assign({}, PROFIL_STANDARD, { alter: 25, geschlecht: 'm', aktivitaet: 1.55, einkaufstag: 2 });
      const w = generiereWoche(z, { start: addTage(heute(), -2), seed: 99 });
      w.tage[0].slots.forEach(s => { s.gegessen = true; });
      w.tage[1].slots.forEach(s => { s.gegessen = true; });
      w.tage[2].slots[0].gegessen = true;
      w.einkauf.erledigt = true; w.einkauf.erledigtAm = addTage(heute(), -2);
      z.wochen.push(w);
      z.gewichte.push({ id: 'g1', datum: addTage(heute(), -1), kg: 62.4 });
      z.kassenbons.push({ id: 'b1', datum: addTage(heute(), -2), betrag: 51.9, wocheId: w.id });
      z.log[heute()] = { extras: [{ id: 'x1', kcal: 250, protein: 4, text: 'Test-Riegel' }] };
      pruefeErfolge(z, berechneSpielstand(z));
      speichereZustand(z);
    });
    await page.reload();
    await page.waitForSelector('#nav button');
    const s = await zustand(page);
    fs.writeFileSync(SNAPSHOT, JSON.stringify(s));
    console.log(`Vorher gespeichert: Version ${s.version}, XP ${s.xp}, Level ${s.level}, Streak ${s.streak}, ${s.wochen} Woche(n), ${s.gewichte} Gewicht(e)`);
  } else {
    const vorher = JSON.parse(fs.readFileSync(SNAPSHOT, 'utf8'));
    let banner = false;
    for (let i = 0; i < 40 && !banner; i++) {
      await page.evaluate(async () => { const r = await navigator.serviceWorker.getRegistration(); if (r) await r.update().catch(() => {}); });
      await warte(3000);
      banner = (await page.locator('#update-banner').count()) > 0;
      if (!banner && i % 5 === 4) { await page.reload(); await warte(1500); banner = (await page.locator('#update-banner').count()) > 0; }
    }
    console.log(banner ? '✅ Update-Banner erschienen' : '❌ kein Update-Banner');
    if (banner) {
      await Promise.all([page.waitForEvent('load', { timeout: 15000 }).catch(() => null), page.click('[data-a="update-laden"]')]);
      await warte(2000);
    }
    await page.waitForSelector('#nav button');
    const n = await zustand(page);
    const gleich = JSON.stringify(JSON.parse(n.roh)) === JSON.stringify(JSON.parse(vorher.roh));
    const ok = [
      [n.version === neueVersion, `Neue Version aktiv: ${n.version}`],
      [gleich, 'Gespeicherte Daten exakt gleich (localStorage)'],
      [n.xp === vorher.xp && n.level === vorher.level, `XP ${vorher.xp} → ${n.xp}, Level ${vorher.level} → ${n.level}`],
      [n.wochen === vorher.wochen && n.gewichte === vorher.gewichte, 'Plan und Gewichte vollständig'],
      [(await page.locator('.hud').count()) === 1, 'Neues Design sichtbar (Kampf-HUD)'],
      [fehler.length === 0, 'Keine Konsolenfehler' + (fehler.length ? ': ' + fehler.join(' | ') : '')],
    ];
    ok.forEach(([b, t]) => console.log((b ? '✅ ' : '❌ ') + t));
    await page.screenshot({ path: PROFIL + '-nachher.png' });
    process.exitCode = ok.every(x => x[0]) && banner ? 0 : 1;
  }
  await ctx.close();
})().catch(e => { console.error(e); process.exit(2); });
