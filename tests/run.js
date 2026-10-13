// Automatische Tests für Mampf-Dojo (ohne Zusatzpakete): node tests/run.js
// Prüft Datenbank, Generator (50 Wochen), Prognose, XP, Speicher, Kalibrierung, Tauschen.
'use strict';
const fs = require('fs');
const path = require('path');
const { ladeApp } = require('./lade-app.js');
const A = ladeApp();

let ok = 0, fehler = 0;
function pruefe(bed, text, detail) {
  if (bed) { ok++; if (process.env.LAUT) console.log('  ✅ ' + text); }
  else { fehler++; console.log('  ❌ ' + text + (detail ? ' → ' + detail : '')); }
}
function abschnitt(t) { console.log('\n' + t); }
function profil(extra) {
  const z = A.leererZustand();
  z.profil = Object.assign({}, A.PROFIL_STANDARD, { name: 'Test', alter: 25, geschlecht: 'm', aktivitaet: 1.55, einkaufstag: 6 }, extra || {});
  return z;
}

/* ------------------------------------------------------------------ */
abschnitt('1) Rezeptdatenbank & Zutaten');
const R = A.REZEPTE, anz = m => R.filter(r => r.mahlzeit === m).length;
pruefe(R.length >= 70, `mind. 70 Rezepte (${R.length})`);
pruefe(anz('fruehstueck') >= 16, `mind. 16 Frühstück (${anz('fruehstueck')})`);
pruefe(anz('mittag') >= 20, `mind. 20 Mittag (${anz('mittag')})`);
pruefe(anz('abend') >= 20, `mind. 20 Abend (${anz('abend')})`);
pruefe(anz('snack') >= 14, `mind. 14 Snacks/Shakes (${anz('snack')})`);
pruefe(R.filter(r => r.aufwand === 0).length >= 20, `mind. 20 Rezepte ohne Kochen (${R.filter(r => r.aufwand === 0).length})`);
const alleVersionen = R.concat(Object.values(A.REZEPT_MILD));
const ausserhalb = alleVersionen.filter(r => r.mahlzeit === 'snack' ? (r.kcal < 300 || r.kcal > 500) : (r.kcal < 500 || r.kcal > 800));
pruefe(!ausserhalb.length, 'Portionsgrößen: Haupt 500–800, Snack 300–500 kcal', ausserhalb.map(r => r.id + (r.istMild ? '(mild)' : '') + ':' + r.kcal).join(', '));
const felder = ['id', 'name', 'emoji', 'mahlzeit', 'kueche', 'kcal', 'protein', 'zeitMin', 'kosten', 'fancy', 'premium', 'schaerfe', 'magenschonend', 'aufwand', 'abwasch', 'mealPrepPortionen', 'haltbarTage', 'basisId', 'variante', 'mildVersion', 'zutaten', 'schritte'];
pruefe(R.every(r => felder.every(f => f in r)), 'alle Pflichtfelder vorhanden');
pruefe(R.every(r => r.zutaten.every(z => z.name && z.menge > 0 && z.einheit && z.abteilung)), 'Zutaten mit name/menge/einheit/abteilung');
pruefe(R.every(r => r.schritte.length >= 3), 'jedes Rezept hat mind. 3 Schritte');
pruefe(R.every(r => r.schaerfe >= 0 && r.schaerfe <= 3 && r.aufwand >= 0 && r.aufwand <= 2), 'Schärfe 0–3, Aufwand 0–2');
pruefe(R.every(r => r.haltbarTage <= 3 && r.mealPrepPortionen >= 1 && r.mealPrepPortionen <= 3), 'gekocht max. 3 Tage, Meal-Prep max. 3 Portionen');
const scharfOhneMild = R.filter(r => r.schaerfe > 1 && !(A.REZEPT_MILD[r.id] && A.REZEPT_MILD[r.id].schaerfe <= 1));
pruefe(!scharfOhneMild.length, 'scharfe Gerichte haben eine Mild-Version', scharfOhneMild.map(r => r.id).join(', '));
pruefe(R.every(r => !r.magenschonend || r.reiz.length === 0), 'magenschonend nur ohne Reizfaktoren');
const texte = r => [r.name].concat(r.schritte, r.tipps || []).join(' ');
const mitOfen = R.filter(r => /backofen|\bofen\b|ofenkartoffel|aufs blech|umluft|auflaufform|kastenform/i.test(texte(r)));
pruefe(!mitOfen.length, 'kein Backofen nötig (nur Herd + Heißluftfritteuse)', mitOfen.map(r => r.id).join(', '));
const nurMikrowelle = R.filter(r => r.schritte.concat(r.tipps || []).some(t => /mikrowelle/i.test(t) && !/oder/i.test(t)));
pruefe(!nurMikrowelle.length, 'Mikrowelle immer mit Pfannen-/Topf-Alternative', nurMikrowelle.map(r => r.id).join(', '));
pruefe(A.ZUTATEN.every(z => z.tiefkuehl === false && !/\bTK\b|tiefgek/i.test(z.name)), 'keine Tiefkühlware');
pruefe(A.ZUTATEN.every(z => z.kcal >= 0 && z.protein >= 0 && z.preis > 0 && z.packung > 0 && z.haltbarRohTage > 0), 'Zutaten: Nährwerte, Preis, Packung, Haltbarkeit');
pruefe(A.ZUTATEN.filter(z => ['haehnchen', 'hack', 'lachs', 'himbeeren', 'spinat', 'salat'].includes(z.id)).every(z => z.haltbarRohTage <= 4), 'Empfindliches (Hack, Fisch, Hähnchen, Beeren, Salat) kurz haltbar');
pruefe(new Set(R.map(r => r.kueche)).size >= 10, `mind. 10 Länderküchen (${new Set(R.map(r => r.kueche)).size})`);
pruefe(R.filter(r => r.basisId).length >= 10, 'Basis-Ketten vorhanden');
pruefe(R.filter(r => r.premium).length >= 3, 'Premium-Gerichte vorhanden');
const anzSprueche = Object.values(A.SPRUECHE).reduce((s, l) => s + l.length, 0);
pruefe(anzSprueche >= 60, `mind. 60 Sprüche (${anzSprueche})`);
pruefe(A.ERFOLGE.length >= 25, `mind. 25 Erfolge (${A.ERFOLGE.length})`);
pruefe(new Set(A.ERFOLGE.map(e => e.id)).size === A.ERFOLGE.length, 'Erfolg-IDs eindeutig');
pruefe(A.RAENGE.map(r => r.name).join('|') === 'Reiskorn-Rekrut|Ramen-Lehrling|Wok-Krieger|Gyoza-Meister|Bulk-Shogun|Legendärer Küchen-Kaiser', 'Ränge vollständig');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const wurzel = path.join(__dirname, '..');
const bilderImCode = [...new Set((html.match(/const MASKOTTCHEN_BILDER = \{([^}]*)\}/) || [, ''])[1].match(/'([a-z]+)'/g) || [])].map(x => x.replace(/'/g, ''));
pruefe(bilderImCode.length >= 6 && bilderImCode.every(n => fs.existsSync(path.join(wurzel, 'assets/bilder/maskottchen', n + '.webp'))), `Maskottchen: mind. 6 Ausdrücke als Bild vorhanden (${bilderImCode.join(', ')})`);
pruefe(A.BOSSE.length >= 10 && A.BOSSE.every(b => b.bild && fs.existsSync(path.join(wurzel, 'assets/bilder/bosse', b.bild + '.webp'))), `mind. 10 illustrierte Wochen-Bosse (${A.BOSSE.length})`);
const swText = fs.readFileSync(path.join(wurzel, 'sw.js'), 'utf8');
const assetDateien = [];
(function sammle(d) { for (const f of fs.readdirSync(path.join(wurzel, d))) { const r = d + '/' + f; if (fs.statSync(path.join(wurzel, r)).isDirectory()) sammle(r); else if (!f.endsWith('.txt')) assetDateien.push(r); } })('assets');
pruefe(assetDateien.every(f => swText.includes("'./" + f + "'")), 'Service Worker cacht alle Bilder & Schriften (offline)', assetDateien.filter(f => !swText.includes("'./" + f + "'")).join(', '));
const swListe = (swText.match(/const DATEIEN = \[([\s\S]*?)\];/) || [, ''])[1].match(/'\.\/([^']+)'/g) || [];
pruefe(swListe.every(x => { const f = x.slice(3, -1); return f === '' || fs.existsSync(path.join(wurzel, f)); }), 'alle Dateien der Service-Worker-Liste existieren');
const bildBytes = assetDateien.filter(f => f.endsWith('.webp')).reduce((s, f) => s + fs.statSync(path.join(wurzel, f)).size, 0);
pruefe(bildBytes < 900 * 1024, `Bilder zusammen klein genug fürs Handy (${Math.round(bildBytes / 1024)} KB < 900 KB)`);
pruefe(!/fonts\.googleapis|fonts\.gstatic/.test(html) && fs.existsSync(path.join(wurzel, 'assets/fonts/Bangers-OFL.txt')), 'Schriften lokal mit OFL-Lizenz');
pruefe(!/https?:\/\/(cdn|fonts|unpkg|cdnjs)/.test(html) && !/<script[^>]+src=/.test(html) && !/<link[^>]+stylesheet/.test(html), 'keine CDNs/externen Skripte/Schriften');

/* ------------------------------------------------------------------ */
abschnitt('2) Version');
const swVersion = (fs.readFileSync(path.join(__dirname, '..', 'sw.js'), 'utf8').match(/const VERSION = '([^']+)'/) || [])[1];
pruefe(swVersion === A.APP_VERSION, `APP_VERSION (${A.APP_VERSION}) = sw.js VERSION (${swVersion})`);
const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'manifest.webmanifest'), 'utf8'));
pruefe(manifest.icons.some(i => i.purpose === 'maskable') && manifest.icons.some(i => i.sizes === '512x512') && manifest.icons.some(i => i.sizes === '192x192'), 'Manifest: Icons 192/512 + maskable');
pruefe(manifest.icons.every(i => fs.existsSync(path.join(__dirname, '..', i.src))), 'Manifest: alle Icon-Dateien existieren');

