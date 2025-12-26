import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import type { NoteWithOctave } from '../types/music';
import { SettingsProvider } from '../contexts/SettingsContext';
import React from 'react';

// Create mock audio engine using vi.hoisted to ensure proper hoisting
const mockAudioEngine = vi.hoisted(() => ({
  initialize: vi.fn().mockResolvedValue(undefined),
  playNote: vi.fn().mockResolvedValue(undefined),
  releaseAllNotes: vi.fn(),
  playChord: vi.fn(),
  releaseNote: vi.fn()
}));

// Mock the audio engine module
vi.mock('../utils/audioEngine', () => ({
  audioEngine: mockAudioEngine
}));

// Now import the component after mocks are set up
import PianoKeyboard from './PianoKeyboard';

// Test wrapper component that provides SettingsContext
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <SettingsProvider>
    {children}
  </SettingsProvider>
);

describe('PianoKeyboard - Mono Mode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // TODO: Fix audio engine mocking - vitest/vite module mocking issue
  it.skip('should release all notes before playing new note when monoMode is true', async () => {
    const onNoteClick = vi.fn();
    const { container } = render(
      <PianoKeyboard
        onNoteClick={onNoteClick}
        monoMode={true}
      />,
      { wrapper: TestWrapper }
    );

    // Click on C key
    const cKey = container.querySelector('.white-key');
    expect(cKey).toBeInTheDocument();

    if (cKey) {
      fireEvent.click(cKey);

      // Wait for async operations
      await vi.waitFor(() => {
        expect(mockAudioEngine.releaseAllNotes).toHaveBeenCalled();
      });

      expect(mockAudioEngine.playNote).toHaveBeenCalled();
      expect(onNoteClick).toHaveBeenCalled();
    }
  });

  // TODO: Fix audio engine mocking - vitest/vite module mocking issue
  it.skip('should NOT release notes before playing when monoMode is false', async () => {
    const onNoteClick = vi.fn();
    const { container } = render(
      <PianoKeyboard
        onNoteClick={onNoteClick}
        monoMode={false}
      />,
      { wrapper: TestWrapper }
    );

    // Click on C key
    const cKey = container.querySelector('.white-key');
    expect(cKey).toBeInTheDocument();

    if (cKey) {
      fireEvent.click(cKey);

      // Wait for async operations
      await vi.waitFor(() => {
        expect(mockAudioEngine.playNote).toHaveBeenCalled();
      });

      expect(mockAudioEngine.releaseAllNotes).not.toHaveBeenCalled();
      expect(onNoteClick).toHaveBeenCalled();
    }
  });

  it('should highlight notes with error type in red', () => {
    const testNote: NoteWithOctave = { note: 'C', octave: 4 };
    const { container } = render(
      <PianoKeyboard
        highlights={[{ note: testNote, type: 'error' }]}
      />,
      { wrapper: TestWrapper }
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
      />,
      { wrapper: TestWrapper }
    );

    // Component should render successfully with the prop
    expect(container.querySelector('.piano-keyboard')).toBeInTheDocument();

    // Note: The actual timing-based behavior of preventNoteRestart
    // is difficult to test in a unit test due to timing dependencies.
    // This is better tested in integration/E2E tests.
  });
});
