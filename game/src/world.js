// The run itself: a turkey auto-runs to the right across three yards while the
// farmer closes in from behind. The world is simulated in pixels along a track
// (25 px = 1 m); the turkey's world position is `distancePx`, and render.js
// maps world x to screen x. Obstacles ask for one of two verbs — jump or duck —
// and bumping one makes the turkey stumble, which is how the farmer gains.

import { WORLD, zoneIndexAt } from './config.js';
import { RNG } from './random.js';

export const EV = {
  NONE: 0, JUMP: 1, FLAP: 2, CORN: 4, GOLDEN: 8, STUMBLE: 16,
  PUDDLE: 32, KNIFE_FALL: 64, KNIFE_LAND: 128, ESCAPED: 256, CAUGHT: 512,
};

// kind -> footprint and the verb that clears it. Duck obstacles are a bar held
// high: their `h` is the bar's top, and the collision band is computed in step().
const OBSTACLES = {
  fence: { w: 46, h: 46, verb: 'jump' },
  hay: { w: 54, h: 40, verb: 'jump' },
  stalk: { w: 40, h: 52, verb: 'jump' },
  oven: { w: 66, h: 66, verb: 'jump' },
  puddle: { w: 74, h: 8, verb: 'jump' },
  sign: { w: 58, h: 86, verb: 'duck' },
  scare: { w: 50, h: 86, verb: 'duck' },
  pan: { w: 62, h: 86, verb: 'duck' },
};

const ZONE_KINDS = [
  ['fence', 'hay', 'puddle', 'sign'],
  ['hay', 'stalk', 'puddle', 'scare'],
  ['oven', 'puddle', 'pan'],
];

export class World {
  constructor(seed = 1) {
    this.reset(seed);
  }

  reset(seed = 1) {
    this.rng = new RNG(seed * 7919 + 13);
    this.goalPx = WORLD.goalMeters * WORLD.pxPerMeter;
    this.distancePx = 0;
    this.time = 0;
    this.status = 'run'; // 'run' | 'escaped' | 'caught'
    this.turkeyY = WORLD.groundY; // feet position
    this.turkeyVY = 0;
    this.grounded = true;
    this.ducking = false;
    this.flapUsed = false;
    this.runPhase = 0;
    this.gap = WORLD.startGap; // 0 = the farmer's hands close on the turkey
    this.corn = 0;
    this.golden = 0;
    this.bonus = 0;
    this.stumbleTimer = 0;
    this.invulnerableTimer = 0;
    this.boostTimer = 0;
    this.obstacles = [];
    this.pickups = [];
    this.knives = [];
    this.particles = [];
    this.spawnCursor = 1150;
    this.dustTimer = 0;
    this.spawnAhead();
  }

  get meters() { return this.distancePx / WORLD.pxPerMeter; }
  get zone() { return zoneIndexAt(this.meters); }
  get score() { return Math.floor(this.meters) + this.bonus; }

  speed() {
    let s = Math.min(WORLD.maxSpeed, WORLD.baseSpeed + this.distancePx * WORLD.speedRamp);
    if (this.boostTimer > 0) s += WORLD.boostSpeed;
    if (this.stumbleTimer > 0) s *= WORLD.stumbleSpeedFactor;
    return s;
  }

  // ---- spawning -----------------------------------------------------------