/* ------------------------------------------------------------------ */
abschnitt('3) Generator: 50 Wochen');
const N = +(process.env.WOCHEN || 50);
const starts = ['2026-10-17', '2026-10-19', '2026-10-21', '2026-11-05', '2026-12-12'];
let premiumOk = 0, sumKosten = 0, msGesamt = 0;
const verstoesse = {};
const merke = (k, info) => { (verstoesse[k] = verstoesse[k] || []).push(info); };
for (let i = 0; i < N; i++) {
  const z = profil();
  const start = starts[i % starts.length];
  const t0 = Date.now();
  const w = A.generiereWoche(z, { start, seed: 500 + i });
  msGesamt += Date.now() - t0;
  const An = A.analysiereWoche(w);
  const zz = A.ziele(z);
  An.tage.forEach((t, ti) => {
    if (Math.abs(t.kcal - zz.kcal) / zz.kcal > 0.05) merke('kcal ±5 %', `#${i} Tag ${ti}: ${t.kcal}`);
    if (t.protein < zz.protein * 0.9) merke('Protein ≥ 90 %', `#${i} Tag ${ti}: ${t.protein}`);
    if (t.reiz > 1) merke('Magen: max. 1 reizendes Gericht/Tag', `#${i} Tag ${ti}`);
  });
  if (w.einkauf.kostenPlan > w.budget) merke('Budget', `#${i}: ${w.einkauf.kostenPlan} > ${w.budget}`);
  if (An.frisch.length) merke('Haltbarkeit roh', `#${i}: ` + An.frisch.map(f => f.zutat + '@' + f.tag).join(','));
  w.tage.forEach((t, ti) => t.slots.forEach((s, si) => {
    const r = A.rezeptVon(s.rid, s.mild), inf = An.slotInfo[ti][si];
    if (r.schaerfe > z.profil.maxSchaerfe) merke('Schärfe ≤ 1', `#${i} ${r.id}`);
    if (inf.rest && tiDiff(w, inf.kochDatum, t.datum) >= r.haltbarTage) merke('Haltbarkeit gekocht', `#${i} ${r.id}`);
    if (inf.portionen > 3) merke('Meal-Prep max. 3 Portionen', `#${i} ${r.id}`);
    if (r.zutaten.some(x => A.ZUTAT[x.id].tiefkuehl)) merke('keine Tiefkühlware', r.id);
  }));
  for (const [rid, n] of Object.entries(An.rCount)) if (n > 3) merke('max. 3× pro Gericht', `#${i} ${rid}: ${n}`);
  const chill = w.tage.filter(t => t.chill);
  if (chill.length !== 2) merke('2 Chill-Tage', `#${i}: ${chill.length}`);
  w.tage.forEach((t, ti) => { if (t.chill && An.slotInfo[ti].some(x => x.aufwand > 1)) merke('Chill-Tage Aufwand 0–1', `#${i} Tag ${ti}`); });
  if (w.tage.slice(0, 2).some(t => t.chill)) merke('Koch-Tage direkt nach dem Einkauf', `#${i}`);
  if (An.premium >= 2 && An.premium <= 3) premiumOk++;
  sumKosten += w.einkauf.kostenPlan;
  // Einkaufsliste deckt den Bedarf, sortiert nach Abteilung
  const ord = w.einkauf.items.map(it => A.ABTEILUNGEN.findIndex(a => a.id === A.ZUTAT[it.id].abteilung));
  if (ord.some((o, k) => k && o < ord[k - 1])) merke('Einkaufsliste nach Abteilung sortiert', `#${i}`);
  if (w.einkauf.items.some(it => it.kaufMenge + it.bestand < it.menge * 0.97 - 1)) merke('Packungen decken Bedarf', `#${i}`);
}
function tiDiff(w, a, b) { return A.tageZwischen(a, b); }
for (const regel of ['kcal ±5 %', 'Protein ≥ 90 %', 'Budget', 'Haltbarkeit roh', 'Haltbarkeit gekocht', 'Schärfe ≤ 1', 'max. 3× pro Gericht',
  '2 Chill-Tage', 'Chill-Tage Aufwand 0–1', 'Koch-Tage direkt nach dem Einkauf', 'Magen: max. 1 reizendes Gericht/Tag', 'Meal-Prep max. 3 Portionen',
  'keine Tiefkühlware', 'Einkaufsliste nach Abteilung sortiert', 'Packungen decken Bedarf']) {
  const v = verstoesse[regel] || [];
  pruefe(!v.length, `${regel}: ${N - new Set(v.map(x => x.split(' ')[0])).size}/${N} Wochen ok`, v.slice(0, 4).join(' | '));
}
pruefe(premiumOk >= N * 0.9, `2–3 Premium-Gerichte in ${premiumOk}/${N} Wochen (mind. 90 %)`);
console.log(`  ℹ️  Ø Wochenkosten ${(sumKosten / N).toFixed(2)} € (Budget ${A.wochenbudget(profil().profil).toFixed(2)} €), Ø ${Math.round(msGesamt / N)} ms pro Woche`);

