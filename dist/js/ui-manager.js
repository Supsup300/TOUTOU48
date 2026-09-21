import { DOGS, dogForLevel, spritePosition } from "./dogs.js";
import { ACHIEVEMENTS, OBJECTIVES, objectiveProgress } from "./achievements.js";

const escapeHtml = (value) => String(value)
  .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;").replaceAll("'", "&#039;");

export class UIManager {
  constructor() {
    this.screens = [...document.querySelectorAll(".screen")];
    this.dialog = document.querySelector("#appDialog");
    this.dialogTitle = document.querySelector("#dialogTitle");
    this.dialogBody = document.querySelector("#dialogBody");
    this.dialogActions = document.querySelector("#dialogActions");
    this.toastRegion = document.querySelector("#toastRegion");
  }

  showScreen(name) {
    this.screens.forEach((screen) => screen.classList.toggle("is-active", screen.dataset.screen === name));
    document.body.dataset.screen = name;
  }

  updateHeader({ score, bestScore, coins, maxLevel, jokers }) {
    document.querySelector("#scoreValue").textContent = score.toLocaleString("fr-FR");
    document.querySelector("#bestValue").textContent = bestScore.toLocaleString("fr-FR");
    document.querySelector("#coinValue").textContent = coins.toLocaleString("fr-FR");
    document.querySelector("#maxDogName").textContent = dogForLevel(maxLevel).short;
    document.querySelector("#maxDogLevel").textContent = `Niv. ${maxLevel}`;
    Object.entries(jokers).forEach(([name, count]) => {
      const element = document.querySelector(`[data-joker-count="${name}"]`);
      if (element) element.textContent = count > 0 ? String(count) : "+";
    });
  }

  updateHome(hasSave, maxLevel, bestScore) {
    const play = document.querySelector("#playButton");
    play.querySelector("span").textContent = hasSave ? "REPRENDRE" : "JOUER";
    document.querySelector("#homeRecord").textContent = bestScore.toLocaleString("fr-FR");
    document.querySelector("#homeDogName").textContent = dogForLevel(maxLevel).short;
    const hero = document.querySelector("#heroDog");
    hero.style.backgroundPosition = spritePosition(maxLevel);
  }

