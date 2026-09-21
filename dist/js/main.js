import { GAME_CONFIG, MONETIZATION_CONFIG } from "./config.js";
import { DOGS, dogForLevel } from "./dogs.js";
import { GameEngine, cloneGrid, isGameOver } from "./game-engine.js";
import { SaveManager } from "./save-manager.js";
import { AdManager } from "./ad-manager.js";
import { AudioManager } from "./audio-manager.js";
import { InputManager } from "./input-manager.js";
import { AnimationManager } from "./animation-manager.js";
import { UIManager } from "./ui-manager.js";
import { evaluateProgress } from "./achievements.js";
import { canBuyJoker, gameCoinReward, mergeCoinReward } from "./economy.js";

const saveManager = new SaveManager();
const ui = new UIManager();
const engine = new GameEngine();
const adManager = new AdManager();
const settings = saveManager.loadSettings();
const audio = new AudioManager(settings);
const board = document.querySelector("#board");
const animator = new AnimationManager(board, document.querySelector("#tileLayer"), document.querySelector("#ghostLayer"));

let profile = saveManager.loadProfile();
let savedGame = saveManager.loadGame();
let jokers = saveManager.freshJokers();
let secondChanceUsed = 0;
let gameRewardClaimed = false;
let inProgress = false;
let inputLocked = false;
let deleteMode = false;
let playTimeMark = null;

const input = new InputManager(board, (direction) => performMove(direction));

function vibrate(pattern = 14) {
  if (settings.haptics && navigator.vibrate) navigator.vibrate(pattern);
}

function currentSave() {
  return {
    inProgress,
    engine: engine.snapshot(),
    jokers: { ...jokers },
    secondChanceUsed,
    gameRewardClaimed
  };
}

function saveAll() {
  profile.bestScore = Math.max(profile.bestScore, engine.score || 0);
  profile.maxLevel = Math.max(profile.maxLevel, engine.maxLevel || 1);
  saveManager.saveProfile(profile);
  saveManager.saveGame(currentSave());
  savedGame = currentSave();
}

function commitPlayTime() {
  if (!playTimeMark) return;
  const now = Date.now();
  profile.playTimeMs += Math.max(0, now - playTimeMark);
  playTimeMark = inProgress && document.body.dataset.screen === "game" ? now : null;
}

function discoveredFromGrid() {
  const before = new Set(profile.discovered);
  engine.grid.flat().filter(Boolean).forEach((level) => before.add(level));
  const next = [...before].sort((a, b) => a - b);
  const newlyFound = next.filter((level) => !profile.discovered.includes(level));
  profile.discovered = next;
  profile.maxLevel = Math.max(profile.maxLevel, engine.maxLevel, ...next, 1);
  return newlyFound;
}

function updateUI() {
  ui.updateHeader({
    score: engine.score,
    bestScore: Math.max(profile.bestScore, engine.score),
    coins: profile.coins,
    maxLevel: engine.maxLevel,
    jokers
  });
  ui.updateHome(Boolean(savedGame?.inProgress), profile.maxLevel, profile.bestScore);
}

function enterGame() {
  ui.closeDialog();
  ui.showScreen("game");
  input.enabled = true;
  playTimeMark = Date.now();
  animator.render(engine.grid);
  updateUI();
  audio.startAmbience();
}

function startNewGame() {
  commitPlayTime();
  engine.start();
  jokers = saveManager.freshJokers();
  secondChanceUsed = 0;
  gameRewardClaimed = false;
  inProgress = true;
  profile.gamesPlayed += 1;
  discoveredFromGrid();
  saveAll();
  enterGame();
  ui.toast("Nouvelle meute, nouvelle chance.");
}

function resumeGame() {
  if (!savedGame?.inProgress || !engine.restore(savedGame.engine)) {
    startNewGame();
    return;
  }
  jokers = { ...saveManager.freshJokers(), ...(savedGame.jokers || {}) };
  secondChanceUsed = Number(savedGame.secondChanceUsed) || 0;
  gameRewardClaimed = Boolean(savedGame.gameRewardClaimed);
  inProgress = true;
  discoveredFromGrid();
  enterGame();
}

