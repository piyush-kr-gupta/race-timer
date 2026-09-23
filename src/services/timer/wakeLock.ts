/**
 * Screen Wake Lock API service.
 * Keeps screen awake during active race runs, automatically reacquiring when tab regains focus.
 */

interface WakeLockSentinel {
  released: boolean;
  release(): Promise<void>;
  addEventListener(type: string, listener: EventListener): void;
}

class WakeLockService {
  private sentinel: WakeLockSentinel | null = null;
  private requested: boolean = false;

  constructor() {
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && this.requested && !this.sentinel) {
          this.acquire();
        }
      });
    }
  }

  async acquire(): Promise<boolean> {
    this.requested = true;
    if (typeof navigator === 'undefined' || !('wakeLock' in navigator)) {
      return false;
    }

    try {
      // TypeScript navigator wakeLock definition
      const nav = navigator as unknown as {
        wakeLock: {
          request(type: string): Promise<WakeLockSentinel>;
        };
      };
      this.sentinel = await nav.wakeLock.request('screen');
      this.sentinel.addEventListener('release', () => {
        this.sentinel = null;
      });
      return true;
    } catch {
      // Wake lock can fail if battery saver is on or device disallows it
      this.sentinel = null;
      return false;
    }
  }

  async release(): Promise<void> {
    this.requested = false;
    if (this.sentinel && !this.sentinel.released) {
      try {
        await this.sentinel.release();
      } catch {
        // Ignore release errors
      } finally {
        this.sentinel = null;
      }
    }
  }
}

export const wakeLock = new WakeLockService();
