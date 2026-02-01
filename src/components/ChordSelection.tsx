import React from 'react';
import type { Note, ChordType } from '../types/music';
import { ALL_NOTES, ChordType as CT } from '../types/music';
import { formatChordName } from '../constants/chords';
import './ChordSelection.css';

export type ChordQuality = 'maj' | 'm' | 'dim' | 'aug' | 'sus2' | 'sus4';
export type ChordExtension = '7' | '9' | '11' | '13' | 'add9' | 'add11';

interface ChordSelectionProps {
  selectedBaseNote: Note | null;
  selectedQuality: ChordQuality | null;
  selectedExtension: ChordExtension | null;
  onBaseNoteSelect: (note: Note | null) => void;
  onQualitySelect: (quality: ChordQuality | null) => void;
  onExtensionSelect: (extension: ChordExtension | null) => void;
  disabled?: boolean;
  className?: string;
}

const QUALITY_OPTIONS: { value: ChordQuality; label: string }[] = [
  { value: 'maj', label: 'maj' },
  { value: 'm', label: 'm' },
  { value: 'dim', label: 'dim' },
  { value: 'aug', label: 'aug' },
  { value: 'sus2', label: 'sus2' },
  { value: 'sus4', label: 'sus4' },
];

const EXTENSION_OPTIONS: { value: ChordExtension; label: string }[] = [
  { value: '7', label: '7' },
  { value: '9', label: '9' },
  { value: '11', label: '11' },
  { value: '13', label: '13' },
  { value: 'add9', label: 'add9' },
  { value: 'add11', label: 'add11' },
];

/**
 * Maps (quality, extension) to a ChordType.
 * Returns null for invalid combinations.
 */
const QUALITY_EXTENSION_MAP: Record<string, ChordType> = {
  // Quality only (no extension) — triads
  'maj:': CT.MAJOR,
  'm:': CT.MINOR,
  'dim:': CT.DIMINISHED,
  'aug:': CT.AUGMENTED,
  'sus2:': CT.SUS2,
  'sus4:': CT.SUS4,

  // No quality + extension — dominant chords
  ':7': CT.DOMINANT_7,
  ':9': CT.DOMINANT_9,
  ':11': CT.DOMINANT_11,
  ':13': CT.DOMINANT_13,

  // maj + extension
  'maj:7': CT.MAJOR_7,
  'maj:9': CT.MAJOR_9,
  'maj:11': CT.MAJOR_11,
  'maj:13': CT.MAJOR_13,
  'maj:add9': CT.ADD9,
  'maj:add11': CT.ADD11,

  // m + extension
  'm:7': CT.MINOR_7,
  'm:9': CT.MINOR_9,
  'm:11': CT.MINOR_11,
  'm:13': CT.MINOR_13,
  'm:add9': CT.MINOR_ADD9,

  // dim + extension
  'dim:7': CT.DIMINISHED_7,
};

export function resolveChordType(
  quality: ChordQuality | null,
  extension: ChordExtension | null
): ChordType | null {
  const q = quality ?? '';
  const e = extension ?? '';

  // No quality and no extension — default to major
  if (!q && !e) return CT.MAJOR;

  const key = `${q}:${e}`;
  return QUALITY_EXTENSION_MAP[key] ?? null;
}

/**
 * Returns which extensions are valid for a given quality.
 */
function getValidExtensions(quality: ChordQuality | null): Set<ChordExtension> {
  const q = quality ?? '';
  const valid = new Set<ChordExtension>();
  for (const ext of EXTENSION_OPTIONS) {
    const key = `${q}:${ext.value}`;
    if (key in QUALITY_EXTENSION_MAP) {
      valid.add(ext.value);
    }
  }
  return valid;
}

const ChordSelection: React.FC<ChordSelectionProps> = ({
  selectedBaseNote,
  selectedQuality,
  selectedExtension,
  onBaseNoteSelect,
  onQualitySelect,
  onExtensionSelect,
  disabled = false,
  className = ''
}) => {
  const validExtensions = getValidExtensions(selectedQuality);
  const chordType = resolveChordType(selectedQuality, selectedExtension);

  const formattedChordName = selectedBaseNote && chordType
    ? formatChordName(selectedBaseNote, chordType)
    : null;

  const handleNoteClick = (note: Note) => {
    if (disabled) return;
    onBaseNoteSelect(selectedBaseNote === note ? null : note);
  };

  const handleQualityClick = (quality: ChordQuality) => {
    if (disabled) return;
    if (selectedQuality === quality) {
      onQualitySelect(null);
    } else {
      onQualitySelect(quality);
      // Clear extension if it becomes invalid with the new quality
      if (selectedExtension && !getValidExtensions(quality).has(selectedExtension)) {
        onExtensionSelect(null);
      }
    }
  };

  const handleExtensionClick = (extension: ChordExtension) => {
    if (disabled) return;
    onExtensionSelect(selectedExtension === extension ? null : extension);
  };

  return (
    <div className={`chord-selection ${className} ${disabled ? 'disabled' : ''}`}>
      <div className="chord-selection-columns">
        {/* Column 1: Root Notes */}
        <div className="chord-column">
          <div className="chord-column-header">Root</div>
          <div className="chord-column-buttons" role="group" aria-label="Root notes">
            {ALL_NOTES.map(note => (
              <button
                key={note}
                type="button"
                className={`chord-col-button ${selectedBaseNote === note ? 'selected' : ''}`}
                onClick={() => handleNoteClick(note)}
                disabled={disabled}
                aria-pressed={selectedBaseNote === note}
              >
                {note}
              </button>
            ))}
          </div>
        </div>

        {/* Column 2: Quality */}
        <div className="chord-column">
          <div className="chord-column-header">Quality</div>
          <div className="chord-column-buttons" role="group" aria-label="Chord quality">
            {QUALITY_OPTIONS.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                className={`chord-col-button ${selectedQuality === value ? 'selected' : ''}`}
                onClick={() => handleQualityClick(value)}
                disabled={disabled}
                aria-pressed={selectedQuality === value}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Column 3: Extension */}
        <div className="chord-column">
          <div className="chord-column-header">Extension</div>
          <div className="chord-column-buttons" role="group" aria-label="Chord extension">
            {EXTENSION_OPTIONS.map(({ value, label }) => {
              const isValid = validExtensions.has(value);
              return (
                <button
                  key={value}
                  type="button"
                  className={`chord-col-button ${selectedExtension === value ? 'selected' : ''} ${!isValid ? 'invalid' : ''}`}
                  onClick={() => handleExtensionClick(value)}
                  disabled={disabled || !isValid}
                  aria-pressed={selectedExtension === value}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
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