  spawnAhead() {
    const horizon = this.distancePx + 1750;
    while (this.spawnCursor < horizon) {
      const zone = zoneIndexAt(this.spawnCursor / WORLD.pxPerMeter);
      const roll = this.rng.next();
      if (roll < 0.52) {
        const kind = this.rng.pick(ZONE_KINDS[zone]);
        const spec = OBSTACLES[kind];
        this.obstacles.push({ kind, x: this.spawnCursor, w: spec.w, h: spec.h, verb: spec.verb, hit: false });
        this.spawnCursor += spec.w;
        // Sometimes a corn arc rewards the jump you just made.
        if (spec.verb === 'jump' && kind !== 'puddle' && this.rng.chance(0.45)) {
          this.cornArc(this.spawnCursor - spec.w - 10);
        }
      } else if (roll < 0.78) {
        this.cornLine(this.spawnCursor, this.rng.chance(0.3) ? 'golden' : 'corn');
        this.spawnCursor += 5 * 36;
      } else if (zone === 2 && roll < 0.9) {
        this.knives.push({ x: this.spawnCursor + 60, phase: 'warn', t: 0, y: -90 });
        this.spawnCursor += 120;
      }
      const spacing = this.rng.range(300, 520) + this.speed() * 0.35;
      this.spawnCursor += spacing;
    }
    // Drop what is far behind.
    const behind = this.distancePx - 500;
    this.obstacles = this.obstacles.filter((o) => o.x + o.w > behind);
    this.pickups = this.pickups.filter((p) => !p.taken && p.x > behind);
    this.knives = this.knives.filter((k) => k.phase !== 'gone' && k.x > behind);
  }

  cornLine(x, kind) {
    for (let i = 0; i < 5; i += 1) {
      this.pickups.push({ kind: kind === 'golden' && i === 2 ? 'golden' : 'corn', x: x + i * 36, yOff: 26, taken: false });
    }
  }

  cornArc(overX) {
    const heights = [16, 52, 74, 52, 16];
    for (let i = 0; i < heights.length; i += 1) {
      this.pickups.push({ kind: 'corn', x: overX + i * 30, yOff: heights[i], taken: false });
    }
  }

  // ---- particles ----------------------------------------------------------

  puff(x, y, kind, n, spread = 60) {
    for (let i = 0; i < n; i += 1) {
      this.particles.push({
        kind, x, y,
        vx: this.rng.range(-spread, spread), vy: this.rng.range(-90, -10),
        life: this.rng.range(0.35, 0.8), age: 0, rot: this.rng.range(0, 6.28),
      });
    }
  }

  // ---- the step -----------------------------------------------------------

  step(dt, input) {
    if (this.status !== 'run') return EV.NONE;
    let ev = EV.NONE;
    this.time += dt;
    const speed = this.speed();

    // Timers.
    this.stumbleTimer = Math.max(0, this.stumbleTimer - dt);
    this.invulnerableTimer = Math.max(0, this.invulnerableTimer - dt);
    this.boostTimer = Math.max(0, this.boostTimer - dt);

    // Jump / flap / duck.
    if (input.jump) {
      if (this.grounded) {
        this.turkeyVY = -WORLD.jumpVelocity;
        this.grounded = false;
        this.flapUsed = false;
        ev |= EV.JUMP;
      } else if (!this.flapUsed) {
        this.turkeyVY = -WORLD.flapVelocity;
        this.flapUsed = true;
        ev |= EV.FLAP;
        this.puff(this.distancePx - 10, this.turkeyY - 20, 'feather', 4, 40);
      }
    }
    this.ducking = !!input.duck && this.grounded;
    if (!this.grounded && input.duck) this.turkeyVY += WORLD.fastFall * dt;

    // Vertical motion.
    if (!this.grounded) {
      this.turkeyVY += WORLD.gravity * dt;
      this.turkeyY += this.turkeyVY * dt;
      if (this.turkeyY >= WORLD.groundY) {
        this.turkeyY = WORLD.groundY;
        this.turkeyVY = 0;
        this.grounded = true;
        this.puff(this.distancePx, WORLD.groundY, 'dust', 3, 30);
      }
    }

    // Forward motion and the farmer.
    this.distancePx += speed * dt;
    this.runPhase += dt * speed * 0.055;
    const drain = this.zone === 2 ? WORLD.kitchenDrain : WORLD.gapDrain;
    this.gap += (WORLD.gapRegen - drain) * dt;
    this.gap = Math.min(100, this.gap);

    // Running dust.
    this.dustTimer -= dt;
    if (this.grounded && this.dustTimer <= 0) {
      this.dustTimer = 0.09;
      this.puff(this.distancePx - 22, WORLD.groundY - 2, 'dust', 1, 14);
    }

    this.spawnAhead();
    ev |= this.collide();
    ev |= this.updateKnives(dt);

    // Particles.
    for (const p of this.particles) {
      p.age += dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 300 * dt;
      p.rot += dt * 3;
    }
    this.particles = this.particles.filter((p) => p.age < p.life);

    // Endings.
    if (this.gap <= 0) {
      this.gap = 0;
      this.status = 'caught';
      ev |= EV.CAUGHT;
    } else if (this.distancePx >= this.goalPx) {
      this.status = 'escaped';
      this.bonus += WORLD.escapeBonus;
      ev |= EV.ESCAPED;
    }
    return ev;
  }

