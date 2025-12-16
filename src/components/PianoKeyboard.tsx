import React from 'react';
import type { Note, NoteWithOctave, Octave, NoteHighlight, NoteHighlightType } from '../types/music';
import { audioEngine } from '../utils/audioEngine';
import { useSettings } from '../hooks/useSettings';
import './PianoKeyboard.css';

interface PianoKeyboardProps {
  /** Callback when a piano key is clicked */
  onNoteClick?: (noteWithOctave: NoteWithOctave) => void;

  /** Array of note highlights to apply to the piano keys */
  highlights?: NoteHighlight[];

  /** Base octave for the piano keyboard (default: 4) */
  octave?: number;

  /** Whether the piano is disabled for interaction */
  disabled?: boolean;

  /**
   * Prevent replaying the same note while it's still playing (default: false)
   * Set to true for ear training mode to avoid note restart issues
   * Set to false for chord mode to allow note replay
   */
  preventNoteRestart?: boolean;

  /**
   * Mono mode - release all notes before playing a new one (default: false)
   * Set to true for ear training mode where only one note should sound at a time
   * Set to false for chord mode where multiple notes should sound together
   */
  monoMode?: boolean;
}

const PianoKeyboard: React.FC<PianoKeyboardProps> = ({
  onNoteClick,
  highlights,
  octave = 4,
  disabled = false,
  preventNoteRestart = false,
  monoMode = false
}) => {
  const { settings } = useSettings();
  const { noteDuration } = settings.timing;
  const { showNoteLabels } = settings;

  // Track last played note for restart prevention
  const lastPlayedNoteRef = React.useRef<{ note: NoteWithOctave; endTime: number } | null>(null);
  const whiteKeys: Note[] = ['C', 'D', 'E', 'F', 'G', 'A', 'B', 'C'];
  // Black keys positioned between specific white keys
  // C# between C and D, D# between D and E, F# between F and G, G# between G and A, A# between A and B
  const blackKeys: { note: Note; leftOffset: number }[] = [
    { note: 'C#', leftOffset: 60 },   // Between C(0) and D(1)
    { note: 'D#', leftOffset: 120 },  // Between D(1) and E(2)
    { note: 'F#', leftOffset: 240 },  // Between F(3) and G(4)
    { note: 'G#', leftOffset: 300 },  // Between G(4) and A(5)
    { note: 'A#', leftOffset: 360 },  // Between A(5) and B(6)
  ];

  /**
   * Mapping from highlight type to CSS class name.
   * This provides the semantic styling for each highlight type.
   */
  const highlightTypeToClass: Record<NoteHighlightType, string> = {
    'default': '',
    'selected': 'piano-key-selected',
    'success': 'piano-key-success',
    'error': 'piano-key-error',
    'dimmed': 'piano-key-dimmed',
    'highlighted': 'piano-key-highlighted',
    'custom': '' // Custom class provided in highlight object
  };

  /**
   * Creates a unique key for a note (for comparison purposes).
   */
  const getNoteKey = (note: NoteWithOctave): string => {
    return `${note.note}-${note.octave}`;
  };

  /**
   * Builds a map of note keys to their highlight types.
   * If multiple highlights exist for the same note, the last one wins.
   */
  const buildHighlightMap = (highlights?: NoteHighlight[]): Map<string, NoteHighlight> => {
    const map = new Map<string, NoteHighlight>();

    if (!highlights) return map;

    for (const highlight of highlights) {
      const key = getNoteKey(highlight.note);
      map.set(key, highlight);
    }

    return map;
  };

  // Build highlight map once
  const highlightMap = React.useMemo(() => buildHighlightMap(highlights), [highlights]);

  /**
   * Handles a piano key click.
   */
  const handleKeyClick = async (note: Note, keyIndex?: number) => {
    // Don't handle clicks if disabled
    if (disabled) return;

    // For the second C key (index 7), use the next octave
    const actualOctave = (note === 'C' && keyIndex === 7) ? (octave + 1) as Octave : octave as Octave;
    const noteWithOctave = { note, octave: actualOctave };

    // Check if we should prevent replaying the same note
    const now = Date.now();
    const lastPlayed = lastPlayedNoteRef.current;
    const isSameNote = lastPlayed &&
      lastPlayed.note.note === noteWithOctave.note &&
      lastPlayed.note.octave === noteWithOctave.octave;
    const isStillPlaying = lastPlayed && now < lastPlayed.endTime;

    if (preventNoteRestart && isSameNote && isStillPlaying) {
      // Still trigger callback even if we don't replay audio
      if (onNoteClick) {
        onNoteClick(noteWithOctave);
      }
      return;
    }

    // Play the note sound
    try {
      await audioEngine.initialize();

      // In mono mode, release all notes before playing new one
      // This ensures only one note plays at a time (ear training mode)
      if (monoMode) {
        audioEngine.releaseAllNotes();
      }

      audioEngine.playNote(noteWithOctave, noteDuration);

      // Track when this note will finish playing (convert noteDuration to ms)
      const durationMs = noteDuration === '8n' ? 250 :
                        noteDuration === '4n' ? 500 :
                        noteDuration === '2n' ? 1000 : 2000;
      lastPlayedNoteRef.current = {
        note: noteWithOctave,
        endTime: now + durationMs
      };
    } catch (error) {
      console.warn('Failed to play note:', error);
    }

    // Call the parent callback
    if (onNoteClick) {
      onNoteClick(noteWithOctave);
    }
  };

  /**
   * Gets the CSS class for a piano key based on its highlight state.
   */
  const getHighlightClass = (note: Note, keyIndex: number): string => {
    const keyOctave = ((note === 'C' && keyIndex === 7) ? octave + 1 : octave) as Octave;
    const noteKey = getNoteKey({ note, octave: keyOctave });

    const highlight = highlightMap.get(noteKey);
    if (!highlight) return '';

    // For custom type, use the provided className
    if (highlight.type === 'custom' && highlight.className) {
      return highlight.className;
    }

    return highlightTypeToClass[highlight.type];
  };

  return (
    <div className="piano-keyboard">
      <div className="white-keys">
        {whiteKeys.map((note, index) => {
          const highlightClass = getHighlightClass(note, index);
          const className = `white-key ${highlightClass}`.trim();

          return (
            <button
              key={`${note}-${index}`}
              className={className}
              onClick={() => handleKeyClick(note, index)}
              disabled={disabled}
            >
              {showNoteLabels && <span className="note-label">{note}</span>}
            </button>
          );
        })}
      </div>
      <div className="black-keys">
        {blackKeys.map(({ note, leftOffset }) => {
          const highlightClass = getHighlightClass(note, -1);
          const className = `black-key ${highlightClass}`.trim();

          return (
            <button
              key={note}
              className={className}
              style={{ left: `${leftOffset}px` }}
              onClick={() => handleKeyClick(note)}
              disabled={disabled}
            >
              {showNoteLabels && <span className="note-label">{note}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default PianoKeyboard;