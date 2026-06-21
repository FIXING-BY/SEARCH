#!/usr/bin/env node
// ╔══════════════════════════════════════════════════════╗
//  Qono Secure V4 — HTML Şifreleme Aracı
//  Kullanım: node encrypt_tool.js <input.html>
//  Çıktı:    zzz.secure | zzz.secures | v4.datables
// ╚══════════════════════════════════════════════════════╝
'use strict';
const crypto = require('crypto');
const fs     = require('fs');
const path   = require('path');

function aesEncrypt(data, key, iv) {
  const c = crypto.createCipheriv('aes-256-cbc', key, iv);
  return c.update(data,'utf8','base64') + c.final('base64');
}
function xorObfuscate(str, key) {
  let r = '';
  for (let i = 0; i < str.length; i++)
    r += String.fromCharCode(str.charCodeAt(i) ^ key.charCodeAt(i % key.length));
  return Buffer.from(r,'binary').toString('base64');
}
function shuffleBase64(str, seed) {
  const ch = str.split('');
  let s = seed;
  for (let i = ch.length-1; i>0; i--) {
    s = (s*1664525 + 1013904223) & 0xFFFFFFFF;
    const j = Math.abs(s) % (i+1);
    [ch[i],ch[j]] = [ch[j],ch[i]];
  }
  return ch.join('');
}

const inputFile = process.argv[2];
if (!inputFile) { console.error('Kullanım: node encrypt_tool.js <input.html>'); process.exit(1); }

const htmlContent = fs.readFileSync(inputFile, 'utf8');
const outDir      = path.dirname(path.resolve(inputFile));

console.log('\n╔══════════════════════════════╗');
console.log('║  Qono Secure V4 — Encrypting ║');
console.log('╚══════════════════════════════╝\n');

// Anahtar üret
const aesKey = crypto.randomBytes(32);
const aesIV  = crypto.randomBytes(16);
const xorKey = crypto.randomBytes(32).toString('hex');
const seed   = Math.floor(Math.random() * 0x7FFFFFFF);

// 3 katman şifrele
const layer1 = aesEncrypt(htmlContent, aesKey, aesIV);
const layer2 = xorObfuscate(layer1, xorKey);
const layer3 = shuffleBase64(layer2, seed);

// İkiye böl
const sp    = Math.floor(layer3.length * (0.45 + Math.random()*0.1));
const part1 = layer3.substring(0, sp);
const part2 = layer3.substring(sp);

// Anahtar paketi — browser-readable obfuscation
const keyData = JSON.stringify({ k1: aesKey.toString('hex'), iv: aesIV.toString('hex'), k2: xorKey, seed, split: sp });
const keyB64  = Buffer.from(keyData).toString('base64');
const keyRev  = keyB64.split('').reverse().join('');

const datables =
`// Qono Secure V4 — Key Store
// ██ Do not edit or share this file ██
// ████████████████████████████████████
const _Q4=(()=>{const _r=${JSON.stringify(keyRev)};return JSON.parse(atob(_r.split('').reverse().join('')));})();`;

// Kaydet
fs.writeFileSync(path.join(outDir,'zzz.secure'),  part1);
fs.writeFileSync(path.join(outDir,'zzz.secures'), part2);
fs.writeFileSync(path.join(outDir,'v4.datables'), datables);

const chk = crypto.createHash('sha256').update(htmlContent).digest('hex').substring(0,16);
console.log(`[✓] AES-256-CBC  →  katman 1`);
console.log(`[✓] XOR-32       →  katman 2`);
console.log(`[✓] Base64Shuffle→  katman 3`);
console.log(`[✓] İkiye bölündü: ${part1.length} + ${part2.length} karakter`);
console.log(`\n[i] Checksum : ${chk}`);
console.log(`[i] Çıktı klasörü: ${outDir}\n`);
console.log('Dosyalar:');
console.log(`  zzz.secure   (${part1.length} B)`);
console.log(`  zzz.secures  (${part2.length} B)`);
console.log(`  v4.datables`);
console.log('\n✅ Tamamlandı! index.html ile aynı klasöre koy.\n');
