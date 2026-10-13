// Erzeugt die Icon-SVGs (normal + maskable + Apple) mit dem Maskottchen „Sensei Mampfi“.
// Aufruf: node tools/erzeuge-icon-svgs.js  → schreibt icons/*.svg
// Die PNGs werden danach im Browser über tools/icons.html gerendert (siehe CLAUDE.md).
'use strict';
const fs = require('fs');
const path = require('path');
const INK = '#15121f';

function strahlen(cx, cy, r, n, farbe) {
  let s = '';
  for (let i = 0; i < n; i++) {
    const a1 = (i / n) * Math.PI * 2, a2 = a1 + Math.PI / n * 0.55;
    s += `<path d="M${cx} ${cy} L${(cx + Math.cos(a1) * r).toFixed(1)} ${(cy + Math.sin(a1) * r).toFixed(1)} L${(cx + Math.cos(a2) * r).toFixed(1)} ${(cy + Math.sin(a2) * r).toFixed(1)} Z" fill="${farbe}"/>`;
  }
  return s;
}
function maskottchen() {
  return `
  <path d="M28 130 Q30 100 60 98 Q90 100 92 130 Z" fill="#fff" stroke="${INK}" stroke-width="3.5"/>
  <path d="M45 130 V108 Q60 101 75 108 V130" fill="#ff4f8b" stroke="${INK}" stroke-width="3"/>
  <path d="M55 120 L60 112 L65 120 Z" fill="#fff" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>
  <ellipse cx="60" cy="72" rx="37" ry="33" fill="#ffe2c6" stroke="${INK}" stroke-width="3.5"/>
  <path d="M24 70 Q22 50 34 45 L86 45 Q98 50 96 70 L90 60 L84 67 L78 55 L70 64 L62 52 L54 64 L46 55 L40 67 L32 58 Z" fill="#3b2a63" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
  <path d="M33 42 Q22 26 37 19 Q41 5 60 9 Q79 5 83 19 Q98 26 87 42 Z" fill="#fff" stroke="${INK}" stroke-width="3.5" stroke-linejoin="round"/>
  <rect x="31" y="36" width="58" height="12" rx="4" fill="#ff4f8b" stroke="${INK}" stroke-width="3.5"/>
  <path d="M56 46 L60 38 L64 46 Z" fill="#fff" stroke="${INK}" stroke-width="1.8" stroke-linejoin="round"/>
  <ellipse cx="36" cy="83" rx="6.5" ry="4" fill="#ff8fb1" opacity=".85"/><ellipse cx="84" cy="83" rx="6.5" ry="4" fill="#ff8fb1" opacity=".85"/>
  <path d="M38 74 Q45 65 52 74" fill="none" stroke="${INK}" stroke-width="4" stroke-linecap="round"/>
  <path d="M68 74 Q75 65 82 74" fill="none" stroke="${INK}" stroke-width="4" stroke-linecap="round"/>
  <path d="M49 84 Q60 100 71 84 Z" fill="#7a1f3d" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
  <path d="M54 91 Q60 97 66 91 Q60 88 54 91 Z" fill="#ff7a9c"/>`;
}
// skala: Größe des Maskottchens relativ zur Kachel; rund: abgerundete Ecken (nur „any“)
function icon(skala, rund) {
  const S = 512, w = 120 * skala * S / 120, h = 130 * w / 120;
  const x = (S - w) / 2, y = (S - h) / 2 + S * 0.03;
  const clip = rund ? `<clipPath id="k"><rect width="${S}" height="${S}" rx="112"/></clipPath>` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${S} ${S}" width="${S}" height="${S}">
  <defs>${clip}<radialGradient id="g" cx="50%" cy="45%" r="70%"><stop offset="0" stop-color="#ff7aa8"/><stop offset="1" stop-color="#ff3d7f"/></radialGradient></defs>
  <g${rund ? ' clip-path="url(#k)"' : ''}>
    <rect width="${S}" height="${S}" fill="url(#g)"/>
    ${strahlen(S / 2, S * 0.46, S, 28, '#ffd23f')}
    <circle cx="${S / 2}" cy="${S * 0.5}" r="${S * 0.36 * skala / 0.78}" fill="#fff1d0" stroke="${INK}" stroke-width="10"/>
    <g transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${(w / 120).toFixed(4)})">${maskottchen()}</g>
  </g>
  ${rund ? `<rect x="5" y="5" width="${S - 10}" height="${S - 10}" rx="108" fill="none" stroke="${INK}" stroke-width="10"/>` : ''}
</svg>`;
}
const dir = path.join(__dirname, '..', 'icons');
fs.writeFileSync(path.join(dir, 'icon.svg'), icon(0.78, true));
fs.writeFileSync(path.join(dir, 'icon-maskable.svg'), icon(0.6, false));
fs.writeFileSync(path.join(dir, 'icon-apple.svg'), icon(0.72, false));
console.log('SVG-Icons geschrieben.');
