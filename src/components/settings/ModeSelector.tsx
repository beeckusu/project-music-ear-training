import React from 'react';
import { useSettings } from '../../hooks/useSettings';
import type { ModeType } from '../../types/game';
import { EAR_TRAINING_SUB_MODES, NOTE_TRAINING_SUB_MODES } from '../../constants';
import RushModeSettings from './RushModeSettings';
import SurvivalModeSettings from './SurvivalModeSettings';
import SandboxModeSettings from './SandboxModeSettings';
import NoteTrainingModeSettings from './NoteTrainingModeSettings';

interface ModeCardProps {
  mode: ModeType;
  icon: string;
  title: string;
  description: string;
  isSelected: boolean;
  onClick: () => void;
}

const ModeCard: React.FC<ModeCardProps> = ({ icon, title, description, isSelected, onClick }) => {
  return (
    <div
      className={`mode-card ${isSelected ? 'selected' : ''}`}
      onClick={onClick}
    >
      <div className="mode-icon">{icon}</div>
      <div className="mode-content">
        <h3 className="mode-title">{title}</h3>
        <p className="mode-description">{description}</p>
      </div>
      {isSelected && <div className="mode-selected-indicator">✓</div>}
    </div>
  );
};

interface ModeSelectorProps {
  onRestartGame?: () => void;
}

const ModeSelector: React.FC<ModeSelectorProps> = ({ onRestartGame }) => {
  const { settings, updateModeSettings, isFirstTimeSetup, hasCompletedModeSetup, completeModeSetup } = useSettings();
  const selectedMode = settings.modes.selectedMode;

  const handleModeSelect = (mode: ModeType) => {
    updateModeSettings({ selectedMode: mode });
  };

  const handleRestartGame = () => {
    handleModeSelect(selectedMode);
    // If this is the first time selecting a mode (not in first-time setup flow),
    // mark mode setup as complete so the game can start
    if (!hasCompletedModeSetup) {
      completeModeSetup();
    }
    onRestartGame?.();
  }

  const handleBeginPractice = () => {
    completeModeSetup();
  };

  const modes = [
    {
      mode: 'sandbox' as ModeType,
      icon: '🎯',
      title: 'Sandbox',
      description: 'Practice at your own pace with optional targets'
    },
    {
      mode: 'rush' as ModeType,
      icon: '🏃‍♂️',
      title: 'Rush',
      description: 'Race to hit your target note count as fast as possible'
    },
    {
      mode: 'survival' as ModeType,
      icon: '❤️',
      title: 'Survival',
      description: 'Survive the time limit while keeping your health up'
    },
    {
      mode: NOTE_TRAINING_SUB_MODES.SHOW_CHORD_GUESS_NOTES as ModeType,
      icon: '🎹',
      title: 'Chord Training',
      description: 'Identify individual notes in chords'
    }
  ];

  return (
    <div className="tab-content">
      {isFirstTimeSetup && (
        <div className="first-time-header">
          <h3>Choose Your Practice Mode</h3>
          <p>Select how you want to challenge yourself during practice sessions.</p>
        </div>
      )}

      <div className="mode-grid">
        {modes.map(({ mode, icon, title, description }) => (
          <ModeCard
            key={mode}
            mode={mode}
            icon={icon}
            title={title}
            description={description}
            isSelected={selectedMode === mode}
            onClick={() => handleModeSelect(mode)}
          />
        ))}
      </div>

      {selectedMode && (
        <div className="mode-settings-section">
          <div className="mode-specific-settings">
            {selectedMode === EAR_TRAINING_SUB_MODES.RUSH && <RushModeSettings />}
            {selectedMode === EAR_TRAINING_SUB_MODES.SURVIVAL && <SurvivalModeSettings />}
            {selectedMode === EAR_TRAINING_SUB_MODES.SANDBOX && <SandboxModeSettings />}
            {selectedMode === NOTE_TRAINING_SUB_MODES.SHOW_CHORD_GUESS_NOTES && <NoteTrainingModeSettings />}
          </div>
        </div>
      )}

      {isFirstTimeSetup ? (
        <div className="first-time-actions">
          <button
            className="begin-practice-button primary-button"
            onClick={handleBeginPractice}
            disabled={!selectedMode}
          >
            Begin Practice
          </button>
        </div>
      ) : (
        <div className="restart-game-section">
          <div className="restart-info">
            <h4>Game Controls</h4>
            <p>Use these controls to manage your current practice session.</p>
          </div>
          <button
            className="restart-game-button secondary-button"
            onClick={handleRestartGame}
          >
            🔄 Restart Current Session
          </button>
        </div>
      )}
    </div>
  );
};

export default ModeSelector;