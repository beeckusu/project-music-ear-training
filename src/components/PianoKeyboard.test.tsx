import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/react';
import type { NoteWithOctave } from '../types/music';
import React from 'react';
import { SettingsProvider } from '../contexts/SettingsContext';
import PianoKeyboard from './PianoKeyboard';
import { audioEngine } from '../utils/audioEngine';

// Helper to render with SettingsProvider
const renderWithSettings = (ui: React.ReactElement) => {
  return render(
    <SettingsProvider>
      {ui}
    </SettingsProvider>
  );
};

describe('PianoKeyboard - Mono Mode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should release all notes before playing new note when monoMode is true', async () => {
    const onNoteClick = vi.fn();
    const { container, debug } = renderWithSettings(
      <PianoKeyboard
        onNoteClick={onNoteClick}
        monoMode={true}
      />
    );

    // Find all white keys
    const allKeys = container.querySelectorAll('button');
    expect(allKeys.length).toBeGreaterThan(0);

    // Click the first key (should be C)
    const firstKey = allKeys[0];
    expect(firstKey).toBeInTheDocument();

    fireEvent.click(firstKey);

    // Wait for async operations
    await waitFor(() => {
      expect(audioEngine.releaseAllNotes).toHaveBeenCalled();
      expect(audioEngine.playNote).toHaveBeenCalled();
      expect(onNoteClick).toHaveBeenCalled();
    });
  });

  it('should NOT release notes before playing when monoMode is false', async () => {
    const onNoteClick = vi.fn();
    const { container } = renderWithSettings(
      <PianoKeyboard
        onNoteClick={onNoteClick}
        monoMode={false}
      />
    );

    // Find all buttons
    const allKeys = container.querySelectorAll('button');
    expect(allKeys.length).toBeGreaterThan(0);

    // Click the first key
    const firstKey = allKeys[0];
    expect(firstKey).toBeInTheDocument();

    fireEvent.click(firstKey);

    // Wait for async operations
    await waitFor(() => {
      expect(audioEngine.playNote).toHaveBeenCalled();
      expect(onNoteClick).toHaveBeenCalled();
    });

    expect(audioEngine.releaseAllNotes).not.toHaveBeenCalled();
  });

  it('should highlight notes with error type in red', () => {
    const testNote: NoteWithOctave = { note: 'C', octave: 4 };
    const { container } = renderWithSettings(
      <PianoKeyboard
        highlights={[{ note: testNote, type: 'error' }]}
      />
    );

    // Check if the C key has the error class
    const errorKey = container.querySelector('.piano-key-error');
    expect(errorKey).toBeInTheDocument();
  });

  it('should highlight notes with midi-active type for MIDI input', () => {
    const testNote: NoteWithOctave = { note: 'D', octave: 4 };
    const { container } = renderWithSettings(
      <PianoKeyboard
        highlights={[{ note: testNote, type: 'midi-active' }]}
      />
    );

    // Check if the D key has the midi-active class
    const midiActiveKey = container.querySelector('.piano-key-midi-active');
    expect(midiActiveKey).toBeInTheDocument();
  });

  it('should support multiple midi-active highlights simultaneously', () => {
    const { container } = renderWithSettings(
      <PianoKeyboard
        highlights={[
          { note: { note: 'C', octave: 4 }, type: 'midi-active' },
          { note: { note: 'E', octave: 4 }, type: 'midi-active' },
          { note: { note: 'G', octave: 4 }, type: 'midi-active' },
        ]}
      />
    );

    // Check if all three keys have the midi-active class
    const midiActiveKeys = container.querySelectorAll('.piano-key-midi-active');
    expect(midiActiveKeys).toHaveLength(3);
  });

  it('should have preventNoteRestart prop available', () => {
    // This test verifies the prop exists and can be set
    const onNoteClick = vi.fn();
    const { container } = renderWithSettings(
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
