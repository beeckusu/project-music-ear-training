import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ProgressGraph from './ProgressGraph';
import type { GameSession } from '../types/game';

const createMockSession = (
  accuracy: number,
  chordStats: Record<string, { accuracy: number; attempts: number; correct: number }>,
  daysAgo: number = 0
): GameSession => {
  const timestamp = new Date();
  timestamp.setDate(timestamp.getDate() - daysAgo);

  return {
    mode: 'note-training',
    timestamp,
    completionTime: 120,
    accuracy,
    totalAttempts: 10,
    settings: {},
    results: {
      accuracy,
      chordsCompleted: 5,
      longestStreak: 3,
      averageTimePerChord: 24,
      chordTypeStats: chordStats,
      guessHistory: [],
      firstTryCorrect: 3,
      totalChordsAttempted: 5,
      subMode: 'show-chord-guess-notes'
    }
  };
};

describe('ProgressGraph', () => {
  it('renders empty state when no sessions provided', () => {
    render(<ProgressGraph sessions={[]} title="Test Graph" />);

    expect(screen.getByText('No session data available yet.')).toBeTruthy();
    expect(screen.getByText('Complete more practice sessions to see your progress!')).toBeTruthy();
  });

  it('renders single session state when only one session', () => {
    const sessions = [
      createMockSession(85, { 'C Major': { accuracy: 85, attempts: 5, correct: 4 } })
    ];

    render(<ProgressGraph sessions={sessions} title="Test Graph" />);

    expect(screen.getByText('85.0%')).toBeTruthy();
    expect(screen.getByText('First session recorded')).toBeTruthy();
  });

  it('renders chart when multiple sessions provided', () => {
    const sessions = [
      createMockSession(75, { 'C Major': { accuracy: 75, attempts: 5, correct: 3 } }, 2),
      createMockSession(85, { 'C Major': { accuracy: 85, attempts: 5, correct: 4 } }, 1),
      createMockSession(90, { 'C Major': { accuracy: 90, attempts: 5, correct: 4 } }, 0)
    ];

    render(<ProgressGraph sessions={sessions} title="Accuracy Over Time" />);

    expect(screen.getByText('Accuracy Over Time')).toBeTruthy();
    expect(screen.getByText('3 sessions')).toBeTruthy();
    // Chart should be rendered (recharts container)
    expect(document.querySelector('.recharts-responsive-container')).toBeTruthy();
  });

  it('shows improving trend when accuracy increases', () => {
    const sessions = [
      createMockSession(50, { 'C Major': { accuracy: 50, attempts: 5, correct: 2 } }, 3),
      createMockSession(60, { 'C Major': { accuracy: 60, attempts: 5, correct: 3 } }, 2),
      createMockSession(75, { 'C Major': { accuracy: 75, attempts: 5, correct: 3 } }, 1),
      createMockSession(90, { 'C Major': { accuracy: 90, attempts: 5, correct: 4 } }, 0)
    ];

    render(<ProgressGraph sessions={sessions} />);

    expect(screen.getByText('📈 Improving')).toBeTruthy();
  });

  it('shows declining trend when accuracy decreases', () => {
    const sessions = [
      createMockSession(90, { 'C Major': { accuracy: 90, attempts: 5, correct: 4 } }, 3),
      createMockSession(75, { 'C Major': { accuracy: 75, attempts: 5, correct: 3 } }, 2),
      createMockSession(60, { 'C Major': { accuracy: 60, attempts: 5, correct: 3 } }, 1),
      createMockSession(50, { 'C Major': { accuracy: 50, attempts: 5, correct: 2 } }, 0)
    ];

    render(<ProgressGraph sessions={sessions} />);

    expect(screen.getByText('📉 Needs work')).toBeTruthy();
  });

  it('shows stable trend when accuracy is consistent', () => {
    const sessions = [
      createMockSession(80, { 'C Major': { accuracy: 80, attempts: 5, correct: 4 } }, 3),
      createMockSession(82, { 'C Major': { accuracy: 82, attempts: 5, correct: 4 } }, 2),
      createMockSession(78, { 'C Major': { accuracy: 78, attempts: 5, correct: 3 } }, 1),
      createMockSession(81, { 'C Major': { accuracy: 81, attempts: 5, correct: 4 } }, 0)
    ];

    render(<ProgressGraph sessions={sessions} />);

    expect(screen.getByText('➡️ Stable')).toBeTruthy();
  });

  it('filters by chord name when provided', () => {
    const sessions = [
      createMockSession(75, {
        'C Major': { accuracy: 75, attempts: 5, correct: 3 },
        'A Minor': { accuracy: 60, attempts: 5, correct: 3 }
      }, 1),
      createMockSession(85, {
        'C Major': { accuracy: 85, attempts: 5, correct: 4 },
        'A Minor': { accuracy: 70, attempts: 5, correct: 3 }
      }, 0)
    ];

    render(<ProgressGraph sessions={sessions} chordName="C Major" title="C Major Progress" />);

    expect(screen.getByText('C Major Progress')).toBeTruthy();
    expect(screen.getByText('2 sessions')).toBeTruthy();
  });

  it('handles sessions without chordTypeStats gracefully', () => {
    const sessionsWithInvalidData = [
      {
        mode: 'note-training',
        timestamp: new Date(),
        completionTime: 120,
        accuracy: 80,
        totalAttempts: 10,
        settings: {},
        results: {} // No chordTypeStats
      }
    ] as GameSession[];

    render(<ProgressGraph sessions={sessionsWithInvalidData} />);

    // Should show empty state since no valid sessions
    expect(screen.getByText('No session data available yet.')).toBeTruthy();
  });
});
