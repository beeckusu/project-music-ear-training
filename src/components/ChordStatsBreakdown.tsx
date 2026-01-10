import React from 'react';
import type { ChordGuessAttempt } from '../types/game';
import { aggregateByChordType, aggregateByRootNote, sortByAccuracyAsc } from '../utils/chordStatistics';
import type { ChordTypeStats, RootNoteStats } from '../utils/chordStatistics';
import './ChordStatsBreakdown.css';

interface ChordStatsBreakdownProps {
  /** Array of chord guess attempts to analyze */
  guessHistory: ChordGuessAttempt[];
}

/**
 * ChordStatsBreakdown component - displays detailed chord statistics
 *
 * Shows accuracy breakdown by:
 * - Chord Type (Major, Minor, etc.)
 * - Root Note (C, D, E, etc.)
 *
 * Only displays chord types and root notes that actually appeared in the session.
 * Stats are sorted by accuracy (ascending) to highlight areas needing practice.
 */
const ChordStatsBreakdown: React.FC<ChordStatsBreakdownProps> = ({ guessHistory }) => {
  // Don't render if insufficient data
  if (guessHistory.length < 3) {
    return null;
  }

  const chordTypeStats = sortByAccuracyAsc(aggregateByChordType(guessHistory));
  const rootNoteStats = sortByAccuracyAsc(aggregateByRootNote(guessHistory));

  /**
   * Gets the CSS class for accuracy-based color coding
   */
  const getAccuracyClass = (accuracy: number): string => {
    if (accuracy >= 85) return 'accuracy-success';
    if (accuracy >= 65) return 'accuracy-neutral';
    return 'accuracy-warning';
  };

  /**
   * Renders a stats table row
   */
  const renderStatsRow = (
    label: string,
    stats: { totalAttempts: number; correctAttempts: number; accuracy: number }
  ) => {
    const accuracyClass = getAccuracyClass(stats.accuracy);

    return (
      <tr key={label} className={accuracyClass}>
        <td className="stats-label">{label}</td>
        <td className="stats-attempts">{stats.totalAttempts}</td>
        <td className="stats-accuracy-bar">
          <div className="accuracy-bar-container">
            <div
              className="accuracy-bar-fill"
              style={{ width: `${stats.accuracy}%` }}
            />
          </div>
        </td>
        <td className="stats-accuracy-text">{stats.accuracy.toFixed(0)}%</td>
      </tr>
    );
  };

  return (
    <div className="chord-stats-breakdown">
      <h3 className="breakdown-title">Performance Breakdown</h3>

      <div className="breakdown-container">
        {/* Chord Type Stats */}
        <div className="breakdown-section">
          <h4 className="section-title">By Chord Type</h4>
          <table className="stats-table">
            <thead>
              <tr>
                <th>Type</th>
                <th>Attempts</th>
                <th>Accuracy</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {chordTypeStats.map((stats: ChordTypeStats) =>
                renderStatsRow(stats.displayName, stats)
              )}
            </tbody>
          </table>
        </div>

        {/* Root Note Stats */}
        <div className="breakdown-section">
          <h4 className="section-title">By Root Note</h4>
          <table className="stats-table">
            <thead>
              <tr>
                <th>Note</th>
                <th>Attempts</th>
                <th>Accuracy</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rootNoteStats.map((stats: RootNoteStats) =>
                renderStatsRow(stats.rootNote, stats)
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="breakdown-legend">
        <span className="legend-item">
          <span className="legend-color accuracy-success"></span> Excellent (≥85%)
        </span>
        <span className="legend-item">
          <span className="legend-color accuracy-neutral"></span> Good (65-84%)
        </span>
        <span className="legend-item">
          <span className="legend-color accuracy-warning"></span> Needs Practice (&lt;65%)
        </span>
      </div>
    </div>
  );
};

export default ChordStatsBreakdown;
