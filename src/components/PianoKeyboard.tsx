import React from 'react';
import type { Note, NoteWithOctave, Octave } from '../types/music';
import { audioEngine } from '../utils/audioEngine';
import { useSettings } from '../hooks/useSettings';
import './PianoKeyboard.css';

interface PianoKeyboardProps {
  onNoteClick?: (noteWithOctave: NoteWithOctave) => void;
  highlightedNote?: NoteWithOctave;
  octave?: number;
}

const PianoKeyboard: React.FC<PianoKeyboardProps> = ({
  onNoteClick,
  highlightedNote,
  octave = 4
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


  return (
    <div className="piano-keyboard">
      <div className="white-keys">
        {whiteKeys.map((note, index) => (
          <button
            key={`${note}-${index}`}
            className={`white-key ${isHighlighted(note, index) ? 'highlighted' : ''}`}
            onClick={() => handleKeyClick(note, index)}
          >
            {showNoteLabels && <span className="note-label">{note}</span>}
          </button>
        ))}
      </div>
      <div className="black-keys">
        {blackKeys.map(({ note, leftOffset }) => (
          <button
            key={note}
            className={`black-key ${isHighlighted(note, -1) ? 'highlighted' : ''}`}
            style={{ left: `${leftOffset}px` }}
            onClick={() => handleKeyClick(note)}
          >
            {showNoteLabels && <span className="note-label">{note}</span>}
          </button>
        ))}
      </div>
    </div>
  );
};

export default PianoKeyboard;