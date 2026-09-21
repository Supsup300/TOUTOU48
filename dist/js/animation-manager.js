import { dogForLevel, spritePosition } from "./dogs.js";
import { GAME_CONFIG } from "./config.js";

export function createDogArt(level, className = "dog-art") {
  const art = document.createElement("div");
  art.className = className;
  art.style.backgroundPosition = spritePosition(level);
  art.setAttribute("aria-hidden", "true");
  return art;
}

function createTile(level, row, col, extraClass = "") {
  const dog = dogForLevel(level);
  const tile = document.createElement("button");
  tile.type = "button";
  tile.className = `dog-tile level-${level} ${extraClass}`.trim();
  tile.style.gridRow = String(row + 1);
  tile.style.gridColumn = String(col + 1);
  tile.style.setProperty("--accent", dog.accent);
  tile.dataset.row = row;
  tile.dataset.col = col;
  tile.dataset.level = level;
  tile.setAttribute("aria-label", `${dog.name}, niveau ${level}`);
  tile.append(createDogArt(level));
  const badge = document.createElement("span");
  badge.className = "tile-level";
  badge.textContent = String(level);
  tile.append(badge);
  return tile;
}

export class AnimationManager {
  constructor(board, tileLayer, ghostLayer) {
    this.board = board;
    this.tileLayer = tileLayer;
    this.ghostLayer = ghostLayer;
  }

  render(grid, { spawned = null, mergedCells = [] } = {}) {
    this.tileLayer.replaceChildren();
    const merged = new Set(mergedCells.map(({ row, col }) => `${row}-${col}`));
    grid.forEach((row, r) => row.forEach((level, c) => {
      if (!level) return;
      let animationClass = "";
      if (spawned && spawned.row === r && spawned.col === c) animationClass = "is-spawning";
      if (merged.has(`${r}-${c}`)) animationClass = "is-merged";
      this.tileLayer.append(createTile(level, r, c, animationClass));
    }));
  }

  async animate(beforeGrid, result) {
    if (!result.changed || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      this.render(result.grid, result);
      return;
    }
    const slots = [...this.board.querySelectorAll(".board-slot")];
    this.ghostLayer.replaceChildren();
    this.tileLayer.classList.add("is-hidden");

    result.transitions.forEach((transition) => {
      const fromIndex = transition.from.row * 4 + transition.from.col;
      const toIndex = transition.to.row * 4 + transition.to.col;
      const from = slots[fromIndex];
      const to = slots[toIndex];
      if (!from || !to) return;
      const ghost = createTile(transition.level, 0, 0, "ghost-tile");
      ghost.style.gridRow = "auto";
      ghost.style.gridColumn = "auto";
      ghost.style.left = `${from.offsetLeft}px`;
      ghost.style.top = `${from.offsetTop}px`;
      ghost.style.width = `${from.offsetWidth}px`;
      ghost.style.height = `${from.offsetHeight}px`;
      ghost.style.setProperty("--move-x", `${to.offsetLeft - from.offsetLeft}px`);
      ghost.style.setProperty("--move-y", `${to.offsetTop - from.offsetTop}px`);
      if (transition.merged) ghost.classList.add("will-merge");
      this.ghostLayer.append(ghost);
    });

    this.board.getBoundingClientRect();
    this.ghostLayer.classList.add("is-moving");
    await new Promise((resolve) => window.setTimeout(resolve, GAME_CONFIG.MOVE_LOCK_MS - 25));
    this.ghostLayer.classList.remove("is-moving");
    this.ghostLayer.replaceChildren();
    this.tileLayer.classList.remove("is-hidden");
    this.render(result.grid, result);
  }

  burst(row, col) {
    const slots = [...this.board.querySelectorAll(".board-slot")];
    const slot = slots[row * 4 + col];
    if (!slot) return;
    const rect = slot.getBoundingClientRect();
    const boardRect = this.board.getBoundingClientRect();
    for (let i = 0; i < 7; i += 1) {
      const particle = document.createElement("i");
      particle.className = "particle";
      particle.style.left = `${rect.left - boardRect.left + rect.width / 2}px`;
      particle.style.top = `${rect.top - boardRect.top + rect.height / 2}px`;
      particle.style.setProperty("--angle", `${i * (360 / 7)}deg`);
      this.board.append(particle);
      window.setTimeout(() => particle.remove(), 500);
    }
  }
}
