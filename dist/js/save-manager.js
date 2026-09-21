import { GAME_CONFIG, MONETIZATION_CONFIG } from "./config.js";

const DEFAULT_PROFILE = Object.freeze({
  bestScore: 0,
  maxLevel: 1,
  discovered: [],
  coins: MONETIZATION_CONFIG.STARTING_COINS,
  gamesPlayed: 0,
  totalMerges: 0,
  jokersUsed: 0,
  playTimeMs: 0,
  achievements: [],
  objectives: [],
  mergeCoinSteps: 0
});

const DEFAULT_SETTINGS = Object.freeze({
  music: true,
  sounds: true,
  haptics: true
});

function read(key, fallback) {
  try {
    const parsed = JSON.parse(localStorage.getItem(key));
    return parsed && typeof parsed === "object" ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export class SaveManager {
  loadProfile() {
    const stored = read(GAME_CONFIG.PROFILE_KEY, {});
    return {
      ...structuredClone(DEFAULT_PROFILE),
      ...stored,
      discovered: Array.isArray(stored.discovered) ? stored.discovered : [],
      achievements: Array.isArray(stored.achievements) ? stored.achievements : [],
      objectives: Array.isArray(stored.objectives) ? stored.objectives : []
    };
  }

  saveProfile(profile) {
    return write(GAME_CONFIG.PROFILE_KEY, profile);
  }

  loadGame() {
    return read(GAME_CONFIG.SAVE_KEY, null);
  }

  saveGame(game) {
    return write(GAME_CONFIG.SAVE_KEY, { ...game, savedAt: Date.now() });
  }

  clearGame() {
    try { localStorage.removeItem(GAME_CONFIG.SAVE_KEY); } catch { /* stockage indisponible */ }
  }

  loadSettings() {
    return { ...structuredClone(DEFAULT_SETTINGS), ...read(GAME_CONFIG.SETTINGS_KEY, {}) };
  }

  saveSettings(settings) {
    return write(GAME_CONFIG.SETTINGS_KEY, settings);
  }

  tutorialSeen() {
    try { return localStorage.getItem(GAME_CONFIG.TUTORIAL_KEY) === "done"; } catch { return false; }
  }

  completeTutorial() {
    try { localStorage.setItem(GAME_CONFIG.TUTORIAL_KEY, "done"); } catch { /* stockage indisponible */ }
  }

  freshJokers() {
    return {
      undo: MONETIZATION_CONFIG.FREE_UNDOS,
      remove: MONETIZATION_CONFIG.FREE_REMOVALS,
      shuffle: MONETIZATION_CONFIG.FREE_SHUFFLES
    };
  }
}
