import * as THREE from 'three';

/**
 * Procedural canvas textures — no asset downloads, generated once at startup.
 * These carry most of the "next level" look: glowing sign faces, soft
 * particles, tiled floor with grime, caution stripes, coin emboss.
 */

function makeCanvas(w: number, h: number) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  return { canvas, ctx: canvas.getContext('2d')! };
}

function asTexture(canvas: HTMLCanvasElement, srgb = true): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  if (srgb) tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

const cache = new Map<string, THREE.CanvasTexture>();

/** Neon sign face: dark panel, tube border, glowing text with bloom-friendly core. */
export function neonSignTexture(text: string, color: string, sub?: string): THREE.CanvasTexture {
  const key = `sign:${text}:${color}:${sub ?? ''}`;
  const cached = cache.get(key);
  if (cached) return cached;

  const { canvas, ctx } = makeCanvas(512, 192);
  // panel
  const bg = ctx.createLinearGradient(0, 0, 0, 192);
  bg.addColorStop(0, '#171b25');
  bg.addColorStop(1, '#0b0e15');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 512, 192);
  // tube border
  ctx.strokeStyle = color;
  ctx.lineWidth = 5;
  ctx.shadowColor = color;
  ctx.shadowBlur = 22;
  ctx.strokeRect(14, 14, 484, 164);
  // text with layered glow
  const main = sub ? 96 : 104;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `900 ${sub ? 58 : 66}px 'Arial Black', 'Inter', sans-serif`;
  ctx.shadowBlur = 34;
  ctx.fillStyle = color;
  ctx.fillText(text, 256, main, 460);
  ctx.shadowBlur = 14;
  ctx.fillText(text, 256, main, 460);
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#ffffff';
  ctx.globalAlpha = 0.92;
  ctx.fillText(text, 256, main, 460);
  ctx.globalAlpha = 1;
  if (sub) {
    ctx.font = `700 26px 'Arial', sans-serif`;
    ctx.fillStyle = '#cfd8e3';
    ctx.shadowColor = color;
    ctx.shadowBlur = 8;
    ctx.fillText(sub, 256, 152, 420);
  }
  const tex = asTexture(canvas);
  cache.set(key, tex);
  return tex;
}

/** Soft radial sprite for particles (white core → transparent). */
export function softSpriteTexture(): THREE.CanvasTexture {
  const cached = cache.get('softSprite');
  if (cached) return cached;
  const { canvas, ctx } = makeCanvas(64, 64);
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.35, 'rgba(255,255,255,0.55)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  const tex = asTexture(canvas, false);
  cache.set('softSprite', tex);
  return tex;
}

/** Wide soft glow streak for sign halos and light pools. */
export function glowStreakTexture(): THREE.CanvasTexture {
  const cached = cache.get('glowStreak');
  if (cached) return cached;
  const { canvas, ctx } = makeCanvas(256, 128);
  const g = ctx.createRadialGradient(128, 64, 4, 128, 64, 120);
  g.addColorStop(0, 'rgba(255,255,255,0.9)');
  g.addColorStop(0.4, 'rgba(255,255,255,0.28)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.save();
  ctx.translate(128, 64);
  ctx.scale(1, 0.5);
  ctx.translate(-128, -64);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 128);
  ctx.restore();
  const tex = asTexture(canvas, false);
  cache.set('glowStreak', tex);
  return tex;
}

