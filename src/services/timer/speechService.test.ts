import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SpeechService } from './speechService';

describe('SpeechService', () => {
  let mockSpeechSynthesis: {
    speak: ReturnType<typeof vi.fn>;
    cancel: ReturnType<typeof vi.fn>;
    resume: ReturnType<typeof vi.fn>;
    paused: boolean;
  };
  let originalSpeechSynthesis: any;
  let originalSpeechSynthesisUtterance: any;

  beforeEach(() => {
    mockSpeechSynthesis = {
      speak: vi.fn(),
      cancel: vi.fn(),
      resume: vi.fn(),
      paused: false,
    };

    originalSpeechSynthesis = window.speechSynthesis;
    originalSpeechSynthesisUtterance = window.SpeechSynthesisUtterance;

    Object.defineProperty(window, 'speechSynthesis', {
      value: mockSpeechSynthesis,
      configurable: true,
      writable: true,
    });

    // Mock SpeechSynthesisUtterance constructor
    window.SpeechSynthesisUtterance = vi.fn().mockImplementation(function (text: string) {
      return {
        text,
        volume: 1,
        rate: 1,
        pitch: 1,
        lang: '',
      };
    }) as any;
  });

  afterEach(() => {
    Object.defineProperty(window, 'speechSynthesis', {
      value: originalSpeechSynthesis,
      configurable: true,
      writable: true,
    });
    window.SpeechSynthesisUtterance = originalSpeechSynthesisUtterance;
  });

  it('detects browser support properly', () => {
    const service = new SpeechService();
    expect(service.isSupported()).toBe(true);
  });

  it('speaks text when enabled with correct parameters and cancels prior utterances', () => {
    const service = new SpeechService();
    service.setEnabled(true);
    service.setVolume(0.9);
    service.setRate(1.2);
    service.setPitch(1.1);

    const result = service.speak('Problem Understanding & Questioning');

    expect(result).toBe(true);
    expect(mockSpeechSynthesis.cancel).toHaveBeenCalledTimes(1);
    expect(mockSpeechSynthesis.speak).toHaveBeenCalledTimes(1);

    const utteranceArg = mockSpeechSynthesis.speak.mock.calls[0][0];
    expect(utteranceArg.text).toBe('Problem Understanding & Questioning');
    expect(utteranceArg.volume).toBe(0.9);
    expect(utteranceArg.rate).toBe(1.2);
    expect(utteranceArg.pitch).toBe(1.1);
  });

  it('does not speak when disabled', () => {
    const service = new SpeechService();
    service.setEnabled(false);

    const result = service.speak('Clarify Edge Cases');
    expect(result).toBe(false);
    expect(mockSpeechSynthesis.speak).not.toHaveBeenCalled();
  });

  it('does not speak empty or whitespace-only text', () => {
    const service = new SpeechService();
    service.setEnabled(true);

    expect(service.speak('')).toBe(false);
    expect(service.speak('   ')).toBe(false);
    expect(mockSpeechSynthesis.speak).not.toHaveBeenCalled();
  });

  it('resumes speech synthesis if paused prior to speaking', () => {
    mockSpeechSynthesis.paused = true;
    const service = new SpeechService();
    service.speak('Next Task');

    expect(mockSpeechSynthesis.resume).toHaveBeenCalledTimes(1);
    expect(mockSpeechSynthesis.speak).toHaveBeenCalledTimes(1);
  });

  it('cancels speech via cancel() method', () => {
    const service = new SpeechService();
    service.cancel();
    expect(mockSpeechSynthesis.cancel).toHaveBeenCalledTimes(1);
  });
});
