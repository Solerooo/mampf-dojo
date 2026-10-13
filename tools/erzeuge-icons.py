# Erzeugt alle App-Icons aus dem Maskottchen-Referenzbild (transparentes PNG, 1024×1024).
# Aufruf (Pillow nötig):  python3 tools/erzeuge-icons.py /pfad/zu/maskottchen-referenz.png
# Schreibt: icons/icon-192.png, icon-512.png, icon-maskable-192.png, icon-maskable-512.png,
#           apple-touch-icon.png und icons/icon.svg (SVG mit eingebettetem Bild)
import base64, io, math, os, sys
from PIL import Image, ImageDraw

WURZEL = os.path.join(os.path.dirname(__file__), '..')
PINK, PINK_HELL, GELB, PAPIER, TUSCHE = (255, 45, 122), (255, 110, 160), (255, 212, 0), (255, 246, 229), (27, 16, 51)

def kopf(quelle):
    im = Image.open(quelle).convert('RGBA')
    # Kopf mit Mütze (oberer Bildteil), quadratisch zugeschnitten
    box = im.getchannel('A').point(lambda v: 255 if v > 10 else 0).getbbox()
    x0, y0, x1, y1 = box
    breite = x1 - x0
    seite = int(breite * 1.0)
    mitte = (x0 + x1) // 2 + int(breite * 0.06)
    return im.crop((mitte - seite // 2, y0 - 10, mitte + seite // 2, y0 - 10 + seite))

def icon(kopfbild, groesse, rund, figur_anteil):
    S = groesse * 4  # Supersampling für weiche Kanten
    bild = Image.new('RGBA', (S, S), PINK + (255,))
    d = ImageDraw.Draw(bild)
    for r in range(S // 2, 0, -S // 40):  # weicher Verlauf von innen hell nach außen pink
        t = r / (S / 2)
        farbe = tuple(int(PINK_HELL[i] * (1 - t) + PINK[i] * t) for i in range(3)) + (255,)
        d.ellipse((S / 2 - r, S * 0.47 - r, S / 2 + r, S * 0.47 + r), fill=farbe)
    n = 28
    for i in range(n):  # Speedlines
        a1 = i / n * 2 * math.pi
        a2 = a1 + math.pi / n * 0.55
        d.polygon([(S / 2, S * 0.47), (S / 2 + math.cos(a1) * S, S * 0.47 + math.sin(a1) * S), (S / 2 + math.cos(a2) * S, S * 0.47 + math.sin(a2) * S)], fill=GELB + (255,))
    rk = S * 0.36 * figur_anteil / 0.82
    d.ellipse((S / 2 - rk, S * 0.5 - rk, S / 2 + rk, S * 0.5 + rk), fill=PAPIER + (255,), outline=TUSCHE + (255,), width=int(S * 0.02))
    k = int(S * figur_anteil)
    kb = kopfbild.resize((k, k), Image.LANCZOS)
    bild.alpha_composite(kb, ((S - k) // 2, int(S * 0.52 - k / 2)))
    if rund:
        maske = Image.new('L', (S, S), 0)
        ImageDraw.Draw(maske).rounded_rectangle((0, 0, S - 1, S - 1), radius=int(S * 0.22), fill=255)
        rahmen = ImageDraw.Draw(bild)
        rahmen.rounded_rectangle((S * 0.012, S * 0.012, S * 0.988, S * 0.988), radius=int(S * 0.21), outline=TUSCHE + (255,), width=int(S * 0.022))
        bild.putalpha(maske)
    return bild.resize((groesse, groesse), Image.LANCZOS)

def main():
    kopfbild = kopf(sys.argv[1])
    ziel = os.path.join(WURZEL, 'icons')
    icon(kopfbild, 192, True, 0.82).save(os.path.join(ziel, 'icon-192.png'), optimize=True)
    gross = icon(kopfbild, 512, True, 0.82)
    gross.save(os.path.join(ziel, 'icon-512.png'), optimize=True)
    icon(kopfbild, 192, False, 0.62).save(os.path.join(ziel, 'icon-maskable-192.png'), optimize=True)
    icon(kopfbild, 512, False, 0.62).save(os.path.join(ziel, 'icon-maskable-512.png'), optimize=True)
    icon(kopfbild, 180, False, 0.74).convert('RGB').save(os.path.join(ziel, 'apple-touch-icon.png'), optimize=True)
    puffer = io.BytesIO()
    gross.resize((256, 256), Image.LANCZOS).save(puffer, 'WEBP', quality=82)
    daten = base64.b64encode(puffer.getvalue()).decode()
    with open(os.path.join(ziel, 'icon.svg'), 'w') as f:
        f.write(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256"><image width="256" height="256" href="data:image/webp;base64,{daten}"/></svg>\n')
    print('Icons geschrieben nach', ziel)

main()
