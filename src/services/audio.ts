/**
 * Synthesized sound effects via Web Audio API — no external files needed.
 * All sounds are generated programmatically for zero-footprint bundling.
 */

let ctx: AudioContext | null = null;
let _masterVolume = 1.0; // 0.0 - 1.0

export function setMasterVolume(volume: number): void {
  _masterVolume = Number.isFinite(volume) ? Math.max(0, Math.min(1, volume)) : 1.0;
}

export function getMasterVolume(): number {
  return _masterVolume;
}

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
  gain.gain.setValueAtTime(volume * _masterVolume, c.currentTime);
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
  gain.gain.setValueAtTime(0.06 * _masterVolume, c.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.12);
  osc.connect(gain);
  gain.connect(c.destination);
  osc.start(c.currentTime);
  osc.stop(c.currentTime + 0.12);
}

/** Pleasant ascending two-note chime for correct answers */
export function playCorrectSound(): void {
  getCtx();
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

// ── Ambient Soundscapes ──

export type Soundscape = "rain" | "cafe" | "lofi" | "none";

let ambientNodes: AudioNode[] = [];
let ambientPlaying: Soundscape = "none";

function stopAmbient(): void {
  for (const node of ambientNodes) {
    try { node.disconnect(); } catch { /* already disconnected */ }
  }
  ambientNodes = [];
  ambientPlaying = "none";
}

function createNoiseBuffer(duration = 2): AudioBuffer {
  const c = getCtx();
  const sampleRate = c.sampleRate;
  const length = sampleRate * duration;
  const buffer = c.createBuffer(1, length, sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  return buffer;
}

function createNoiseSource(): AudioBufferSourceNode {
  const c = getCtx();
  const source = c.createBufferSource();
  source.buffer = createNoiseBuffer(3);
  source.loop = true;
  return source;
}

export function startRain(): void {
  stopAmbient();
  const c = getCtx();
  const noise = createNoiseSource();
  const filter = c.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = 800;
  filter.Q.value = 0.5;
  const gain = c.createGain();
  gain.gain.value = 0.04 * _masterVolume;
  noise.connect(filter);
  filter.connect(gain);
  gain.connect(c.destination);
  noise.start();
  ambientNodes = [noise, filter, gain];
  ambientPlaying = "rain";
}

export function startCafe(): void {
  stopAmbient();
  const c = getCtx();
  // Low rumble
  const noise = createNoiseSource();
  const lowpass = c.createBiquadFilter();
  lowpass.type = "lowpass";
  lowpass.frequency.value = 200;
  const rumbleGain = c.createGain();
  rumbleGain.gain.value = 0.025 * _masterVolume;
  noise.connect(lowpass);
  lowpass.connect(rumbleGain);
  rumbleGain.connect(c.destination);
  noise.start();
  ambientNodes = [noise, lowpass, rumbleGain];

  // Random tonal pings (cups clinking, distant chatter)
  const pingInterval = setInterval(() => {
    if (ambientPlaying !== "cafe") { clearInterval(pingInterval); return; }
    const freq = 800 + Math.random() * 1200;
    const pingVol = (0.01 + Math.random() * 0.02) * _masterVolume;
    const osc = c.createOscillator();
    const pingGain = c.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    pingGain.gain.setValueAtTime(pingVol, c.currentTime);
    pingGain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.3);
    osc.connect(pingGain);
    pingGain.connect(c.destination);
    osc.start();
    osc.stop(c.currentTime + 0.3);
  }, 1500 + Math.random() * 3000);
  
  ambientNodes.push({ disconnect: () => clearInterval(pingInterval) } as unknown as AudioNode);
  ambientPlaying = "cafe";
}

export function startLofi(): void {
  stopAmbient();
  const c = getCtx();
  // Warm low pad
  const osc = c.createOscillator();
  const lfo = c.createOscillator();
  const lfoGain = c.createGain();
  const mainGain = c.createGain();
  const filter = c.createBiquadFilter();
  
  osc.type = "triangle";
  osc.frequency.value = 110; // A2
  lfo.type = "sine";
  lfo.frequency.value = 0.3; // Slow modulation
  lfoGain.gain.value = 15;
  
  filter.type = "lowpass";
  filter.frequency.value = 600;
  filter.Q.value = 0.7;
  
  mainGain.gain.value = 0.06 * _masterVolume;
  
  lfo.connect(lfoGain);
  lfoGain.connect(osc.frequency);
  osc.connect(filter);
  filter.connect(mainGain);
  mainGain.connect(c.destination);
  
  lfo.start();
  osc.start();
  
  ambientNodes = [lfo, lfoGain, osc, filter, mainGain];
  ambientPlaying = "lofi";
}

export function startSoundscape(name: Soundscape): void {
  switch (name) {
    case "rain": startRain(); break;
    case "cafe": startCafe(); break;
    case "lofi": startLofi(); break;
    case "none": stopAmbient(); break;
  }
}

export function stopSoundscape(): void {
  stopAmbient();
}

export function getPlayingSoundscape(): Soundscape {
  return ambientPlaying;
}

/** Short click-tonk for tile selection */
export function playTileClickSound(): void {
  playTone(660, 0.08, "sine", 0.08);
}

/** Pleasant ding for successful match */
export function playMatchSound(): void {
  playTone(784, 0.12, "sine", 0.1);
  setTimeout(() => playTone(988, 0.15, "sine", 0.1), 70);
}

/** Low thud for wrong match */
export function playMismatchSound(): void {
  playTone(200, 0.2, "triangle", 0.06);
}