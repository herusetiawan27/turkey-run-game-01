// All drawing. Flat vector shapes on canvas: a three-yard farm the turkey runs
// through, the turkey and the farmer as simple articulated figures, and the
// HUD and screens laid over the world. Scenery placement is a pure function of
// distance (hash-based), so any frame of a run renders identically every time.

import { VIEW, WORLD, ZONES, zoneIndexAt } from './config.js';
import { hash01 } from './random.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_CAUGHT = 'caught';
export const SCREEN_ESCAPED = 'escaped';

export const TX = 250; // the turkey's screen x; the world scrolls past it

const toScreenX = (world, wx) => wx - world.distancePx + TX;

function lerpColor(a, b, t) {
  const pa = [1, 3, 5].map((i) => parseInt(a.substr(i, 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.substr(i, 2), 16));
  return `rgb(${pa.map((v, i) => Math.round(v + (pb[i] - v) * t)).join(',')})`;
}

function zoneBlend(world) {
  const m = world.meters;
  const zi = zoneIndexAt(m);
  const z = ZONES[zi];
  if (zi === ZONES.length - 1) return { ...z, t: 0, next: z };
  const spanStart = zi === 0 ? 0 : ZONES[zi - 1].until;
  const frac = (m - (z.until - 60)) / 60;
  const t = Math.max(0, Math.min(1, frac));
  void spanStart;
  return { ...z, t, next: ZONES[zi + 1] };
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// ---- scenery --------------------------------------------------------------

function drawSky(ctx, world) {
  const zb = zoneBlend(world);
  const grad = ctx.createLinearGradient(0, 0, 0, WORLD.groundY);
  grad.addColorStop(0, lerpColor(zb.skyTop, zb.next.skyTop, zb.t));
  grad.addColorStop(1, lerpColor(zb.skyBottom, zb.next.skyBottom, zb.t));
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);

  // Sun.
  ctx.fillStyle = 'rgba(255, 236, 170, 0.9)';
  ctx.beginPath();
  ctx.arc(830, 78, 34, 0, 6.29);
  ctx.fill();
  ctx.fillStyle = 'rgba(255, 244, 200, 0.35)';
  ctx.beginPath();
  ctx.arc(830, 78, 52, 0, 6.29);
  ctx.fill();

  // Clouds drift at a tenth of run speed.
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  const spacing = 340;
  const off = (world.distancePx * 0.1) % spacing;
  for (let i = -1; i < 4; i += 1) {
    const idx = Math.floor(world.distancePx * 0.1 / spacing) + i;
    const cx = idx * spacing - world.distancePx * 0.1 + hash01(idx) * 120 + 60;
    const cy = 46 + hash01(idx * 3) * 70;
    void off;
    ctx.beginPath();
    ctx.ellipse(cx, cy, 44, 15, 0, 0, 6.29);
    ctx.ellipse(cx + 30, cy + 4, 32, 12, 0, 0, 6.29);
    ctx.ellipse(cx - 32, cy + 5, 28, 11, 0, 0, 6.29);
    ctx.fill();
  }
}

function drawFarLayer(ctx, world) {
  const zb = zoneBlend(world);
  ctx.fillStyle = lerpColor(zb.hill, zb.next.hill, zb.t);
  ctx.beginPath();
  ctx.moveTo(0, WORLD.groundY);
  const par = world.distancePx * 0.3;
  for (let x = 0; x <= VIEW.width; x += 40) {
    const wx = x + par;
    ctx.lineTo(x, WORLD.groundY - 120 - Math.sin(wx * 0.004) * 26 - Math.sin(wx * 0.0013) * 18);
  }
  ctx.lineTo(VIEW.width, WORLD.groundY);
  ctx.closePath();
  ctx.fill();

  // Landmark silhouettes per zone, repeating along the track.
  const zone = world.zone;
  const spacing = 620;
  const base = Math.floor((world.distancePx * 0.3) / spacing);
  for (let i = -1; i < 3; i += 1) {
    const idx = base + i;
    const x = idx * spacing - world.distancePx * 0.3 + hash01(idx * 7) * 160;
    const gy = WORLD.groundY - 96 - Math.sin((x + world.distancePx * 0.3) * 0.004) * 20;
    ctx.fillStyle = 'rgba(90, 60, 40, 0.55)';
    if (zone === 0) {
      // Barn and silo.
      ctx.fillRect(x, gy - 64, 110, 64);
      ctx.beginPath();
      ctx.moveTo(x - 8, gy - 64);
      ctx.lineTo(x + 55, gy - 96);
      ctx.lineTo(x + 118, gy - 64);
      ctx.closePath();
      ctx.fill();
      ctx.fillRect(x + 128, gy - 88, 26, 88);
      ctx.beginPath();
      ctx.arc(x + 141, gy - 88, 13, 3.14, 0);
      ctx.fill();
    } else if (zone === 1) {
      // Distant corn rows: soft vertical strokes.
      ctx.fillStyle = 'rgba(90, 130, 60, 0.5)';
      for (let c = 0; c < 9; c += 1) ctx.fillRect(x + c * 22, gy - 52 - hash01(idx * 31 + c) * 22, 7, 74);
    } else {
      // The farmhouse kitchen, chimneys smoking.
      ctx.fillRect(x, gy - 58, 130, 58);
      ctx.beginPath();
      ctx.moveTo(x - 8, gy - 58);
      ctx.lineTo(x + 65, gy - 88);
      ctx.lineTo(x + 138, gy - 58);
      ctx.closePath();
      ctx.fill();
      ctx.fillRect(x + 92, gy - 96, 14, 30);
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.beginPath();
      ctx.ellipse(x + 99, gy - 108, 10, 6, 0, 0, 6.29);
      ctx.ellipse(x + 108, gy - 120, 13, 8, 0, 0, 6.29);
      ctx.fill();
    }
  }
}

function drawMidLayer(ctx, world) {
  const g = WORLD.groundY;
  const zone = world.zone;
  const spacing = zone === 1 ? 46 : 92;
  const par = world.distancePx * 0.62;
  const base = Math.floor(par / spacing);
  for (let i = -1; i < VIEW.width / spacing + 2; i += 1) {
    const idx = base + i;
    const x = idx * spacing - par;
    if (zone === 1) {
      // Corn stalks.
      const h = 74 + hash01(idx * 13) * 26;
      ctx.strokeStyle = '#5d8f3e';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(x, g);
      ctx.quadraticCurveTo(x + 4, g - h * 0.6, x + (hash01(idx) - 0.5) * 10, g - h);
      ctx.stroke();
      ctx.fillStyle = '#e9c46a';
      ctx.beginPath();
      ctx.ellipse(x + 5, g - h * 0.55, 5, 10, 0.5, 0, 6.29);
      ctx.fill();
    } else {
      // Fence posts with a rail.
      ctx.fillStyle = zone === 2 ? '#8a5a33' : '#9c6b3f';
      ctx.fillRect(x, g - 44, 9, 44);
      ctx.fillRect(x - spacing / 2, g - 38, spacing, 6);
      ctx.fillRect(x - spacing / 2, g - 18, spacing, 6);
    }
  }
}

function drawGround(ctx, world) {
  const g = WORLD.groundY;
  const zone = world.zone;
  ctx.fillStyle = zone === 2 ? '#b07a45' : '#c99a5b';
  ctx.fillRect(0, g, VIEW.width, VIEW.height - g);
  ctx.fillStyle = zone === 2 ? '#96622f' : '#a87c40';
  ctx.fillRect(0, g, VIEW.width, 7);
  // Texture dashes scrolling at full speed.
  ctx.fillStyle = 'rgba(90, 60, 25, 0.35)';
  const spacing = 56;
  const off = world.distancePx % spacing;
  for (let x = -off; x < VIEW.width; x += spacing) {
    const idx = Math.floor((world.distancePx + x) / spacing);
    ctx.fillRect(x + hash01(idx) * 20, g + 16 + hash01(idx * 3) * 52, 16, 4);
  }
  // Zone name signpost at each boundary the turkey passes.
  for (let zi = 1; zi < ZONES.length; zi += 1) {
    const wx = ZONES[zi - 1].until * WORLD.pxPerMeter;
    const sx = toScreenX(world, wx);
    if (sx > -160 && sx < VIEW.width + 40) drawSignpost(ctx, sx, ZONES[zi].name);
  }
  // The freedom gate near the end of the track.
  const gateX = toScreenX(world, world.goalPx);
  if (gateX > -220 && gateX < VIEW.width + 220) drawGate(ctx, gateX);
}

function drawSignpost(ctx, x, text) {
  const g = WORLD.groundY;
  ctx.fillStyle = '#7a4f26';
  ctx.fillRect(x, g - 92, 8, 92);
  ctx.fillStyle = '#a9713f';
  roundRect(ctx, x - 52, g - 118, 118, 30, 5);
  ctx.fill();
  ctx.fillStyle = '#fff7e0';
  ctx.font = 'bold 15px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(text, x + 7, g - 98);
}

function drawGate(ctx, x) {
  const g = WORLD.groundY;
  ctx.fillStyle = '#5d8f3e';
  ctx.fillRect(x + 90, g - 190, VIEW.width, 190); // the woods beyond
  ctx.fillStyle = '#4a7432';
  for (let i = 0; i < 5; i += 1) {
    ctx.beginPath();
    ctx.ellipse(x + 130 + i * 46, g - 170 + (i % 2) * 22, 30, 42, 0, 0, 6.29);
    ctx.fill();
  }
  ctx.fillStyle = '#7a4f26';
  ctx.fillRect(x - 8, g - 168, 12, 168);
  ctx.fillRect(x + 92, g - 168, 12, 168);
  ctx.fillRect(x - 14, g - 178, 124, 14);
  // Bunting.
  const cols = ['#e76f51', '#f4a261', '#e9c46a', '#2a9d8f'];
  for (let i = 0; i < 6; i += 1) {
    ctx.fillStyle = cols[i % 4];
    ctx.beginPath();
    ctx.moveTo(x - 8 + i * 19, g - 164);
    ctx.lineTo(x + 11 + i * 19, g - 164);
    ctx.lineTo(x + 2 + i * 19, g - 146);
    ctx.closePath();
    ctx.fill();
  }
  ctx.fillStyle = '#fff7e0';
  ctx.font = 'bold 17px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('FREEDOM', x + 48, g - 186 + 0);
  ctx.fillStyle = '#264653';
  roundRect(ctx, x - 2, g - 208, 104, 24, 5);
  ctx.fill();
  ctx.fillStyle = '#fff7e0';
  ctx.fillText('FREEDOM', x + 50, g - 191);
}

// ---- entities ---------------------------------------------------------------

function drawCorn(ctx, x, y, golden) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = golden ? '#ffd94d' : '#f2c230';
  ctx.beginPath();
  ctx.ellipse(0, 0, 8, 15, 0.35, 0, 6.29);
  ctx.fill();
  ctx.strokeStyle = golden ? '#c9930a' : '#c9930a';
  ctx.lineWidth = 1.4;
  for (let i = -1; i <= 1; i += 1) {
    ctx.beginPath();
    ctx.moveTo(-6, i * 7);
    ctx.lineTo(6, i * 7 - 3);
    ctx.stroke();
  }
  ctx.fillStyle = '#5d8f3e';
  ctx.beginPath();
  ctx.ellipse(-8, 9, 4, 9, -0.7, 0, 6.29);
  ctx.ellipse(8, 9, 4, 9, 0.7, 0, 6.29);
  ctx.fill();
  if (golden) {
    ctx.fillStyle = 'rgba(255, 217, 77, 0.3)';
    ctx.beginPath();
    ctx.arc(0, 0, 21, 0, 6.29);
    ctx.fill();
  }
  ctx.restore();
}

