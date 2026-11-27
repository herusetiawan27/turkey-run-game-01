# Gobble Run — The Great Thanksgiving Escape

[![Competition](https://make.fun/badge/turkey-run-game-01.svg)](https://make.fun/bounty/turkey-run-game-01?utm_source=github&utm_medium=readme&utm_campaign=turkey-run-game-01)
[![Rank](https://make.fun/badge/turkey-run-game-01-rank.svg)](https://make.fun/leaderboard)
[![Prize](https://make.fun/badge/turkey-run-game-01-prize.svg)](https://make.fun/bounty/turkey-run-game-01?utm_source=github&utm_medium=readme&utm_campaign=turkey-run-game-01)

An original turkey escape game built for the make.fun bounty
[Make the best turkey escape game](https://make.fun/bounty/turkey-run-game-01).
Play it in the browser: **https://herusetiawan27.github.io/turkey-run-game-01/game/**

Thanksgiving is coming, and you are *not* on the menu. You are a turkey making
a break for it: out of the Barnyard, through the Cornfield, across the Kitchen
Yard, and through the Freedom Gate at 1,200 m — with the farmer and his net
right behind you the whole way.

## How to play

- **SPACE / ↑ / click** — jump; press again mid-air for a wing-flap double jump
- **↓** — duck under signs, scarecrow arms and hanging pans
- Jump fences, hay bales and ovens; splash through puddles only if you must
  (they slow you down); when a red **!** flashes on the ground, a carving knife
  is about to fall there — be somewhere else, or airborne
- Corn scores points; golden corn scores more and gives a speed boost
- Every stumble lets the farmer close in. If the FARMER meter empties, dinner
  is served. Reach the gate and you are free
- **P** pause · **M** sound on/off · **T** autopilot demo · **R** restart

## Running it locally

The game is plain static files under `game/` — no build step, no network.
Serve it any way you like, or use the bundled server (Node 22):

```sh
node serve.ts          # then open http://localhost:8080
```

`main.ts` is the hand-in program: it copies `game/` and `screenshots/` to the
output directory and writes the `dossier.json` summary with the vendored
make.fun library in `vendor/makefun-game.ts` (kept unchanged from the kit).

Deterministic screenshot scenes live behind `?shot=title|cover|play|end|caught`
(see `shots.json`); an autopilot that plays the real game drives them, and the
same pilot powers the in-game demo and the `?demo=1` mode.

## Layout

- `game/index.html` — the page
- `game/src/` — config, seeded RNG, input, WebAudio synth, the world
  simulation, the canvas renderer, screenshot staging
- `screenshots/` — four renders of the game itself (the first is the cover)
- `vendor/makefun-game.ts` — the kit's dossier library, unchanged

All art is drawn in code and all sound is synthesised with WebAudio; there are
no external assets. Licensed MIT.
