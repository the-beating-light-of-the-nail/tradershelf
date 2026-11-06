// TraderShelf og.png generator — zero-dependency PNG writer (node:zlib only).
// Draws: dark bg + faint grid, "TraderShelf" in a 3x5 pixel font, shelf books + candles.
// Usage: node scripts/gen-og.mjs   →  public/og.png (1200x630)
import { deflateSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const W = 1200, H = 630;
const px = Buffer.alloc(W * H * 3);

const BG = [11, 15, 20];
const GRID = [22, 28, 37];
const TEAL = [45, 212, 191];
const WHITE = [231, 237, 243];
const GOLD = [251, 191, 36];
const GRAY = [139, 152, 168];
const GREEN = [52, 211, 153];
const RED = [248, 113, 113];

function set(x, y, c) {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const i = (y * W + x) * 3;
  px[i] = c[0]; px[i + 1] = c[1]; px[i + 2] = c[2];
}
function rect(x0, y0, w, h, c) {
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) set(x, y, c);
}

// 3x5 pixel font — only the glyphs we need
const FONT = {
  T: [7, 2, 2, 2, 2],
  R: [6, 5, 6, 5, 5],
  A: [2, 5, 7, 5, 5],
  D: [6, 5, 5, 5, 6],
  E: [7, 4, 6, 4, 7],
  S: [3, 4, 2, 1, 6],
  H: [5, 5, 7, 5, 5],
  L: [4, 4, 4, 4, 7],
  F: [7, 4, 6, 4, 4],
};
function drawText(str, x0, y0, scale, c) {
  let x = x0;
  for (const ch of str) {
    const g = FONT[ch.toUpperCase()];
    if (g) {
      for (let row = 0; row < 5; row++) {
        for (let col = 0; col < 3; col++) {
          if (g[row] & (4 >> col)) rect(x + col * scale, y0 + row * scale, scale, scale, c);
        }
      }
    }
    x += 4 * scale; // 3 cols + 1 letter-spacing
  }
}

// ---- paint ----
rect(0, 0, W, H, BG);
// faint 80px grid
for (let gx = 0; gx <= W; gx += 80) rect(gx, 0, 1, H, GRID);
for (let gy = 0; gy <= H; gy += 80) rect(0, gy, W, 1, GRID);

// title "TraderShelf": 11 glyphs, 4 units wide each → 43 units, scale 16 → 688 px
const scale = 16, titleW = (11 * 4 - 1) * scale;
drawText('TraderShelf', Math.floor((W - titleW) / 2), 170, scale, WHITE);
// accent underline
rect(Math.floor((W - titleW) / 2), 170 + 5 * scale + 18, titleW, 6, TEAL);

// shelf composition (bottom third)
const sx = 330, sy = 430;
// books (x, w, htop) sitting on a board at y=560
rect(sx, 560 - 120, 52, 120, TEAL);
rect(sx + 64, 560 - 100, 52, 100, WHITE);
rect(sx + 128, 560 - 132, 52, 132, GOLD);
// shelf board
rect(sx - 30, 560, 560, 14, GRAY);
// green candle below shelf
rect(560, 588, 16, 34, GREEN);
rect(566, 578, 4, 60, GREEN);
// red candle
rect(700, 594, 16, 28, RED);
rect(706, 584, 4, 52, RED);

// ---- PNG encode ----
const raw = Buffer.alloc((W * 3 + 1) * H);
for (let y = 0; y < H; y++) {
  raw[y * (W * 3 + 1)] = 0; // filter: none
  px.copy(raw, y * (W * 3 + 1) + 1, y * W * 3, (y + 1) * W * 3);
}
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(W, 0);
ihdr.writeUInt32BE(H, 4);
ihdr[8] = 8; ihdr[9] = 2; // 8-bit, truecolor RGB
const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk('IHDR', ihdr),
  chunk('IDAT', deflateSync(raw, { level: 9 })),
  chunk('IEND', Buffer.alloc(0)),
]);

const out = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'og.png');
writeFileSync(out, png);
console.log('wrote', out, png.length, 'bytes');
