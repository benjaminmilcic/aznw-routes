import { Injectable } from '@angular/core';
import confetti from 'canvas-confetti';

/**
 * Taken over from the whiteboard app – usable by all games here.
 * Takes care of the "show" at the end of a game: fireworks + sound on a win,
 * a sad sound on a loss, cheerful-neutral on a draw.
 *
 * The sounds are generated with the Web Audio API, so that no external
 * audio files have to be bundled or loaded.
 */
@Injectable({ providedIn: 'root' })
export class GameEffectsService {
  private audio: AudioContext | null = null;
  private fireworkTimer: ReturnType<typeof setInterval> | null = null;
  private soundTimers: ReturnType<typeof setTimeout>[] = [];

  /** Fireworks + fireworks sound on a win. */
  celebrate(): void {
    this.stop();
    this.launchFireworks();
    this.playFireworkShow();
  }

  /** Sad "wah-wah" sound on a loss. */
  commiserate(): void {
    this.stop();
    this.playSadTrombone();
  }

  /** Friendly bells + gentle confetti rain on a draw. */
  draw(): void {
    this.stop();
    this.gentleConfetti();
    this.playChime();
  }

  /** Cleans up running effects (e.g. when leaving the screen). */
  stop(): void {
    if (this.fireworkTimer) {
      clearInterval(this.fireworkTimer);
      this.fireworkTimer = null;
    }
    for (const t of this.soundTimers) clearTimeout(t);
    this.soundTimers = [];
    confetti.reset();
  }

  // ---- Confetti / fireworks (canvas-confetti) -------------------------

  private launchFireworks(): void {
    const duration = 5000;
    const end = Date.now() + duration;
    const colors = ['#f6c945', '#4a93ff', '#e76f8a', '#7ac043', '#ef7d35', '#ffffff'];
    const defaults = { startVelocity: 32, spread: 360, ticks: 70, zIndex: 1000 };
    const rnd = (min: number, max: number) => Math.random() * (max - min) + min;

    this.fireworkTimer = setInterval(() => {
      const timeLeft = end - Date.now();
      if (timeLeft <= 0) {
        if (this.fireworkTimer) clearInterval(this.fireworkTimer);
        this.fireworkTimer = null;
        return;
      }
      const particleCount = Math.round(45 * (timeLeft / duration)) + 10;
      confetti({ ...defaults, particleCount, colors, origin: { x: rnd(0.1, 0.35), y: Math.random() - 0.2 } });
      confetti({ ...defaults, particleCount, colors, origin: { x: rnd(0.65, 0.9), y: Math.random() - 0.2 } });
    }, 280);
  }

  private gentleConfetti(): void {
    const colors = ['#85bbff', '#b9d8ff', '#dcecff', '#f6c945'];
    confetti({ particleCount: 70, spread: 100, startVelocity: 26, origin: { y: 0.3 }, colors, zIndex: 1000 });
    const timer = setTimeout(() => {
      confetti({ particleCount: 50, spread: 120, startVelocity: 20, origin: { y: 0.2 }, colors, zIndex: 1000 });
    }, 350);
    this.soundTimers.push(timer);
  }

  // ---- Sound generation -----------------------------------------------

