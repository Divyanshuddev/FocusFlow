import type { AmbientSound } from "@/types";

/**
 * Lightweight procedural Web Audio synthesizer for distraction-free focus soundscapes
 * and session completion chimes. Works 100% locally without external MP3 dependencies.
 */
class AmbientAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private cleanupFns: Array<() => void> = [];
  private activeSound: AmbientSound = "none";

  private ensureContext(): AudioContext | null {
    if (typeof window === "undefined") return null;
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return null;
    if (!this.ctx) {
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public stop(): void {
    this.cleanupFns.forEach((fn) => {
      try {
        fn();
      } catch {
        // Ignore teardown errors
      }
    });
    this.cleanupFns = [];
    this.activeSound = "none";
  }

  public setVolume(volume: number): void {
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(Math.max(0, Math.min(1, volume)), this.ctx.currentTime, 0.08);
    }
  }

  public play(sound: AmbientSound, volume = 0.35): void {
    if (sound === "none") {
      this.stop();
      return;
    }
    if (this.activeSound === sound) {
      this.setVolume(volume);
      return;
    }

    this.stop();
    const ctx = this.ensureContext();
    if (!ctx) return;

    const master = ctx.createGain();
    master.gain.setValueAtTime(0.001, ctx.currentTime);
    master.gain.exponentialRampToValueAtTime(Math.max(0.02, volume), ctx.currentTime + 0.6);
    master.connect(ctx.destination);
    this.masterGain = master;
    this.activeSound = sound;

    if (sound === "rain" || sound === "brown_noise" || sound === "forest") {
      const bufferSize = ctx.sampleRate * 3;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);

      let lastOut = 0.0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        if (sound === "brown_noise") {
          data[i] = (lastOut + 0.02 * white) / 1.02;
          lastOut = data[i];
          data[i] *= 2.8;
        } else {
          // Pink-ish noise curve
          lastOut = 0.96 * lastOut + 0.04 * white;
          data[i] = lastOut * 1.8 + white * 0.18;
        }
      }

      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.loop = true;

      const filter = ctx.createBiquadFilter();
      if (sound === "rain") {
        filter.type = "bandpass";
        filter.frequency.value = 1100;
        filter.Q.value = 0.7;
      } else if (sound === "forest") {
        filter.type = "lowpass";
        filter.frequency.value = 650;
      } else {
        filter.type = "lowpass";
        filter.frequency.value = 340;
      }

      source.connect(filter);
      filter.connect(master);
      source.start();

      this.cleanupFns.push(() => {
        source.stop();
        source.disconnect();
        filter.disconnect();
        master.disconnect();
      });
    } else if (sound === "lofi") {
      // Soft warm harmonic drone (C2, G2, E3, B3)
      const freqs = [130.81, 196.0, 246.94, 329.63];
      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 480;
      filter.connect(master);

      const oscillators = freqs.map((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = idx % 2 === 0 ? "sine" : "triangle";
        osc.frequency.value = freq;
        gain.gain.value = 0.08;
        osc.connect(gain);
        gain.connect(filter);
        osc.start();
        return { osc, gain };
      });

      this.cleanupFns.push(() => {
        oscillators.forEach(({ osc, gain }) => {
          osc.stop();
          osc.disconnect();
          gain.disconnect();
        });
        filter.disconnect();
        master.disconnect();
      });
    }
  }

  public playCompletionChime(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const start = ctx.currentTime + idx * 0.14;
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0.001, start);
      gain.gain.exponentialRampToValueAtTime(0.14, start + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.55);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.6);
    });
  }
}

export const ambientAudio = new AmbientAudioEngine();
