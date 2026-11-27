// All sound is synthesised with WebAudio — no audio files, so the game stays a
// handful of static files that work fully offline. The context is created on
// the first user gesture, as browsers require.

export class SoundFX {
  constructor() {
    this.ctx = null;
    this.muted = false;
  }

  ensure() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return true;
    }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      this.ctx = new AC();
      return true;
    } catch {
      return false;
    }
  }

  tone(freq, seconds, type = 'sine', volume = 0.16, slideTo = null, delay = 0) {
    if (this.muted || !this.ensure()) return;
    const ctx = this.ctx;
    const t0 = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo !== null) osc.frequency.exponentialRampToValueAtTime(Math.max(30, slideTo), t0 + seconds);
    gain.gain.setValueAtTime(volume, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + seconds);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + seconds + 0.02);
  }

  noise(seconds, volume = 0.12, delay = 0) {
    if (this.muted || !this.ensure()) return;
    const ctx = this.ctx;
    const t0 = ctx.currentTime + delay;
    const len = Math.max(1, Math.floor(ctx.sampleRate * seconds));
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + seconds);
    src.connect(gain).connect(ctx.destination);
    src.start(t0);
  }

  jump() { this.tone(320, 0.16, 'square', 0.07, 640); }
  flap() { this.noise(0.14, 0.1); this.tone(520, 0.1, 'sine', 0.05, 760); }
  corn() { this.tone(880, 0.09, 'sine', 0.12); this.tone(1320, 0.12, 'sine', 0.1, null, 0.06); }
  golden() { [660, 880, 1100, 1470].forEach((f, i) => this.tone(f, 0.14, 'triangle', 0.12, null, i * 0.06)); }
  stumble() { this.noise(0.2, 0.18); this.tone(140, 0.25, 'sawtooth', 0.12, 60); }
  puddle() { this.noise(0.18, 0.1); this.tone(300, 0.15, 'sine', 0.06, 120); }
  knifeWhistle() { this.tone(1900, 0.3, 'sine', 0.05, 500); }
  clang() { this.tone(2400, 0.18, 'square', 0.06, 1800); this.noise(0.06, 0.08); }
  gobble() { for (let i = 0; i < 4; i += 1) this.tone(420 + Math.random() * 80, 0.07, 'sawtooth', 0.05, 300, i * 0.08); }
  win() { [523, 659, 784, 1047, 784, 1047].forEach((f, i) => this.tone(f, 0.22, 'triangle', 0.13, null, i * 0.13)); }
  caught() { [392, 370, 349, 311].forEach((f, i) => this.tone(f, 0.3, 'sawtooth', 0.09, null, i * 0.2)); }
}
