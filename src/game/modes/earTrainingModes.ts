import { modeRegistry } from '../ModeRegistry';
import { EAR_TRAINING_SUB_MODES, TRAINING_MODES } from '../../constants';
import { DEFAULT_MODE_SETTINGS } from '../../types/game';
import { RushGameStateImpl } from '../RushGameState';
import { SurvivalGameStateImpl } from '../SurvivalGameState';
import { SandboxGameStateImpl } from '../SandboxGameState';
import RushModeSettings from '../../components/settings/RushModeSettings';
import SurvivalModeSettings from '../../components/settings/SurvivalModeSettings';
import SandboxModeSettings from '../../components/settings/SandboxModeSettings';

// Register Rush Mode
modeRegistry.register({
  id: EAR_TRAINING_SUB_MODES.RUSH,
  type: TRAINING_MODES.EAR_TRAINING,
  strategyType: 'ear-training',
  icon: '🏃‍♂️',
  title: 'Rush',
  description: 'Race to hit your target note count as fast as possible',
  settingsComponent: RushModeSettings,
  settingsKey: 'rush',
  gameStateFactory: (rushSettings) => new RushGameStateImpl(rushSettings),
  defaultSettings: {
    rush: DEFAULT_MODE_SETTINGS.rush
  }
});

// Register Survival Mode
modeRegistry.register({
  id: EAR_TRAINING_SUB_MODES.SURVIVAL,
  type: TRAINING_MODES.EAR_TRAINING,
  strategyType: 'ear-training',
  icon: '❤️',
  title: 'Survival',
  description: 'Survive the time limit while keeping your health up',
  settingsComponent: SurvivalModeSettings,
  settingsKey: 'survival',
  gameStateFactory: (survivalSettings) => new SurvivalGameStateImpl(survivalSettings),
  defaultSettings: {
    survival: DEFAULT_MODE_SETTINGS.survival
  }
});

// Register Sandbox Mode
modeRegistry.register({
  id: EAR_TRAINING_SUB_MODES.SANDBOX,
  type: TRAINING_MODES.EAR_TRAINING,
  strategyType: 'ear-training',
  icon: '🎯',
  title: 'Sandbox',
  description: 'Practice at your own pace with optional targets',
  settingsComponent: SandboxModeSettings,
  settingsKey: 'sandbox',
  gameStateFactory: (sandboxSettings) => new SandboxGameStateImpl(sandboxSettings),
  defaultSettings: {
    sandbox: DEFAULT_MODE_SETTINGS.sandbox
  }
});
