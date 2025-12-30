import React from 'react';
import type { Note, ChordType } from '../types/music';
import { ALL_NOTES, ChordType as CT } from '../types/music';
import { formatChordName, CHORD_NAME_FORMATS } from '../constants/chords';
import './ChordSelection.css';

interface ChordSelectionProps {
  /** Currently selected base note */
  selectedBaseNote: Note | null;

  /** Currently selected chord type */
  selectedChordType: ChordType | null;

  /** Callback when base note is clicked */
  onBaseNoteSelect: (note: Note) => void;

  /** Callback when chord type is clicked */
  onChordTypeSelect: (type: ChordType) => void;

  /** Whether the component is disabled */
  disabled?: boolean;

  /** Optional CSS classes */
  className?: string;
}

// Organized chord types as per requirements
const CHORD_TYPE_GROUPS = {
  TRIADS: {
    label: 'Triads',
    types: [CT.MAJOR, CT.MINOR, CT.DIMINISHED, CT.AUGMENTED] as ChordType[]
  },
  SEVENTHS: {
    label: '7th Chords',
    types: [CT.MAJOR_7, CT.DOMINANT_7, CT.MINOR_7, CT.HALF_DIMINISHED_7, CT.DIMINISHED_7] as ChordType[]
  },
  NINTHS: {
    label: '9th Chords',
    types: [CT.MAJOR_9, CT.DOMINANT_9, CT.MINOR_9] as ChordType[]
  },
  ELEVENTHS: {
    label: '11th Chords',
    types: [CT.MAJOR_11, CT.DOMINANT_11, CT.MINOR_11] as ChordType[]
  },
  THIRTEENTHS: {
    label: '13th Chords',
    types: [CT.MAJOR_13, CT.DOMINANT_13, CT.MINOR_13] as ChordType[]
  },
  SUSPENDED: {
    label: 'Suspended',
    types: [CT.SUS2, CT.SUS4] as ChordType[]
  },
  ADDED: {
    label: 'Added Tones',
    types: [CT.ADD9, CT.ADD11, CT.MAJOR_ADD9, CT.MINOR_ADD9] as ChordType[]
  }
};

/**
 * Chord selection UI component with two-step selection (base note + chord type).
 * Displays 12 base note buttons and 24 chord type buttons organized in logical groups.
 */
const ChordSelection: React.FC<ChordSelectionProps> = ({
  selectedBaseNote,
  selectedChordType,
  onBaseNoteSelect,
  onChordTypeSelect,
  disabled = false,
  className = ''
}) => {
  // Get the formatted chord name when both selections are made
  const getFormattedChordName = (): string | null => {
    if (selectedBaseNote && selectedChordType) {
      return formatChordName(selectedBaseNote, selectedChordType);
    }
    return null;
  };

  const formattedChordName = getFormattedChordName();

  return (
    <div className={`chord-selection ${className} ${disabled ? 'disabled' : ''}`}>
      {/* Base Notes Grid */}
      <div className="base-notes-grid" role="group" aria-label="Base notes">
        {ALL_NOTES.map(note => (
          <button
            key={note}
            type="button"
            className={`base-note-button ${selectedBaseNote === note ? 'selected' : ''}`}
            onClick={() => !disabled && onBaseNoteSelect(note)}
            disabled={disabled}
            aria-label={`Base note ${note}`}
            aria-pressed={selectedBaseNote === note}
          >
            {note}
          </button>
        ))}
      </div>

      {/* Chord Types Grid - All types in one compact grid */}
      <div className="chord-types-grid" role="group" aria-label="Chord types">
        {Object.values(CHORD_TYPE_GROUPS).flatMap(group => group.types).map(type => (
          <button
            key={type}
            type="button"
            className={`chord-type-button ${selectedChordType === type ? 'selected' : ''}`}
            onClick={() => !disabled && onChordTypeSelect(type)}
            disabled={disabled}
            aria-label={`Chord type ${CHORD_NAME_FORMATS[type] || 'major'}`}
            aria-pressed={selectedChordType === type}
            title={CHORD_NAME_FORMATS[type] || 'maj'}
          >
            {CHORD_NAME_FORMATS[type] || 'maj'}
          </button>
        ))}
      </div>

      {/* Selected Chord Name Display */}
      {formattedChordName && (
        <div className="selected-chord-display" aria-live="polite">
          <span className="selected-chord-name">{formattedChordName}</span>
        </div>
      )}
    </div>
  );
};

export default ChordSelection;