/* ------------------------------------------------------------------ */
abschnitt('4) Prognose');
{
  const z = profil();
  const p = z.profil;
  const ziel = A.simulierePrognose(p, 62, 72, 'ziel');
  pruefe(ziel.status === 'ok' && ziel.wochen > 25 && ziel.wochen < 30, `180 cm, 62→72 kg, +400 kcal: ${ziel.wochen.toFixed(1)} Wochen (≈ halbes Jahr)`);
  const fix = A.simulierePrognose(p, 62, 72, 'fix', A.ziele(z).kcal);
  pruefe(fix.status === 'ok' && fix.wochen > ziel.wochen, `Feste kcal: länger, weil TDEE mitwächst (${fix.wochen.toFixed(1)} Wochen)`);
  const defizit = A.simulierePrognose(p, 62, 72, 'fix', 2300);
  pruefe(defizit.status === 'defizit' && defizit.verlauf.length === 0, 'Unter TDEE: keine Prognose ins Minus');
  const plateau = A.simulierePrognose(p, 62, 72, 'fix', 2600);
  pruefe(plateau.status === 'plateau' && plateau.plateauKg < 72 && plateau.plateauKg > 62, `Plateau erkannt (${plateau.plateauKg.toFixed(1)} kg)`);
  pruefe(Math.round(A.grundumsatz(p, 62)) === 1625 && Math.round(A.tdee(p, 62)) === 2519, 'Mifflin-St-Jeor × 1,55 korrekt (1625 / 2519 kcal)');
  pruefe(A.proteinZiel(62) === 112, 'Protein 1,8 g/kg');
  pruefe(Math.abs(A.wochenbudget(p) - 250 * 12 / 52) < 1e-9, 'Wochenbudget = Monat × 12 / 52');
}