function returnHome() {
  cancelDeleteMode();
  commitPlayTime();
  saveAll();
  ui.showScreen("home");
  input.enabled = false;
  audio.stopAmbience();
  updateUI();
}

function rewardMessage(item) {
  if (item.type === "achievement") return `Succès débloqué : ${item.title} · +${item.reward} pièces`;
  if (item.reward.coins) return `Objectif atteint : ${item.title} · +${item.reward.coins} pièces`;
  return `Objectif atteint : ${item.title} · +1 mélange`;
}

async function performMove(direction) {
  if (!inProgress || inputLocked || deleteMode || document.body.dataset.screen !== "game" || ui.dialog.open) return false;
  const beforeGrid = cloneGrid(engine.grid);
  const priorMax = profile.maxLevel;
  const result = engine.move(direction);
  if (!result.changed) {
    vibrate(6);
    return false;
  }

  inputLocked = true;
  input.enabled = false;
  audio.slide();
  if (result.mergedCells.length) audio.merge(Math.max(...result.mergedCells.map((cell) => cell.level)));
  profile.totalMerges += result.mergedCells.length;
  const mergeReward = mergeCoinReward(profile.totalMerges, profile.mergeCoinSteps || 0);
  const earnedMergeSteps = mergeReward.steps;
  const mergeCoins = mergeReward.coins;
  if (mergeCoins) {
    profile.coins += mergeCoins;
    profile.mergeCoinSteps = earnedMergeSteps;
  }
  profile.bestScore = Math.max(profile.bestScore, engine.score);
  const newDogs = discoveredFromGrid();
  const unlocked = evaluateProgress(profile, engine.score, jokers);
  commitPlayTime();
  saveAll();
  updateUI();

  try {
    await animator.animate(beforeGrid, result);
    result.mergedCells.forEach(({ row, col }) => animator.burst(row, col));
    if (result.mergedCells.length) vibrate([12, 22, 18]);

    if (newDogs.length && profile.maxLevel > priorMax) {
      const level = Math.max(...newDogs);
      audio.discovery();
      ui.toast(`Nouvelle race : ${dogForLevel(level).name} !`, "reward", 3100);
    }
    unlocked.forEach((item, index) => window.setTimeout(() => {
      audio.reward();
      ui.toast(rewardMessage(item), "reward", 3200);
    }, 350 + index * 420));
    if (mergeCoins) ui.toast(`+${mergeCoins} pièce${mergeCoins > 1 ? "s" : ""} · Fidélité de la meute`, "reward");
  } catch {
    animator.render(engine.grid, result);
  } finally {
    inputLocked = false;
    input.reset();
    input.enabled = true;
  }
  if (result.gameOver) finishGame();
  return true;
}

function finishGame() {
  if (!inProgress) return;
  commitPlayTime();
  inProgress = false;
  const gameCoins = gameRewardClaimed ? 0 : gameCoinReward(engine.score, engine.maxLevel);
  if (!gameRewardClaimed) {
    profile.coins += gameCoins;
    gameRewardClaimed = true;
  }
  saveAll();
  audio.gameOver();
  input.enabled = false;
  const canContinue = secondChanceUsed < MONETIZATION_CONFIG.SECOND_CHANCE_LIMIT;
  ui.openDialog({
    title: "PARTIE TERMINÉE",
    html: `<div class="game-over-card">
      <div><span>SCORE</span><strong>${engine.score.toLocaleString("fr-FR")}</strong></div>
      <div><span>RECORD</span><strong>${profile.bestScore.toLocaleString("fr-FR")}</strong></div>
      <p>Meilleur chien <b>${dogForLevel(engine.maxLevel).name}</b></p>
      <p class="coin-reward">Récompense de partie <b>● +${gameCoins}</b></p>
    </div>`,
    actions: [
      ...(canContinue ? [{ label: "CONTINUER · PUB", kind: "secondary", onClick: () => continueWithReward() }] : []),
      { label: "RECOMMENCER", kind: "primary", onClick: () => restartAfterGame() },
      { label: "ACCUEIL", kind: "secondary", onClick: () => returnHome() }
    ],
    className: "game-over-dialog"
  });
}

