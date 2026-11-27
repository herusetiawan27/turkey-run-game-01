// Deterministic screenshot scenes behind ?shot=title|cover|play|end|caught, and
// the autopilot that also drives the in-game demo (T key). Every scene plays
// the real simulation forward from a fresh world at a fixed step, steered by
// the autopilot, so a screenshot is a frame the game genuinely produces and
// the same seed always gives the same frame.

import { WORLD } from './config.js';
import { World } from './world.js';
import { SCREEN_CAUGHT, SCREEN_ESCAPED, SCREEN_PLAY, SCREEN_TITLE } from './render.js';

const STEP = 1 / 60;

/**
 * One step of autopilot input for `world`: jump the hurdles, duck the bars,
 * sidestep nothing (a turkey runs one lane) but time the falling knives.
 */
export function autopilotInput(world) {
  const front = world.distancePx + 26;
  const speed = world.speed();
  let jump = false;
  let duck = false;
  let nearest = null;
  for (const ob of world.obstacles) {
    if (ob.hit) continue;
    const dist = ob.x - front;
    if (dist < -10 || dist > 420) continue;
    if (nearest === null || dist < nearest.dist) nearest = { ob, dist };
  }
  if (nearest) {
    const { ob, dist } = nearest;
    if (ob.verb === 'duck') {
      if (dist < speed * 0.42 && dist > -ob.w) duck = true;
    } else if (ob.kind !== 'puddle') {
      if (world.grounded && dist < speed * 0.34 && dist > 0) jump = true;
      // Tall ovens get the wing-flap to clear the far edge.
      if (!world.grounded && !world.flapUsed && ob.h >= 60 && dist < speed * 0.16 && dist > -20) jump = true;
    }
  }
  // A knife is about to land where the turkey will be: be airborne over it.
  for (const k of world.knives) {
    if (k.phase !== 'warn') continue;
    const dist = k.x - world.distancePx;
    if (world.grounded && dist > 30 && dist < speed * 0.34) jump = true;
  }
  return { jump, duck };
}

function simulate(world, seconds, pilot = autopilotInput) {
  const steps = Math.floor(seconds / STEP);
  for (let i = 0; i < steps; i += 1) {
    world.step(STEP, pilot(world));
    if (world.status !== 'run') break;
  }
}

/**
 * Stage the named scene in a fresh world and return { world, screen }.
 * - title:  the attract-mode barnyard behind the title screen
 * - cover:  kitchen-yard action — the turkey mid-flap over an oven, farmer close
 * - play:   cornfield action with the HUD up
 * - end:    a completed run, on the escaped screen
 * - caught: a run that ends in the farmer's net
 */
export function stageShot(name, seed = 1) {
  const world = new World(seed);
  if (name === 'cover') {
    world.distancePx = 845 * WORLD.pxPerMeter;
    world.spawnCursor = world.distancePx + 1150;
    world.obstacles = [];
    world.pickups = [];
    world.knives = [];
    world.spawnAhead();
    world.gap = 34;
    simulate(world, 9);
    // Keep going until the turkey is airborne (a flap over something) for the hero frame.
    for (let i = 0; i < 240 && world.status === 'run'; i += 1) {
      world.step(STEP, autopilotInput(world));
      if (!world.grounded && world.turkeyVY < 200) break;
    }
    return { world, screen: SCREEN_PLAY };
  }
  if (name === 'play') {
    world.distancePx = 470 * WORLD.pxPerMeter;
    world.spawnCursor = world.distancePx + 1150;
    world.obstacles = [];
    world.pickups = [];
    world.knives = [];
    world.spawnAhead();
    simulate(world, 7);
    return { world, screen: SCREEN_PLAY };
  }
  if (name === 'end') {
    world.goalPx = 260 * WORLD.pxPerMeter;
    simulate(world, 90);
    return { world, screen: world.status === 'escaped' ? SCREEN_ESCAPED : SCREEN_PLAY };
  }
  if (name === 'caught') {
    // A pilot who never jumps and never ducks is caught before long.
    simulate(world, 120, () => ({ jump: false, duck: false }));
    return { world, screen: world.status === 'caught' ? SCREEN_CAUGHT : SCREEN_PLAY };
  }
  // Title: let the world idle in attract mode (no farmer pressure off-screen).
  simulate(world, 4, () => ({ jump: false, duck: false }));
  world.gap = WORLD.startGap;
  return { world, screen: SCREEN_TITLE };
}
