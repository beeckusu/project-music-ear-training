import React, { useState } from 'react';
import type { NoteWithOctave, GuessAttempt } from '../types/music';
import { audioEngine, AudioEngine } from '../utils/audioEngine';
import { useSettings } from '../hooks/useSettings';
import PianoKeyboard from './PianoKeyboard';
import './NoteIdentification.css';

interface NoteIdentificationProps {
  onGuessAttempt?: (attempt: GuessAttempt) => void;
}

const NoteIdentification: React.FC<NoteIdentificationProps> = ({ onGuessAttempt }) => {
  const { settings } = useSettings();
  const [currentNote, setCurrentNote] = useState<NoteWithOctave | null>(null);
  const [userGuess, setUserGuess] = useState<NoteWithOctave | null>(null);
  const [feedback, setFeedback] = useState<string>('Click "Start Practice" to begin your ear training session');
  const [isPlaying, setIsPlaying] = useState(false);


  const playCurrentNote = async () => {
    if (!currentNote) return;
    
    setIsPlaying(true);
    await audioEngine.initialize();
    audioEngine.playNote(currentNote, '2n');
    setTimeout(() => setIsPlaying(false), 500);
  };

  const handleNoteGuess = (guessedNote: NoteWithOctave) => {
    if (!currentNote) {
      setFeedback('Please start practice first by clicking "Start Practice"');
      return;
    }

    setUserGuess(guessedNote);
    const isCorrect = guessedNote.note === currentNote.note;
    
    const attempt: GuessAttempt = {
      id: `${Date.now()}-${Math.random()}`,
      timestamp: new Date(),
      actualNote: currentNote,
      guessedNote: guessedNote,
      isCorrect: isCorrect
    };

    onGuessAttempt?.(attempt);
    
    if (isCorrect) {
      setFeedback('Correct! Great job!');
      setTimeout(() => {
        startNewRound();
      }, 1000);
    } else {
      setFeedback(`Not quite. The correct answer was ${currentNote.note}`);
    }
  };

  const startNewRound = async () => {
    const newNote = AudioEngine.getRandomNoteFromFilter(settings.noteFilter);
    setCurrentNote(newNote);
    setUserGuess(null);
    setFeedback('Listen to the note and identify it on the keyboard');
    
    setIsPlaying(true);
    await audioEngine.initialize();
    audioEngine.playNote(newNote, '2n');
    setTimeout(() => setIsPlaying(false), 500);
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

        <PianoKeyboard 
          onNoteClick={handleNoteGuess}
          highlightedNote={userGuess || undefined}
        />
      </div>
    </div>
  );
};

export default NoteIdentification;