/* ------------------------------------------------------------------ */
abschnitt('5) XP, Streak, Level, Rückgängig');
{
  const z = profil();
  const h = A.heute();
  const w = A.generiereWoche(z, { start: A.addTage(h, -2), seed: 1 });
  z.wochen.push(w);
  const xp0 = A.berechneSpielstand(z).xp;
  w.tage[0].slots.forEach(s => { s.gegessen = true; });
  const sp1 = A.berechneSpielstand(z);
  pruefe(sp1.proTag[w.tage[0].datum].zielErreicht && sp1.proTag[w.tage[0].datum].alle5, 'Tag 1: Ziel + alle 5');
  const tag1 = sp1.xp;
  w.tage[1].slots.forEach(s => { s.gegessen = true; });
  const sp2 = A.berechneSpielstand(z);
  pruefe(sp2.proTag[w.tage[1].datum].mult === 1.1, 'Streak-Bonus +10 % am 2. Tag');
  w.tage[1].slots[4].gegessen = false;
  const sp3 = A.berechneSpielstand(z);
  w.tage[1].slots[4].gegessen = true;
  pruefe(A.berechneSpielstand(z).xp === sp2.xp && sp3.xp < sp2.xp, 'Rückgängig zieht XP exakt ab (inkl. Boni)');
  pruefe(A.levelAusXP(0) === 1 && A.levelAusXP(499) === 1 && A.levelAusXP(500) === 2 && A.levelAusXP(1500) === 3, 'Level n braucht 500 × n XP');
  pruefe(A.rangFuer(20).name === 'Bulk-Shogun' && A.rangFuer(30).name === 'Legendärer Küchen-Kaiser', 'Ränge nach Level');
  // Kappe bei 110 %
  const e = { kcalListe: [5000], kcal: 5000, protein: 0, ziel: { kcal: 2900, protein: 112 }, slotAnzahl: 5, gegessen: 1 };
  pruefe(Math.round(A.tagesXPRoh(e).mahlXP) === 319, 'XP zählen nur bis 110 % des Tagesziels');
  // Einkauf & Gewicht
  const vorher = A.berechneSpielstand(z).xp;
  w.einkauf.erledigt = true;
  pruefe(A.berechneSpielstand(z).xp - vorher === 150, 'Wocheneinkauf +150 XP');
  z.gewichte.push({ id: 'g1', datum: h, kg: 63 });
  pruefe(A.berechneSpielstand(z).xp - vorher === 150 + 30 + 100, 'Gewicht +30, neues Höchstgewicht +100');
  const b = A.bossStatus(w, A.tagesUebersicht(z));
  pruefe(b.hp === w.tage.reduce((s, t) => s + t.zielKcal, 0) && b.schaden > 0, 'Boss-HP = Wochen-Kalorienziel, Schaden = gegessene kcal');
  pruefe(xp0 === 0 && tag1 > 400, 'XP startet bei 0, voller Tag ≈ 500 XP');
  const neu = A.pruefeErfolge(z, A.berechneSpielstand(z));
  pruefe(neu.some(x => x.id === 'erster_bissen') && neu.some(x => x.id === 'einkauf1'), 'Erfolge werden freigeschaltet');
}

