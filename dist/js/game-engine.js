import { GAME_CONFIG } from "./config.js";

export const cloneGrid = (grid) => grid.map((row) => [...row]);
export const emptyGrid = (size = GAME_CONFIG.BOARD_SIZE) =>
  Array.from({ length: size }, () => Array(size).fill(0));

export function gridsEqual(a, b) {
  return a.length === b.length && a.every((row, r) =>
    row.length === b[r].length && row.every((cell, c) => cell === b[r][c])
  );
}

export function mergeLine(line, maxLevel = GAME_CONFIG.MAX_LEVEL) {
  const compact = line.filter(Boolean);
  const merged = [];
  const mergedIndices = [];
  let scoreGain = 0;

  for (let index = 0; index < compact.length; index += 1) {
    const current = compact[index];
    const next = compact[index + 1];
    if (current === next && current < maxLevel) {
      const upgraded = current + 1;
      mergedIndices.push(merged.length);
      merged.push(upgraded);
      scoreGain += 2 ** upgraded;
      index += 1;
    } else {
      merged.push(current);
    }
  }

  while (merged.length < line.length) merged.push(0);
  return { line: merged, scoreGain, mergedIndices };
}

function coordinatesFor(direction, fixed, variable, size) {
  if (direction === "left") return [fixed, variable];
  if (direction === "right") return [fixed, size - 1 - variable];
  if (direction === "up") return [variable, fixed];
  return [size - 1 - variable, fixed];
}

export function moveGrid(grid, direction, maxLevel = GAME_CONFIG.MAX_LEVEL) {
  if (!["left", "right", "up", "down"].includes(direction)) {
    throw new Error(`Direction inconnue : ${direction}`);
  }
  const size = grid.length;
  const nextGrid = emptyGrid(size);
  const mergedCells = [];
  const transitions = [];
  let scoreGain = 0;

  for (let fixed = 0; fixed < size; fixed += 1) {
    const entries = [];
    for (let variable = 0; variable < size; variable += 1) {
      const [row, col] = coordinatesFor(direction, fixed, variable, size);
      if (grid[row][col]) entries.push({ level: grid[row][col], variable, row, col });
    }

    const outputs = [];
    for (let index = 0; index < entries.length; index += 1) {
      const current = entries[index];
      const next = entries[index + 1];
      if (next && current.level === next.level && current.level < maxLevel) {
        const level = current.level + 1;
        outputs.push({ level, sources: [current, next], merged: true });
        scoreGain += 2 ** level;
        index += 1;
      } else {
        outputs.push({ level: current.level, sources: [current], merged: false });
      }
    }

    outputs.forEach((output, variable) => {
      const [row, col] = coordinatesFor(direction, fixed, variable, size);
      nextGrid[row][col] = output.level;
      if (output.merged) mergedCells.push({ row, col, level: output.level });
      output.sources.forEach((source) => transitions.push({
        from: { row: source.row, col: source.col },
        to: { row, col },
        level: source.level,
        merged: output.merged
      }));
    });

    for (let variable = outputs.length; variable < size; variable += 1) {
      const [row, col] = coordinatesFor(direction, fixed, variable, size);
      nextGrid[row][col] = 0;
    }
  }

  return {
    grid: nextGrid,
    changed: !gridsEqual(grid, nextGrid),
    scoreGain,
    mergedCells,
    transitions
  };
}

export function availableCells(grid) {
  const cells = [];
  grid.forEach((row, r) => row.forEach((value, c) => {
    if (value === 0) cells.push({ row: r, col: c });
  }));
  return cells;
}

export function spawnTile(grid, rng = Math.random, levelOneProbability = GAME_CONFIG.SPAWN_LEVEL_1_PROBABILITY) {
  const cells = availableCells(grid);
  if (!cells.length) return { grid: cloneGrid(grid), spawned: null };
  const nextGrid = cloneGrid(grid);
  const cell = cells[Math.min(cells.length - 1, Math.floor(rng() * cells.length))];
  const level = rng() < levelOneProbability ? 1 : 2;
  nextGrid[cell.row][cell.col] = level;
  return { grid: nextGrid, spawned: { ...cell, level } };
}

export function canMove(grid, maxLevel = GAME_CONFIG.MAX_LEVEL) {
  if (availableCells(grid).length) return true;
  const size = grid.length;
  for (let row = 0; row < size; row += 1) {
    for (let col = 0; col < size; col += 1) {
      const value = grid[row][col];
      if (col + 1 < size && value === grid[row][col + 1] && value < maxLevel) return true;
      if (row + 1 < size && value === grid[row + 1][col] && value < maxLevel) return true;
    }
  }
  return false;
}