  private ctx(): AudioContext | null {
    if (!this.audio) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      this.audio = new Ctor();
    }
    if (this.audio.state === 'suspended') this.audio.resume().catch(() => {});
    return this.audio;
  }

  /** Several "rise + bang + crackle" salvos over a few seconds. */
  private playFireworkShow(): void {
    const ctx = this.ctx();
    if (!ctx) return;
    const offsets = [0, 600, 1300, 2100, 3000, 3900];
    for (const ms of offsets) {
      const timer = setTimeout(() => {
        const c = this.ctx();
        if (c) this.playSingleFirework(c);
      }, ms);
      this.soundTimers.push(timer);
    }
  }

  private playSingleFirework(ctx: AudioContext): void {
    const now = ctx.currentTime;

    const whistle = ctx.createOscillator();
    const whistleGain = ctx.createGain();
    whistle.type = 'sine';
    whistle.frequency.setValueAtTime(400, now);
    whistle.frequency.exponentialRampToValueAtTime(1400, now + 0.5);
    whistleGain.gain.setValueAtTime(0.0001, now);
    whistleGain.gain.exponentialRampToValueAtTime(0.12, now + 0.05);
    whistleGain.gain.exponentialRampToValueAtTime(0.04, now + 0.5);
    whistle.connect(whistleGain).connect(ctx.destination);
    whistle.start(now);
    whistle.stop(now + 0.55);

    const boomAt = now + 0.55;
    const boom = ctx.createBufferSource();
    boom.buffer = this.noiseBuffer(ctx, 0.5);
    const boomFilter = ctx.createBiquadFilter();
    boomFilter.type = 'lowpass';
    boomFilter.frequency.setValueAtTime(900, boomAt);
    boomFilter.frequency.exponentialRampToValueAtTime(120, boomAt + 0.4);
    const boomGain = ctx.createGain();
    boomGain.gain.setValueAtTime(0.5, boomAt);
    boomGain.gain.exponentialRampToValueAtTime(0.001, boomAt + 0.5);
    boom.connect(boomFilter).connect(boomGain).connect(ctx.destination);
    boom.start(boomAt);
    boom.stop(boomAt + 0.5);

    const crackle = ctx.createBufferSource();
    crackle.buffer = this.noiseBuffer(ctx, 0.6);
    const crackleFilter = ctx.createBiquadFilter();
    crackleFilter.type = 'highpass';
    crackleFilter.frequency.value = 4000;
    const crackleGain = ctx.createGain();
    crackleGain.gain.setValueAtTime(0.0001, boomAt + 0.05);
    crackleGain.gain.linearRampToValueAtTime(0.12, boomAt + 0.12);
    crackleGain.gain.exponentialRampToValueAtTime(0.001, boomAt + 0.6);
    crackle.connect(crackleFilter).connect(crackleGain).connect(ctx.destination);
    crackle.start(boomAt + 0.05);
    crackle.stop(boomAt + 0.65);
  }

  /** Classic descending "wah-wah-wah-waaah" on a loss. */
  private playSadTrombone(): void {
    const ctx = this.ctx();
    if (!ctx) return;
    const start = ctx.currentTime + 0.05;
    const notes = [
      { f: 311, dur: 0.32 }, // Eb4
      { f: 277, dur: 0.32 }, // C#4
      { f: 247, dur: 0.32 }, // B3
      { f: 220, dur: 0.85 }, // A3 (drawn out)
    ];
    let t = start;
    notes.forEach((n, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(n.f, t);
      osc.frequency.linearRampToValueAtTime(n.f * 0.94, t + n.dur);

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 1100;

      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.18, t + 0.05);
      gain.gain.setValueAtTime(0.18, t + n.dur - 0.08);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + n.dur);

      if (i === notes.length - 1) {
        const lfo = ctx.createOscillator();
        const lfoGain = ctx.createGain();
        lfo.frequency.value = 6;
        lfoGain.gain.value = 10;
        lfo.connect(lfoGain).connect(osc.frequency);
        lfo.start(t);
        lfo.stop(t + n.dur);
      }

      osc.connect(filter).connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + n.dur + 0.02);
      t += n.dur + 0.04;
    });
  }

  /** Friendly rising bells (draw). */
  private playChime(): void {
    const ctx = this.ctx();
    if (!ctx) return;
    const start = ctx.currentTime + 0.05;
    const notes = [523.25, 659.25, 783.99]; // C5 – E5 – G5 (major triad)
    let t = start;
    for (const f of notes) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = f;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.18, t + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.5);
      t += 0.18;
    }
  }

  /** Creates a short buffer of white noise. */
  private noiseBuffer(ctx: AudioContext, seconds: number): AudioBuffer {
    const length = Math.floor(ctx.sampleRate * seconds);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
    return buffer;
  }
}