async function continueWithReward() {
  const result = await adManager.showRewardedAd({
    placement: "second_chance",
    onRewardGranted: () => {
      engine.secondChance(3);
      secondChanceUsed += 1;
      inProgress = true;
      animator.render(engine.grid);
      saveAll();
      updateUI();
      input.enabled = true;
      playTimeMark = Date.now();
      audio.reward();
      ui.toast("Seconde chance accordée : 3 cases libérées.", "reward");
    },
    onAdFailed: () => ui.toast("La récompense n’a pas pu être validée.", "error")
  });
  if (result.status !== "rewarded") input.enabled = false;
}

async function restartAfterGame() {
  await adManager.showInterstitial({ gameNumber: profile.gamesPlayed });
  startNewGame();
}

function requestNewGame() {
  if (!inProgress) {
    startNewGame();
    return;
  }
  ui.openDialog({
    title: "RECOMMENCER ?",
    html: "<p class=\"confirm-copy\">Votre partie actuelle sera perdue.</p>",
    actions: [
      { label: "ANNULER", kind: "secondary" },
      { label: "RECOMMENCER", kind: "danger", onClick: () => startNewGame() }
    ]
  });
}

function offerRewardedJoker(type, onReady) {
  const labels = { undo: "ANNULER", remove: "SUPPRESSION", shuffle: "MÉLANGE" };
  const cost = MONETIZATION_CONFIG.JOKER_COSTS[type];
  const canBuy = canBuyJoker(profile.coins, type);
  ui.openDialog({
    title: "BESOIN D’UN JOKER ?",
    html: `<div class="reward-offer"><span>+1</span><strong>${labels[type]}</strong><p>Achetez ce joker pour <b>● ${cost}</b>, ou regardez une publicité pour l’obtenir gratuitement.</p><small>Solde : ● ${profile.coins}</small></div>`,
    actions: [
      { label: "PLUS TARD", kind: "secondary" },
      { label: `ACHETER · ${cost}`, kind: "secondary", disabled: !canBuy, onClick: () => {
        profile.coins -= cost;
        jokers[type] += 1;
        saveAll();
        updateUI();
        audio.reward();
        ui.toast(`Joker ${labels[type].toLowerCase()} acheté · −${cost} pièces`);
        window.setTimeout(onReady, 0);
      } },
      { label: "REGARDER UNE PUB", kind: "primary", onClick: async () => {
        await adManager.showRewardedAd({
          placement: `joker_${type}`,
          onRewardGranted: () => {
            jokers[type] += 1;
            saveAll();
            updateUI();
            audio.reward();
            ui.toast(`+1 joker ${labels[type].toLowerCase()}`, "reward");
            window.setTimeout(onReady, 0);
          },
          onAdFailed: () => ui.toast("La publicité est indisponible. Vous pouvez continuer à jouer.", "error")
        });
      } }
    ]
  });
}

function resumeAfterJoker() {
  inProgress = true;
  inputLocked = false;
  input.reset();
  input.enabled = true;
  playTimeMark = Date.now();
}

function useUndo() {
  if (inputLocked || deleteMode) return;
  if (jokers.undo <= 0) return offerRewardedJoker("undo", useUndo);
  if (!engine.lastSnapshot) return ui.toast("Aucun mouvement à annuler.");
  if (!engine.undo()) return;
  jokers.undo -= 1;
  profile.jokersUsed += 1;
  resumeAfterJoker();
  animator.render(engine.grid);
  saveAll();
  updateUI();
  audio.tap();
  vibrate(12);
}

function useRemove() {
  if (inputLocked) return;
  if (jokers.remove <= 0) return offerRewardedJoker("remove", useRemove);
  deleteMode = true;
  input.enabled = false;
  board.classList.add("is-delete-mode");
  document.querySelector("#deleteHint").hidden = false;
  ui.toast("Touchez le chien que vous souhaitez retirer.");
}

