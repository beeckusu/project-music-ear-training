import React, { useState, useCallback } from 'react';
import type { NoteWithOctave } from '../types/music';
import { audioEngine, AudioEngine } from '../utils/audioEngine';
import PianoKeyboard from './PianoKeyboard';
import './NoteIdentification.css';

interface NoteIdentificationProps {
  onScoreUpdate?: (correct: boolean) => void;
}

const NoteIdentification: React.FC<NoteIdentificationProps> = ({ onScoreUpdate }) => {
  const [currentNote, setCurrentNote] = useState<NoteWithOctave | null>(null);
  const [userGuess, setUserGuess] = useState<NoteWithOctave | null>(null);
  const [feedback, setFeedback] = useState<string>('');
  const [isPlaying, setIsPlaying] = useState(false);

  const generateNewNote = useCallback(() => {
    const newNote = AudioEngine.getRandomNote(4, 4); // Match keyboard octave
    setCurrentNote(newNote);
    setUserGuess(null);
    setFeedback('Listen to the note and identify it on the keyboard');
  }, []);

  const playCurrentNote = async () => {
    if (!currentNote) return;
    
    setIsPlaying(true);
    await audioEngine.initialize();
    audioEngine.playNote(currentNote, '2n');
    setTimeout(() => setIsPlaying(false), 500);
  };

  const handleNoteGuess = (guessedNote: NoteWithOctave) => {
    if (!currentNote) return;

    setUserGuess(guessedNote);
    const isCorrect = guessedNote.note === currentNote.note && guessedNote.octave === currentNote.octave;
    
    if (isCorrect) {
      setFeedback('Correct! Great job!');
      onScoreUpdate?.(true);
    } else {
      setFeedback(`Not quite. The correct answer was ${currentNote.note}${currentNote.octave}`);
      onScoreUpdate?.(false);
    }
  };

  const startNewRound = () => {
    generateNewNote();
  };

  return (
    <div className="note-identification">
      <h2>Note Identification</h2>
      
      <div className="game-area">
        <div className="controls">
          <button 
            onClick={currentNote ? playCurrentNote : startNewRound}
            disabled={isPlaying}
            className="primary-button"
          >
            {isPlaying ? 'Playing...' : currentNote ? 'Play Note Again' : 'Start Practice'}
          </button>
          
          {currentNote && (
            <button onClick={startNewRound} className="secondary-button">
              Next Note
            </button>
          )}
        </div>

        <div className="feedback">
          {feedback && <p className="feedback-text">{feedback}</p>}
        </div>

        {currentNote && (
          <PianoKeyboard 
            onNoteClick={handleNoteGuess}
            highlightedNote={userGuess || undefined}
          />
        )}
      </div>
    </div>
  );
};

export default NoteIdentification;