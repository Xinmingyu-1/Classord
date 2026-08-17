// 生成 Classord 应用图标（纯 Node，无第三方依赖，仅用内置 zlib）。
// 设计：黑底 + 白色加粗「C」字标（圆角开口的几何环，象征 Classord）。
// 用法：node scripts/generate-icon.mjs
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'assets', 'images');

const WHITE = [255, 255, 255];
const BLACK = [0, 0, 0];

// 字标参数（归一化 0..1）：外半径 Ro、描边粗细 t、开口半角 theta。
// 黑色背景、白色 C，右侧开口（约 67°）。
const GLYPH = { Ro: 0.3, t: 0.1, theta: Math.PI / 4 };

/** 字母「C」的有符号距离场：圆环 + 右侧开口，两端用圆帽收尾。 */
function sdC(px, py, cx, cy, rm, thick, theta) {
  const dx = px - cx;
  const dy = py - cy;
  const rho = Math.hypot(dx, dy);
  const phi = Math.atan2(dy, dx); // 0 = 右侧（+x），C 开口朝右
  const dRing = Math.abs(rho - rm) - thick / 2;
  if (Math.abs(phi) < theta) {
    // 开口区：只保留两个圆帽（round cap）
    const capX = cx + rm * Math.cos(theta);
    const capY1 = cy - rm * Math.sin(theta);
    const capY2 = cy + rm * Math.sin(theta);
    const d1 = Math.hypot(px - capX, py - capY1) - thick / 2;
    const d2 = Math.hypot(px - capX, py - capY2) - thick / 2;
    return Math.min(d1, d2);
  }
  return dRing;
}

/**
 * 渲染一张 RGBA 位图。
 * @param scale 相对居中缩放（自适应前景需缩小到中央安全圈内）
 * @param bg 'black' 黑底 / 'none' 透明底
 * @param colorize 字标颜色（默认白，monochrome 用黑）
 * @param glyph 是否绘制字标（背景层传 false）
 */
function render(size, { scale = 1, bg = 'black', colorize = WHITE, glyph = true } = {}) {
  const buf = Buffer.alloc(size * size * 4);
  const cx = size / 2;
  const cy = size / 2;
  const rm = (GLYPH.Ro - GLYPH.t / 2) * scale * size;
  const thick = GLYPH.t * scale * size;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const cov = glyph
        ? Math.max(0, Math.min(1, 0.5 - sdC(x + 0.5, y + 0.5, cx, cy, rm, thick, GLYPH.theta)))
        : 0;
      const i = (y * size + x) * 4;
      if (bg === 'black') {
        buf[i] = Math.round(cov * colorize[0]);
        buf[i + 1] = Math.round(cov * colorize[1]);
        buf[i + 2] = Math.round(cov * colorize[2]);
        buf[i + 3] = 255;
      } else {
        buf[i] = colorize[0];
        buf[i + 1] = colorize[1];
        buf[i + 2] = colorize[2];
        buf[i + 3] = Math.round(cov * 255);
      }
    }
  }
  return encodePNG(size, size, buf);
}

const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = (c >>> 8) ^ CRC_TABLE[(c ^ buf[i]) & 0xff];
  return (c ^ -1) >>> 0;
}

function chunk(type, data) {
  const out = Buffer.alloc(8 + data.length + 4);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, 'ascii');
  data.copy(out, 8);
  out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length);
  return out;
}

function encodePNG(width, height, rgba) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0; // filter: none
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, 'icon.png'), render(1024, { scale: 1, bg: 'black' }));
writeFileSync(join(OUT, 'android-icon-background.png'), render(1024, { bg: 'black', glyph: false }));
writeFileSync(join(OUT, 'android-icon-foreground.png'), render(1024, { bg: 'none', scale: 0.82 }));
writeFileSync(join(OUT, 'android-icon-monochrome.png'), render(1024, { bg: 'none', scale: 0.82, colorize: BLACK }));
writeFileSync(join(OUT, 'favicon.png'), render(48, { scale: 1, bg: 'black' }));
writeFileSync(join(OUT, 'splash-icon.png'), render(256, { bg: 'none', scale: 1 }));

console.log('已生成图标文件 →', OUT);
