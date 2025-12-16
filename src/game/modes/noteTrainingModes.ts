import { modeRegistry } from '../ModeRegistry';
import { NOTE_TRAINING_SUB_MODES, TRAINING_MODES } from '../../constants';
import { DEFAULT_MODE_SETTINGS } from '../../types/game';
import { SingleChordGameState } from '../SingleChordGameState';
import NoteTrainingModeSettings from '../../components/settings/NoteTrainingModeSettings';

// Register Single Chord Mode (Show Chord, Guess Notes)
modeRegistry.register({
  id: NOTE_TRAINING_SUB_MODES.SHOW_CHORD_GUESS_NOTES,
  type: TRAINING_MODES.NOTE_TRAINING,
  icon: '🎹',
  title: 'Chord Training',
  description: 'Identify individual notes in chords',
  settingsComponent: NoteTrainingModeSettings,
  settingsKey: 'noteTraining',
  gameStateFactory: (noteTrainingSettings) => new SingleChordGameState(noteTrainingSettings),
  defaultSettings: {
    noteTraining: DEFAULT_MODE_SETTINGS.noteTraining
  }
});

// Future: META-76 will add SHOW_NOTES_GUESS_CHORD mode here