function drawObstacle(ctx, ob, sx) {
  const g = WORLD.groundY;
  ctx.save();
  ctx.translate(sx, g);
  if (ob.kind === 'fence') {
    ctx.fillStyle = '#a9713f';
    ctx.fillRect(0, -46, 8, 46);
    ctx.fillRect(38, -46, 8, 46);
    ctx.fillRect(-2, -40, 50, 8);
    ctx.fillRect(-2, -20, 50, 8);
    ctx.fillStyle = '#8a5a33';
    ctx.fillRect(-2, -40, 50, 3);
  } else if (ob.kind === 'hay') {
    ctx.fillStyle = '#e9c46a';
    roundRect(ctx, 0, -40, 54, 40, 9);
    ctx.fill();
    ctx.strokeStyle = '#c9930a';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(10, -40);
    ctx.lineTo(10, 0);
    ctx.moveTo(44, -40);
    ctx.lineTo(44, 0);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(160, 110, 20, 0.5)';
    ctx.lineWidth = 1.6;
    for (let i = 0; i < 4; i += 1) {
      ctx.beginPath();
      ctx.moveTo(4 + i * 12, -32);
      ctx.lineTo(10 + i * 12, -8);
      ctx.stroke();
    }
  } else if (ob.kind === 'stalk') {
    ctx.strokeStyle = '#4a7432';
    ctx.lineWidth = 6;
    for (let i = 0; i < 3; i += 1) {
      ctx.beginPath();
      ctx.moveTo(8 + i * 13, 0);
      ctx.quadraticCurveTo(12 + i * 13, -30, 6 + i * 13, -52);
      ctx.stroke();
    }
    ctx.fillStyle = '#f2c230';
    ctx.beginPath();
    ctx.ellipse(14, -34, 6, 12, 0.4, 0, 6.29);
    ctx.ellipse(28, -26, 6, 12, -0.3, 0, 6.29);
    ctx.fill();
  } else if (ob.kind === 'oven') {
    ctx.fillStyle = '#3d405b';
    roundRect(ctx, 0, -66, 66, 66, 6);
    ctx.fill();
    ctx.fillStyle = '#f4a261';
    roundRect(ctx, 12, -48, 42, 34, 5);
    ctx.fill();
    ctx.fillStyle = '#e76f51';
    ctx.beginPath();
    ctx.ellipse(33, -26, 10, 7, 0, 0, 6.29);
    ctx.fill();
    ctx.fillStyle = '#22223a';
    ctx.fillRect(28, -80, 10, 16);
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.beginPath();
    ctx.ellipse(33, -90, 7, 5, 0, 0, 6.29);
    ctx.ellipse(38, -100, 9, 6, 0, 0, 6.29);
    ctx.fill();
    ctx.fillStyle = '#ffd166';
    ctx.font = 'bold 10px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('HOT!', 33, -54);
  } else if (ob.kind === 'puddle') {
    ctx.fillStyle = 'rgba(70, 120, 180, 0.75)';
    ctx.beginPath();
    ctx.ellipse(37, -3, 38, 6, 0, 0, 6.29);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.beginPath();
    ctx.ellipse(26, -4, 12, 2.4, 0, 0, 6.29);
    ctx.fill();
  } else {
    // Duck bars: sign / scarecrow arms / hanging pan rail.
    ctx.fillStyle = '#7a4f26';
    ctx.fillRect(2, -86, 7, 86);
    ctx.fillRect(ob.w - 9, -86, 7, 86);
    if (ob.kind === 'sign') {
      ctx.fillStyle = '#b23a48';
      roundRect(ctx, -6, -86, ob.w + 12, 24, 5);
      ctx.fill();
      ctx.fillStyle = '#fff7e0';
      ctx.font = 'bold 12px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('FRESH TURKEYS', ob.w / 2, -70);
    } else if (ob.kind === 'scare') {
      ctx.fillStyle = '#8a5a33';
      ctx.fillRect(-4, -80, ob.w + 8, 8);
      ctx.fillStyle = '#e9c46a';
      for (let i = 0; i < 5; i += 1) ctx.fillRect(-2 + i * 11, -72, 4, 12);
      ctx.fillStyle = '#6c5849';
      ctx.beginPath();
      ctx.arc(ob.w / 2, -92, 10, 0, 6.29);
      ctx.fill();
    } else {
      ctx.fillStyle = '#555b6e';
      ctx.fillRect(-4, -84, ob.w + 8, 7);
      for (let i = 0; i < 3; i += 1) {
        ctx.fillStyle = '#2b2d42';
        ctx.beginPath();
        ctx.ellipse(10 + i * 21, -70, 10, 8, 0, 0, 6.29);
        ctx.fill();
        ctx.fillRect(8 + i * 21, -84, 4, 8);
      }
    }
  }
  ctx.restore();
}