export const isGameOver = (grid, maxLevel = GAME_CONFIG.MAX_LEVEL) => !canMove(grid, maxLevel);

export class GameEngine {
  constructor({ rng = Math.random } = {}) {
    this.rng = rng;
    this.grid = emptyGrid();
    this.score = 0;
    this.maxLevel = 1;
    this.lastSnapshot = null;
  }

  start() {
    this.grid = emptyGrid();
    this.score = 0;
    this.maxLevel = 1;
    this.lastSnapshot = null;
    this.grid = spawnTile(this.grid, this.rng).grid;
    this.grid = spawnTile(this.grid, this.rng).grid;
    this.maxLevel = Math.max(...this.grid.flat());
    return this.snapshot();
  }

  restore(saved) {
    if (!saved?.grid || saved.grid.length !== GAME_CONFIG.BOARD_SIZE) return false;
    this.grid = saved.grid.map((row) => row.map((value) => Number(value) || 0));
    this.score = Number(saved.score) || 0;
    this.maxLevel = Math.max(1, Number(saved.maxLevel) || Math.max(...this.grid.flat()));
    this.lastSnapshot = saved.lastSnapshot || null;
    return true;
  }

  snapshot() {
    return {
      grid: cloneGrid(this.grid),
      score: this.score,
      maxLevel: this.maxLevel,
      lastSnapshot: this.lastSnapshot ? {
        grid: cloneGrid(this.lastSnapshot.grid),
        score: this.lastSnapshot.score,
        maxLevel: this.lastSnapshot.maxLevel
      } : null
    };
  }

  move(direction) {
    const result = moveGrid(this.grid, direction);
    if (!result.changed) return { ...result, spawned: null, gameOver: isGameOver(this.grid) };
    this.lastSnapshot = { grid: cloneGrid(this.grid), score: this.score, maxLevel: this.maxLevel };
    this.grid = result.grid;
    this.score += result.scoreGain;
    const spawn = spawnTile(this.grid, this.rng);
    this.grid = spawn.grid;
    this.maxLevel = Math.max(this.maxLevel, ...this.grid.flat());
    return { ...result, grid: cloneGrid(this.grid), spawned: spawn.spawned, gameOver: isGameOver(this.grid) };
  }

  undo() {
    if (!this.lastSnapshot) return false;
    this.grid = cloneGrid(this.lastSnapshot.grid);
    this.score = this.lastSnapshot.score;
    this.maxLevel = this.lastSnapshot.maxLevel;
    this.lastSnapshot = null;
    return true;
  }

  removeTile(row, col) {
    if (!this.grid[row]?.[col]) return false;
    this.grid[row][col] = 0;
    this.lastSnapshot = null;
    return true;
  }

  shuffle() {
    const original = this.grid.flat();
    if (original.filter(Boolean).length < 2) return false;
    const toGrid = (values) => {
      const next = emptyGrid();
      values.forEach((value, index) => {
        next[Math.floor(index / 4)][index % 4] = value;
      });
      return next;
    };
    const randomize = (source) => {
      const values = [...source];
      for (let i = values.length - 1; i > 0; i -= 1) {
        const j = Math.floor(this.rng() * (i + 1));
        [values[i], values[j]] = [values[j], values[i]];
      }
      return values;
    };

    for (let attempt = 0; attempt < 40; attempt += 1) {
      const values = randomize(original);
      const next = toGrid(values);
      if (!gridsEqual(this.grid, next) && canMove(next)) {
        this.grid = next;
        this.lastSnapshot = null;
        return true;
      }
    }

    const counts = new Map();
    original.filter(Boolean).forEach((level) => counts.set(level, (counts.get(level) || 0) + 1));
    const pairLevel = [...counts.entries()].find(([level, count]) => count >= 2 && level < GAME_CONFIG.MAX_LEVEL)?.[0];
    if (pairLevel) {
      const remainder = [...original];
      remainder.splice(remainder.indexOf(pairLevel), 1);
      remainder.splice(remainder.indexOf(pairLevel), 1);
      const values = [pairLevel, pairLevel, ...randomize(remainder)];
      this.grid = toGrid(values);
      this.lastSnapshot = null;
      return true;
    }
    return false;
  }

  secondChance(removeCount = 3) {
    const occupied = [];
    this.grid.forEach((row, r) => row.forEach((level, c) => {
      if (level) occupied.push({ row: r, col: c, level });
    }));
    occupied.sort((a, b) => a.level - b.level);
    occupied.slice(0, Math.min(removeCount, occupied.length)).forEach(({ row, col }) => {
      this.grid[row][col] = 0;
    });
    this.lastSnapshot = null;
    return occupied.length > 0;
  }
}