  openDialog({ title, html, actions = [], className = "" }) {
    this.dialogTitle.textContent = title;
    this.dialogBody.innerHTML = html;
    this.dialogActions.replaceChildren();
    this.dialog.className = `app-dialog ${className}`.trim();
    actions.forEach(({ label, kind = "secondary", onClick, close = true, disabled = false }) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `button button-${kind}`;
      button.textContent = label;
      button.disabled = disabled;
      button.addEventListener("click", () => {
        if (close) this.closeDialog();
        onClick?.();
      });
      this.dialogActions.append(button);
    });
    if (!this.dialog.open) this.dialog.showModal();
  }

  closeDialog() {
    if (this.dialog.open) this.dialog.close();
  }

  showCollection(profile) {
    const cards = DOGS.map((dog) => {
      const discovered = profile.discovered.includes(dog.level);
      const position = spritePosition(dog.level);
      return `<article class="collection-card ${discovered ? "is-found" : "is-locked"}">
        <div class="collection-art" style="background-position:${position}">${discovered ? "" : "<span>?</span>"}</div>
        <div><small>NIVEAU ${dog.level}</small><strong>${discovered ? escapeHtml(dog.name) : "???"}</strong></div>
        <span class="collection-state">${discovered ? "Découvert ✓" : "À découvrir"}</span>
      </article>`;
    }).join("");
    this.openDialog({
      title: "LE CHENIL",
      html: `<div class="collection-summary"><strong>${profile.discovered.length} / 20</strong><span>races découvertes</span></div><div class="collection-grid">${cards}</div>`,
      actions: [{ label: "FERMER", kind: "primary" }],
      className: "wide-dialog"
    });
  }

  showStats(profile) {
    const rows = [
      ["Parties jouées", profile.gamesPlayed.toLocaleString("fr-FR")],
      ["Meilleur score", profile.bestScore.toLocaleString("fr-FR")],
      ["Fusions réalisées", profile.totalMerges.toLocaleString("fr-FR")],
      ["Plus grande race", dogForLevel(profile.maxLevel).name],
      ["Chiens découverts", `${profile.discovered.length} / 20`],
      ["Jokers utilisés", profile.jokersUsed.toLocaleString("fr-FR")],
      ["Temps de jeu", this.formatTime(profile.playTimeMs)]
    ];
    this.openDialog({
      title: "STATISTIQUES",
      html: `<div class="stats-list">${rows.map(([label, value]) => `<div><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`).join("")}</div>`,
      actions: [{ label: "FERMER", kind: "primary" }]
    });
  }

  showProgress(profile, score) {
    const objectives = OBJECTIVES.map((objective) => {
      const progress = objectiveProgress(objective, profile, score);
      const complete = profile.objectives.includes(objective.id);
      const reward = objective.reward.coins ? `${objective.reward.coins} pièces` : "+1 mélange";
      return `<article class="mission-row ${complete ? "is-complete" : ""}">
        <div><strong>${escapeHtml(objective.title)}</strong><small>${complete ? "Terminé" : `${Math.min(progress.value, objective.target).toLocaleString("fr-FR")} / ${objective.target.toLocaleString("fr-FR")}`} · ${reward}</small></div>
        <div class="progress-track"><i style="width:${progress.ratio * 100}%"></i></div>
      </article>`;
    }).join("");
    const achievements = ACHIEVEMENTS.map((item) => {
      const unlocked = profile.achievements.includes(item.id);
      return `<article class="badge-row ${unlocked ? "is-unlocked" : ""}"><span>${unlocked ? "◆" : "◇"}</span><div><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(item.description)}</small></div></article>`;
    }).join("");
    this.openDialog({
      title: "MISSIONS & SUCCÈS",
      html: `<h3 class="dialog-section-title">OBJECTIFS</h3><div class="mission-list">${objectives}</div><h3 class="dialog-section-title">SUCCÈS</h3><div class="badge-list">${achievements}</div>`,
      actions: [{ label: "FERMER", kind: "primary" }],
      className: "wide-dialog"
    });
  }

  showSettings(settings, onChange) {
    const setting = (key, label, checked) => `<label class="setting-row"><span>${label}</span><input type="checkbox" data-setting="${key}" ${checked ? "checked" : ""}><i aria-hidden="true"></i></label>`;
    this.openDialog({
      title: "PARAMÈTRES",
      html: `<div class="settings-list">${setting("music", "Musique", settings.music)}${setting("sounds", "Sons", settings.sounds)}${setting("haptics", "Vibrations", settings.haptics)}</div><p class="settings-note">La progression est sauvegardée automatiquement sur cet appareil.</p>`,
      actions: [{ label: "FERMER", kind: "primary" }]
    });
    this.dialogBody.querySelectorAll("[data-setting]").forEach((input) => input.addEventListener("change", () => {
      settings[input.dataset.setting] = input.checked;
      onChange(settings);
    }));
  }

  toast(message, kind = "default", duration = 2400) {
    const toast = document.createElement("div");
    toast.className = `toast toast-${kind}`;
    toast.textContent = message;
    this.toastRegion.append(toast);
    requestAnimationFrame(() => toast.classList.add("is-visible"));
    window.setTimeout(() => {
      toast.classList.remove("is-visible");
      window.setTimeout(() => toast.remove(), 220);
    }, duration);
  }

  showAdSimulation({ kind = "rewarded", complete } = {}) {
    const overlay = document.querySelector("#adSimulation");
    const title = overlay.querySelector("strong");
    const note = overlay.querySelector("small");
    const progress = overlay.querySelector(".ad-progress i");
    const close = overlay.querySelector("button");
    const rewarded = kind === "rewarded";
    title.textContent = rewarded ? "Publicité récompensée" : "Pause publicitaire";
    note.textContent = rewarded ? "La récompense sera accordée à la fin." : "La partie reste gratuite grâce à cette publicité test.";
    progress.style.animationDuration = rewarded ? "2.5s" : "3s";
    close.hidden = true;
    overlay.hidden = false;
    requestAnimationFrame(() => overlay.classList.add("is-visible"));
    window.setTimeout(() => {
      close.hidden = false;
      close.textContent = rewarded ? "RÉCUPÉRER LA RÉCOMPENSE" : "CONTINUER";
      close.onclick = () => {
        overlay.classList.remove("is-visible");
        window.setTimeout(() => { overlay.hidden = true; }, 180);
        complete?.({ rewarded });
      };
    }, rewarded ? 2500 : 3000);
  }

  formatTime(milliseconds) {
    const minutes = Math.floor(milliseconds / 60000);
    if (minutes < 60) return `${minutes} min`;
    return `${Math.floor(minutes / 60)} h ${minutes % 60} min`;
  }
}