function drawKnife(ctx, k, sx, world) {
  const g = WORLD.groundY;
  if (k.phase === 'warn') {
    const pulse = 0.6 + 0.4 * Math.sin(world.time * 18);
    ctx.fillStyle = `rgba(178, 58, 72, ${0.35 + 0.3 * pulse})`;
    ctx.beginPath();
    ctx.ellipse(sx, g - 2, 20, 5, 0, 0, 6.29);
    ctx.fill();
    ctx.fillStyle = '#b23a48';
    ctx.font = 'bold 16px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('!', sx, g - 14);
    return;
  }
  ctx.save();
  ctx.translate(sx, k.y);
  ctx.rotate(0.5);
  ctx.fillStyle = '#ced4da';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(9, -34);
  ctx.lineTo(16, 0);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#7a4f26';
  ctx.fillRect(4, -46, 8, 13);
  ctx.restore();
}

function drawFarmer(ctx, world) {
  const g = WORLD.groundY;
  const x = TX - 66 - world.gap * 2.1;
  if (x < -90) return;
  const phase = world.runPhase * 1.15;
  const bob = Math.abs(Math.sin(phase)) * 5;
  const y = g - bob;
  ctx.save();
  ctx.translate(x, y);
  // Legs (overalls + boots), pumping.
  ctx.strokeStyle = '#3a5a8c';
  ctx.lineWidth = 9;
  ctx.beginPath();
  ctx.moveTo(0, -34);
  ctx.lineTo(Math.sin(phase) * 15, -4);
  ctx.moveTo(0, -34);
  ctx.lineTo(Math.sin(phase + 3.14) * 15, -4);
  ctx.stroke();
  ctx.fillStyle = '#4a3220';
  ctx.fillRect(Math.sin(phase) * 15 - 7, -7, 13, 6);
  ctx.fillRect(Math.sin(phase + 3.14) * 15 - 7, -7, 13, 6);
  // Body: plaid shirt + overalls bib.
  ctx.fillStyle = '#b23a48';
  roundRect(ctx, -13, -66, 27, 36, 6);
  ctx.fill();
  ctx.fillStyle = '#3a5a8c';
  ctx.fillRect(-11, -48, 23, 20);
  // Arm reaching forward with a net.
  ctx.strokeStyle = '#b23a48';
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(8, -58);
  ctx.lineTo(30, -46 + Math.sin(phase * 2) * 3);
  ctx.stroke();
  ctx.strokeStyle = '#7a4f26';
  ctx.lineWidth = 3.4;
  ctx.beginPath();
  ctx.moveTo(30, -46);
  ctx.lineTo(52, -40);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(230,230,230,0.8)';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.ellipse(62, -40, 13, 16, 0.4, 0, 6.29);
  ctx.stroke();
  // Head + straw hat; angrier as he closes in.
  ctx.fillStyle = '#f2c29b';
  ctx.beginPath();
  ctx.arc(1, -76, 11, 0, 6.29);
  ctx.fill();
  ctx.fillStyle = '#e9c46a';
  ctx.fillRect(-13, -86, 29, 5);
  ctx.fillRect(-6, -94, 15, 9);
  ctx.fillStyle = '#222';
  const brow = world.gap < 40 ? 2 : 0;
  ctx.fillRect(-4, -79 + brow, 4, 2);
  ctx.fillRect(5, -79 - brow, 4, 2);
  ctx.restore();
}

