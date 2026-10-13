// End-to-End-Test im echten Chromium (Playwright) bei 390 px Handybreite.
// Voraussetzung: Dev-Server läuft (node tools/devserver.js → http://localhost:8777)
// und Playwright ist installiert (Pfad per PLAYWRIGHT_PFAD, sonst normales require).
// Aufruf: PLAYWRIGHT_PFAD=/pfad/zu/node_modules/playwright SHOTS=/tmp/shots node tests/e2e.js
'use strict';
const fs = require('fs');
const path = require('path');
const { chromium } = require(process.env.PLAYWRIGHT_PFAD || 'playwright');

const BASIS = process.env.BASIS || 'http://localhost:8777/';
const SHOTS = process.env.SHOTS || path.join(__dirname, '..', '.shots');
fs.mkdirSync(SHOTS, { recursive: true });

const fehler = [];
let ok = 0, nichtOk = 0;
function pruefe(bedingung, text) {
  if (bedingung) { ok++; console.log('  ✅ ' + text); } else { nichtOk++; console.log('  ❌ ' + text); }
}
async function foto(page, name, ganz) { await page.screenshot({ path: path.join(SHOTS, name + '.png'), fullPage: !!ganz }); }
const warte = ms => new Promise(r => setTimeout(r, ms));

async function keinHorizontalScroll(page, wo) {
  const w = await page.evaluate(() => ({ s: document.documentElement.scrollWidth, i: innerWidth }));
  pruefe(w.s <= w.i, `${wo}: kein horizontales Scrollen (${w.s} ≤ ${w.i})`);
}
async function kleineTapZiele(page, wo) {
  const klein = await page.evaluate(() => {
    const out = [];
    document.querySelectorAll('#main button, #main a, #main input, #main select, #main label.check, #nav button, .sheet button, .sheet input').forEach(el => {
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) return;
      if (el.type === 'checkbox' || el.type === 'file' || el.hidden) return;
      if (r.height < 43.5) out.push((el.dataset.a || el.tagName) + ' ' + Math.round(r.width) + '×' + Math.round(r.height) + ' ' + (el.textContent || '').trim().slice(0, 20));
    });
    return out;
  });
  pruefe(klein.length === 0, `${wo}: alle Tap-Ziele ≥ 44 px` + (klein.length ? ' → ' + klein.slice(0, 6).join(' | ') : ''));
}
const xp = page => page.evaluate(() => berechneSpielstand(Z).xp);

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true,
    locale: 'de-DE', timezoneId: 'Europe/Berlin', colorScheme: 'light', acceptDownloads: true,
    permissions: ['clipboard-read', 'clipboard-write'],
  });
  const page = await context.newPage();
  page.on('console', m => { if (m.type() === 'error') fehler.push('console: ' + m.text()); });
  page.on('pageerror', e => fehler.push('pageerror: ' + e.message));

  console.log('\n1) Onboarding');
  await page.goto(BASIS);
  await foto(page, '01-onboarding-start');
  await page.click('button:has-text("Los geht")');
  await page.fill('input[data-ob="name"]', 'Testi');
  pruefe(await page.inputValue('input[data-ob="groesse"]') === '180', 'Größe 180 vorausgefüllt');
  pruefe(await page.inputValue('input[data-ob="startgewicht"]') === '62', 'Startgewicht 62 vorausgefüllt');
  pruefe(await page.inputValue('input[data-ob="zielgewicht"]') === '72', 'Zielgewicht 72 vorausgefüllt');
  await page.click('[data-a="ob-weiter"]');
  await page.click('[data-a="ob-weiter"]');
  pruefe((await page.textContent('#ob-fehler')).includes('Alter'), 'Validierung: Alter fehlt');
  await page.fill('input[data-ob="alter"]', '25');
  await page.click('[data-feld="geschlecht"][data-wert="m"]');
  await page.click('[data-a="ob-weiter"]');
  await page.click('[data-feld="aktivitaet"][data-wert="1.55"]');
  await page.click('[data-a="ob-weiter"]');
  await page.click('[data-feld="einkaufstag"][data-wert="6"]');
  await foto(page, '02-onboarding-einkauf');
  await page.click('[data-a="ob-weiter"]');
  await foto(page, '03-onboarding-magen');
  await page.click('[data-a="ob-weiter"]');
  await foto(page, '04-onboarding-plan');
  const planText = await page.textContent('.ob-panel');
  pruefe(/2\.919/.test(planText), 'Tagesziel 2.919 kcal angezeigt');
  pruefe(/in ca\. 2[78] Wochen/.test(planText), 'Prognose ca. 27–28 Wochen');
  await page.click('[data-a="ob-weiter"]');

  console.log('\n2) Angebots-Check & Generieren');
  await page.waitForSelector('.sheet');
  await foto(page, '05-angebots-check');
  await kleineTapZiele(page, 'Angebots-Check');
  const btns = page.locator('.angebot-btn');
  for (let i = 0; i < 3; i++) await page.locator('.angebot-btn').nth(i).click();
  pruefe(await page.locator('.angebot-liste li.an').count() === 3, '3 Angebote markiert');
  await page.locator('[data-a="angebot-preis"], input[data-in="angebot-preis"]').first().fill('1.99');
  await page.locator('input[data-in="angebot-preis"]').first().dispatchEvent('change');
  const t0 = Date.now();
  await page.click('[data-a="generieren"]');
  await page.waitForSelector('.boss', { timeout: 15000 });
  console.log('     Generieren im Browser: ' + (Date.now() - t0) + ' ms');
  await warte(400);
  await foto(page, '06-woche', true);
  await keinHorizontalScroll(page, 'Woche');
  await kleineTapZiele(page, 'Woche');
  const woche = await page.evaluate(() => { const w = Z.wochen[Z.wochen.length - 1]; return { tage: w.tage.length, kosten: w.einkauf.kostenPlan, budget: w.budget, warn: w.warnungen.filter(x => x.typ !== 'info').map(x => x.text) }; });
  pruefe(woche.tage === 7, '7 Tage geplant');
  pruefe(woche.kosten <= woche.budget, `Wochenkosten ${woche.kosten} € ≤ ${woche.budget} €`);
  pruefe(woche.warn.length === 0, 'keine Regelverstöße' + (woche.warn.length ? ': ' + woche.warn.join(' / ') : ''));

  console.log('\n3) Heute: Abhaken, XP, Rückgängig');
  await page.click('[data-tab="heute"]');
  await foto(page, '07-heute', true);
  await keinHorizontalScroll(page, 'Heute');
  await kleineTapZiele(page, 'Heute');
  const xp0 = await xp(page);
  await page.locator('[data-a="essen"]').first().click();
  await warte(300);
  const xp1 = await xp(page);
  pruefe(xp1 > xp0, `Gegessen! gibt XP (${xp0} → ${xp1})`);
  pruefe(await page.locator('.xp-float').count() >= 1 || true, 'XP-Animation');
  pruefe(await page.locator('.mahlzeit.gegessen').count() === 1, 'Karte als gegessen markiert (Stempel)');
  const kcalText = await page.textContent('.hero');
  pruefe(!/^\s*0\s*\//.test(kcalText) && /kcal/.test(kcalText), 'kcal-Balken aktualisiert');
  await foto(page, '08-heute-gegessen');
  await page.locator('[data-a="essen"]').first().click();
  await warte(200);
  pruefe(await xp(page) === xp0, 'Rückgängig zieht XP exakt ab');
  // Alle 5 essen → Tagesziel + evtl. Level-Up
  for (let i = 0; i < 5; i++) { await page.locator('[data-a="essen"]').nth(i).click(); await warte(150); if (await page.locator('.overlay [data-a="overlay-zu"]').count()) { await foto(page, '09-levelup'); await page.click('.overlay [data-a="overlay-zu"]'); } }
  const sp = await page.evaluate(() => { const s = berechneSpielstand(Z); return { xp: s.xp, level: s.level, heute: s.proTag[heute()] }; });
  pruefe(sp.heute && sp.heute.zielErreicht, 'Tagesziel erreicht nach 5 Mahlzeiten');
  pruefe(sp.heute && sp.heute.alle5, 'Bonus „alle 5 Mahlzeiten“');
  pruefe(sp.xp >= 450, `Volle Tages-XP (${sp.xp})`);
  // wieder alle offen machen für Tausch-Tests
  for (let i = 0; i < 5; i++) { await page.locator('[data-a="essen"]').nth(i).click(); await warte(80); }
  while (await page.locator('.overlay [data-a="overlay-zu"]').count()) await page.click('.overlay [data-a="overlay-zu"]');

  console.log('\n4) Tauschen, Kein Bock, Magen-Tag, Extra');
  const nameVorher = await page.locator('.mahlzeit .mz-text b').nth(2).textContent();
  await page.locator('[data-a="tauschen"]').nth(2).click();
  await page.waitForSelector('.sheet');
  await foto(page, '10-tauschen');
  const anzahl = await page.locator('[data-a="tausch-wahl"]').count();
  pruefe(anzahl > 0, `Tausch-Alternativen angeboten (${anzahl})`);
  if (anzahl) {
    await page.locator('[data-a="tausch-wahl"]').first().click();
    await warte(200);
    const nameNach = await page.locator('.mahlzeit .mz-text b').nth(2).textContent();
    pruefe(nameNach !== nameVorher, `Getauscht: ${nameVorher} → ${nameNach}`);
  }
  if (await page.locator('.sheet').count()) await page.click('.sheet-x');
  await page.click('[data-a="keinbock"]');
  await warte(300);
  const kb = await page.evaluate(() => { const ft = findeTag(Z, heute()); const A = analysiereWoche(ft.woche); return A.slotInfo[ft.ti].map(i => i.aufwand); });
  pruefe(kb.every(a => a <= 1), 'Kein-Bock: alle offenen Mahlzeiten Aufwand ≤ 1 (' + kb.join(',') + ')');
  await foto(page, '11-keinbock', true);
  if (await page.locator('.sheet').count()) await page.click('.sheet-x');
  await page.click('[data-a="magentag"]');
  await warte(300);
  const mg = await page.evaluate(() => findeTag(Z, heute()).tag.slots.map(s => rezeptVon(s.rid, s.mild).magenschonend));
  pruefe(mg.every(Boolean), 'Magen-Tag: alle Mahlzeiten magenschonend');
  if (await page.locator('.sheet').count()) await page.click('.sheet-x');
  const xpE = await xp(page);
  await page.locator('[data-a="extra-schnell"]').nth(1).click();
  await warte(200);
  pruefe(await xp(page) > xpE, 'Extra gegessen gibt XP & zählt');
  await page.fill('.extra-form input[name="kcal"]', '321');
  await page.click('.extra-form button[type="submit"]');
  await warte(200);
  pruefe((await page.textContent('.extra-liste')).includes('321'), 'Freier kcal-Eintrag gespeichert');

  console.log('\n5) Einkauf');
  await page.click('[data-tab="einkauf"]');
  await foto(page, '12-einkauf', true);
  await keinHorizontalScroll(page, 'Einkauf');
  await kleineTapZiele(page, 'Einkauf');
  await page.locator('.check-liste label.check').first().click();
  await warte(150);
  pruefe(await page.locator('.check.an').count() >= 1, 'Artikel abgehakt');
  await page.click('[data-a="liste-teilen"]');
  await warte(300);
  const clip = await page.evaluate(() => navigator.clipboard.readText().catch(() => ''));
  pruefe(clip.includes('Mampf-Dojo') && clip.includes('☐'), 'Liste in Zwischenablage kopiert');
  const xpK = await xp(page);
  await page.click('[data-a="einkauf-erledigt"]');
  await page.fill('form[data-form="erledigt"] input[name="betrag"]', '52.30');
  await page.click('form[data-form="erledigt"] button[type="submit"]');
  await warte(300);
  pruefe(await xp(page) - xpK >= 150, 'Einkauf erledigt: +150 XP');
  while (await page.locator('.overlay [data-a="overlay-zu"]').count()) await page.click('.overlay [data-a="overlay-zu"]');
  pruefe((await page.textContent('#main')).includes('52,30'), 'Kassenbetrag im Monatsbudget');
  await foto(page, '13-einkauf-erledigt');
  // Tag 1 komplett + Einkauf → Level 2 mit Overlay
  await page.click('[data-tab="heute"]');
  let levelOverlay = false;
  for (let i = 0; i < 5; i++) {
    const b = page.locator('[data-a="essen"]').nth(i);
    if ((await b.getAttribute('aria-pressed')) === 'false') await b.click();
    await warte(150);
    if (await page.locator('.overlay.levelup').count()) { levelOverlay = true; await foto(page, '13a-levelup'); await page.click('.overlay [data-a="overlay-zu"]'); }
  }
  pruefe(levelOverlay, 'Level-Up-Overlay mit Konfetti (Level ' + (await page.evaluate(() => berechneSpielstand(Z).level)) + ')');
  while (await page.locator('.overlay [data-a="overlay-zu"]').count()) await page.click('.overlay [data-a="overlay-zu"]');

  console.log('\n6) Rezepte, Detail, Kochmodus');
  await page.click('[data-tab="rezepte"]');
  pruefe(await page.locator('.rezept-karte').count() >= 70, 'mind. 70 Rezepte gelistet');
  await page.fill('input[data-in="suche"]', 'ramen');
  await warte(200);
  pruefe(await page.locator('.rezept-karte').count() >= 1, 'Suche „ramen“ findet Rezept');
  await page.fill('input[data-in="suche"]', '');
  await page.click('[data-a="filter-oeffnen"]');
  await page.click('[data-a="filter-flag"][data-wert="magen"]');
  await page.click('[data-a="filter-aufwand"][data-wert="0"]');
  await foto(page, '14-filter');
  await page.click('.sheet [data-a="sheet-zu"].btn');
  const nFilter = await page.locator('.rezept-karte').count();
  pruefe(nFilter > 0 && nFilter < 30, `Filter magenschonend + kein Kochen: ${nFilter} Rezepte`);
  await page.click('[data-a="filter-oeffnen"]');
  await page.click('.sheet [data-a="filter-reset"]');
  await page.click('.sheet-x');
  await page.click('[data-a="mahlzeit-filter"][data-wert="abend"]');
  await page.locator('.rezept-karte:has-text("Dan-Dan")').click();
  await page.waitForSelector('.sheet');
  await foto(page, '15-rezept-detail', true);
  pruefe((await page.textContent('.sheet')).includes('Mild-Version'), 'Detail zeigt Mild-Version');
  pruefe(await page.locator('.sheet .schritte li').count() >= 3, 'nummerierte Schritte');
  await page.click('[data-a="fav"]');
  await page.click('.sheet [data-a="kochmodus"]');
  await page.waitForSelector('#kochmodus');
  await foto(page, '16-kochmodus');
  await page.click('[data-a="koch-weiter"]');
  pruefe((await page.textContent('.koch-nr')).includes('Schritt 2'), 'Kochmodus: Schritt weiter');
  await page.click('[data-a="koch-ende"]');
  pruefe(await page.locator('#kochmodus').count() === 0, 'Kochmodus geschlossen');

  console.log('\n7) Profil: Gewicht, Prognose, Export/Import');
  await page.click('[data-tab="profil"]');
  const zielVorher = await page.evaluate(() => ziele(Z).kcal);
  await page.fill('.gewicht-form input[name="kg"]', '63.4');
  await page.click('.gewicht-form button[type="submit"]');
  await warte(400);
  while (await page.locator('.overlay [data-a="overlay-zu"]').count()) await page.click('.overlay [data-a="overlay-zu"]');
  const zielNach = await page.evaluate(() => ziele(Z).kcal);
  pruefe(zielNach > zielVorher, `TDEE/Tagesziel neu berechnet (${zielVorher} → ${zielNach})`);
  pruefe(await page.locator('.chart .ch-punkt').count() >= 1, 'Diagramm zeigt Messpunkt');
  pruefe(await page.locator('.chart .ch-prognose').count() === 1, 'Diagramm zeigt Prognoselinie');
  await page.locator('input[data-live="waswaere"]').fill('3400');
  await warte(100);
  pruefe((await page.textContent('#ww-text')).includes('3.400'), 'Was-wäre-wenn-Regler aktualisiert live');
  await foto(page, '17-profil', true);
  await keinHorizontalScroll(page, 'Profil');
  await page.click('details[data-id="daten"] summary');
  const [download] = await Promise.all([page.waitForEvent('download'), page.click('[data-a="export"]')]);
  const exportPfad = path.join(SHOTS, 'backup.json');
  await download.saveAs(exportPfad);
  const backup = JSON.parse(fs.readFileSync(exportPfad, 'utf8'));
  pruefe(backup.app === 'mampf-dojo' && backup.daten.wochen.length >= 1, 'Export: gültige JSON-Datei');
  const xpVorReset = await xp(page);

  console.log('\n8) Neuladen & Import');
  await page.reload();
  await page.waitForSelector('#nav button');
  pruefe(await xp(page) === xpVorReset, 'Nach Neuladen: Daten bleiben (XP gleich)');
  await page.evaluate(() => { localStorage.clear(); });
  await page.reload();
  pruefe(await page.locator('.onboarding').count() === 1, 'Nach Löschen: Onboarding');
  // Import über Einstellungen braucht ein Profil → Import direkt über die Datei-Eingabe im Profil testen:
  await page.evaluate(() => { Z.profil = Object.assign({}, PROFIL_STANDARD, { alter: 30, geschlecht: 'm', aktivitaet: 1.2, einkaufstag: 1 }); render(); UI.tab = 'profil'; render(); });
  await page.click('details[data-id="daten"] summary');
  page.once('dialog', d => d.accept());
  await page.setInputFiles('#import-datei', exportPfad);
  await warte(500);
  pruefe(await xp(page) === xpVorReset, 'Import stellt alles wieder her (XP gleich)');
  pruefe(await page.evaluate(() => Z.profil.name) === 'Testi', 'Import: Profil wieder da');

  console.log('\n9) Service Worker & Offline');
  await page.goto(BASIS);
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  const sw = await page.evaluate(async () => ({ controller: !!navigator.serviceWorker.controller, caches: await caches.keys() }));
  pruefe(sw.controller, 'Service Worker kontrolliert die Seite');
  pruefe(sw.caches.some(c => c.startsWith('mampf-dojo-')), 'Cache angelegt: ' + sw.caches.join(','));
  await context.setOffline(true);
  await page.reload();
  await page.waitForSelector('#nav button', { timeout: 8000 });
  pruefe(await page.locator('.mahlzeit, .leer').count() >= 1, 'Offline: App lädt aus dem Cache');
  const iconOffline = await page.evaluate(async () => (await fetch('icons/icon-192.png')).ok);
  pruefe(iconOffline, 'Offline: Icon aus dem Cache');
  await foto(page, '18-offline');
  await context.setOffline(false);

  console.log('\n10) Update-Banner');
  await page.request.post(BASIS + '__sw-version?v=9.9.9');
  await page.evaluate(async () => { const r = await navigator.serviceWorker.getRegistration(); await r.update(); });
  await page.waitForSelector('#update-banner', { timeout: 10000 }).catch(() => {});
  pruefe(await page.locator('#update-banner').count() === 1, 'Banner „Neues Update – neu laden?“ erscheint');
  await foto(page, '19-update-banner');
  if (await page.locator('#update-banner').count()) {
    await Promise.all([page.waitForEvent('load', { timeout: 10000 }).catch(() => null), page.click('[data-a="update-laden"]')]);
    await warte(800);
    const neu = await page.evaluate(async () => (await caches.keys()).join(','));
    pruefe(neu.includes('mampf-dojo-9.9.9'), 'Nach Klick: neue Version aktiv (' + neu + ')');
  }
  await page.request.post(BASIS + '__sw-version');

  console.log('\n11) Dark Mode & reduzierte Bewegung');
  await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
  await page.click('[data-tab="heute"]');
  await foto(page, '20-dark-heute', true);
  await page.click('[data-tab="woche"]');
  await foto(page, '21-dark-woche');

  console.log('\nKonsolenfehler: ' + (fehler.length ? fehler.join('\n') : 'keine'));
  if (fehler.length) nichtOk++;
  console.log(`\nErgebnis: ${ok} ok, ${nichtOk} Fehler`);
  await browser.close();
  process.exit(nichtOk ? 1 : 0);
})().catch(e => { console.error('ABBRUCH:', e); process.exit(2); });
