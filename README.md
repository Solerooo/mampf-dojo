# 🍙 Mampf-Dojo

Die Anime-Food-Quest-App zum Zunehmen. Sensei Mampfi plant dir jeden Tag **5 Mahlzeiten** mit Kalorien und
Protein, macht eine Einkaufsliste für **einen Einkauf pro Woche**, achtet auf dein **Budget** – und für jede
abgehakte Mahlzeit gibt’s **XP, Level und Wochen-Bosse**.

**👉 App öffnen: https://solerooo.github.io/mampf-dojo/**

## Was die App kann
- **Heute:** 5 Mahlzeiten-Karten, „Gegessen!“ mit XP (rückgängig machbar), Tauschen, „Heute kein Bock 😴“,
  „Magen-Tag 🫶“, Extra-Kalorien eintragen
- **Woche:** 7-Tage-Plan, Wochen-Boss mit HP-Balken, Kosten vs. Budget, Chill-Tage, Angebots-Check vor dem Generieren
- **Einkauf:** Liste nach Supermarkt-Abteilungen, Packungsgrößen, „bis Tag X verbrauchen“, Vorrat-Check,
  Teilen/Kopieren, echte Kassenbeträge → Monatsbudget
- **Rezepte:** 75 Rezepte (asiatisch, indisch, amerikanisch, mexikanisch, mediterran, bayrisch …), Filter,
  Mild-Versionen, Varianten, Kochmodus mit großer Schrift (Bildschirm bleibt an)
- **Profil:** Level & Rang, Gewicht + Diagramm mit Prognose, „Was wäre, wenn …“, Erfolge, Einstellungen, Backup

Magenschonend als Standard (wenig Schärfe, Säure, Fett), keine Tiefkühlware, Empfindliches wird früh in der Woche
verplant. Alle Rezepte klappen mit Herd und Heißluftfritteuse – ein Backofen ist nicht nötig. **Die App ersetzt keine ärztliche Beratung.**

## Aufs Handy wie eine echte App
- **iPhone (Safari):** Link öffnen → Teilen-Knopf (Quadrat mit Pfeil) → „Zum Home-Bildschirm“ → „Hinzufügen“.
- **Android (Chrome):** Link öffnen → Menü ⋮ → „App installieren“ bzw. „Zum Startbildschirm hinzufügen“.

Danach startet Mampf-Dojo im Vollbild mit eigenem Icon und funktioniert auch ohne Internet.

## Backup
Profil → Einstellungen → „Daten & Backup“ → **Backup exportieren**. Auf dem iPhone im Teilen-Menü
„In Dateien sichern“ wählen. Zum Wiederherstellen: „Backup importieren“ und die JSON-Datei auswählen.
Alle Daten bleiben nur auf deinem Gerät – nichts wird hochgeladen.

## Updates
Neue Versionen kommen automatisch: Beim nächsten Öffnen erscheint „✨ Neues Update – neu laden?“ → antippen.

## Für Entwickler
Kein Build-Schritt: `index.html` enthält die ganze App. Tests: `node tests/run.js`.
Lokal starten: `node tools/devserver.js` → http://localhost:8777. Details in `CLAUDE.md`.