function drawTurkey(ctx, world) {
  const feetY = world.turkeyY;
  const ducking = world.ducking;
  const airborne = !world.grounded;
  const phase = world.runPhase;
  ctx.save();
  ctx.translate(TX, feetY);
  if (world.stumbleTimer > 0) ctx.rotate(Math.sin(world.time * 40) * 0.06);

  const bodyY = ducking ? -20 : -27;
  // Legs.
  ctx.strokeStyle = '#e07a2f';
  ctx.lineWidth = 4;
  if (airborne) {
    ctx.beginPath();
    ctx.moveTo(-4, -12);
    ctx.lineTo(-10, -2);
    ctx.moveTo(6, -12);
    ctx.lineTo(12, -3);
    ctx.stroke();
  } else if (!ducking) {
    ctx.beginPath();
    ctx.moveTo(-4, -12);
    ctx.lineTo(Math.sin(phase) * 11, 0);
    ctx.moveTo(6, -12);
    ctx.lineTo(Math.sin(phase + 3.14) * 11, 0);
    ctx.stroke();
  }
  // Tail fan.
  ctx.fillStyle = '#8a5a33';
  for (let i = -2; i <= 2; i += 1) {
    ctx.save();
    ctx.translate(-20, bodyY + 2);
    ctx.rotate(i * 0.32 - 0.15);
    ctx.beginPath();
    ctx.ellipse(-13, 0, 14, 5.5, 0, 0, 6.29);
    ctx.fill();
    ctx.restore();
  }
  ctx.fillStyle = '#a9713f';
  for (let i = -1; i <= 1; i += 1) {
    ctx.save();
    ctx.translate(-19, bodyY + 2);
    ctx.rotate(i * 0.34 - 0.1);
    ctx.beginPath();
    ctx.ellipse(-11, 0, 12, 4.6, 0, 0, 6.29);
    ctx.fill();
    ctx.restore();
  }
  // Body.
  ctx.fillStyle = '#b07a45';
  ctx.beginPath();
  ctx.ellipse(0, bodyY, 25, 17, ducking ? 0.12 : -0.05, 0, 6.29);
  ctx.fill();
  ctx.fillStyle = '#c98d5f';
  ctx.beginPath();
  ctx.ellipse(3, bodyY + 3, 18, 12, 0, 0, 6.29);
  ctx.fill();
  // Wing: flaps hard while airborne.
  const flap = airborne ? Math.sin(world.time * 26) * 0.7 : Math.sin(phase * 2) * 0.12;
  ctx.save();
  ctx.translate(-2, bodyY - 2);
  ctx.rotate(-0.25 + flap);
  ctx.fillStyle = '#8a5a33';
  ctx.beginPath();
  ctx.ellipse(-6, 4, 15, 7, 0.5, 0, 6.29);
  ctx.fill();
  ctx.restore();
  // Neck and head.
  const headX = ducking ? 30 : 22;
  const headY = ducking ? -30 : -46;
  ctx.strokeStyle = '#7fb3d5';
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(14, bodyY - 8);
  ctx.quadraticCurveTo(headX - 4, (bodyY + headY) / 2, headX, headY + 6);
  ctx.stroke();
  ctx.fillStyle = '#aed6f1';
  ctx.beginPath();
  ctx.arc(headX, headY, 10, 0, 6.29);
  ctx.fill();
  // Beak + wattle.
  ctx.fillStyle = '#f2c230';
  ctx.beginPath();
  ctx.moveTo(headX + 8, headY - 2);
  ctx.lineTo(headX + 19, headY + 1);
  ctx.lineTo(headX + 8, headY + 4);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#d64550';
  ctx.beginPath();
  ctx.ellipse(headX + 6, headY + 7, 3.4, 6, 0.2, 0, 6.29);
  ctx.fill();
  // Eye: worried when the farmer is close.
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(headX + 3, headY - 3, 4.6, 0, 6.29);
  ctx.fill();
  ctx.fillStyle = '#222';
  ctx.beginPath();
  ctx.arc(headX + 4.4, headY - 3, 2.4, 0, 6.29);
  ctx.fill();
  if (world.gap < 35) {
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(headX - 2, headY - 10);
    ctx.lineTo(headX + 7, headY - 8);
    ctx.stroke();
  }
  ctx.restore();
}

