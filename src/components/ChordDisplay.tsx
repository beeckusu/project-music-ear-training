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
 * Returns the display label for a chord inversion.
 * @param inversion - The inversion number (0 = root, 1 = first, 2 = second, etc.)
 * @returns The formatted label (e.g., "1st inv") or null if root position
 */
const getInversionLabel = (inversion: number | undefined): string | null => {
  if (inversion === undefined || inversion === 0) return null;
  const ordinals = ['1st', '2nd', '3rd'];
  return `${ordinals[inversion - 1] || `${inversion}th`} inv`;
};

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
        {chord.inversion !== undefined && chord.inversion > 0 && (
          <div className="chord-inversion" aria-label={`${getInversionLabel(chord.inversion)}`}>
            {getInversionLabel(chord.inversion)}
          </div>
        )}
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
