// Draws the app icon (progress ring + check) and writes PNGs with no dependencies.
import { writeFileSync } from "node:fs";
import { deflateSync } from "node:zlib";

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc = (buf) => { let c = 0xffffffff; for (const b of buf) c = crcTable[(c ^ b) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const chunk = (type, data) => {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const c = Buffer.alloc(4); c.writeUInt32BE(crc(td));
  return Buffer.concat([len, td, c]);
};
const png = (w, h, rgb) => {
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) { raw[y * (w * 3 + 1)] = 0; rgb.copy(raw, y * (w * 3 + 1) + 1, y * w * 3, (y + 1) * w * 3); }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw, { level: 9 })), chunk("IEND", Buffer.alloc(0))]);
};
const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
const NAVY = [11, 16, 42], NAVY2 = [24, 32, 70], PURPLE = [120, 95, 250], TEAL = [27, 213, 173], TRACK = [30, 42, 78];

function segDist(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay, t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}
function shade(x, y) { // x,y in 0..1
  const cx = 0.5, cy = 0.5, r = Math.hypot(x - cx, y - cy);
  let col = mix(NAVY2, NAVY, Math.min(1, Math.hypot(x - 0.3, y - 0.25) / 0.9));
  const R = 0.3, W = 0.075;
  if (Math.abs(r - R) < W / 2) {
    let ang = Math.atan2(x - cx, -(y - cy)); if (ang < 0) ang += 2 * Math.PI; // 0 at top, clockwise
    const frac = ang / (2 * Math.PI);
    col = frac < 0.78 ? mix(PURPLE, TEAL, frac / 0.78) : TRACK;
  }
  // rounded cap at the ring's end
  const endA = 0.78 * 2 * Math.PI, ex = cx + R * Math.sin(endA), ey = cy - R * Math.cos(endA);
  if (Math.hypot(x - ex, y - ey) < W / 2) col = TEAL;
  if (Math.hypot(x - cx, y - (cy - R)) < W / 2) col = PURPLE;
  // check mark
  const d = Math.min(segDist(x, y, 0.385, 0.51, 0.47, 0.595), segDist(x, y, 0.47, 0.595, 0.625, 0.425));
  if (d < 0.034) col = [255, 255, 255];
  return col;
}
function render(size) {
  const buf = Buffer.alloc(size * size * 3), S = 3;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    let acc = [0, 0, 0];
    for (let sy = 0; sy < S; sy++) for (let sx = 0; sx < S; sx++) {
      const c = shade((x + (sx + 0.5) / S) / size, (y + (sy + 0.5) / S) / size);
      acc = acc.map((v, i) => v + c[i]);
    }
    const o = (y * size + x) * 3;
    buf[o] = Math.round(acc[0] / (S * S)); buf[o + 1] = Math.round(acc[1] / (S * S)); buf[o + 2] = Math.round(acc[2] / (S * S));
  }
  return png(size, size, buf);
}
writeFileSync("public/icons/apple-touch-icon.png", render(180));
writeFileSync("public/icons/icon-192.png", render(192));
writeFileSync("public/icons/icon-512.png", render(512));
console.log("icons written");