function drawParticles(ctx, world) {
  for (const p of world.particles) {
    const a = 1 - p.age / p.life;
    const sx = toScreenX(world, p.x);
    if (p.kind === 'feather') {
      ctx.save();
      ctx.translate(sx, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = `rgba(240, 230, 210, ${a})`;
      ctx.beginPath();
      ctx.ellipse(0, 0, 6, 2.6, 0, 0, 6.29);
      ctx.fill();
      ctx.restore();
    } else if (p.kind === 'spark') {
      ctx.fillStyle = `rgba(255, 215, 64, ${a})`;
      ctx.fillRect(sx - 2, p.y - 2, 4, 4);
    } else {
      ctx.fillStyle = `rgba(190, 160, 120, ${a * 0.6})`;
      ctx.beginPath();
      ctx.arc(sx, p.y, 3.4 * a + 1, 0, 6.29);
      ctx.fill();
    }
  }
}

// ---- HUD and screens ---------------------------------------------------------

function drawHUD(ctx, world) {
  // Progress track with zone segments and the gate at the end.
  const x0 = 24;
  const x1 = VIEW.width - 24;
  const y = 18;
  ctx.fillStyle = 'rgba(20, 24, 38, 0.55)';
  roundRect(ctx, x0 - 8, y - 8, x1 - x0 + 16, 30, 9);
  ctx.fill();
  const cols = ['#7fb069', '#e9c46a', '#e76f51'];
  let segX = x0;
  for (let zi = 0; zi < 3; zi += 1) {
    const endM = zi === 2 ? WORLD.goalMeters : ZONES[zi].until;
    const startM = zi === 0 ? 0 : ZONES[zi - 1].until;
    const w = ((endM - startM) / WORLD.goalMeters) * (x1 - x0);
    ctx.fillStyle = cols[zi];
    ctx.fillRect(segX, y, w - 2, 8);
    segX += w;
  }
  const px = x0 + Math.min(1, world.meters / WORLD.goalMeters) * (x1 - x0);
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(px, y + 4, 6.4, 0, 6.29);
  ctx.fill();
  ctx.fillStyle = '#b07a45';
  ctx.beginPath();
  ctx.arc(px, y + 4, 4.4, 0, 6.29);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 13px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`${Math.floor(world.meters)} m / ${WORLD.goalMeters} m — ${ZONES[world.zone].name}`, x0, y + 36 + 8);

  // Score and corn, top-right under the track.
  ctx.textAlign = 'right';
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 21px system-ui, sans-serif';
  ctx.fillText(`SCORE ${world.score}`, x1, y + 44);
  ctx.font = 'bold 15px system-ui, sans-serif';
  ctx.fillStyle = '#ffd94d';
  ctx.fillText(`🌽 ${world.corn + world.golden}   ★ ${world.golden}`, x1, y + 66);

  // Farmer gap meter, bottom-left.
  const gx = 24;
  const gy = VIEW.height - 34;
  ctx.fillStyle = 'rgba(20, 24, 38, 0.55)';
  roundRect(ctx, gx - 8, gy - 20, 216, 42, 9);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 12px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('FARMER', gx, gy - 6);
  const frac = Math.max(0, world.gap / 100);
  ctx.fillStyle = frac > 0.45 ? '#7fb069' : frac > 0.22 ? '#e9c46a' : '#e63946';
  roundRect(ctx, gx + 62, gy - 16, 138 * frac, 10, 5);
  ctx.fill();
  if (world.gap < 30 && Math.sin(world.time * 10) > 0) {
    ctx.fillStyle = '#ff5964';
    ctx.font = 'bold 13px system-ui, sans-serif';
    ctx.fillText("HE'S RIGHT BEHIND YOU!", gx, gy + 16);
  }
  // Controls hint, bottom-right.
  ctx.textAlign = 'right';
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.font = '13px system-ui, sans-serif';
  ctx.fillText('SPACE jump ×2 flap · ↓ duck · P pause · T demo', VIEW.width - 24, VIEW.height - 16);
}

