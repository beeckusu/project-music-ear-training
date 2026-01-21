import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import ChordDisplay from './ChordDisplay';
import type { Chord, NoteWithOctave } from '../types/music';

// Test notes
const TEST_NOTE_C4: NoteWithOctave = { note: 'C', octave: 4 };
const TEST_NOTE_E4: NoteWithOctave = { note: 'E', octave: 4 };
const TEST_NOTE_G4: NoteWithOctave = { note: 'G', octave: 4 };

// Helper to create a mock chord
const createMockChord = (overrides: Partial<Chord> = {}): Chord => ({
  name: 'C Major',
  root: 'C',
  type: 'major',
  notes: [TEST_NOTE_C4, TEST_NOTE_E4, TEST_NOTE_G4],
  ...overrides,
});

describe('ChordDisplay', () => {
  it('should render chord name', () => {
    const chord = createMockChord();
    render(<ChordDisplay chord={chord} />);

    expect(screen.getByText('C Major')).toBeInTheDocument();
    expect(screen.getByText('Current Chord')).toBeInTheDocument();
  });

  it('should not render anything when chord is null', () => {
    const { container } = render(<ChordDisplay chord={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('should show instruction text by default', () => {
    const chord = createMockChord();
    render(<ChordDisplay chord={chord} />);

    expect(screen.getByText(/Select all 3 notes/)).toBeInTheDocument();
  });

  it('should hide instruction text when showInstructions is false', () => {
    const chord = createMockChord();
    render(<ChordDisplay chord={chord} showInstructions={false} />);

    expect(screen.queryByText(/Select all/)).not.toBeInTheDocument();
  });

  it('should not render inversion indicator when inversion is undefined', () => {
    const chord = createMockChord({ inversion: undefined });
    const { container } = render(<ChordDisplay chord={chord} />);

    expect(container.querySelector('.chord-inversion')).not.toBeInTheDocument();
  });

  it('should not render inversion indicator when inversion is 0 (root position)', () => {
    const chord = createMockChord({ inversion: 0 });
    const { container } = render(<ChordDisplay chord={chord} />);

    expect(container.querySelector('.chord-inversion')).not.toBeInTheDocument();
  });

  it('should render "1st inv" when inversion is 1', () => {
    const chord = createMockChord({ inversion: 1 });
    render(<ChordDisplay chord={chord} />);

    expect(screen.getByText('1st inv')).toBeInTheDocument();
  });

  it('should render "2nd inv" when inversion is 2', () => {
    const chord = createMockChord({ inversion: 2 });
    render(<ChordDisplay chord={chord} />);

    expect(screen.getByText('2nd inv')).toBeInTheDocument();
  });

  it('should render "3rd inv" when inversion is 3', () => {
    const chord = createMockChord({ inversion: 3 });
    render(<ChordDisplay chord={chord} />);

    expect(screen.getByText('3rd inv')).toBeInTheDocument();
  });

  it('should have aria-label on inversion indicator for accessibility', () => {
    const chord = createMockChord({ inversion: 1 });
    const { container } = render(<ChordDisplay chord={chord} />);

    const inversionElement = container.querySelector('.chord-inversion');
    expect(inversionElement).toHaveAttribute('aria-label', '1st inv');
  });

  it('should apply custom className', () => {
    const chord = createMockChord();
    const { container } = render(<ChordDisplay chord={chord} className="custom-class" />);

    const section = container.querySelector('.chord-display-section');
    expect(section).toHaveClass('custom-class');
  });
});
