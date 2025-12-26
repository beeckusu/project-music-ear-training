import { expect, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';

// Extend Vitest's expect with jest-dom matchers
expect.extend(matchers);

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock Tone.js audio engine globally for all tests
vi.mock('../utils/audioEngine', () => {
  return {
    audioEngine: {
      initialize: vi.fn().mockResolvedValue(undefined),
      playNote: vi.fn().mockResolvedValue(undefined),
      releaseAllNotes: vi.fn(),
      stopAll: vi.fn(),
      setInstrument: vi.fn()
    },
    AudioEngine: Object.assign(
      vi.fn().mockImplementation(() => ({
        initialize: vi.fn().mockResolvedValue(undefined),
        playNote: vi.fn().mockResolvedValue(undefined),
        releaseAllNotes: vi.fn(),
        stopAll: vi.fn(),
        setInstrument: vi.fn()
      })),
      {
        // Static method for generating random notes from filter
        getRandomNoteFromFilter: vi.fn((filter) => {
          const notes = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
          const randomNote = notes[Math.floor(Math.random() * notes.length)];
          const octave = filter?.octaveRange?.min || 4;
          return { note: randomNote, octave };
        })
      }
    ),
    InstrumentType: {
      SYNTH: 'synth',
      PIANO: 'piano',
      FM: 'fm'
    }
  };
});
