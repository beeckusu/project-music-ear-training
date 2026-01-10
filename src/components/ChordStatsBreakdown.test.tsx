import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import ChordStatsBreakdown from './ChordStatsBreakdown';
import type { ChordGuessAttempt } from '../types/game';
import type { Chord } from '../types/music';
import { ChordType } from '../types/music';

describe('ChordStatsBreakdown', () => {
  // Helper to create mock chord
  const createMockChord = (root: 'C' | 'D' | 'E' | 'F' | 'G', type: typeof ChordType[keyof typeof ChordType]): Chord => ({
    name: `${root} ${type}`,
    root,
    type,
    notes: [{ note: root, octave: 4 }]
  });

  // Helper to create training mode attempt
  const createTrainingAttempt = (
    root: 'C' | 'D' | 'E' | 'F' | 'G',
    type: typeof ChordType[keyof typeof ChordType],
    accuracy: number,
    isCorrect: boolean
  ): ChordGuessAttempt => ({
    id: Math.random().toString(),
    timestamp: new Date(),
    actualChord: createMockChord(root, type),
    isCorrect,
    accuracy,
    correctNotes: [],
    missedNotes: [],
    incorrectNotes: []
  });

  // Helper to create identification mode attempt
  const createIdentificationAttempt = (
    root: 'C' | 'D' | 'E' | 'F' | 'G',
    type: typeof ChordType[keyof typeof ChordType],
    isCorrect: boolean
  ): ChordGuessAttempt => ({
    id: Math.random().toString(),
    timestamp: new Date(),
    actualChord: createMockChord(root, type),
    isCorrect,
    guessedChordName: `${root} ${type}`
  });

  describe('Rendering', () => {
    it('should not render when guess history is empty', () => {
      const { container } = render(<ChordStatsBreakdown guessHistory={[]} />);
      expect(container.firstChild).toBeNull();
    });

    it('should not render when guess history has fewer than 3 attempts', () => {
      const guessHistory = [
        createTrainingAttempt('C', ChordType.MAJOR, 100, true),
        createTrainingAttempt('D', ChordType.MINOR, 80, false)
      ];

      const { container } = render(<ChordStatsBreakdown guessHistory={guessHistory} />);
      expect(container.firstChild).toBeNull();
    });

    it('should render when guess history has 3 or more attempts', () => {
      const guessHistory = [
        createTrainingAttempt('C', ChordType.MAJOR, 100, true),
        createTrainingAttempt('D', ChordType.MINOR, 80, false),
        createTrainingAttempt('E', ChordType.MAJOR, 60, false)
      ];

      render(<ChordStatsBreakdown guessHistory={guessHistory} />);
      expect(screen.getByText('Performance Breakdown')).toBeInTheDocument();
    });
  });

  describe('Chord Type Stats', () => {
    it('should display chord type breakdown', () => {
      const guessHistory = [
        createTrainingAttempt('C', ChordType.MAJOR, 100, true),
        createTrainingAttempt('D', ChordType.MAJOR, 80, false),
        createTrainingAttempt('E', ChordType.MINOR, 60, false)
      ];

      render(<ChordStatsBreakdown guessHistory={guessHistory} />);

      expect(screen.getByText('By Chord Type')).toBeInTheDocument();
      expect(screen.getByText('Major')).toBeInTheDocument();
      expect(screen.getByText('Minor')).toBeInTheDocument();
    });

    it('should only show chord types that appeared', () => {
      const guessHistory = [
        createTrainingAttempt('C', ChordType.MAJOR, 100, true),
        createTrainingAttempt('D', ChordType.MAJOR, 80, false),
        createTrainingAttempt('E', ChordType.MAJOR, 60, false)
      ];

      render(<ChordStatsBreakdown guessHistory={guessHistory} />);

      expect(screen.getByText('Major')).toBeInTheDocument();
      expect(screen.queryByText('Minor')).not.toBeInTheDocument();
      expect(screen.queryByText('Diminished')).not.toBeInTheDocument();
    });

    it('should display correct accuracy for training mode', () => {
      const guessHistory = [
        createTrainingAttempt('C', ChordType.MAJOR, 100, true),
        createTrainingAttempt('D', ChordType.MAJOR, 80, false),
        createTrainingAttempt('E', ChordType.MAJOR, 60, false)
      ];

      render(<ChordStatsBreakdown guessHistory={guessHistory} />);

      // Average accuracy for Major: (100 + 80 + 60) / 3 = 80%
      const accuracyElements = screen.getAllByText('80%');
      expect(accuracyElements.length).toBeGreaterThan(0);
    });

    it('should display correct accuracy for identification mode', () => {
      const guessHistory = [
        createIdentificationAttempt('C', ChordType.MAJOR, true),
        createIdentificationAttempt('D', ChordType.MAJOR, false),
        createIdentificationAttempt('E', ChordType.MINOR, true)
      ];

      render(<ChordStatsBreakdown guessHistory={guessHistory} />);

      // Average accuracy for Major: (100 + 0) / 2 = 50%
      const fiftyPercent = screen.getAllByText('50%');
      expect(fiftyPercent.length).toBeGreaterThan(0);
      // Average accuracy for Minor: 100 / 1 = 100%
      const hundredPercent = screen.getAllByText('100%');
      expect(hundredPercent.length).toBeGreaterThan(0);
    });
  });

  describe('Root Note Stats', () => {
    it('should display root note breakdown', () => {
      const guessHistory = [
        createTrainingAttempt('C', ChordType.MAJOR, 100, true),
        createTrainingAttempt('D', ChordType.MAJOR, 80, false),
        createTrainingAttempt('E', ChordType.MAJOR, 60, false)
      ];

      render(<ChordStatsBreakdown guessHistory={guessHistory} />);

      expect(screen.getByText('By Root Note')).toBeInTheDocument();
      expect(screen.getByText('C')).toBeInTheDocument();
      expect(screen.getByText('D')).toBeInTheDocument();
      expect(screen.getByText('E')).toBeInTheDocument();
    });

    it('should only show root notes that appeared', () => {
      const guessHistory = [
        createTrainingAttempt('C', ChordType.MAJOR, 100, true),
        createTrainingAttempt('C', ChordType.MINOR, 80, false),
        createTrainingAttempt('D', ChordType.MAJOR, 60, false)
      ];

      render(<ChordStatsBreakdown guessHistory={guessHistory} />);

      expect(screen.getByText('C')).toBeInTheDocument();
      expect(screen.getByText('D')).toBeInTheDocument();
      expect(screen.queryByText('E')).not.toBeInTheDocument();
      expect(screen.queryByText('F')).not.toBeInTheDocument();
    });
  });

  describe('Sorting', () => {
    it('should sort stats by accuracy ascending (lowest first)', () => {
      const guessHistory = [
        createTrainingAttempt('C', ChordType.MAJOR, 90, true),      // 90% average
        createTrainingAttempt('D', ChordType.MINOR, 50, false),     // 50% average
        createTrainingAttempt('E', ChordType.DIMINISHED, 70, false) // 70% average
      ];

      render(<ChordStatsBreakdown guessHistory={guessHistory} />);

      const rows = screen.getAllByRole('row');

      // Check chord type section (skip header row)
      const chordTypeRows = rows.slice(1, 4); // Rows for Minor, Diminished, Major
      expect(chordTypeRows[0]).toHaveTextContent('Minor');
      expect(chordTypeRows[1]).toHaveTextContent('Diminished');
      expect(chordTypeRows[2]).toHaveTextContent('Major');
    });
  });

  describe('Legend', () => {
    it('should display accuracy legend', () => {
      const guessHistory = [
        createTrainingAttempt('C', ChordType.MAJOR, 100, true),
        createTrainingAttempt('D', ChordType.MAJOR, 80, false),
        createTrainingAttempt('E', ChordType.MAJOR, 60, false)
      ];

      render(<ChordStatsBreakdown guessHistory={guessHistory} />);

      expect(screen.getByText(/Excellent.*≥85%/)).toBeInTheDocument();
      expect(screen.getByText(/Good.*65-84%/)).toBeInTheDocument();
      expect(screen.getByText(/Needs Practice.*<65%/)).toBeInTheDocument();
    });
  });

  describe('Attempts Display', () => {
    it('should display correct number of attempts', () => {
      const guessHistory = [
        createTrainingAttempt('C', ChordType.MAJOR, 100, true),
        createTrainingAttempt('D', ChordType.MAJOR, 80, false),
        createTrainingAttempt('E', ChordType.MAJOR, 60, false)
      ];

      render(<ChordStatsBreakdown guessHistory={guessHistory} />);

      // Should show 3 attempts for Major chord type
      const attemptCells = screen.getAllByText('3');
      expect(attemptCells.length).toBeGreaterThan(0);
    });

    it('should aggregate attempts by chord type correctly', () => {
      const guessHistory = [
        createTrainingAttempt('C', ChordType.MAJOR, 100, true),
        createTrainingAttempt('D', ChordType.MAJOR, 80, false),
        createTrainingAttempt('E', ChordType.MINOR, 60, false),
        createTrainingAttempt('F', ChordType.MINOR, 70, false)
      ];

      render(<ChordStatsBreakdown guessHistory={guessHistory} />);

      // Find all cells showing "2" attempts
      const twoCells = screen.getAllByText('2');
      // Should have 2 instances of "2" (one for Major, one for Minor)
      expect(twoCells.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Mixed Mode Data', () => {
    it('should handle mixed training and identification mode data', () => {
      const guessHistory = [
        createTrainingAttempt('C', ChordType.MAJOR, 75, false),
        createIdentificationAttempt('D', ChordType.MAJOR, true),
        createTrainingAttempt('E', ChordType.MINOR, 80, false)
      ];

      render(<ChordStatsBreakdown guessHistory={guessHistory} />);

      expect(screen.getByText('Performance Breakdown')).toBeInTheDocument();
      expect(screen.getByText('Major')).toBeInTheDocument();
      expect(screen.getByText('Minor')).toBeInTheDocument();
    });
  });
});