/* ------------------------------------------------------------------ */
abschnitt('6) Kein-Bock, Magen-Tag, Tauschen');
{
  const z = profil();
  const h = A.heute();
  z.wochen.push(A.generiereWoche(z, { start: A.addTage(h, -1), seed: 77 }));
  const kand = A.ersatzKandidaten(z, 0, 1, 2, 'tausch');
  pruefe(kand.some(k => !k.nichtGekauft), `Tauschen findet Alternativen mit Einkaufs-Zutaten (${kand.filter(k => !k.nichtGekauft).length})`);
  const erg = A.tauscheTag(z, 0, 1, 'keinbock');
  const An = A.analysiereWoche(z.wochen[0]);
  pruefe(An.slotInfo[1].every(x => x.aufwand <= 1), `Kein-Bock: alle Mahlzeiten Aufwand 0–1 (${erg.getauscht} getauscht)`);
  pruefe(z.log[z.wochen[0].tage[1].datum].keinBock === true, 'Kein-Bock-Tag wird gemerkt (Lazy Legend)');
  A.tauscheTag(z, 0, 1, 'magen');
  pruefe(z.wochen[0].tage[1].slots.every(s => A.rezeptVon(s.rid, s.mild).magenschonend), 'Magen-Tag: alles magenschonend');
  const kcal = z.wochen[0].tage[1].slots.reduce((s, x) => s + x.kcal, 0);
  pruefe(Math.abs(kcal - z.wochen[0].tage[1].zielKcal) / z.wochen[0].tage[1].zielKcal < 0.12, `Magen-Tag: kcal bleiben ähnlich (${kcal})`);
}