/** Dark kitchen floor tiles with grout and grime — tileable. */
export function floorTileTexture(): THREE.CanvasTexture {
  const cached = cache.get('floorTile');
  if (cached) return cached;
  const { canvas, ctx } = makeCanvas(256, 256);
  ctx.fillStyle = '#1d222c';
  ctx.fillRect(0, 0, 256, 256);
  // per-tile shading variation
  const tile = 64;
  for (let y = 0; y < 4; y += 1) {
    for (let x = 0; x < 4; x += 1) {
      const v = 0.92 + ((x * 7 + y * 13) % 5) * 0.035;
      ctx.fillStyle = `rgb(${Math.round(29 * v)}, ${Math.round(34 * v)}, ${Math.round(44 * v)})`;
      ctx.fillRect(x * tile + 2, y * tile + 2, tile - 4, tile - 4);
      // specular-ish top edge
      ctx.fillStyle = 'rgba(255,255,255,0.05)';
      ctx.fillRect(x * tile + 2, y * tile + 2, tile - 4, 3);
    }
  }
  // grout
  ctx.strokeStyle = '#0c0f15';
  ctx.lineWidth = 4;
  for (let i = 0; i <= 4; i += 1) {
    ctx.beginPath();
    ctx.moveTo(i * tile, 0);
    ctx.lineTo(i * tile, 256);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i * tile);
    ctx.lineTo(256, i * tile);
    ctx.stroke();
  }
  // grime speckle
  for (let i = 0; i < 320; i += 1) {
    const x = (i * 97) % 256;
    const y = (i * 53) % 256;
    ctx.fillStyle = i % 3 === 0 ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.03)';
    ctx.fillRect(x, y, 2, 2);
  }
  const tex = asTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  cache.set('floorTile', tex);
  return tex;
}

/** Yellow/black caution stripes (tileable horizontally). */
export function cautionStripeTexture(): THREE.CanvasTexture {
  const cached = cache.get('caution');
  if (cached) return cached;
  const { canvas, ctx } = makeCanvas(128, 64);
  ctx.fillStyle = '#10131a';
  ctx.fillRect(0, 0, 128, 64);
  ctx.fillStyle = '#ffc41f';
  for (let x = -64; x < 128; x += 32) {
    ctx.beginPath();
    ctx.moveTo(x, 64);
    ctx.lineTo(x + 32, 0);
    ctx.lineTo(x + 48, 0);
    ctx.lineTo(x + 16, 64);
    ctx.closePath();
    ctx.fill();
  }
  const tex = asTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  cache.set('caution', tex);
  return tex;
}

/** Gold coin face with embossed burger icon. */
export function coinFaceTexture(): THREE.CanvasTexture {
  const cached = cache.get('coinFace');
  if (cached) return cached;
  const { canvas, ctx } = makeCanvas(128, 128);
  // gold disc with radial shading
  const g = ctx.createRadialGradient(52, 44, 8, 64, 64, 64);
  g.addColorStop(0, '#ffe9a0');
  g.addColorStop(0.55, '#ffc842');
  g.addColorStop(1, '#d98a18');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(64, 64, 62, 0, Math.PI * 2);
  ctx.fill();
  // rim ring
  ctx.strokeStyle = '#fff3c4';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(64, 64, 54, 0, Math.PI * 2);
  ctx.stroke();
  // burger icon
  ctx.fillStyle = '#b96812';
  // top bun
  ctx.beginPath();
  ctx.ellipse(64, 52, 26, 14, 0, Math.PI, 0);
  ctx.fill();
  // patty
  ctx.fillRect(38, 58, 52, 8);
  // bottom bun
  ctx.beginPath();
  ctx.moveTo(40, 72);
  ctx.lineTo(88, 72);
  ctx.quadraticCurveTo(88, 82, 78, 82);
  ctx.lineTo(50, 82);
  ctx.quadraticCurveTo(40, 82, 40, 72);
  ctx.fill();
  // cheese drip
  ctx.fillStyle = '#a85a08';
  ctx.beginPath();
  ctx.moveTo(36, 56);
  ctx.lineTo(92, 56);
  ctx.lineTo(88, 62);
  ctx.lineTo(40, 62);
  ctx.closePath();
  ctx.fill();
  const tex = asTexture(canvas);
  cache.set('coinFace', tex);
  return tex;
}

/** Brushed metal with vertical streaks for counters/arches. */
export function brushedMetalTexture(): THREE.CanvasTexture {
  const cached = cache.get('brushed');
  if (cached) return cached;
  const { canvas, ctx } = makeCanvas(128, 128);
  ctx.fillStyle = '#2c3340';
  ctx.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 240; i += 1) {
    const x = (i * 53) % 128;
    const alpha = 0.025 + ((i * 31) % 8) * 0.008;
    ctx.fillStyle = i % 2 ? `rgba(255,255,255,${alpha})` : `rgba(0,0,0,${alpha * 1.4})`;
    ctx.fillRect(x, 0, 1, 128);
  }
  const tex = asTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  cache.set('brushed', tex);
  return tex;
}
