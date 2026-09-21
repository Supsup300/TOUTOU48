export class AudioManager {
  constructor(settings) {
    this.settings = settings;
    this.context = null;
    this.musicTimer = null;
  }

  ensureContext() {
    if (!this.context) this.context = new (window.AudioContext || window.webkitAudioContext)();
    if (this.context.state === "suspended") this.context.resume();
    return this.context;
  }

  tone(frequency, duration = 0.08, volume = 0.035, type = "sine", delay = 0) {
    if (!this.settings.sounds) return;
    const context = this.ensureContext();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const start = context.currentTime + delay;
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.02);
  }

  slide() { this.tone(150, 0.045, 0.018, "triangle"); }
  tap() { this.tone(260, 0.045, 0.025, "sine"); }
  merge(level = 1) {
    const base = Math.min(720, 250 + level * 22);
    this.tone(base, 0.11, 0.045, "triangle");
    this.tone(base * 1.5, 0.13, 0.025, "sine", 0.045);
  }
  discovery() {
    [392, 494, 587].forEach((frequency, i) => this.tone(frequency, 0.2, 0.035, "sine", i * 0.07));
  }
  reward() {
    [440, 554, 659, 880].forEach((frequency, i) => this.tone(frequency, 0.13, 0.028, "triangle", i * 0.045));
  }
  gameOver() {
    [330, 262, 196].forEach((frequency, i) => this.tone(frequency, 0.22, 0.03, "sine", i * 0.11));
  }

  setSettings(settings) {
    this.settings = settings;
    if (settings.music) this.startAmbience(); else this.stopAmbience();
  }

  startAmbience() {
    if (!this.settings.music || this.musicTimer) return;
    const playChord = () => {
      if (!this.settings.music || document.hidden) return;
      const originalSound = this.settings.sounds;
      this.settings.sounds = true;
      [110, 164.8, 220].forEach((frequency, i) => this.tone(frequency, 1.8, 0.006, "sine", i * 0.04));
      this.settings.sounds = originalSound;
    };
    playChord();
    this.musicTimer = window.setInterval(playChord, 9000);
  }

  stopAmbience() {
    if (this.musicTimer) window.clearInterval(this.musicTimer);
    this.musicTimer = null;
  }
}
