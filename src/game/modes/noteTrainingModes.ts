import { modeRegistry } from '../ModeRegistry';
import { NOTE_TRAINING_SUB_MODES, TRAINING_MODES } from '../../constants';
import { DEFAULT_MODE_SETTINGS } from '../../types/game';
import { SingleChordGameState } from '../SingleChordGameState';
import { ChordIdentificationGameState } from '../ChordIdentificationGameState';
import NoteTrainingModeSettings from '../../components/settings/NoteTrainingModeSettings';

// Register Single Chord Mode (Show Chord, Guess Notes)
modeRegistry.register({
  id: NOTE_TRAINING_SUB_MODES.SHOW_CHORD_GUESS_NOTES,
  type: TRAINING_MODES.NOTE_TRAINING,
  strategyType: 'chord-training',
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

// Register Chord Identification Mode (Show Notes, Guess Chord)
modeRegistry.register({
  id: NOTE_TRAINING_SUB_MODES.SHOW_NOTES_GUESS_CHORD,
  type: TRAINING_MODES.NOTE_TRAINING,
  strategyType: 'chord-training',
  icon: '🎵',
  title: 'Chord Identification',
  description: 'Identify chord names from displayed notes',
  settingsComponent: NoteTrainingModeSettings,
  settingsKey: 'noteTraining',
  gameStateFactory: (noteTrainingSettings) => new ChordIdentificationGameState(noteTrainingSettings),
  defaultSettings: {
    noteTraining: DEFAULT_MODE_SETTINGS.noteTraining
  }
});
