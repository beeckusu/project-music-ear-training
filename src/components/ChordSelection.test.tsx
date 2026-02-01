import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent, screen } from '@testing-library/react';
import React from 'react';
import ChordSelection, { resolveChordType } from './ChordSelection';
import type { Note } from '../types/music';
import { ChordType as CT } from '../types/music';
import type { ChordQuality, ChordExtension } from './ChordSelection';

describe('ChordSelection', () => {
  const mockOnBaseNoteSelect = vi.fn();
  const mockOnQualitySelect = vi.fn();
  const mockOnExtensionSelect = vi.fn();

  const defaultProps = {
    selectedBaseNote: null as Note | null,
    selectedQuality: null as ChordQuality | null,
    selectedExtension: null as ChordExtension | null,
    onBaseNoteSelect: mockOnBaseNoteSelect,
    onQualitySelect: mockOnQualitySelect,
    onExtensionSelect: mockOnExtensionSelect,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render 3 columns with headers', () => {
      const { container } = render(<ChordSelection {...defaultProps} />);

      const columns = container.querySelectorAll('.chord-column');
      expect(columns.length).toBe(3);

      const headers = container.querySelectorAll('.chord-column-header');
      expect(headers[0].textContent).toBe('Root');
      expect(headers[1].textContent).toBe('Quality');
      expect(headers[2].textContent).toBe('Extension');
    });

    it('should render 12 root note buttons', () => {
      const { container } = render(<ChordSelection {...defaultProps} />);

      const columns = container.querySelectorAll('.chord-column');
      const rootButtons = columns[0].querySelectorAll('.chord-col-button');
      expect(rootButtons.length).toBe(12);
    });

    it('should render 6 quality buttons', () => {
      const { container } = render(<ChordSelection {...defaultProps} />);

      const columns = container.querySelectorAll('.chord-column');
      const qualityButtons = columns[1].querySelectorAll('.chord-col-button');
      expect(qualityButtons.length).toBe(6);
    });

    it('should render 6 extension buttons', () => {
      const { container } = render(<ChordSelection {...defaultProps} />);

      const columns = container.querySelectorAll('.chord-column');
      const extensionButtons = columns[2].querySelectorAll('.chord-col-button');
      expect(extensionButtons.length).toBe(6);
    });

    it('should not display chord name when no selections are made', () => {
      const { container } = render(<ChordSelection {...defaultProps} />);

      const chordDisplay = container.querySelector('.selected-chord-display');
      expect(chordDisplay).not.toBeInTheDocument();
    });

    it('should display chord name when root note is selected (defaults to major)', () => {
      const { container } = render(
        <ChordSelection {...defaultProps} selectedBaseNote={'C' as Note} />
      );

      const chordName = container.querySelector('.selected-chord-name');
      expect(chordName?.textContent).toBe('C');
    });
  });

  describe('Toggle Behavior', () => {
    it('should toggle root note off when clicking the selected note', () => {
      const { container } = render(<ChordSelection {...defaultProps} selectedBaseNote={'C' as Note} />);

      const cButton = container.querySelector('.chord-col-button.selected') as HTMLElement;
      fireEvent.click(cButton);

      expect(mockOnBaseNoteSelect).toHaveBeenCalledWith(null);
    });

    it('should select a different root note', () => {
      render(<ChordSelection {...defaultProps} selectedBaseNote={'C' as Note} />);

      const dButton = screen.getByText('D');
      fireEvent.click(dButton);

      expect(mockOnBaseNoteSelect).toHaveBeenCalledWith('D');
    });

    it('should toggle quality off when clicking the selected quality', () => {
      render(<ChordSelection {...defaultProps} selectedQuality={'m'} />);

      const mButton = screen.getByText('m');
      fireEvent.click(mButton);

      expect(mockOnQualitySelect).toHaveBeenCalledWith(null);
    });

    it('should toggle extension off when clicking the selected extension', () => {
      render(<ChordSelection {...defaultProps} selectedExtension={'7'} />);

      const sevenButton = screen.getByText('7');
      fireEvent.click(sevenButton);

      expect(mockOnExtensionSelect).toHaveBeenCalledWith(null);
    });
  });

  describe('Invalid Extension Combinations', () => {
    it('should disable extensions that are invalid for aug quality', () => {
      const { container } = render(
        <ChordSelection {...defaultProps} selectedQuality={'aug'} />
      );

      const columns = container.querySelectorAll('.chord-column');
      const extensionButtons = columns[2].querySelectorAll('.chord-col-button');

      // All extensions should be disabled for aug
      extensionButtons.forEach(button => {
        expect(button).toBeDisabled();
      });
    });

    it('should enable valid extensions for maj quality', () => {
      const { container } = render(
        <ChordSelection {...defaultProps} selectedQuality={'maj'} />
      );

      const columns = container.querySelectorAll('.chord-column');
      const extensionButtons = columns[2].querySelectorAll('.chord-col-button');

      // 7, 9, 11, 13, add9, add11 should all be enabled for maj
      extensionButtons.forEach(button => {
        expect(button).not.toBeDisabled();
      });
    });

    it('should clear extension when switching to a quality that invalidates it', () => {
      render(
        <ChordSelection {...defaultProps} selectedQuality={'maj'} selectedExtension={'9'} />
      );

      // Click aug quality — should clear extension since aug+9 is invalid
      const augButton = screen.getByText('aug');
      fireEvent.click(augButton);

      expect(mockOnQualitySelect).toHaveBeenCalledWith('aug');
      expect(mockOnExtensionSelect).toHaveBeenCalledWith(null);
    });
  });

  describe('Chord Name Formatting', () => {
    it('should format C + maj as "C"', () => {
      const { container } = render(
        <ChordSelection {...defaultProps} selectedBaseNote={'C' as Note} selectedQuality={'maj'} />
      );
      const chordName = container.querySelector('.selected-chord-name');
      expect(chordName?.textContent).toBe('C');
    });

    it('should format F# + m as "F#m"', () => {
      render(
        <ChordSelection {...defaultProps} selectedBaseNote={'F#' as Note} selectedQuality={'m'} />
      );
      expect(screen.getByText('F#m')).toBeInTheDocument();
    });

    it('should format C + m + 7 as "Cm7"', () => {
      render(
        <ChordSelection {...defaultProps} selectedBaseNote={'C' as Note} selectedQuality={'m'} selectedExtension={'7'} />
      );
      expect(screen.getByText('Cm7')).toBeInTheDocument();
    });

    it('should format G + (no quality) + 9 as "G9" (dominant)', () => {
      render(
        <ChordSelection {...defaultProps} selectedBaseNote={'G' as Note} selectedExtension={'9'} />
      );
      expect(screen.getByText('G9')).toBeInTheDocument();
    });

    it('should format A# + dim + 7 as "A#dim7"', () => {
      render(
        <ChordSelection {...defaultProps} selectedBaseNote={'A#' as Note} selectedQuality={'dim'} selectedExtension={'7'} />
      );
      expect(screen.getByText('A#dim7')).toBeInTheDocument();
    });
  });

  describe('Disabled State', () => {
    it('should apply disabled class when disabled prop is true', () => {
      const { container } = render(
        <ChordSelection {...defaultProps} disabled={true} />
      );

      const chordSelection = container.querySelector('.chord-selection');
      expect(chordSelection?.classList.contains('disabled')).toBe(true);
    });

    it('should disable all buttons when disabled', () => {
      const { container } = render(
        <ChordSelection {...defaultProps} disabled={true} />
      );

      const buttons = container.querySelectorAll('.chord-col-button');
      buttons.forEach(button => {
        expect(button).toBeDisabled();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have role="group" for all three columns', () => {
      const { container } = render(<ChordSelection {...defaultProps} />);

      const groups = container.querySelectorAll('[role="group"]');
      expect(groups.length).toBe(3);
    });

    it('should have aria-pressed on selected buttons', () => {
      render(
        <ChordSelection {...defaultProps} selectedBaseNote={'C' as Note} selectedQuality={'m'} selectedExtension={'7'} />
      );

      const cButton = screen.getByText('C');
      expect(cButton).toHaveAttribute('aria-pressed', 'true');

      const mButton = screen.getByText('m');
      expect(mButton).toHaveAttribute('aria-pressed', 'true');

      const sevenButton = screen.getByText('7');
      expect(sevenButton).toHaveAttribute('aria-pressed', 'true');
    });

    it('should have aria-live region for selected chord display', () => {
      const { container } = render(
        <ChordSelection {...defaultProps} selectedBaseNote={'C' as Note} selectedQuality={'maj'} selectedExtension={'7'} />
      );

      const chordDisplay = container.querySelector('.selected-chord-display');
      expect(chordDisplay).toHaveAttribute('aria-live', 'polite');
    });
  });
});

describe('resolveChordType', () => {
  it('should return major for no quality and no extension', () => {
    expect(resolveChordType(null, null)).toBe(CT.MAJOR);
  });

  it('should return minor for m quality', () => {
    expect(resolveChordType('m', null)).toBe(CT.MINOR);
  });

  it('should return dominant7 for no quality + 7', () => {
    expect(resolveChordType(null, '7')).toBe(CT.DOMINANT_7);
  });

  it('should return major7 for maj + 7', () => {
    expect(resolveChordType('maj', '7')).toBe(CT.MAJOR_7);
  });

  it('should return minor9 for m + 9', () => {
    expect(resolveChordType('m', '9')).toBe(CT.MINOR_9);
  });

  it('should return null for invalid combinations like aug + 7', () => {
    expect(resolveChordType('aug', '7')).toBeNull();
  });

  it('should return diminished7 for dim + 7', () => {
    expect(resolveChordType('dim', '7')).toBe(CT.DIMINISHED_7);
  });

  it('should return sus2 for sus2 quality', () => {
    expect(resolveChordType('sus2', null)).toBe(CT.SUS2);
  });

  it('should return add9 for maj + add9', () => {
    expect(resolveChordType('maj', 'add9')).toBe(CT.ADD9);
  });
});
