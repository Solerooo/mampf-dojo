// Screenshots aller 5 Tabs bei 390 px mit einem festen Demo-Zustand (für Vorher/Nachher-Vergleiche).
// Voraussetzung: node tools/devserver.js läuft, Playwright installiert.
// Aufruf: PLAYWRIGHT_PFAD=/pfad/node_modules/playwright node tools/screenshots.js design/vorher
'use strict';
const fs = require('fs');
const path = require('path');
const { chromium } = require(process.env.PLAYWRIGHT_PFAD || 'playwright');

const BASIS = process.env.BASIS || 'http://localhost:8777/';
const ZIEL = path.resolve(process.argv[2] || 'design/screenshots');
const DATUM = '2026-10-17';
fs.mkdirSync(ZIEL, { recursive: true });
const warte = ms => new Promise(r => setTimeout(r, ms));

async function demoZustand(page) {
  await page.evaluate(() => {
    const z = leererZustand();
    z.erstelltAm = '2026-10-10';
    z.profil = Object.assign({}, PROFIL_STANDARD, { name: '', alter: 25, geschlecht: 'm', aktivitaet: 1.55, einkaufstag: 4 });
    z.gewichte = [
      { id: 'g1', datum: '2026-10-10', kg: 62.0 },
      { id: 'g2', datum: '2026-10-14', kg: 62.3 },
      { id: 'g3', datum: '2026-10-17', kg: 62.6 },
    ];
    const w = generiereWoche(z, { start: '2026-10-15', seed: 42 });
    w.tage[0].slots.forEach(s => { s.gegessen = true; });
    w.tage[1].slots.forEach(s => { s.gegessen = true; });
    w.tage[2].slots[0].gegessen = true;
    w.tage[2].slots[1].gegessen = true;
    w.einkauf.erledigt = true; w.einkauf.erledigtAm = '2026-10-15';
    w.einkauf.items.slice(0, 6).forEach(i => { w.einkauf.abgehakt[i.id] = true; });
    w.einkauf.vorrat.slice(0, 8).forEach(v => { w.einkauf.vorratDa[v.id] = true; });
    z.wochen.push(w);
    z.kassenbons.push({ id: 'b1', datum: '2026-10-15', betrag: 54.8, wocheId: w.id });
    z.log['2026-10-16'] = { extras: [{ id: 'x1', kcal: 250, protein: 4, text: '🍫 Schokoriegel' }] };
    pruefeErfolge(z, berechneSpielstand(z));
    speichereZustand(z);
  });
}

(async () => {
  const browser = await chromium.launch();
  for (const schema of ['light', 'dark']) {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'de-DE', colorScheme: schema, reducedMotion: 'reduce', serviceWorkers: 'block' });
    const page = await ctx.newPage();
    const fehler = [];
    page.on('pageerror', e => fehler.push(e.message));
    page.on('console', m => { if (m.type() === 'error') fehler.push(m.text()); });
    await page.goto(BASIS + '?datum=' + DATUM);
    await demoZustand(page);
    await page.goto(BASIS + '?datum=' + DATUM);
    await page.waitForSelector('#nav button');
    for (const tab of ['heute', 'woche', 'einkauf', 'rezepte', 'profil']) {
      await page.click(`[data-tab="${tab}"]`);
      await warte(300);
      while (await page.locator('.overlay [data-a="overlay-zu"]').count()) await page.click('.overlay [data-a="overlay-zu"]');
      await page.evaluate(() => document.querySelectorAll('.toast').forEach(t => t.remove()));
      const name = `${tab}-${schema === 'light' ? 'hell' : 'dunkel'}`;
      await page.screenshot({ path: path.join(ZIEL, name + '-oben.png') });
      if (schema === 'light') await page.screenshot({ path: path.join(ZIEL, name + '-ganz.png'), fullPage: true });
    }
    if (schema === 'light') {
      await page.click('[data-tab="rezepte"]');
      await page.locator('.rezept-karte').first().click();
      await warte(300);
      await page.screenshot({ path: path.join(ZIEL, 'rezept-detail-hell.png') });
    }
    if (fehler.length) console.log('Fehler (' + schema + '):', fehler.join(' | '));
    await ctx.close();
  }
  await browser.close();
  console.log('Screenshots gespeichert in', ZIEL, '→', fs.readdirSync(ZIEL).length, 'Dateien');
})().catch(e => { console.error(e); process.exit(1); });