function cancelDeleteMode() {
  deleteMode = false;
  input.reset();
  board.classList.remove("is-delete-mode");
  document.querySelector("#deleteHint").hidden = true;
  input.enabled = document.body.dataset.screen === "game" && inProgress;
}

function useShuffle() {
  if (inputLocked || deleteMode) return;
  if (jokers.shuffle <= 0) return offerRewardedJoker("shuffle", useShuffle);
  if (!engine.shuffle()) return ui.toast("Ce plateau ne peut pas être débloqué par un mélange.", "error");
  jokers.shuffle -= 1;
  profile.jokersUsed += 1;
  resumeAfterJoker();
  animator.render(engine.grid);
  saveAll();
  updateUI();
  audio.tap();
  vibrate([8, 20, 8]);
  if (isGameOver(engine.grid)) finishGame();
}

function showSettings() {
  ui.showSettings(settings, (next) => {
    Object.assign(settings, next);
    saveManager.saveSettings(settings);
    audio.setSettings(settings);
    audio.tap();
  });
}

function setupTutorial() {
  if (saveManager.tutorialSeen()) return;
  const overlay = document.querySelector("#tutorial");
  const title = document.querySelector("#tutorialTitle");
  const text = document.querySelector("#tutorialText");
  const visual = document.querySelector("#tutorialVisual");
  const button = document.querySelector("#tutorialNext");
  const dots = [...document.querySelectorAll(".tutorial-dots i")];
  const pages = [
    { title: "GLISSE POUR DÉPLACER LES CHIENS", text: "Sur mobile, glisse dans une direction. Sur ordinateur, utilise les flèches.", visual: "<span>←</span><span>→</span>" },
    { title: "FUSIONNE DEUX CHIENS IDENTIQUES", text: "Deux chiens de même race donnent naissance à la race suivante.", visual: "<span>🐕</span><b>＋</b><span>🐕</span>" },
    { title: "DÉCOUVRE LES 20 RACES", text: "Du Chihuahua au Mastiff : complète le Chenil et bats ton record.", visual: "<span>1</span><b>→</b><span>20</span>" }
  ];
  let page = 0;
  const draw = () => {
    title.textContent = pages[page].title;
    text.textContent = pages[page].text;
    visual.innerHTML = pages[page].visual;
    dots.forEach((dot, index) => dot.classList.toggle("is-active", index === page));
    button.textContent = page === pages.length - 1 ? "JOUER" : "SUIVANT";
  };
  overlay.hidden = false;
  draw();
  button.addEventListener("click", () => {
    audio.tap();
    if (page < pages.length - 1) { page += 1; draw(); return; }
    overlay.hidden = true;
    saveManager.completeTutorial();
  });
}

function setupWebMCP() {
  const context = document.modelContext;
  if (!context?.registerTool) return;
  const lifecycle = new AbortController();
  const register = (tool) => {
    try { void Promise.resolve(context.registerTool(tool, { signal: lifecycle.signal })).catch(() => {}); } catch { /* API expérimentale indisponible */ }
  };
  register({
    name: "read_game_state",
    title: "Lire l’état de TOUTOU48",
    description: "Retourne le score, la grille, le meilleur chien et l’état de la partie sans rien modifier.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true, untrustedContentHint: false },
    execute() {
      return { inProgress, score: engine.score, grid: cloneGrid(engine.grid), maxDog: dogForLevel(engine.maxLevel).name, gameOver: isGameOver(engine.grid) };
    }
  });
  register({
    name: "start_new_game",
    title: "Commencer une nouvelle partie",
    description: "Remplace la partie actuelle par une nouvelle grille TOUTOU48 et affiche le plateau.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: false, untrustedContentHint: false },
    execute() {
      startNewGame();
      return { started: true, score: engine.score, grid: cloneGrid(engine.grid) };
    }
  });
  register({
    name: "move_dogs",
    title: "Déplacer la meute",
    description: "Joue un mouvement dans la partie TOUTOU48 active, avec les mêmes règles et animations que l’interface.",
    inputSchema: {
      type: "object",
      properties: { direction: { type: "string", enum: ["left", "right", "up", "down"] } },
      required: ["direction"],
      additionalProperties: false
    },
    annotations: { readOnlyHint: false, untrustedContentHint: false },
    async execute(input) {
      if (!input || !["left", "right", "up", "down"].includes(input.direction)) throw new Error("Direction invalide.");
      if (!inProgress || document.body.dataset.screen !== "game") throw new Error("Aucune partie active à l’écran.");
      const moved = await performMove(input.direction);
      return { moved, score: engine.score, grid: cloneGrid(engine.grid), gameOver: isGameOver(engine.grid) };
    }
  });
  window.addEventListener("pagehide", () => lifecycle.abort(), { once: true });
}

