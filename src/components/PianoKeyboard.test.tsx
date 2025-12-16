import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import PianoKeyboard from './PianoKeyboard';
import { audioEngine } from '../utils/audioEngine';
import type { NoteWithOctave } from '../types/music';

// Mock the audio engine
vi.mock('../utils/audioEngine', () => ({
  audioEngine: {
    initialize: vi.fn().mockResolvedValue(undefined),
    playNote: vi.fn(),
    releaseAllNotes: vi.fn()
  }
}));

vi.mock('../hooks/useSettings', () => ({
  useSettings: () => ({
    settings: {
      timing: {
        noteDuration: '2n'
      },
      showNoteLabels: true
    }
  })
}));

describe('PianoKeyboard - Mono Mode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should release all notes before playing new note when monoMode is true', async () => {
    const onNoteClick = vi.fn();
    const { container } = render(
      <PianoKeyboard
        onNoteClick={onNoteClick}
        monoMode={true}
      />
    );

    // Click on C key
    const cKey = container.querySelector('.white-key');
    expect(cKey).toBeInTheDocument();

    if (cKey) {
      fireEvent.click(cKey);

      // Wait for async operations
      await vi.waitFor(() => {
        expect(audioEngine.releaseAllNotes).toHaveBeenCalled();
      });

      expect(audioEngine.playNote).toHaveBeenCalled();
      expect(onNoteClick).toHaveBeenCalled();
    }
  });

  it('should NOT release notes before playing when monoMode is false', async () => {
    const onNoteClick = vi.fn();
    const { container } = render(
      <PianoKeyboard
        onNoteClick={onNoteClick}
        monoMode={false}
      />
    );

    // Click on C key
    const cKey = container.querySelector('.white-key');
    expect(cKey).toBeInTheDocument();

    if (cKey) {
      fireEvent.click(cKey);

      // Wait for async operations
      await vi.waitFor(() => {
        expect(audioEngine.playNote).toHaveBeenCalled();
      });

      expect(audioEngine.releaseAllNotes).not.toHaveBeenCalled();
      expect(onNoteClick).toHaveBeenCalled();
    }
  });

  it('should highlight notes with error type in red', () => {
    const testNote: NoteWithOctave = { note: 'C', octave: 4 };
    const { container } = render(
      <PianoKeyboard
        highlights={[{ note: testNote, type: 'error' }]}
      />
    );

    // Check if the C key has the error class
    const errorKey = container.querySelector('.piano-key-error');
    expect(errorKey).toBeInTheDocument();
  });

  it('should have preventNoteRestart prop available', () => {
    // This test verifies the prop exists and can be set
    const onNoteClick = vi.fn();
    const { container } = render(
      <PianoKeyboard
        onNoteClick={onNoteClick}
        preventNoteRestart={true}
      />
    );

    // Component should render successfully with the prop
    expect(container.querySelector('.piano-keyboard')).toBeInTheDocument();

    // Note: The actual timing-based behavior of preventNoteRestart
    // is difficult to test in a unit test due to timing dependencies.
    // This is better tested in integration/E2E tests.
  });
});
