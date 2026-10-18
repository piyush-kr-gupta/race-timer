/**
 * Browser Text-to-Speech service using Web Speech API (speechSynthesis).
 * Offline-capable, zero external dependencies.
 */

export class SpeechService {
  private enabled: boolean = true;
  private volume: number = 0.8;
  private rate: number = 1.0;
  private pitch: number = 1.0;

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
  }

  setRate(rate: number) {
    this.rate = Math.max(0.5, Math.min(2, rate));
  }

  setPitch(pitch: number) {
    this.pitch = Math.max(0.5, Math.min(2, pitch));
  }

  isSupported(): boolean {
    return (
      typeof window !== 'undefined' &&
      'speechSynthesis' in window &&
      typeof window.SpeechSynthesisUtterance !== 'undefined'
    );
  }

  /**
   * Speaks out the given text using window.speechSynthesis.
   * Cancels any previously playing utterance to avoid speech queue backlog.
   */
  speak(text: string): boolean {
    if (!this.enabled || !text.trim() || !this.isSupported()) {
      return false;
    }

    try {
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }
      window.speechSynthesis.cancel();

      const utterance = new window.SpeechSynthesisUtterance(text.trim());
      utterance.volume = this.volume;
      utterance.rate = this.rate;
      utterance.pitch = this.pitch;
      utterance.lang = 'en-US';

      window.speechSynthesis.speak(utterance);
      return true;
    } catch (e) {
      console.warn('Speech synthesis playback failed:', e);
      return false;
    }
  }

  cancel() {
    if (this.isSupported()) {
      try {
        window.speechSynthesis.cancel();
      } catch (e) {
        // ignore
      }
    }
  }
}

export const speech = new SpeechService();
