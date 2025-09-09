import React from 'react';
import type { Note, NoteWithOctave, Octave } from '../types/music';
import { audioEngine } from '../utils/audioEngine';
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
  const whiteKeys: Note[] = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
  // Black keys positioned between specific white keys
  // C# between C and D, D# between D and E, F# between F and G, G# between G and A, A# between A and B
  const blackKeys: { note: Note; leftOffset: number }[] = [
    { note: 'C#', leftOffset: 60 },   // Between C(0) and D(1)
    { note: 'D#', leftOffset: 120 },  // Between D(1) and E(2)
    { note: 'F#', leftOffset: 240 },  // Between F(3) and G(4)
    { note: 'G#', leftOffset: 300 },  // Between G(4) and A(5)
    { note: 'A#', leftOffset: 360 },  // Between A(5) and B(6)
  ];

  const handleKeyClick = async (note: Note) => {
    const noteWithOctave = { note, octave: octave as Octave };
    
    // Play the note sound
    try {
      await audioEngine.initialize();
      audioEngine.playNote(noteWithOctave, '8n');
    } catch (error) {
      console.warn('Failed to play note:', error);
    }
    
    // Call the parent callback
    if (onNoteClick) {
      onNoteClick(noteWithOctave);
    }
  };

  const isHighlighted = (note: Note) => {
    return highlightedNote?.note === note && highlightedNote?.octave === octave;
  };


  return (
    <div className="piano-keyboard">
      <div className="white-keys">
        {whiteKeys.map((note) => (
          <button
            key={note}
            className={`white-key ${isHighlighted(note) ? 'highlighted' : ''}`}
            onClick={() => handleKeyClick(note)}
          >
            {note}
          </button>
        ))}
      </div>
      <div className="black-keys">
        {blackKeys.map(({ note, leftOffset }) => (
          <button
            key={note}
            className={`black-key ${isHighlighted(note) ? 'highlighted' : ''}`}
            style={{ left: `${leftOffset}px` }}
            onClick={() => handleKeyClick(note)}
          >
            {note}
          </button>
        ))}
      </div>
    </div>
  );
};

export default PianoKeyboard;