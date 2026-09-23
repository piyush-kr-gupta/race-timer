import { useEffect } from 'react';

export interface ShortcutHandlers {
  onPlayPause?: () => void;
  onComplete?: () => void;
  onSkip?: () => void;
  onRestart?: () => void;
  onEscape?: () => void;
  onToggleFocus?: () => void;
}

export function useKeyboardShortcuts(
  handlers: ShortcutHandlers,
  enabled: boolean = true
) {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept shortcuts when typing in inputs, textareas, or contentEditable elements
      const target = e.target as HTMLElement;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        if (e.key === 'Escape' && handlers.onEscape) {
          handlers.onEscape();
        }
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        handlers.onPlayPause?.();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        handlers.onComplete?.();
      } else if (e.key === 's' || e.key === 'S') {
        e.preventDefault();
        handlers.onSkip?.();
      } else if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        handlers.onRestart?.();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        handlers.onEscape?.();
      } else if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        handlers.onToggleFocus?.();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlers, enabled]);
}