  turkeyBox() {
    const h = this.ducking ? 30 : 48;
    return { back: this.distancePx - 24, front: this.distancePx + 26, top: this.turkeyY - h, bottom: this.turkeyY };
  }

  stumble(ev) {
    if (this.invulnerableTimer > 0) return EV.NONE;
    this.gap -= WORLD.stumbleGapLoss;
    this.stumbleTimer = WORLD.stumbleSeconds;
    this.invulnerableTimer = WORLD.invulnerableSeconds;
    this.puff(this.distancePx, this.turkeyY - 30, 'feather', 7, 70);
    return ev;
  }

  collide() {
    let ev = EV.NONE;
    const box = this.turkeyBox();
    const g = WORLD.groundY;
    for (const ob of this.obstacles) {
      if (ob.hit) continue;
      if (ob.x > box.front || ob.x + ob.w < box.back) continue;
      if (ob.verb === 'duck') {
        const barTop = g - ob.h;
        const barBottom = g - 46;
        if (box.top < barBottom && box.bottom > barTop) {
          ob.hit = true;
          ev |= this.stumble(EV.STUMBLE);
        }
      } else if (ob.kind === 'puddle') {
        if (this.grounded) {
          ob.hit = true;
          this.gap -= WORLD.puddleGapLoss;
          ev |= EV.PUDDLE;
        }
      } else if (box.bottom > g - ob.h + 8) {
        ob.hit = true;
        ev |= this.stumble(EV.STUMBLE);
      }
    }
    for (const p of this.pickups) {
      if (p.taken) continue;
      if (p.x < box.back - 8 || p.x > box.front + 8) continue;
      const cy = g - p.yOff;
      if (cy > box.top - 14 && cy < box.bottom + 10) {
        p.taken = true;
        if (p.kind === 'golden') {
          this.golden += 1;
          this.bonus += WORLD.goldenScore;
          this.boostTimer = WORLD.boostSeconds;
          ev |= EV.GOLDEN;
        } else {
          this.corn += 1;
          this.bonus += WORLD.cornScore;
          ev |= EV.CORN;
        }
        this.puff(p.x, cy, 'spark', 4, 36);
      }
    }
    return ev;
  }

  updateKnives(dt) {
    let ev = EV.NONE;
    const g = WORLD.groundY;
    for (const k of this.knives) {
      k.t += dt;
      if (k.phase === 'warn' && k.t > 0.75) {
        k.phase = 'fall';
        k.t = 0;
        ev |= EV.KNIFE_FALL;
      } else if (k.phase === 'fall') {
        k.y += 1500 * dt;
        if (k.y >= g - 14) {
          k.y = g - 14;
          k.phase = 'stuck';
          k.t = 0;
          ev |= EV.KNIFE_LAND;
          const box = this.turkeyBox();
          if (Math.abs(k.x - this.distancePx) < 36 && box.bottom > g - 36) {
            ev |= this.stumble(EV.STUMBLE);
            k.phase = 'gone';
          }
        }
      } else if (k.phase === 'stuck') {
        // A stuck knife is a low hurdle until it is yanked out.
        const box = this.turkeyBox();
        if (!k.hit && k.x > box.back && k.x < box.front && box.bottom > g - 30) {
          k.hit = true;
          ev |= this.stumble(EV.STUMBLE);
        }
        if (k.t > 1.1) k.phase = 'gone';
      }
    }
    return ev;
  }
}
