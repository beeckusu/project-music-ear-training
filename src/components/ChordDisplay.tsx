import React from 'react';
import type { Chord } from '../types/music';
import './ChordDisplay.css';

interface ChordDisplayProps {
  /** The chord to display. If null, component renders nothing. */
  chord: Chord | null;

  /** Whether to show instruction text. Default: true */
  showInstructions?: boolean;

  /** Optional additional CSS classes */
  className?: string;
}

/**
 * ChordDisplay component - displays chord name and type above piano keyboard
 *
 * Extracted from SingleChordModeDisplay for reusability across multiple chord-related modes.
 * Shows the current chord name with optional instructional text.
 */
const ChordDisplay: React.FC<ChordDisplayProps> = ({
  chord,
  showInstructions = true,
  className = ''
}) => {
  // Don't render anything if no chord is provided
  if (!chord) {
    return null;
  }

  return (
    <div className={`chord-display-section ${className}`.trim()}>
      <div className="chord-name-container">
        <div className="chord-label">Current Chord</div>
        <div className="chord-name">{chord.name}</div>
        {showInstructions && (
          <div className="chord-instruction">
            Select all {chord.notes.length} notes in this chord
          </div>
        )}
      </div>
    </div>
  );
};

export default ChordDisplay;
