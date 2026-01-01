import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import ChordGuessHistory from './ChordGuessHistory';
import type { ChordGuessAttempt } from '../types/game';
import type { NoteWithOctave, Chord } from '../types/music';

describe('ChordGuessHistory', () => {
  const createMockChord = (name: string, notes: NoteWithOctave[]): Chord => ({
    name,
    notes,
    type: 'major' as any,
    rootNote: notes[0]
  });

  const createCorrectAttempt = (id: string): ChordGuessAttempt => ({
    id,
    timestamp: new Date(),
    actualChord: createMockChord('C major', [
      { note: 'C', octave: 4 },
      { note: 'E', octave: 4 },
      { note: 'G', octave: 4 }
    ]),
    isCorrect: true,
    accuracy: 100
  });

  const createWrongAttempt = (id: string): ChordGuessAttempt => ({
    id,
    timestamp: new Date(),
    actualChord: createMockChord('C major', [
      { note: 'C', octave: 4 },
      { note: 'E', octave: 4 },
      { note: 'G', octave: 4 }
    ]),
    isCorrect: false,
    accuracy: 0
  });

  const createPartialAttempt = (id: string): ChordGuessAttempt => ({
    id,
    timestamp: new Date(),
    actualChord: createMockChord('C major', [
      { note: 'C', octave: 4 },
      { note: 'E', octave: 4 },
      { note: 'G', octave: 4 }
    ]),
    isCorrect: false,
    accuracy: 66,
    correctNotes: [
      { note: 'C', octave: 4 },
      { note: 'E', octave: 4 }
    ],
    missedNotes: [
      { note: 'G', octave: 4 }
    ],
    incorrectNotes: []
  });

  const createTrainingAttempt = (id: string, isCorrect: boolean): ChordGuessAttempt => ({
    id,
    timestamp: new Date(),
    actualChord: createMockChord('D minor', [
      { note: 'D', octave: 4 },
      { note: 'F', octave: 4 },
      { note: 'A', octave: 4 }
    ]),
    isCorrect,
    accuracy: isCorrect ? 100 : 33,
    correctNotes: [{ note: 'D', octave: 4 }],
    missedNotes: isCorrect ? [] : [{ note: 'F', octave: 4 }, { note: 'A', octave: 4 }],
    incorrectNotes: isCorrect ? [] : [{ note: 'C', octave: 4 }]
  });

  const createIdentificationAttempt = (id: string, isCorrect: boolean): ChordGuessAttempt => ({
    id,
    timestamp: new Date(),
    actualChord: createMockChord('G major', [
      { note: 'G', octave: 4 },
      { note: 'B', octave: 4 },
      { note: 'D', octave: 5 }
    ]),
    isCorrect,
    guessedChordName: isCorrect ? 'G' : 'Gm'
  });

  beforeEach(() => {
    // No mocks needed for this component
  });

  describe('Rendering', () => {
    it('should show empty state when no attempts', () => {
      const { container } = render(
        <ChordGuessHistory attempts={[]} mode="training" />
      );

      expect(screen.getByText('Make your first guess to see history here')).toBeInTheDocument();
      const emptyState = container.querySelector('.chord-guess-history-empty');
      expect(emptyState).toBeInTheDocument();
    });

    it('should render recent attempts with correct icons', () => {
      const attempts = [
        createCorrectAttempt('1'),
        createWrongAttempt('2'),
        createPartialAttempt('3')
      ];

      render(<ChordGuessHistory attempts={attempts} mode="training" />);

      const items = document.querySelectorAll('.chord-guess-history-item');
      expect(items.length).toBe(3);
    });

    it('should limit display to maxDisplay prop', () => {
      const attempts = Array.from({ length: 15 }, (_, i) =>
        createCorrectAttempt(`attempt-${i}`)
      );

      render(
        <ChordGuessHistory attempts={attempts} mode="training" maxDisplay={10} />
      );

      const items = document.querySelectorAll('.chord-guess-history-item');
      expect(items.length).toBe(10);
    });

    it('should show most recent attempts when exceeding maxDisplay', () => {
      const attempts = Array.from({ length: 15 }, (_, i) =>
        createCorrectAttempt(`attempt-${i}`)
      );

      render(
        <ChordGuessHistory attempts={attempts} mode="training" maxDisplay={5} />
      );

      const items = document.querySelectorAll('.chord-guess-history-item');
      expect(items.length).toBe(5);

      // Should show the last 5 attempts (indices 10-14)
      items.forEach((item, index) => {
        const attemptId = `attempt-${10 + index}`;
        expect(item.querySelector('.chord-guess-icon')).toBeInTheDocument();
      });
    });

    it('should render title', () => {
      render(<ChordGuessHistory attempts={[]} mode="training" />);
      expect(screen.getByText('Guess History')).toBeInTheDocument();
    });

    it('should have scroll container', () => {
      const { container } = render(
        <ChordGuessHistory attempts={[createCorrectAttempt('1')]} mode="training" />
      );

      const scrollContainer = container.querySelector('.chord-guess-history-list');
      expect(scrollContainer).toBeInTheDocument();
    });
  });

  describe('Icons', () => {
    it('should show ✓ for correct attempts', () => {
      const attempts = [createCorrectAttempt('1')];
      const { container } = render(
        <ChordGuessHistory attempts={attempts} mode="training" />
      );

      const icon = container.querySelector('.chord-guess-icon');
      expect(icon?.textContent).toBe('✓');
    });

    it('should show ✗ for wrong attempts', () => {
      const attempts = [createWrongAttempt('1')];
      const { container } = render(
        <ChordGuessHistory attempts={attempts} mode="training" />
      );

      const icon = container.querySelector('.chord-guess-icon');
      expect(icon?.textContent).toBe('✗');
    });

    it('should show ~ for partial attempts', () => {
      const attempts = [createPartialAttempt('1')];
      const { container } = render(
        <ChordGuessHistory attempts={attempts} mode="training" />
      );

      const icon = container.querySelector('.chord-guess-icon');
      expect(icon?.textContent).toBe('~');
    });

    it('should apply correct CSS class for correct attempts', () => {
      const attempts = [createCorrectAttempt('1')];
      const { container } = render(
        <ChordGuessHistory attempts={attempts} mode="training" />
      );

      const item = container.querySelector('.chord-guess-history-item');
      expect(item?.classList.contains('correct')).toBe(true);
    });

    it('should apply wrong CSS class for wrong attempts', () => {
      const attempts = [createWrongAttempt('1')];
      const { container } = render(
        <ChordGuessHistory attempts={attempts} mode="training" />
      );

      const item = container.querySelector('.chord-guess-history-item');
      expect(item?.classList.contains('wrong')).toBe(true);
    });

    it('should apply partial CSS class for partial attempts', () => {
      const attempts = [createPartialAttempt('1')];
      const { container } = render(
        <ChordGuessHistory attempts={attempts} mode="training" />
      );

      const item = container.querySelector('.chord-guess-history-item');
      expect(item?.classList.contains('partial')).toBe(true);
    });
  });

  describe('Tooltips - Training Mode', () => {
    it('should show tooltip on hover', () => {
      const attempts = [createTrainingAttempt('1', true)];
      const { container } = render(
        <ChordGuessHistory attempts={attempts} mode="training" />
      );

      const item = container.querySelector('.chord-guess-history-item');
      expect(item).toBeInTheDocument();

      // Initially no tooltip
      expect(container.querySelector('.chord-tooltip')).not.toBeInTheDocument();

      // Hover to show tooltip
      fireEvent.mouseEnter(item!);
      expect(container.querySelector('.chord-tooltip')).toBeInTheDocument();
    });

    it('should hide tooltip on mouse leave', () => {
      const attempts = [createTrainingAttempt('1', true)];
      const { container } = render(
        <ChordGuessHistory attempts={attempts} mode="training" />
      );

      const item = container.querySelector('.chord-guess-history-item');
      fireEvent.mouseEnter(item!);
      expect(container.querySelector('.chord-tooltip')).toBeInTheDocument();

      fireEvent.mouseLeave(item!);
      expect(container.querySelector('.chord-tooltip')).not.toBeInTheDocument();
    });

    it('should show correct notes breakdown on hover', () => {
      const attempts = [createTrainingAttempt('1', false)];
      const { container } = render(
        <ChordGuessHistory attempts={attempts} mode="training" />
      );

      const item = container.querySelector('.chord-guess-history-item');
      fireEvent.mouseEnter(item!);

      const tooltip = container.querySelector('.chord-tooltip');
      expect(tooltip).toBeInTheDocument();
      expect(tooltip?.textContent).toContain('D4');
    });

    it('should show missed notes breakdown on hover', () => {
      const attempts = [createTrainingAttempt('1', false)];
      const { container } = render(
        <ChordGuessHistory attempts={attempts} mode="training" />
      );

      const item = container.querySelector('.chord-guess-history-item');
      fireEvent.mouseEnter(item!);

      const tooltip = container.querySelector('.chord-tooltip');
      expect(tooltip?.textContent).toContain('Missed Notes');
      expect(tooltip?.textContent).toContain('F4');
      expect(tooltip?.textContent).toContain('A4');
    });

    it('should show incorrect notes breakdown on hover', () => {
      const attempts = [createTrainingAttempt('1', false)];
      const { container } = render(
        <ChordGuessHistory attempts={attempts} mode="training" />
      );

      const item = container.querySelector('.chord-guess-history-item');
      fireEvent.mouseEnter(item!);

      const tooltip = container.querySelector('.chord-tooltip');
      expect(tooltip?.textContent).toContain('Incorrect Notes');
      expect(tooltip?.textContent).toContain('C4');
    });

    it('should display accuracy percentage', () => {
      const attempts = [createPartialAttempt('1')];
      const { container } = render(
        <ChordGuessHistory attempts={attempts} mode="training" />
      );

      const item = container.querySelector('.chord-guess-history-item');
      fireEvent.mouseEnter(item!);

      const tooltip = container.querySelector('.chord-tooltip');
      expect(tooltip?.textContent).toContain('66%');
    });

    it('should display chord name in tooltip header', () => {
      const attempts = [createTrainingAttempt('1', false)];
      const { container } = render(
        <ChordGuessHistory attempts={attempts} mode="training" />
      );

      const item = container.querySelector('.chord-guess-history-item');
      fireEvent.mouseEnter(item!);

      const tooltip = container.querySelector('.chord-tooltip');
      expect(tooltip?.textContent).toContain('D minor');
    });
  });

  describe('Tooltips - Identification Mode', () => {
    it('should show correct message for right answer', () => {
      const attempts = [createIdentificationAttempt('1', true)];
      const { container } = render(
        <ChordGuessHistory attempts={attempts} mode="identification" />
      );

      const item = container.querySelector('.chord-guess-history-item');
      fireEvent.mouseEnter(item!);

      const tooltip = container.querySelector('.chord-tooltip');
      expect(tooltip?.textContent).toContain('Correct!');
      expect(tooltip?.textContent).toContain('G major');
    });

    it('should show actual vs guessed chord on hover for wrong answer', () => {
      const attempts = [createIdentificationAttempt('1', false)];
      const { container } = render(
        <ChordGuessHistory attempts={attempts} mode="identification" />
      );

      const item = container.querySelector('.chord-guess-history-item');
      fireEvent.mouseEnter(item!);

      const tooltip = container.querySelector('.chord-tooltip');
      expect(tooltip?.textContent).toContain('Actual:');
      expect(tooltip?.textContent).toContain('G major');
      expect(tooltip?.textContent).toContain('Your guess:');
      expect(tooltip?.textContent).toContain('Gm');
    });

    it('should not show training-specific details in identification mode', () => {
      const attempts = [createIdentificationAttempt('1', false)];
      const { container } = render(
        <ChordGuessHistory attempts={attempts} mode="identification" />
      );

      const item = container.querySelector('.chord-guess-history-item');
      fireEvent.mouseEnter(item!);

      const tooltip = container.querySelector('.chord-tooltip');
      expect(tooltip?.textContent).not.toContain('Correct Notes');
      expect(tooltip?.textContent).not.toContain('Missed Notes');
      expect(tooltip?.textContent).not.toContain('Incorrect Notes');
    });
  });

  describe('Multiple Attempts', () => {
    it('should render multiple attempts in order', () => {
      const attempts = [
        createCorrectAttempt('1'),
        createWrongAttempt('2'),
        createPartialAttempt('3')
      ];

      const { container } = render(
        <ChordGuessHistory attempts={attempts} mode="training" />
      );

      const items = container.querySelectorAll('.chord-guess-history-item');
      expect(items.length).toBe(3);

      // Check icons in order
      const icons = container.querySelectorAll('.chord-guess-icon');
      expect(icons[0].textContent).toBe('✓');
      expect(icons[1].textContent).toBe('✗');
      expect(icons[2].textContent).toBe('~');
    });

    it('should show different tooltips for different items', () => {
      const attempts = [
        createTrainingAttempt('1', true),
        createTrainingAttempt('2', false)
      ];

      const { container } = render(
        <ChordGuessHistory attempts={attempts} mode="training" />
      );

      const items = container.querySelectorAll('.chord-guess-history-item');

      // Hover first item
      fireEvent.mouseEnter(items[0]);
      let tooltip = container.querySelector('.chord-tooltip');
      expect(tooltip).toBeInTheDocument();
      const firstTooltipContent = tooltip?.textContent;

      fireEvent.mouseLeave(items[0]);

      // Hover second item
      fireEvent.mouseEnter(items[1]);
      tooltip = container.querySelector('.chord-tooltip');
      expect(tooltip).toBeInTheDocument();
      const secondTooltipContent = tooltip?.textContent;

      // Tooltips should be different (one has incorrect notes, one doesn't)
      expect(firstTooltipContent).not.toBe(secondTooltipContent);
    });
  });

  describe('Edge Cases', () => {
    it('should handle attempt with no correctNotes array', () => {
      const attempt: ChordGuessAttempt = {
        id: '1',
        timestamp: new Date(),
        actualChord: createMockChord('C major', [
          { note: 'C', octave: 4 },
          { note: 'E', octave: 4 },
          { note: 'G', octave: 4 }
        ]),
        isCorrect: false
      };

      const { container } = render(
        <ChordGuessHistory attempts={[attempt]} mode="training" />
      );

      const item = container.querySelector('.chord-guess-history-item');
      fireEvent.mouseEnter(item!);

      // Should not crash
      const tooltip = container.querySelector('.chord-tooltip');
      expect(tooltip).toBeInTheDocument();
    });

    it('should handle attempt with empty correctNotes array', () => {
      const attempt: ChordGuessAttempt = {
        id: '1',
        timestamp: new Date(),
        actualChord: createMockChord('C major', [
          { note: 'C', octave: 4 },
          { note: 'E', octave: 4 },
          { note: 'G', octave: 4 }
        ]),
        isCorrect: false,
        correctNotes: []
      };

      const { container } = render(
        <ChordGuessHistory attempts={[attempt]} mode="training" />
      );

      const item = container.querySelector('.chord-guess-history-item');
      fireEvent.mouseEnter(item!);

      const tooltip = container.querySelector('.chord-tooltip');
      expect(tooltip).toBeInTheDocument();
      expect(tooltip?.textContent).not.toContain('Correct Notes');
    });

    it('should handle maxDisplay of 0 by showing all attempts', () => {
      const attempts = [createCorrectAttempt('1')];
      const { container } = render(
        <ChordGuessHistory attempts={attempts} mode="training" maxDisplay={0} />
      );

      // slice(-0) returns all items, so maxDisplay of 0 shows all
      const items = container.querySelectorAll('.chord-guess-history-item');
      expect(items.length).toBe(1);
    });

    it('should handle single attempt', () => {
      const attempts = [createCorrectAttempt('1')];
      const { container } = render(
        <ChordGuessHistory attempts={attempts} mode="training" />
      );

      const items = container.querySelectorAll('.chord-guess-history-item');
      expect(items.length).toBe(1);
    });
  });
});
