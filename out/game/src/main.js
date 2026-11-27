// Gobble Run — boot and game loop. Three modes:
//   normal play   title -> run -> caught/escaped, keyboard + mouse
//   ?demo=1       the autopilot plays (optionally &goal=<meters> to shorten)
//   ?shot=<name>  one deterministic scene, rendered still, for screenshots
//                 (see shots.json in the repository root)

import { VIEW, WORLD } from './config.js';
import { World, EV } from './world.js';
import { Input } from './input.js';
import { SoundFX } from './audio.js';
import { drawScene, SCREEN_CAUGHT, SCREEN_ESCAPED, SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import { autopilotInput, stageShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
canvas.width = VIEW.width;
canvas.height = VIEW.height;

const params = new URLSearchParams(location.search);
const statusEl = document.getElementById('status');

function loadBest() {
  try { return Number(localStorage.getItem('gobble-run-best') || 0) || 0; } catch { return 0; }
}
function saveBest(v) {
  try { localStorage.setItem('gobble-run-best', String(v)); } catch { /* private mode */ }
}

const sfx = new SoundFX();
let best = loadBest();

// ---- screenshot mode ---------------------------------------------------------

if (params.has('shot')) {
  const seed = Number(params.get('seed') || 1) || 1;
  const { world, screen } = stageShot(params.get('shot'), seed);
  drawScene(ctx, world, screen, best);
  statusEl.textContent = `Gobble Run screenshot scene: ${params.get('shot')}`;
} else {
  // ---- live game -------------------------------------------------------------
  const input = new Input(canvas);
  const demo = params.has('demo');
  let world = new World(1 + Math.floor(Math.random() * 100000));
  if (demo && params.has('goal')) {
    const g = Number(params.get('goal'));
    if (g > 0) world.goalPx = g * WORLD.pxPerMeter;
  }
  let screen = demo ? SCREEN_PLAY : SCREEN_TITLE;
  let paused = false;
  let demoOn = demo;
  let last = performance.now();
  let acc = 0;
  const STEP = 1 / 60;
  let gobbleTimer = 3;

  function startRun() {
    world = new World(1 + Math.floor(Math.random() * 100000));
    screen = SCREEN_PLAY;
    paused = false;
    sfx.ensure();
    sfx.gobble();
  }

  function playEvents(ev) {
    if (ev & EV.JUMP) sfx.jump();
    if (ev & EV.FLAP) sfx.flap();
    if (ev & EV.CORN) sfx.corn();
    if (ev & EV.GOLDEN) sfx.golden();
    if (ev & EV.STUMBLE) sfx.stumble();
    if (ev & EV.PUDDLE) sfx.puddle();
    if (ev & EV.KNIFE_FALL) sfx.knifeWhistle();
    if (ev & EV.KNIFE_LAND) sfx.clang();
    if (ev & EV.ESCAPED) { sfx.win(); if (world.score > best) { best = world.score; saveBest(best); } }
    if (ev & EV.CAUGHT) { sfx.caught(); if (world.score > best) { best = world.score; saveBest(best); } }
  }

  function frame(now) {
    requestAnimationFrame(frame);
    let dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    if (paused) { drawScene(ctx, world, screen, best); return; }
    acc += dt;
    while (acc >= STEP) {
      acc -= STEP;
      world.time += 0; // world.step advances its own clock
      if (screen === SCREEN_TITLE) {
        // Attract mode: the turkey trots in place while the farm scrolls by.
        world.distancePx += 60 * STEP;
        world.runPhase += STEP * 3.4;
        world.time += STEP;
        if (input.takeJump() || input.pressed('Enter')) startRun();
      } else if (screen === SCREEN_PLAY) {
        const ctl = demoOn ? autopilotInput(world) : { jump: input.takeJump(), duck: input.duckHeld };
        if (!demoOn && input.jumpQueued) { /* consumed by takeJump above */ }
        const ev = world.step(STEP, ctl);
        playEvents(ev);
        gobbleTimer -= STEP;
        if (gobbleTimer <= 0) { gobbleTimer = 4 + Math.random() * 5; if (world.gap < 45) sfx.gobble(); }
        if (world.status === 'escaped') screen = SCREEN_ESCAPED;
        else if (world.status === 'caught') screen = SCREEN_CAUGHT;
      } else {
        world.time += STEP;
        if (input.takeJump() || input.pressed('KeyR') || input.pressed('Enter')) startRun();
      }
    }
    drawScene(ctx, world, screen, best);
    statusEl.textContent = screen === SCREEN_PLAY
      ? `Gobble Run: ${Math.floor(world.meters)} metres, score ${world.score}, farmer gap ${Math.round(world.gap)} percent`
      : `Gobble Run: ${screen}`;
  }
  requestAnimationFrame(frame);

  window.addEventListener('keydown', (e) => {
    if (e.code === 'KeyP' && screen === SCREEN_PLAY) paused = !paused;
    if (e.code === 'KeyM') sfx.muted = !sfx.muted;
    if (e.code === 'KeyT' && screen === SCREEN_PLAY) demoOn = !demoOn;
    if (e.code === 'KeyR' && screen !== SCREEN_PLAY) startRun();
  });
  canvas.addEventListener('pointerdown', () => {
    if (screen !== SCREEN_PLAY) startRun();
  });
}
