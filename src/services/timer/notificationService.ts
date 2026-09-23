/**
 * Browser Notification Service for Race Timer.
 * Permission is only requested when explicitly enabled by user in settings.
 */

class NotificationService {
  isSupported(): boolean {
    return typeof window !== 'undefined' && 'Notification' in window;
  }

  getPermission(): NotificationPermission {
    if (!this.isSupported()) return 'denied';
    return Notification.permission;
  }

  async requestPermission(): Promise<boolean> {
    if (!this.isSupported()) return false;
    try {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    } catch {
      return false;
    }
  }

  notify(title: string, options?: NotificationOptions) {
    if (!this.isSupported() || Notification.permission !== 'granted') return;

    try {
      new Notification(title, {
        icon: '/pwa-192x192.png',
        badge: '/favicon.svg',
        ...options,
      });
    } catch {
      // Ignore background notification restrictions
    }
  }
}

export const notifications = new NotificationService();
