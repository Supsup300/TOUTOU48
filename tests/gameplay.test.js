import test from "node:test";
import assert from "node:assert/strict";
import { GameEngine, cloneGrid, isGameOver } from "../dist/js/game-engine.js";
import { directionFromGesture } from "../dist/js/input-manager.js";
import { SaveManager } from "../dist/js/save-manager.js";

function seededRandom(seed = 1234567) {
  let state = seed >>> 0;
  return () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

test("les swipes utilisent l'axe dominant et ignorent les taps", () => {
  assert.equal(directionFromGesture(12, 8), null);
  assert.equal(directionFromGesture(44, 20), "right");
  assert.equal(directionFromGesture(-44, 20), "left");
  assert.equal(directionFromGesture(12, -45), "up");
  assert.equal(directionFromGesture(12, 45), "down");
});

test("undo restaure exactement la grille et le score", () => {
  const engine = new GameEngine({ rng: seededRandom(9) });
  engine.grid = [[1,1,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0]];
  engine.score = 12;
  const before = cloneGrid(engine.grid);
  assert.equal(engine.move("left").changed, true);
  assert.equal(engine.undo(), true);
  assert.deepEqual(engine.grid, before);
  assert.equal(engine.score, 12);
  assert.equal(engine.undo(), false);
});

test("supprimer, mélanger et seconde chance conservent des niveaux valides", () => {
  const engine = new GameEngine({ rng: seededRandom(42) });
  engine.grid = [[1,2,3,4],[5,6,7,8],[9,10,11,12],[13,14,15,16]];
  assert.equal(engine.removeTile(0, 0), true);
  assert.equal(engine.grid[0][0], 0);
  const valuesBefore = engine.grid.flat().sort((a, b) => a - b);
  assert.equal(engine.shuffle(), true);
  assert.deepEqual(engine.grid.flat().sort((a, b) => a - b), valuesBefore);
  const occupiedBefore = engine.grid.flat().filter(Boolean).length;
  assert.equal(engine.secondChance(3), true);
  assert.equal(engine.grid.flat().filter(Boolean).length, occupiedBefore - 3);
  assert.equal(isGameOver(engine.grid), false);
});

test("mélanger une grille pleine avec des doublons garantit un nouveau mouvement", () => {
  const engine = new GameEngine({ rng: () => 0.999999 });
  engine.grid = [
    [1, 2, 3, 4],
    [5, 6, 7, 8],
    [9, 10, 11, 12],
    [13, 14, 15, 1]
  ];
  assert.equal(isGameOver(engine.grid), true);
  assert.equal(engine.shuffle(), true);
  assert.equal(isGameOver(engine.grid), false);
  assert.deepEqual(engine.grid.flat().sort((a, b) => a - b), [1,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15]);
});

test("plusieurs parties simulées restent cohérentes jusqu'à la fin", () => {
  const directions = ["left", "up", "right", "down"];
  for (let game = 0; game < 8; game += 1) {
    const rng = seededRandom(500 + game);
    const engine = new GameEngine({ rng });
    engine.start();
    let attempts = 0;
    while (!isGameOver(engine.grid) && attempts < 12000) {
      engine.move(directions[Math.floor(rng() * directions.length)]);
      assert.equal(engine.grid.length, 4);
      assert.equal(engine.grid.every((row) => row.length === 4), true);
      assert.equal(engine.grid.flat().every((value) => Number.isInteger(value) && value >= 0 && value <= 20), true);
      attempts += 1;
    }
    assert.ok(attempts < 12000, `la partie ${game + 1} doit se terminer`);
    assert.equal(isGameOver(engine.grid), true);
  }
});

test("la sauvegarde web restaure profil, réglages et partie", () => {
  const memory = new Map();
  globalThis.localStorage = {
    getItem: (key) => memory.has(key) ? memory.get(key) : null,
    setItem: (key, value) => memory.set(key, String(value)),
    removeItem: (key) => memory.delete(key)
  };
  const saves = new SaveManager();
  const profile = saves.loadProfile();
  profile.bestScore = 2048;
  profile.discovered = [1, 2, 3];
  assert.equal(saves.saveProfile(profile), true);
  assert.deepEqual(saves.loadProfile().discovered, [1, 2, 3]);
  assert.equal(saves.loadProfile().bestScore, 2048);
  assert.equal(saves.saveGame({ inProgress: true, engine: { grid: [[1]] } }), true);
  assert.equal(saves.loadGame().inProgress, true);
  const settings = saves.loadSettings();
  settings.music = false;
  saves.saveSettings(settings);
  assert.equal(saves.loadSettings().music, false);
});
