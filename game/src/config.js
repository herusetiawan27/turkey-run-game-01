// Gobble Run — tuning constants. Everything the game balances on lives here so the
// feel of the run (speed, jump arc, how fast the farmer closes in) can be tuned in
// one place without touching the simulation.

export const VIEW = { width: 960, height: 540 };

export const WORLD = {
  pxPerMeter: 25,
  goalMeters: 1200,
  groundY: 452,
  gravity: 2100,
  jumpVelocity: 860,
  flapVelocity: 740,
  fastFall: 1500,
  baseSpeed: 265,
  maxSpeed: 445,
  speedRamp: 0.0058,
  boostSpeed: 95,
  boostSeconds: 2.2,
  startGap: 70,
  gapRegen: 1.15,
  gapDrain: 0.5,
  kitchenDrain: 0.85,
  stumbleGapLoss: 26,
  puddleGapLoss: 10,
  stumbleSeconds: 0.75,
  stumbleSpeedFactor: 0.45,
  invulnerableSeconds: 1.0,
  cornScore: 25,
  goldenScore: 100,
  escapeBonus: 500,
};

// The run crosses three yards, each with its own sky, props and obstacles.
export const ZONES = [
  { until: 400, name: 'Barnyard', skyTop: '#7ec8f7', skyBottom: '#dff3ff', hill: '#9ccb7a', mid: '#7fb069' },
  { until: 800, name: 'Cornfield', skyTop: '#6fb7ef', skyBottom: '#e8f7d9', hill: '#a8cf7d', mid: '#8fbf5f' },
  { until: Infinity, name: 'Kitchen Yard', skyTop: '#f2a65a', skyBottom: '#ffe8c9', hill: '#c98d5f', mid: '#a9713f' },
];

export function zoneIndexAt(meters) {
  for (let i = 0; i < ZONES.length; i += 1) if (meters < ZONES[i].until) return i;
  return ZONES.length - 1;
}