/* ------------------------------------------------------------------ */
abschnitt('7) Speicher, Migration, Export/Import');
{
  const z = profil();
  z.wochen.push(A.generiereWoche(z, { start: '2026-10-17', seed: 3 }));
  z.gewichte.push({ id: 'g', datum: '2026-10-18', kg: 62.5 });
  const json = A.exportiereDaten(z);
  const zurueck = A.importiereDaten(json);
  pruefe(JSON.stringify(zurueck) === JSON.stringify(A.migriere(JSON.parse(JSON.stringify(z)))), 'Export → Import: identisch');
  let wurf = false;
  try { A.importiereDaten('{"hallo":1}'); } catch (e) { wurf = true; }
  pruefe(wurf, 'Import lehnt fremde Dateien ab');
  const alt = A.migriere({ profil: { alter: 30 }, wochen: [] });
  pruefe(alt.schema === A.SCHEMA_VERSION && Array.isArray(alt.gewichte) && alt.profil.groesse === 180, 'Migration ergänzt fehlende Felder (Schema 0 → aktuell)');
  pruefe(A.migriere(null).wochen.length === 0 && A.migriere('kaputt').schema === A.SCHEMA_VERSION, 'Kaputte Daten → leerer Zustand');
  pruefe(A.ladeZustand().profil === null, 'Start ohne Speicher funktioniert');
}

/* ------------------------------------------------------------------ */
abschnitt('8) Kalibrierung & Zu-schnell-Warnung');
{
  const z = profil();
  const h = A.heute();
  // 21 Tage je 3300 kcal gegessen, Gewicht steigt 0,8 kg/Woche → echter Verbrauch niedriger als Formel
  for (let i = 1; i <= 21; i++) z.log[A.addTage(h, -i)] = { extras: [{ id: 'x' + i, kcal: 3300, protein: 120 }] };
  [21, 14, 7, 1].forEach(t => z.gewichte.push({ id: 'g' + t, datum: A.addTage(h, -t), kg: 62 + (21 - t) * 0.8 / 7 }));
  const k = A.pruefeKalibrierung(z);
  pruefe(k && k.delta < 0 && k.delta >= -150, `Kalibrierung korrigiert TDEE geglättet (max. ±150): ${k && k.delta} kcal`);
  pruefe(A.nimmtZuSchnellZu(z), 'Mehr als 0,5 kg/Woche wird erkannt');
  const zielVor = A.ziele(z).kcal;
  A.wendeKalibrierungAn(z, k);
  pruefe(A.ziele(z).kcal < zielVor, 'Tagesziel wird angepasst');
  pruefe(A.pruefeKalibrierung(z) === null, 'Höchstens einmal pro Woche');
}

console.log(`\n${fehler ? '❌' : '✅'} ${ok} Prüfungen ok, ${fehler} fehlgeschlagen.`);
process.exit(fehler ? 1 : 0);
