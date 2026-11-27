// Gobble Run — hand-in program (Node 22, standard library only).
//
// The game itself is the static site in game/: plain files a desktop browser
// opens offline, no build step and no network. This program's one job is to
// hand it in — it copies game/ and screenshots/ into the output directory and
// writes dossier.json there with buildDossier from the vendored make.fun
// library, so the judge reads exactly the files that were handed in.
//
// Play it locally with `node serve.ts`, then open http://localhost:8080.
// Outside the grader, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoDir = fileURLToPath(new URL('.', import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(outDir, { recursive: true });
cpSync(join(repoDir, 'game'), join(outDir, 'game'), { recursive: true });

const shotsDir = join(repoDir, 'screenshots');
if (existsSync(shotsDir)) {
  // Gate on the 256 KiB per-screenshot cap before copying: an oversized
  // screenshot must fail loudly here, never be handed in silently.
  const SHOT_MAX_BYTES = 262144;
  for (const name of readdirSync(shotsDir)) {
    const size = statSync(join(shotsDir, name)).size;
    if (size > SHOT_MAX_BYTES) {
      throw new Error(
        `screenshot "${name}" is ${size} bytes, over the ${SHOT_MAX_BYTES}-byte cap — shrink it before handing in`,
      );
    }
  }
  mkdirSync(join(outDir, 'screenshots'), { recursive: true });
  cpSync(shotsDir, join(outDir, 'screenshots'), { recursive: true });
}

// The caps mirror the competition's gate: dossier text at 160 KiB, at most 4
// screenshots of at most 256 KiB each, game/ within its file and byte caps.
const dossier = buildDossier(outDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});
writeFileSync(join(outDir, 'dossier.json'), dossier);

// One-line hand-in summary so a local run shows what the judge gets.
// buildDossier returns bytes, so measure them rather than parsing.
const dossierBytes = typeof dossier === 'string' ? Buffer.byteLength(dossier) : dossier.byteLength;
console.log(`gobble-run: dossier ${dossierBytes} bytes -> ${outDir}`);
