import '@testing-library/jest-dom';

// Mock Web Audio API for tests
class AudioContextMock {
  currentTime = 0;
  state = 'running';
  createOscillator() {
    return {
      type: 'sine',
      frequency: { setValueAtTime: () => {} },
      connect: () => {},
      start: () => {},
      stop: () => {},
    };
  }
  createGain() {
    return {
      gain: {
        setValueAtTime: () => {},
        linearRampToValueAtTime: () => {},
        exponentialRampToValueAtTime: () => {},
      },
      connect: () => {},
    };
  }
  close() {
    return Promise.resolve();
  }
  resume() {
    return Promise.resolve();
  }
}

// Attach mocks to global window
if (typeof window !== 'undefined') {
  (window as unknown as { AudioContext: typeof AudioContextMock }).AudioContext = AudioContextMock;
  (window as unknown as { webkitAudioContext: typeof AudioContextMock }).webkitAudioContext = AudioContextMock;
}
