/**
 * Web Audio API synthesizer for Race Timer.
 * Generates crisp, offline, synthetic sound effects with zero external assets.
 */

class AudioService {
  private ctx: AudioContext | null = null;
  private volume: number = 0.8;
  private enabled: boolean = true;

  private getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;

    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }

    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }

    return this.ctx;
  }

  setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  /**
   * Warning alert: double tone (e.g. 880Hz -> 880Hz) to notify user time is running low
   */
  playWarningAlert() {
    if (!this.enabled || this.volume <= 0) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      // Tone 1
      this.playTone(ctx, 880, 'sine', now, 0.12, 0.25 * this.volume);
      // Tone 2
      this.playTone(ctx, 1100, 'sine', now + 0.16, 0.16, 0.3 * this.volume);
    } catch (e) {
      console.warn('Audio warning playback failed:', e);
    }
  }

  /**
   * Gentle countdown warning pip: soft, subtle sine pulse triggered every second during final countdown (from 10s or 15s to 1s)
   */
  playCountdownWarning(secondsRemaining: number) {
    if (!this.enabled || this.volume <= 0) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      // Gentle soft pip: 660Hz for 15s-4s, slightly brighter 880Hz for final 3s, 2s, 1s
      const freq = secondsRemaining <= 3 ? 880 : 660;
      this.playTone(ctx, freq, 'sine', now, 0.08, 0.16 * this.volume);
    } catch (e) {
      console.warn('Audio countdown warning playback failed:', e);
    }
  }

  /**
   * Task completion chime: cheerful ascending chime (587Hz -> 880Hz)
   */
  playTaskComplete() {
    if (!this.enabled || this.volume <= 0) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      this.playTone(ctx, 587.33, 'triangle', now, 0.18, 0.3 * this.volume); // D5
      this.playTone(ctx, 880, 'triangle', now + 0.15, 0.35, 0.35 * this.volume); // A5
    } catch (e) {
      console.warn('Audio task complete playback failed:', e);
    }
  }

  /**
   * Race completion fanfare: triumphant 4-tone victory chord (C5 -> E5 -> G5 -> C6)
   */
  playRaceComplete() {
    if (!this.enabled || this.volume <= 0) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const notes = [
        { freq: 523.25, time: 0.0, duration: 0.2 }, // C5
        { freq: 659.25, time: 0.18, duration: 0.2 }, // E5
        { freq: 783.99, time: 0.36, duration: 0.25 }, // G5
        { freq: 1046.5, time: 0.6, duration: 0.6 }, // C6
      ];

      for (const note of notes) {
        this.playTone(ctx, note.freq, 'sine', now + note.time, note.duration, 0.35 * this.volume);
      }
    } catch (e) {
      console.warn('Audio race complete playback failed:', e);
    }
  }

  /**
   * Overtime warning ping: brief low-urgency pulse
   */
  playOvertimePing() {
    if (!this.enabled || this.volume <= 0) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      this.playTone(ctx, 440, 'sine', now, 0.1, 0.15 * this.volume);
    } catch (e) {
      console.warn('Audio overtime playback failed:', e);
    }
  }

  private playTone(
    ctx: AudioContext,
    freq: number,
    type: OscillatorType,
    startTime: number,
    duration: number,
    peakGain: number
  ) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, startTime);

    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.linearRampToValueAtTime(peakGain, startTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(startTime);
    osc.stop(startTime + duration + 0.05);
  }
}

export const audio = new AudioService();
