import { GAME_CONFIG } from "./config.js";

export function directionFromGesture(dx, dy, threshold = GAME_CONFIG.SWIPE_THRESHOLD) {
  if (Math.max(Math.abs(dx), Math.abs(dy)) < threshold) return null;
  return Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : (dy > 0 ? "down" : "up");
}

export class InputManager {
  constructor(boardElement, onMove) {
    this.board = boardElement;
    this.onMove = onMove;
    this.startPoint = null;
    this.enabled = true;
    this.bind();
  }

  bind() {
    const keyDirections = {
      ArrowLeft: "left", ArrowRight: "right", ArrowUp: "up", ArrowDown: "down",
      a: "left", d: "right", w: "up", s: "down",
      A: "left", D: "right", W: "up", S: "down"
    };
    window.addEventListener("keydown", (event) => {
      const direction = keyDirections[event.key];
      if (!direction || !this.enabled) return;
      event.preventDefault();
      this.onMove(direction);
    }, { passive: false });

    this.board.addEventListener("pointerdown", (event) => {
      if (!this.enabled) { this.startPoint = null; return; }
      this.startPoint = { x: event.clientX, y: event.clientY, id: event.pointerId };
      this.board.setPointerCapture?.(event.pointerId);
    });

    this.board.addEventListener("pointerup", (event) => {
      if (!this.startPoint || this.startPoint.id !== event.pointerId) return;
      const startPoint = this.startPoint;
      this.startPoint = null;
      if (!this.enabled) return;
      const dx = event.clientX - startPoint.x;
      const dy = event.clientY - startPoint.y;
      const direction = directionFromGesture(dx, dy);
      if (direction) this.onMove(direction);
    });

    this.board.addEventListener("pointercancel", () => { this.startPoint = null; });
  }

  reset() {
    this.startPoint = null;
  }
}
