// Lädt die Daten- und Logik-Teile aus index.html in eine Node-VM (ohne DOM).
// So lassen sich Generator, XP und Prognose automatisch testen.
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function ladeApp(optionen = {}) {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const teile = optionen.teile || ['daten', 'logik'];
  const re = /<script data-teil="([a-z]+)">([\s\S]*?)<\/script>/g;
  const kontext = vm.createContext({ console, Math, Date, JSON, Object, Array, Number, String, Set, Map,
    Int8Array, Int16Array, Uint8Array, Float64Array, Infinity, NaN, isNaN, parseFloat, parseInt, Error });
  kontext.globalThis = kontext;
  let m;
  while ((m = re.exec(html))) {
    if (!teile.includes(m[1])) continue;
    new vm.Script(m[2], { filename: 'index.html#' + m[1] }).runInContext(kontext);
  }
  // Top-level const/let sind nicht automatisch Eigenschaften – per Ausdruck herausholen
  return new Proxy({}, {
    get(_, name) { return vm.runInContext(String(name), kontext); },
  });
}
module.exports = { ladeApp };
