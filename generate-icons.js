/**
 * generate-icons.js
 * Creates all required PWA icon PNGs using only the Canvas API in Node.
 * No external dependencies needed.
 */

const fs = require('fs');
const path = require('path');
const { createCanvas } = require('canvas');

const iconsDir = path.join(__dirname, 'icons');
if (!fs.existsSync(iconsDir)) fs.mkdirSync(iconsDir);

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

function drawIcon(size) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.46;
  const pad = size * 0.12;

  // Background rounded rect
  ctx.fillStyle = '#131722';
  ctx.beginPath();
  ctx.roundRect(0, 0, size, size, size * 0.22);
  ctx.fill();

  // Outer glow ring
  const grd = ctx.createRadialGradient(cx, cy, r * 0.3, cx, cy, r);
  grd.addColorStop(0, 'rgba(56, 189, 248, 0.18)');
  grd.addColorStop(1, 'rgba(56, 189, 248, 0)');
  ctx.fillStyle = grd;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 1.1, 0, Math.PI * 2);
  ctx.fill();

  // Clock circle track
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = size * 0.07;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(cx, cy, r, -Math.PI / 2, Math.PI * 1.5);
  ctx.stroke();

  // Progress arc (teal primary color)
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = size * 0.07;
  ctx.shadowColor = '#38bdf8';
  ctx.shadowBlur = size * 0.06;
  ctx.beginPath();
  ctx.arc(cx, cy, r, -Math.PI / 2, Math.PI * 0.8);
  ctx.stroke();
  ctx.shadowBlur = 0;

  // Center SP text
  ctx.fillStyle = '#f1f5f9';
  ctx.font = `bold ${size * 0.26}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('SP', cx, cy + size * 0.01);

  // Small pulse dot
  ctx.fillStyle = '#38bdf8';
  ctx.shadowColor = '#38bdf8';
  ctx.shadowBlur = size * 0.04;
  ctx.beginPath();
  ctx.arc(cx + r * Math.cos(Math.PI * 0.8 - Math.PI / 2),
          cy + r * Math.sin(Math.PI * 0.8 - Math.PI / 2),
          size * 0.038, 0, Math.PI * 2);
  ctx.fill();

  return canvas.toBuffer('image/png');
}

sizes.forEach((size) => {
  try {
    const buf = drawIcon(size);
    const file = path.join(iconsDir, `icon-${size}.png`);
    fs.writeFileSync(file, buf);
    console.log(`✓ icon-${size}.png`);
  } catch (e) {
    console.error(`✗ icon-${size}.png:`, e.message);
  }
});
console.log('Done!');
