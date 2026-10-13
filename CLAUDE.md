# Mampf-Dojo – Hinweise für Claude

> **Dieses Projekt liegt nur im Ordner mampf-dojo. Niemals andere Projekte auf diesem Computer verändern.**
> Jeden Befehl nur in `~/mampf-dojo` ausführen, Pfade immer prüfen. Regelmäßig committen.

## Was ist das?
Anime-Food-Quest-PWA zum Zunehmen (UI komplett Deutsch, lustiger Anime-Ton):
5 Mahlzeiten/Tag mit kcal & Protein, Wochenplan-Generator, Einkaufsliste für **einen** Einkauf pro Woche,
Monatsbudget, XP/Level/Streak/Wochen-Boss/Erfolge, Gewichtsprognose. Läuft komplett offline.
Live: https://solerooo.github.io/mampf-dojo/ (GitHub Pages, Branch `main`, Root).

## Technik-Regeln (verbindlich)
- Vanilla HTML/CSS/JS, **kein Framework, kein Build-Schritt, keine CDNs/externen Schriften/Bilder**.
- `index.html` enthält die ganze App inline, gegliedert in Script-Blöcke:
  - `data-teil="daten"`: Zutaten (Nährwerte/Preise/Haltbarkeit), Basen, Rezepte, Texte/Sprüche/Erfolge
  - `data-teil="logik"`: Ernährung, Speicher, Prognose, Generator, XP/Spiel – **kein DOM-Zugriff!**
  - `data-teil="ui"`: Rendering, Events, Overlays, PWA
- `sw.js`: index.html network-first, Rest cache-first, Update-Banner über `SKIP_WAITING`.
- **Bei jeder Änderung Version erhöhen:** `APP_VERSION` in `index.html` UND `VERSION` in `sw.js` (gleich halten,
  `node tests/run.js` prüft das).
- Speicher: `localStorage` Key `mampfDojo.v1`, `SCHEMA_VERSION` + `migriere()`. Neue Felder → in `leererZustand()`
  ergänzen; Strukturänderungen → Migrationsschritt `if (v < N)` anhängen und `SCHEMA_VERSION` erhöhen.
- Keine persönlichen Daten ins Repo (alles bleibt im Browser des Nutzers).

## Design-System „Shōnen-Kochshow“ (seit 1.1.0)
- Manga-Seite: Rasterpapier-Hintergrund, weiße Panels mit 3 px Tusche-Rand + harter Schatten. Farben nur als
  CSS-Variablen in `:root` (hell) und Dark-Mode-Block – keine Hex-Werte verstreut einsetzen.
- Mut-Element ist das **Kampf-HUD** auf „Heute“ (Mampfi vs. Wochen-Boss). Effekte nur als Reaktion auf Aktionen
  (Impact beim Abhaken, Boss-Treffer, Level-Up-Verwandlung), immer mit `prefers-reduced-motion`-Fallback.
- Schriften lokal: `Bangers` (Überschriften, Zahlen, Knöpfe), `DelaSFX` nur für Katakana-Soundeffekte.
  Neue Katakana im Code → Schrift neu subsetten (siehe design/PROMPTS.md), sonst fehlen Zeichen.
- Bilder: `assets/bilder/maskottchen/*.webp` (6 Ausdrücke), `assets/bilder/bosse/*.webp` (12, Feld `bild` in `BOSSE`).
  Jede Datei in `assets/` muss in `sw.js` → `DATEIEN` stehen (Test prüft das). Herkunft: design/PROMPTS.md.
- Vorher/Nachher-Screenshots: `node tools/screenshots.js design/<ordner>` (fester Demo-Zustand, 390 px).

## Daten-Konventionen
- Rezeptwerte (kcal, Protein, Kosten) werden **aus der Zutatentabelle berechnet** – nie von Hand eintragen.
- Rezept-Zutaten: `[[zutatId, menge], …]` in der Einheit der Zutat (g/ml/Stk).
- Hauptmahlzeiten (Frühstück/Mittag/Abend) 500–800 kcal, Snacks/Shakes 300–500 kcal (Test prüft das).
- **Küche: Herd + Heißluftfritteuse, KEIN Backofen.** Mikrowelle nur optional – immer eine Pfannen/Topf-Alternative nennen.
- Keine Tiefkühlware (kein Gefrierfach). `haltbarRohTage` = Tage ab Einkauf (Einkaufstag = Tag 1).
- Gekochtes max. 3 Tage, Meal-Prep max. 3 Portionen. Basis-Ketten über `basisId` + `BASEN`.
- Schärfe > 1 braucht `mildVersion` (Standard: max. Schärfe 1). `magenschonend` nur ohne Reizfaktoren.
- Premium = Rezept mit ≥ 75 g Steak/Lachs/Räucherlachs.

## Generator (Kurzfassung)
Simulated Annealing über 7×5 Slots, Strafpunkte in `bewertePlan()`:
harte Regeln (kcal ±5 %, Protein ≥ 90 %, Frische, Chill-Tage Aufwand ≤ 1, max. 3× pro Gericht, Magen,
Budget) mit steigendem Gewicht (`GEN.hartStart` → `GEN.hartEnde`), weiche Kriterien (Kosten, Premium 2–3,
Abwechslung, Reste-Bonus, Angebote). Tagesabhängige Rezept-Pools verhindern Frische-Verstöße.
Danach `poliere()`, Budget-Reparatur und Sicherheitsnetz-Neustarts. Portionsfaktor pro Tag (0,75–1,35).
Parameter in `GEN` – nach Änderungen immer `node tests/run.js` laufen lassen (50 Wochen).

## Testen
- `node tests/run.js` – Daten-Checks, Generator 50×, Prognose, XP/Rückgängig, Speicher/Migration, Export/Import.
  Härtetest: `WOCHEN=150 node tests/run.js`.
- `tests/e2e.js` – Klick-Test in echtem Chromium bei 390 px (Playwright, nicht im Repo installiert):
  `PLAYWRIGHT_PFAD=/pfad/node_modules/playwright SHOTS=/tmp/shots node tests/e2e.js`
  (gegen live: `BASIS=https://solerooo.github.io/mampf-dojo/ OHNE_UPDATE=1 …`).
- `tests/update-live.js` – echter Update-Weg gegen GitHub Pages (Phase `installieren` vor, `pruefen <version>` nach dem Push).
- Hinweis: Der eingebaute Vorschau-Browser der Desktop-App kann keine Service Worker registrieren – SW/Offline mit
  Playwright testen.
- Lokaler Server: `node tools/devserver.js` → http://localhost:8777 (eigener Port!). Bei 390 px Breite durchklicken.
- Test-Datum: `?datum=2026-10-20` an die URL hängen (simuliert einen anderen Tag).
- Icons: `python3 tools/erzeuge-icons.py <maskottchen-referenz.png>` (Pillow). Die alten Dateien
  `tools/erzeuge-icon-svgs.js`, `tools/icons.html`, `icons/icon-maskable.svg`, `icons/icon-apple.svg` sind veraltet.

## Veröffentlichen
`git push` auf `main` → GitHub Pages aktualisiert sich automatisch. Vorher Version erhöhen, sonst kommt das
Update-Banner nicht.
