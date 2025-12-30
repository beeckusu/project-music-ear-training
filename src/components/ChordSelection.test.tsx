import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent, screen } from '@testing-library/react';
import React from 'react';
import ChordSelection from './ChordSelection';
import type { Note, ChordType } from '../types/music';
import { ChordType as CT } from '../types/music';

describe('ChordSelection', () => {
  const mockOnBaseNoteSelect = vi.fn();
  const mockOnChordTypeSelect = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render 12 base note buttons', () => {
      const { container } = render(
        <ChordSelection
          selectedBaseNote={null}
          selectedChordType={null}
          onBaseNoteSelect={mockOnBaseNoteSelect}
          onChordTypeSelect={mockOnChordTypeSelect}
        />
      );

      const baseNoteButtons = container.querySelectorAll('.base-note-button');
      expect(baseNoteButtons.length).toBe(12);
    });

    it('should render 24 chord type buttons', () => {
      const { container } = render(
        <ChordSelection
          selectedBaseNote={null}
          selectedChordType={null}
          onBaseNoteSelect={mockOnBaseNoteSelect}
          onChordTypeSelect={mockOnChordTypeSelect}
        />
      );

      const chordTypeButtons = container.querySelectorAll('.chord-type-button');
      expect(chordTypeButtons.length).toBe(24);
    });

    it('should render all base notes in chromatic order', () => {
      const { container } = render(
        <ChordSelection
          selectedBaseNote={null}
          selectedChordType={null}
          onBaseNoteSelect={mockOnBaseNoteSelect}
          onChordTypeSelect={mockOnChordTypeSelect}
        />
      );

      const expectedNotes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
      const baseNoteButtons = container.querySelectorAll('.base-note-button');

      baseNoteButtons.forEach((button, index) => {
        expect(button.textContent).toBe(expectedNotes[index]);
      });
    });

    it('should render chord types in a single compact grid', () => {
      const { container } = render(
        <ChordSelection
          selectedBaseNote={null}
          selectedChordType={null}
          onBaseNoteSelect={mockOnBaseNoteSelect}
          onChordTypeSelect={mockOnChordTypeSelect}
        />
      );

      const chordTypesGrid = container.querySelector('.chord-types-grid');
      expect(chordTypesGrid).toBeInTheDocument();

      // Should have all 24 chord type buttons in one grid
      const chordTypeButtons = container.querySelectorAll('.chord-type-button');
      expect(chordTypeButtons.length).toBe(24);
    });

    it('should not display chord name when no selections are made', () => {
      const { container } = render(
        <ChordSelection
          selectedBaseNote={null}
          selectedChordType={null}
          onBaseNoteSelect={mockOnBaseNoteSelect}
          onChordTypeSelect={mockOnChordTypeSelect}
        />
      );

      const chordDisplay = container.querySelector('.selected-chord-display');
      expect(chordDisplay).not.toBeInTheDocument();
    });

    it('should not display chord name when only base note is selected', () => {
      const { container } = render(
        <ChordSelection
          selectedBaseNote={'C' as Note}
          selectedChordType={null}
          onBaseNoteSelect={mockOnBaseNoteSelect}
          onChordTypeSelect={mockOnChordTypeSelect}
        />
      );

      const chordDisplay = container.querySelector('.selected-chord-display');
      expect(chordDisplay).not.toBeInTheDocument();
    });

    it('should not display chord name when only chord type is selected', () => {
      const { container } = render(
        <ChordSelection
          selectedBaseNote={null}
          selectedChordType={CT.MINOR as ChordType}
          onBaseNoteSelect={mockOnBaseNoteSelect}
          onChordTypeSelect={mockOnChordTypeSelect}
        />
      );

      const chordDisplay = container.querySelector('.selected-chord-display');
      expect(chordDisplay).not.toBeInTheDocument();
    });

    it('should display formatted chord name when both selections are made', () => {
      const { container } = render(
        <ChordSelection
          selectedBaseNote={'C' as Note}
          selectedChordType={CT.MINOR_7 as ChordType}
          onBaseNoteSelect={mockOnBaseNoteSelect}
          onChordTypeSelect={mockOnChordTypeSelect}
        />
      );

      const chordDisplay = container.querySelector('.selected-chord-display');
      expect(chordDisplay).toBeInTheDocument();
      expect(screen.getByText('Cm7')).toBeInTheDocument();
    });

    it('should display formatted chord name for C# minor7', () => {
      render(
        <ChordSelection
          selectedBaseNote={'C#' as Note}
          selectedChordType={CT.MINOR_7 as ChordType}
          onBaseNoteSelect={mockOnBaseNoteSelect}
          onChordTypeSelect={mockOnChordTypeSelect}
        />
      );

      expect(screen.getByText('C#m7')).toBeInTheDocument();
    });
  });

  describe('Selection Behavior', () => {
    it('should call onBaseNoteSelect when a base note button is clicked', () => {
      const { container } = render(
        <ChordSelection
          selectedBaseNote={null}
          selectedChordType={null}
          onBaseNoteSelect={mockOnBaseNoteSelect}
          onChordTypeSelect={mockOnChordTypeSelect}
        />
      );

      const baseNoteButtons = container.querySelectorAll('.base-note-button');
      const cButton = baseNoteButtons[0]; // First button should be C

      fireEvent.click(cButton);

      expect(mockOnBaseNoteSelect).toHaveBeenCalledWith('C');
    });

    it('should call onChordTypeSelect when a chord type button is clicked', () => {
      const { container } = render(
        <ChordSelection
          selectedBaseNote={null}
          selectedChordType={null}
          onBaseNoteSelect={mockOnBaseNoteSelect}
          onChordTypeSelect={mockOnChordTypeSelect}
        />
      );

      const chordTypeButtons = container.querySelectorAll('.chord-type-button');
      const majorButton = chordTypeButtons[0]; // First button in Triads group should be major

      fireEvent.click(majorButton);

      expect(mockOnChordTypeSelect).toHaveBeenCalledWith(CT.MAJOR);
    });

    it('should allow changing base note selection', () => {
      const { container, rerender } = render(
        <ChordSelection
          selectedBaseNote={'C' as Note}
          selectedChordType={null}
          onBaseNoteSelect={mockOnBaseNoteSelect}
          onChordTypeSelect={mockOnChordTypeSelect}
        />
      );

      const baseNoteButtons = container.querySelectorAll('.base-note-button');
      const dButton = baseNoteButtons[2]; // D should be third button

      fireEvent.click(dButton);

      expect(mockOnBaseNoteSelect).toHaveBeenCalledWith('D');
    });

    it('should allow changing chord type selection', () => {
      const { container } = render(
        <ChordSelection
          selectedBaseNote={null}
          selectedChordType={CT.MAJOR as ChordType}
          onBaseNoteSelect={mockOnBaseNoteSelect}
          onChordTypeSelect={mockOnChordTypeSelect}
        />
      );

      const chordTypeButtons = container.querySelectorAll('.chord-type-button');
      const minorButton = chordTypeButtons[1]; // Second button in Triads should be minor

      fireEvent.click(minorButton);

      expect(mockOnChordTypeSelect).toHaveBeenCalledWith(CT.MINOR);
    });
  });

  describe('Visual States', () => {
    it('should apply selected class to selected base note', () => {
      const { container } = render(
        <ChordSelection
          selectedBaseNote={'C' as Note}
          selectedChordType={null}
          onBaseNoteSelect={mockOnBaseNoteSelect}
          onChordTypeSelect={mockOnChordTypeSelect}
        />
      );

      const baseNoteButtons = container.querySelectorAll('.base-note-button');
      const cButton = baseNoteButtons[0];

      expect(cButton.classList.contains('selected')).toBe(true);
    });

    it('should apply selected class to selected chord type', () => {
      const { container } = render(
        <ChordSelection
          selectedBaseNote={null}
          selectedChordType={CT.MINOR as ChordType}
          onBaseNoteSelect={mockOnBaseNoteSelect}
          onChordTypeSelect={mockOnChordTypeSelect}
        />
      );

      const chordTypeButtons = container.querySelectorAll('.chord-type-button');
      const minorButton = chordTypeButtons[1]; // Minor should be second button in Triads

      expect(minorButton.classList.contains('selected')).toBe(true);
    });

    it('should not apply selected class to unselected buttons', () => {
      const { container } = render(
        <ChordSelection
          selectedBaseNote={'C' as Note}
          selectedChordType={CT.MINOR as ChordType}
          onBaseNoteSelect={mockOnBaseNoteSelect}
          onChordTypeSelect={mockOnChordTypeSelect}
        />
      );

      const baseNoteButtons = container.querySelectorAll('.base-note-button');
      const dButton = baseNoteButtons[2]; // D button

      expect(dButton.classList.contains('selected')).toBe(false);
    });
  });

  describe('Disabled State', () => {
    it('should apply disabled class when disabled prop is true', () => {
      const { container } = render(
        <ChordSelection
          selectedBaseNote={null}
          selectedChordType={null}
          onBaseNoteSelect={mockOnBaseNoteSelect}
          onChordTypeSelect={mockOnChordTypeSelect}
          disabled={true}
        />
      );

      const chordSelection = container.querySelector('.chord-selection');
      expect(chordSelection?.classList.contains('disabled')).toBe(true);
    });

    it('should disable all base note buttons when disabled', () => {
      const { container } = render(
        <ChordSelection
          selectedBaseNote={null}
          selectedChordType={null}
          onBaseNoteSelect={mockOnBaseNoteSelect}
          onChordTypeSelect={mockOnChordTypeSelect}
          disabled={true}
        />
      );

      const baseNoteButtons = container.querySelectorAll('.base-note-button');
      baseNoteButtons.forEach(button => {
        expect(button).toBeDisabled();
      });
    });

    it('should disable all chord type buttons when disabled', () => {
      const { container } = render(
        <ChordSelection
          selectedBaseNote={null}
          selectedChordType={null}
          onBaseNoteSelect={mockOnBaseNoteSelect}
          onChordTypeSelect={mockOnChordTypeSelect}
          disabled={true}
        />
      );

      const chordTypeButtons = container.querySelectorAll('.chord-type-button');
      chordTypeButtons.forEach(button => {
        expect(button).toBeDisabled();
      });
    });

    it('should not call callbacks when disabled and clicked', () => {
      const { container } = render(
        <ChordSelection
          selectedBaseNote={null}
          selectedChordType={null}
          onBaseNoteSelect={mockOnBaseNoteSelect}
          onChordTypeSelect={mockOnChordTypeSelect}
          disabled={true}
        />
      );

      const baseNoteButtons = container.querySelectorAll('.base-note-button');
      const chordTypeButtons = container.querySelectorAll('.chord-type-button');

      fireEvent.click(baseNoteButtons[0]);
      fireEvent.click(chordTypeButtons[0]);

      expect(mockOnBaseNoteSelect).not.toHaveBeenCalled();
      expect(mockOnChordTypeSelect).not.toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('should have aria-label on base note buttons', () => {
      const { container } = render(
        <ChordSelection
          selectedBaseNote={null}
          selectedChordType={null}
          onBaseNoteSelect={mockOnBaseNoteSelect}
          onChordTypeSelect={mockOnChordTypeSelect}
        />
      );

      const baseNoteButtons = container.querySelectorAll('.base-note-button');
      baseNoteButtons.forEach(button => {
        expect(button).toHaveAttribute('aria-label');
      });
    });

    it('should have aria-label on chord type buttons', () => {
      const { container } = render(
        <ChordSelection
          selectedBaseNote={null}
          selectedChordType={null}
          onBaseNoteSelect={mockOnBaseNoteSelect}
          onChordTypeSelect={mockOnChordTypeSelect}
        />
      );

      const chordTypeButtons = container.querySelectorAll('.chord-type-button');
      chordTypeButtons.forEach(button => {
        expect(button).toHaveAttribute('aria-label');
      });
    });

    it('should have aria-pressed attribute on selected base note', () => {
      const { container } = render(
        <ChordSelection
          selectedBaseNote={'C' as Note}
          selectedChordType={null}
          onBaseNoteSelect={mockOnBaseNoteSelect}
          onChordTypeSelect={mockOnChordTypeSelect}
        />
      );

      const baseNoteButtons = container.querySelectorAll('.base-note-button');
      const cButton = baseNoteButtons[0];

      expect(cButton).toHaveAttribute('aria-pressed', 'true');
    });

    it('should have aria-pressed attribute on selected chord type', () => {
      const { container } = render(
        <ChordSelection
          selectedBaseNote={null}
          selectedChordType={CT.MINOR as ChordType}
          onBaseNoteSelect={mockOnBaseNoteSelect}
          onChordTypeSelect={mockOnChordTypeSelect}
        />
      );

      const chordTypeButtons = container.querySelectorAll('.chord-type-button');
      const minorButton = chordTypeButtons[1];

      expect(minorButton).toHaveAttribute('aria-pressed', 'true');
    });

    it('should have aria-live region for selected chord display', () => {
      const { container } = render(
        <ChordSelection
          selectedBaseNote={'C' as Note}
          selectedChordType={CT.MAJOR_7 as ChordType}
          onBaseNoteSelect={mockOnBaseNoteSelect}
          onChordTypeSelect={mockOnChordTypeSelect}
        />
      );

      const chordDisplay = container.querySelector('.selected-chord-display');
      expect(chordDisplay).toHaveAttribute('aria-live', 'polite');
    });

    it('should have role="group" for base notes section', () => {
      const { container } = render(
        <ChordSelection
          selectedBaseNote={null}
          selectedChordType={null}
          onBaseNoteSelect={mockOnBaseNoteSelect}
          onChordTypeSelect={mockOnChordTypeSelect}
        />
      );

      const baseNotesGrid = container.querySelector('.base-notes-grid');
      expect(baseNotesGrid).toHaveAttribute('role', 'group');
      expect(baseNotesGrid).toHaveAttribute('aria-label', 'Base notes');
    });
  });

  describe('Chord Name Formatting', () => {
    it('should format C major as "C"', () => {
      const { container } = render(
        <ChordSelection
          selectedBaseNote={'C' as Note}
          selectedChordType={CT.MAJOR as ChordType}
          onBaseNoteSelect={mockOnBaseNoteSelect}
          onChordTypeSelect={mockOnChordTypeSelect}
        />
      );

      const chordName = container.querySelector('.selected-chord-name');
      expect(chordName?.textContent).toBe('C');
    });

    it('should format F# minor as "F#m"', () => {
      render(
        <ChordSelection
          selectedBaseNote={'F#' as Note}
          selectedChordType={CT.MINOR as ChordType}
          onBaseNoteSelect={mockOnBaseNoteSelect}
          onChordTypeSelect={mockOnChordTypeSelect}
        />
      );

      expect(screen.getByText('F#m')).toBeInTheDocument();
    });

    it('should format A# diminished7 as "A#dim7"', () => {
      render(
        <ChordSelection
          selectedBaseNote={'A#' as Note}
          selectedChordType={CT.DIMINISHED_7 as ChordType}
          onBaseNoteSelect={mockOnBaseNoteSelect}
          onChordTypeSelect={mockOnChordTypeSelect}
        />
      );

      expect(screen.getByText('A#dim7')).toBeInTheDocument();
    });

    it('should format G dominant9 as "G9"', () => {
      render(
        <ChordSelection
          selectedBaseNote={'G' as Note}
          selectedChordType={CT.DOMINANT_9 as ChordType}
          onBaseNoteSelect={mockOnBaseNoteSelect}
          onChordTypeSelect={mockOnChordTypeSelect}
        />
      );

      expect(screen.getByText('G9')).toBeInTheDocument();
    });
  });
});