function panel(ctx, title, titleColor, lines) {
  ctx.fillStyle = 'rgba(16, 18, 30, 0.62)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  ctx.fillStyle = 'rgba(255, 250, 238, 0.97)';
  roundRect(ctx, VIEW.width / 2 - 300, 120, 600, 300, 18);
  ctx.fill();
  ctx.textAlign = 'center';
  ctx.fillStyle = titleColor;
  ctx.font = 'bold 54px system-ui, sans-serif';
  ctx.fillText(title, VIEW.width / 2, 208);
  ctx.fillStyle = '#33384d';
  ctx.font = '19px system-ui, sans-serif';
  lines.forEach((line, i) => ctx.fillText(line, VIEW.width / 2, 262 + i * 32));
}

export function drawScene(ctx, world, screen, best = 0) {
  drawSky(ctx, world);
  drawFarLayer(ctx, world);
  drawMidLayer(ctx, world);
  drawGround(ctx, world);
  for (const p of world.pickups) {
    if (p.taken) continue;
    const sx = toScreenX(world, p.x);
    if (sx < -30 || sx > VIEW.width + 30) continue;
    drawCorn(ctx, sx, WORLD.groundY - p.yOff, p.kind === 'golden');
  }
  for (const ob of world.obstacles) {
    const sx = toScreenX(world, ob.x);
    if (sx < -120 || sx > VIEW.width + 40) continue;
    drawObstacle(ctx, ob, sx);
  }
  for (const k of world.knives) {
    const sx = toScreenX(world, k.x);
    if (sx < -40 || sx > VIEW.width + 40) continue;
    drawKnife(ctx, k, sx, world);
  }
  drawFarmer(ctx, world);
  drawTurkey(ctx, world);
  drawParticles(ctx, world);

  if (screen === SCREEN_PLAY) {
    drawHUD(ctx, world);
    if (world.boostTimer > 0) {
      ctx.fillStyle = 'rgba(255, 217, 77, 0.12)';
      ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    }
  } else if (screen === SCREEN_TITLE) {
    ctx.fillStyle = 'rgba(20, 22, 40, 0.34)';
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fff7e0';
    ctx.font = 'bold 92px system-ui, sans-serif';
    ctx.strokeStyle = '#7a4f26';
    ctx.lineWidth = 10;
    ctx.strokeText('GOBBLE RUN', VIEW.width / 2, 168);
    ctx.fillText('GOBBLE RUN', VIEW.width / 2, 168);
    ctx.font = 'bold 25px system-ui, sans-serif';
    ctx.fillStyle = '#ffd94d';
    ctx.fillText('The Great Thanksgiving Escape', VIEW.width / 2, 208);
    ctx.font = '19px system-ui, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('Thanksgiving is coming — and you are NOT on the menu.', VIEW.width / 2, 262);
    ctx.fillText('Outrun the farmer across the Barnyard, the Cornfield and the Kitchen Yard.', VIEW.width / 2, 290);
    ctx.fillText('Reach the Freedom Gate at 1,200 m. Dodge the ovens. Mind the knives.', VIEW.width / 2, 318);
    ctx.font = 'bold 23px system-ui, sans-serif';
    ctx.fillStyle = '#ffd94d';
    const blink = Math.sin(world.time * 4) > -0.2;
    if (blink) ctx.fillText('Press SPACE or click to run!', VIEW.width / 2, 372);
    ctx.font = '16px system-ui, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.fillText('SPACE / ↑ jump — press again mid-air to flap · ↓ duck · P pause · M sound · T autopilot demo', VIEW.width / 2, 404);
    if (best > 0) ctx.fillText(`Best score so far: ${best}`, VIEW.width / 2, 432);
  } else if (screen === SCREEN_CAUGHT) {
    panel(ctx, 'CAUGHT!', '#b23a48', [
      'The farmer finally got his Thanksgiving dinner…',
      `You ran ${Math.floor(world.meters)} m of ${WORLD.goalMeters} m`,
      `Score ${world.score} · Corn ${world.corn} · Golden corn ${world.golden}`,
      '',
      'Press R or click to run again',
    ]);
  } else if (screen === SCREEN_ESCAPED) {
    panel(ctx, 'YOU ESCAPED!', '#2a7d4f', [
      'Through the Freedom Gate and into the woods — free!',
      `Full ${WORLD.goalMeters} m, with ${world.gap.toFixed(0)}% of a head start to spare`,
      `Score ${world.score} · Corn ${world.corn} · Golden corn ${world.golden}`,
      '',
      'Press R or click to run again',
    ]);
  }
}
