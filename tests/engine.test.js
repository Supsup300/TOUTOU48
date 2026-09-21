import test from "node:test";
import assert from "node:assert/strict";
import { mergeLine, moveGrid, isGameOver, spawnTile, GameEngine } from "../dist/js/game-engine.js";

test("mergeLine respecte les fusions classiques", () => {
  assert.deepEqual(mergeLine([1, 1, 0, 0]).line, [2, 0, 0, 0]);
  assert.deepEqual(mergeLine([1, 1, 1, 0]).line, [2, 1, 0, 0]);
  assert.deepEqual(mergeLine([1, 1, 1, 1]).line, [2, 2, 0, 0]);
  assert.deepEqual(mergeLine([2, 2, 3, 3]).line, [3, 4, 0, 0]);
  assert.deepEqual(mergeLine([1, 0, 1, 1]).line, [2, 1, 0, 0]);
});

test("les quatre directions compressent correctement", () => {
  const grid = [
    [1, 0, 1, 1],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0]
  ];
  assert.deepEqual(moveGrid(grid, "left").grid[0], [2, 1, 0, 0]);
  assert.deepEqual(moveGrid(grid, "right").grid[0], [0, 0, 1, 2]);

  const vertical = [[1, 0, 0, 0], [0, 0, 0, 0], [1, 0, 0, 0], [1, 0, 0, 0]];
  assert.deepEqual(moveGrid(vertical, "up").grid.map((r) => r[0]), [2, 1, 0, 0]);
  assert.deepEqual(moveGrid(vertical, "down").grid.map((r) => r[0]), [0, 0, 1, 2]);
});

test("Game Over exige une grille pleine sans fusion", () => {
  const over = [[1,2,1,2],[2,1,2,1],[1,2,1,2],[2,1,2,1]];
  const playable = [[1,2,1,2],[2,1,2,1],[1,2,2,1],[2,1,2,1]];
  assert.equal(isGameOver(over), true);
  assert.equal(isGameOver(playable), false);
  assert.equal(isGameOver([[1,2,1,2],[2,1,2,1],[1,2,1,2],[2,1,2,0]]), false);
});

test("une tuile n'apparaît qu'après un mouvement valide", () => {
  const engine = new GameEngine({ rng: () => 0 });
  engine.grid = [[1,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0]];
  const invalid = engine.move("left");
  assert.equal(invalid.changed, false);
  assert.equal(engine.grid.flat().filter(Boolean).length, 1);
  const valid = engine.move("right");
  assert.equal(valid.changed, true);
  assert.equal(engine.grid.flat().filter(Boolean).length, 2);
});

test("spawnTile respecte le niveau configuré", () => {
  const grid = [[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0]];
  const values = [0, 0.95];
  const result = spawnTile(grid, () => values.shift(), 0.9);
  assert.equal(result.spawned.level, 2);
});
