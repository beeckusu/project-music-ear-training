import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useMidiHighlights } from '../useMidiHighlights';
import { MidiManager } from '../../services/MidiManager';
import type { MidiNoteEvent } from '../../types/midi';

// Mock the MidiManager module
vi.mock('../../services/MidiManager', () => {
  const mockListeners = new Map<string, Set<(event: MidiNoteEvent) => void>>();

  const mockMidiManager = {
    on: vi.fn((event: string, handler: (event: MidiNoteEvent) => void) => {
      if (!mockListeners.has(event)) {
        mockListeners.set(event, new Set());
      }
      mockListeners.get(event)!.add(handler);
      return () => {
        mockListeners.get(event)?.delete(handler);
      };
    }),
    off: vi.fn((event: string, handler: (event: MidiNoteEvent) => void) => {
      mockListeners.get(event)?.delete(handler);
    }),
    emit: vi.fn((event: string, data: MidiNoteEvent) => {
      mockListeners.get(event)?.forEach(handler => handler(data));
    }),
    // Expose for testing
    _listeners: mockListeners,
    _clearListeners: () => mockListeners.clear(),
  };

  return {
    MidiManager: {
      getInstance: vi.fn(() => mockMidiManager),
    },
  };
});

describe('useMidiHighlights', () => {
  let mockMidiManager: ReturnType<typeof MidiManager.getInstance> & {
    emit: (event: string, data: MidiNoteEvent) => void;
    _clearListeners: () => void;
  };

  beforeEach(() => {
    mockMidiManager = MidiManager.getInstance() as typeof mockMidiManager;
    mockMidiManager._clearListeners();
    vi.clearAllMocks();
  });

  afterEach(() => {
    mockMidiManager._clearListeners();
  });

  it('should return empty array initially', () => {
    const { result } = renderHook(() => useMidiHighlights());

    expect(result.current).toEqual([]);
  });

  it('should subscribe to noteOn and noteOff events on mount', () => {
    renderHook(() => useMidiHighlights());

    expect(mockMidiManager.on).toHaveBeenCalledWith('noteOn', expect.any(Function));
    expect(mockMidiManager.on).toHaveBeenCalledWith('noteOff', expect.any(Function));
  });

  it('should unsubscribe from events on unmount', () => {
    const { unmount } = renderHook(() => useMidiHighlights());

    unmount();

    expect(mockMidiManager.off).toHaveBeenCalledWith('noteOn', expect.any(Function));
    expect(mockMidiManager.off).toHaveBeenCalledWith('noteOff', expect.any(Function));
  });

  it('should add highlight when noteOn event is received', () => {
    const { result } = renderHook(() => useMidiHighlights());

    act(() => {
      mockMidiManager.emit('noteOn', {
        note: { note: 'C', octave: 4 },
        midiNote: 48,
        velocity: 64,
        timestamp: Date.now(),
      });
    });

    expect(result.current).toHaveLength(1);
    expect(result.current[0]).toEqual({
      note: { note: 'C', octave: 4 },
      type: 'midi-active',
    });
  });

  it('should remove highlight when noteOff event is received', () => {
    const { result } = renderHook(() => useMidiHighlights());

    // Press note
    act(() => {
      mockMidiManager.emit('noteOn', {
        note: { note: 'C', octave: 4 },
        midiNote: 48,
        velocity: 64,
        timestamp: Date.now(),
      });
    });

    expect(result.current).toHaveLength(1);

    // Release note
    act(() => {
      mockMidiManager.emit('noteOff', {
        note: { note: 'C', octave: 4 },
        midiNote: 48,
        velocity: 0,
        timestamp: Date.now(),
      });
    });

    expect(result.current).toHaveLength(0);
  });

  it('should handle multiple simultaneous notes', () => {
    const { result } = renderHook(() => useMidiHighlights());

    // Press C4
    act(() => {
      mockMidiManager.emit('noteOn', {
        note: { note: 'C', octave: 4 },
        midiNote: 48,
        velocity: 64,
        timestamp: Date.now(),
      });
    });

    // Press E4
    act(() => {
      mockMidiManager.emit('noteOn', {
        note: { note: 'E', octave: 4 },
        midiNote: 52,
        velocity: 64,
        timestamp: Date.now(),
      });
    });

    // Press G4
    act(() => {
      mockMidiManager.emit('noteOn', {
        note: { note: 'G', octave: 4 },
        midiNote: 55,
        velocity: 64,
        timestamp: Date.now(),
      });
    });

    expect(result.current).toHaveLength(3);

    // Release E4
    act(() => {
      mockMidiManager.emit('noteOff', {
        note: { note: 'E', octave: 4 },
        midiNote: 52,
        velocity: 0,
        timestamp: Date.now(),
      });
    });

    expect(result.current).toHaveLength(2);
    expect(result.current.map(h => h.note.note)).toContain('C');
    expect(result.current.map(h => h.note.note)).toContain('G');
    expect(result.current.map(h => h.note.note)).not.toContain('E');
  });

  it('should handle same note pressed multiple times', () => {
    const { result } = renderHook(() => useMidiHighlights());

    // Press C4 twice (should not duplicate)
    act(() => {
      mockMidiManager.emit('noteOn', {
        note: { note: 'C', octave: 4 },
        midiNote: 48,
        velocity: 64,
        timestamp: Date.now(),
      });
    });

    act(() => {
      mockMidiManager.emit('noteOn', {
        note: { note: 'C', octave: 4 },
        midiNote: 48,
        velocity: 100,
        timestamp: Date.now(),
      });
    });

    expect(result.current).toHaveLength(1);
  });

  it('should handle noteOff for note that was not pressed', () => {
    const { result } = renderHook(() => useMidiHighlights());

    // Release note that was never pressed
    act(() => {
      mockMidiManager.emit('noteOff', {
        note: { note: 'C', octave: 4 },
        midiNote: 48,
        velocity: 0,
        timestamp: Date.now(),
      });
    });

    // Should not crash and remain empty
    expect(result.current).toHaveLength(0);
  });

  it('should correctly differentiate notes by octave', () => {
    const { result } = renderHook(() => useMidiHighlights());

    // Press C4
    act(() => {
      mockMidiManager.emit('noteOn', {
        note: { note: 'C', octave: 4 },
        midiNote: 48,
        velocity: 64,
        timestamp: Date.now(),
      });
    });

    // Press C5
    act(() => {
      mockMidiManager.emit('noteOn', {
        note: { note: 'C', octave: 5 },
        midiNote: 60,
        velocity: 64,
        timestamp: Date.now(),
      });
    });

    expect(result.current).toHaveLength(2);

    // Release only C4
    act(() => {
      mockMidiManager.emit('noteOff', {
        note: { note: 'C', octave: 4 },
        midiNote: 48,
        velocity: 0,
        timestamp: Date.now(),
      });
    });

    expect(result.current).toHaveLength(1);
    expect(result.current[0].note.octave).toBe(5);
  });

  it('should return highlights with correct type', () => {
    const { result } = renderHook(() => useMidiHighlights());

    act(() => {
      mockMidiManager.emit('noteOn', {
        note: { note: 'D#', octave: 5 },
        midiNote: 63,
        velocity: 127,
        timestamp: Date.now(),
      });
    });

    expect(result.current[0].type).toBe('midi-active');
  });

  it('should handle rapid press/release cycles', () => {
    const { result } = renderHook(() => useMidiHighlights());

    // Rapid press/release
    for (let i = 0; i < 10; i++) {
      act(() => {
        mockMidiManager.emit('noteOn', {
          note: { note: 'C', octave: 4 },
          midiNote: 48,
          velocity: 64,
          timestamp: Date.now() + i * 10,
        });
      });

      act(() => {
        mockMidiManager.emit('noteOff', {
          note: { note: 'C', octave: 4 },
          midiNote: 48,
          velocity: 0,
          timestamp: Date.now() + i * 10 + 5,
        });
      });
    }

    expect(result.current).toHaveLength(0);
  });

  it('should handle all 12 chromatic notes', () => {
    const { result } = renderHook(() => useMidiHighlights());

    const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

    notes.forEach((note, index) => {
      act(() => {
        mockMidiManager.emit('noteOn', {
          note: { note: note as 'C' | 'C#' | 'D' | 'D#' | 'E' | 'F' | 'F#' | 'G' | 'G#' | 'A' | 'A#' | 'B', octave: 4 },
          midiNote: 48 + index,
          velocity: 64,
          timestamp: Date.now(),
        });
      });
    });

    expect(result.current).toHaveLength(12);
  });
});
