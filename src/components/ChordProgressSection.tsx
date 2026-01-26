import React, { useState, useMemo } from 'react';
import ProgressGraph from './ProgressGraph';
import { useGameHistory } from '../hooks/useGameHistory';
import type { NoteTrainingSessionResults } from '../types/game';
import './ChordProgressSection.css';

interface ChordProgressSectionProps {
  /** Optional: chords practiced in the current session to highlight */
  currentSessionChords?: string[];
}

/**
 * ChordProgressSection displays progress graphs for chord accuracy over time.
 *
 * Features:
 * - Overall accuracy graph
 * - Per-chord accuracy with dropdown selector
 * - Highlights chords from current session
 */
const ChordProgressSection: React.FC<ChordProgressSectionProps> = ({
  currentSessionChords = []
}) => {
  const [selectedChord, setSelectedChord] = useState<string>('overall');
  const { getNoteTrainingSessions } = useGameHistory();

  // Get Note Training sessions from history
  const sessions = useMemo(() => getNoteTrainingSessions(), [getNoteTrainingSessions]);

  // Extract all unique chord names from session history
  const availableChords = useMemo(() => {
    const chordSet = new Set<string>();

    sessions.forEach(session => {
      const results = session.results as NoteTrainingSessionResults;
      if (results && results.chordTypeStats) {
        Object.keys(results.chordTypeStats).forEach(chord => chordSet.add(chord));
      }
    });

    // Sort chords, putting current session chords first
    return Array.from(chordSet).sort((a, b) => {
      const aInCurrent = currentSessionChords.includes(a);
      const bInCurrent = currentSessionChords.includes(b);

      if (aInCurrent && !bInCurrent) return -1;
      if (!aInCurrent && bInCurrent) return 1;
      return a.localeCompare(b);
    });
  }, [sessions, currentSessionChords]);

  // Filter sessions with Note Training data
  const noteTrainingSessions = useMemo(() => {
    return sessions.filter(s => {
      const results = s.results as NoteTrainingSessionResults;
      return results && results.chordTypeStats !== undefined;
    });
  }, [sessions]);

  // If no session data, show minimal empty state
  if (noteTrainingSessions.length === 0) {
    return null;
  }

  return (
    <div className="chord-progress-section">
      <div className="progress-controls">
        <label htmlFor="chord-select" className="control-label">
          View progress for:
        </label>
        <select
          id="chord-select"
          className="chord-select"
          value={selectedChord}
          onChange={(e) => setSelectedChord(e.target.value)}
        >
          <option value="overall">Overall Accuracy</option>
          {availableChords.length > 0 && (
            <optgroup label="By Chord Type">
              {availableChords.map(chord => (
                <option key={chord} value={chord}>
                  {chord}
                  {currentSessionChords.includes(chord) ? ' ★' : ''}
                </option>
              ))}
            </optgroup>
          )}
        </select>
      </div>

      <ProgressGraph
        sessions={noteTrainingSessions}
        chordName={selectedChord === 'overall' ? undefined : selectedChord}
        height={180}
        title={selectedChord === 'overall' ? 'Accuracy Over Time' : `${selectedChord} Progress`}
      />
    </div>
  );
};

export default ChordProgressSection;
