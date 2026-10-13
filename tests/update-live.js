// Prüft den echten Update-Weg gegen die Live-Seite (GitHub Pages).
// Phase 1 (vor dem Push):  node tests/update-live.js installieren
// Phase 2 (nach dem Push): node tests/update-live.js pruefen <neue-version>
// Nutzt ein dauerhaftes Browser-Profil, damit der alte Service Worker erhalten bleibt.
'use strict';
const path = require('path');
const { chromium } = require(process.env.PLAYWRIGHT_PFAD || 'playwright');
const BASIS = process.env.BASIS || 'https://solerooo.github.io/mampf-dojo/';
const PROFIL = process.env.PROFIL_DIR || path.join(__dirname, '..', '.shots', 'update-profil');
const [phase, neueVersion] = process.argv.slice(2);
const warte = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const ctx = await chromium.launchPersistentContext(PROFIL, { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: 'de-DE' });
  const page = ctx.pages()[0] || await ctx.newPage();
  await page.goto(BASIS);
  await page.evaluate(() => navigator.serviceWorker.ready);
  if (phase === 'installieren') {
    await page.reload();
    const info = await page.evaluate(async () => ({ controller: !!navigator.serviceWorker.controller, caches: await caches.keys(), version: APP_VERSION }));
    console.log('Installiert:', JSON.stringify(info));
  } else {
    let banner = false;
    for (let i = 0; i < 40 && !banner; i++) { // GitHub-CDN kann bis ~10 Min. alte Dateien liefern
      await page.evaluate(async () => { const r = await navigator.serviceWorker.getRegistration(); if (r) await r.update().catch(() => {}); });
      await warte(3000);
      banner = (await page.locator('#update-banner').count()) > 0;
      if (!banner && i % 5 === 4) { await page.reload(); await warte(1500); banner = (await page.locator('#update-banner').count()) > 0; }
    }
    console.log(banner ? '✅ Banner „Neues Update – neu laden?“ erschienen' : '❌ Kein Banner');
    if (banner) {
      await page.screenshot({ path: path.join(path.dirname(PROFIL), 'update-live-banner.png') });
      await Promise.all([page.waitForEvent('load', { timeout: 15000 }).catch(() => null), page.click('[data-a="update-laden"]')]);
      await warte(1500);
      const caches = await page.evaluate(async () => (await caches.keys()).join(','));
      const version = await page.evaluate(() => APP_VERSION);
      const ok = caches.includes('mampf-dojo-' + neueVersion) && version === neueVersion;
      console.log((ok ? '✅' : '❌') + ` Nach „Neu laden“: App ${version}, Cache ${caches}`);
      process.exitCode = ok ? 0 : 1;
    } else process.exitCode = 1;
  }
  await ctx.close();
})().catch(e => { console.error(e); process.exit(2); });
