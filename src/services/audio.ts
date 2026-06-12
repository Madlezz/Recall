/**
 * Synthesized sound effects via Web Audio API — no external files needed.
 * All sounds are generated programmatically for zero-footprint bundling.
 */

let ctx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!ctx || ctx.state === "closed") {
    ctx = new AudioContext();
  }
  if (ctx.state === "suspended") {
    void ctx.resume();
  }
  return ctx;
}

function playTone(
  frequency: number,
  duration: number,
  type: OscillatorType = "sine",
  volume = 0.15,
  ramp = true,
): void {
  const c = getCtx();
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.value = frequency;
  gain.gain.setValueAtTime(volume, c.currentTime);
  if (ramp) gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration);
  osc.connect(gain);
  gain.connect(c.destination);
  osc.start(c.currentTime);
  osc.stop(c.currentTime + duration);
}

/** Subtle whoosh when card flips */
export function playFlipSound(): void {
  const c = getCtx();
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(300, c.currentTime);
  osc.frequency.exponentialRampToValueAtTime(600, c.currentTime + 0.08);
  gain.gain.setValueAtTime(0.06, c.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.12);
  osc.connect(gain);
  gain.connect(c.destination);
  osc.start(c.currentTime);
  osc.stop(c.currentTime + 0.12);
}

/** Pleasant ascending two-note chime for correct answers */
export function playCorrectSound(): void {
  const c = getCtx();
  playTone(523, 0.15, "sine", 0.1); // C5
  setTimeout(() => playTone(659, 0.2, "sine", 0.1), 80); // E5
}

/** Soft low buzz for "again" — not harsh, just informative */
export function playAgainSound(): void {
  playTone(220, 0.25, "triangle", 0.08);
}

/** Neutral blip for "hard" */
export function playHardSound(): void {
  playTone(370, 0.12, "triangle", 0.07);
}

/** Ascending arpeggio for level-up */
export function playLevelUpSound(): void {
  const notes = [523, 659, 784, 1047]; // C5 E5 G5 C6
  notes.forEach((freq, i) => {
    setTimeout(() => playTone(freq, 0.25, "sine", 0.12), i * 100);
  });
}

/** Sparkly jingle for achievement unlock */
export function playAchievementSound(): void {
  const notes = [659, 784, 1047]; // E5 G5 C6
  notes.forEach((freq, i) => {
    setTimeout(() => playTone(freq, 0.3, "sine", 0.1), i * 120);
  });
}

/** Session start chime */
export function playSessionStartSound(): void {
  playTone(440, 0.12, "sine", 0.08);
  setTimeout(() => playTone(554, 0.15, "sine", 0.08), 100);
}