# Bild-Assets (Higgsfield) – Nachvollziehbarkeit

Alle Figuren sind **eigene Entwürfe** (keine bestehenden Anime-Figuren, Serien, Studios oder Künstler).
Modell: **GPT Image 2.5** (`gpt_image_2_5`), 1024 px, Qualität „medium“, transparenter Hintergrund.
Verbraucht: 6,0 Credits aus dem Monatskontingent (keine Zusatzkosten).

| Asset | Erzeugung |
|---|---|
| Maskottchen-Referenz (Entwurf B) | Text-Prompt: Chibi-Koch, weiße Kochmütze mit pinkem Band + weißem Dreieck, stachelige indigo Haare, weiße Kochjacke, pinke Schürze, Holzkelle; Manga-Cel-Shading, dicke Outlines |
| 6 Ausdrücke (freut, stolz, besorgt, müde, kampf, levelup) | Referenzbild = Entwurf B, gleicher Prompt + Pose/Ausdruck |
| 12 Bosse | 3 Sticker-Bögen à 4 Figuren (2×2), Stil-Referenz = Bogen 1, automatisch zugeschnitten (Lücken-Suche im Alphakanal) |
| Gyoza-Ninja | Einzeln neu erzeugt: schlichtes Stoff-Stirnband ohne Metallplatte (Abstand zu bekannten Serien) |

Verarbeitung: zuschneiden auf den sichtbaren Bereich, max. 380–400 px, WebP Qualität 76 (zusammen ca. 730 KB).
App-Icons: `python3 tools/erzeuge-icons.py <maskottchen-referenz.png>` (Pillow), keine Credits.
Schriften: Bangers + Dela Gothic One (nur benutzte Katakana), beide SIL OFL, Lizenztexte in `assets/fonts/`.
