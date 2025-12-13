import React from 'react';
import type { Note, NoteWithOctave, Octave } from '../types/music';
import { audioEngine } from '../utils/audioEngine';
import { useSettings } from '../hooks/useSettings';
import './PianoKeyboard.css';

interface PianoKeyboardProps {
  onNoteClick?: (noteWithOctave: NoteWithOctave) => void;
  highlightedNote?: NoteWithOctave;
  correctNote?: NoteWithOctave;
  // Multi-note highlighting for chord modes
  correctNotes?: Set<NoteWithOctave>;
  incorrectNotes?: Set<NoteWithOctave>;
  missingNotes?: Set<NoteWithOctave>;
  selectedNotes?: Set<NoteWithOctave>;
  octave?: number;
  disabled?: boolean;
}

const PianoKeyboard: React.FC<PianoKeyboardProps> = ({
  onNoteClick,
  highlightedNote,
  correctNote,
  correctNotes,
  incorrectNotes,
  missingNotes,
  selectedNotes,
  octave = 4,
  disabled = false
}) => {
  const { settings } = useSettings();
  const { noteDuration } = settings.timing;
  const { showNoteLabels } = settings;
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

  const handleKeyClick = async (note: Note, keyIndex?: number) => {
    // Don't handle clicks if disabled
    if (disabled) return;

    // For the second C key (index 7), use the next octave
    const actualOctave = (note === 'C' && keyIndex === 7) ? (octave + 1) as Octave : octave as Octave;
    const noteWithOctave = { note, octave: actualOctave };

    // Play the note sound
    try {
      await audioEngine.initialize();
      audioEngine.playNote(noteWithOctave, noteDuration);
    } catch (error) {
      console.warn('Failed to play note:', error);
    }

    // Call the parent callback
    if (onNoteClick) {
      onNoteClick(noteWithOctave);
    }
  };

  const isHighlighted = (note: Note, keyIndex: number) => {
    if (!highlightedNote || highlightedNote.note !== note) return false;

    // For C keys, check which octave we're highlighting
    if (note === 'C') {
      const keyOctave = keyIndex === 7 ? octave + 1 : octave;
      return highlightedNote.octave === keyOctave;
    }

    // For other keys, just check the current octave
    return highlightedNote.octave === octave;
  };

  const isCorrect = (note: Note, keyIndex: number) => {
    if (!correctNote || correctNote.note !== note) return false;

    // For C keys, check which octave we're highlighting
    if (note === 'C') {
      const keyOctave = keyIndex === 7 ? octave + 1 : octave;
      return correctNote.octave === keyOctave;
    }

    // For other keys, just check the current octave
    return correctNote.octave === octave;
  };

  // Helper to check if a note is in a Set
  const isNoteInSet = (noteSet: Set<NoteWithOctave> | undefined, note: Note, keyIndex: number): boolean => {
    if (!noteSet) return false;

    const keyOctave = (note === 'C' && keyIndex === 7) ? octave + 1 : octave;

    return Array.from(noteSet).some(n =>
      n.note === note && n.octave === keyOctave
    );
  };

  const isCorrectNote = (note: Note, keyIndex: number) => isNoteInSet(correctNotes, note, keyIndex);
  const isIncorrectNote = (note: Note, keyIndex: number) => isNoteInSet(incorrectNotes, note, keyIndex);
  const isMissingNote = (note: Note, keyIndex: number) => isNoteInSet(missingNotes, note, keyIndex);
  const isSelectedNote = (note: Note, keyIndex: number) => isNoteInSet(selectedNotes, note, keyIndex);

  return (
    <div className="piano-keyboard">
      <div className="white-keys">
        {whiteKeys.map((note, index) => {
          const highlighted = isHighlighted(note, index);
          const correct = isCorrect(note, index);

          // Multi-note highlighting for chord modes
          const correctMulti = isCorrectNote(note, index);
          const incorrectMulti = isIncorrectNote(note, index);
          const missingMulti = isMissingNote(note, index);
          const selectedMulti = isSelectedNote(note, index);

          const className = `white-key ${highlighted ? 'highlighted' : ''} ${correct ? 'correct' : ''} ${correctMulti ? 'note-correct' : ''} ${incorrectMulti ? 'note-incorrect' : ''} ${missingMulti ? 'note-missing' : ''} ${selectedMulti ? 'selected' : ''}`.trim();

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
          const highlighted = isHighlighted(note, -1);
          const correct = isCorrect(note, -1);

          // Multi-note highlighting for chord modes
          const correctMulti = isCorrectNote(note, -1);
          const incorrectMulti = isIncorrectNote(note, -1);
          const missingMulti = isMissingNote(note, -1);
          const selectedMulti = isSelectedNote(note, -1);

          const className = `black-key ${highlighted ? 'highlighted' : ''} ${correct ? 'correct' : ''} ${correctMulti ? 'note-correct' : ''} ${incorrectMulti ? 'note-incorrect' : ''} ${missingMulti ? 'note-missing' : ''} ${selectedMulti ? 'selected' : ''}`.trim();

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