document.querySelector("#playButton").addEventListener("click", () => {
  audio.tap();
  if (savedGame?.inProgress) resumeGame(); else startNewGame();
});
document.querySelector("#homeButton").addEventListener("click", returnHome);
document.querySelector("#newGameButton").addEventListener("click", requestNewGame);
document.querySelector("#missionsButton").addEventListener("click", () => ui.showProgress(profile, engine.score));

document.querySelectorAll("[data-action]").forEach((button) => button.addEventListener("click", () => {
  audio.tap();
  const action = button.dataset.action;
  if (action === "collection") ui.showCollection(profile);
  if (action === "stats") ui.showStats(profile);
  if (action === "settings") showSettings();
}));

document.querySelectorAll("[data-joker]").forEach((button) => button.addEventListener("click", () => {
  const joker = button.dataset.joker;
  if (joker === "undo") useUndo();
  if (joker === "remove") useRemove();
  if (joker === "shuffle") useShuffle();
}));

document.querySelector("#tileLayer").addEventListener("click", (event) => {
  if (!deleteMode) return;
  const tile = event.target.closest(".dog-tile");
  if (!tile) return;
  const row = Number(tile.dataset.row);
  const col = Number(tile.dataset.col);
  if (!engine.removeTile(row, col)) return;
  jokers.remove -= 1;
  profile.jokersUsed += 1;
  inProgress = true;
  cancelDeleteMode();
  resumeAfterJoker();
  animator.render(engine.grid);
  saveAll();
  updateUI();
  audio.merge(1);
  vibrate(18);
});

window.addEventListener("toutou:ad-simulation", (event) => ui.showAdSimulation(event.detail));
document.querySelector(".currency").addEventListener("click", () => {
  ui.openDialog({
    title: "À QUOI SERVENT LES PIÈCES ?",
    html: `<div class="coin-help"><p>Les pièces permettent d’acheter des jokers sans regarder de publicité.</p><div><span>↶ Annuler</span><b>● ${MONETIZATION_CONFIG.JOKER_COSTS.undo}</b></div><div><span>× Supprimer</span><b>● ${MONETIZATION_CONFIG.JOKER_COSTS.remove}</b></div><div><span>⇄ Mélanger</span><b>● ${MONETIZATION_CONFIG.JOKER_COSTS.shuffle}</b></div><small>Vous gagnez des pièces en jouant, en terminant une partie, grâce aux missions et aux succès.</small></div>`,
    actions: [{ label: "COMPRIS", kind: "primary" }]
  });
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden) { commitPlayTime(); saveAll(); audio.stopAmbience(); }
  else if (document.body.dataset.screen === "game" && inProgress) { playTimeMark = Date.now(); audio.startAmbience(); }
});
window.addEventListener("beforeunload", () => { commitPlayTime(); saveAll(); });

if ("serviceWorker" in navigator) window.addEventListener("load", () => navigator.serviceWorker.register("./service-worker.js").catch(() => {}));

if (savedGame?.engine?.grid) engine.restore(savedGame.engine);
discoveredFromGrid();
profile.bestScore = Math.max(profile.bestScore, engine.score || 0);
saveManager.saveProfile(profile);
animator.render(engine.grid);
updateUI();
input.enabled = false;
setupTutorial();
setupWebMCP();

window.TOUTOU48 = Object.freeze({
  version: "2.0.0",
  AdManager: adManager,
  monetization: MONETIZATION_CONFIG,
  getState: () => currentSave()
});
