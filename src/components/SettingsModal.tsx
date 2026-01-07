import React, { useEffect, useState } from 'react';
import { useSettings } from '../hooks/useSettings';
import { SETTINGS_TABS, type SettingsTab, TRAINING_MODES, type TrainingType } from '../constants';
import NoteRangeSettings from './settings/NoteRangeSettings';
import TimingSettings from './settings/TimingSettings';
import ModeSelector from './settings/ModeSelector';
import AudioSettings from './settings/AudioSettings';
import NoteTrainingModeSettings from './settings/NoteTrainingModeSettings';
import './Settings.css';

interface SettingsModalProps {
  onRestartGame?: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ onRestartGame }) => {
  const { isSettingsOpen, closeSettings, isFirstTimeSetup, defaultTab, pendingSettings } = useSettings();
  const [activeTab, setActiveTab] = useState<SettingsTab>(SETTINGS_TABS.NOTES);
  const trainingType = pendingSettings.trainingType;

  // Define all possible tabs with their supported training types
  const allTabs = [
    { id: SETTINGS_TABS.MODES, label: 'Modes', icon: '🎮', supportedModes: [TRAINING_MODES.EAR_TRAINING, TRAINING_MODES.NOTE_TRAINING] },
    { id: SETTINGS_TABS.NOTES, label: 'Note Range', icon: '🎵', supportedModes: [TRAINING_MODES.EAR_TRAINING] },
    { id: SETTINGS_TABS.CHORDS, label: 'Chords', icon: '🎹', supportedModes: [TRAINING_MODES.NOTE_TRAINING] },
    { id: SETTINGS_TABS.TIMING, label: 'Timing', icon: '⏱️', supportedModes: [TRAINING_MODES.EAR_TRAINING, TRAINING_MODES.NOTE_TRAINING] },
    { id: SETTINGS_TABS.AUDIO, label: 'Audio', icon: '🔊', supportedModes: [TRAINING_MODES.EAR_TRAINING, TRAINING_MODES.NOTE_TRAINING] }
  ];

  // Filter tabs based on current training type
  const tabs = allTabs.filter(tab => tab.supportedModes.includes(trainingType));

  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isFirstTimeSetup) {
        closeSettings();
      }
    };

    if (isSettingsOpen) {
      document.addEventListener('keydown', handleEscKey);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscKey);
      document.body.style.overflow = 'unset';
    };
  }, [isSettingsOpen, closeSettings, isFirstTimeSetup]);

  useEffect(() => {
    if (isSettingsOpen && defaultTab) {
      setActiveTab(defaultTab as SettingsTab);
    }
  }, [isSettingsOpen, defaultTab]);

  // Reset active tab if it's not supported by the current training type
  useEffect(() => {
    const availableTabs = allTabs.filter(tab => tab.supportedModes.includes(trainingType));
    const isActiveTabSupported = availableTabs.some(tab => tab.id === activeTab);

    if (!isActiveTabSupported && availableTabs.length > 0) {
      setActiveTab(availableTabs[0].id);
    }
  }, [trainingType, activeTab]);

  if (!isSettingsOpen) return null;

  const handleBackdropClick = (event: React.MouseEvent) => {
    if (event.target === event.currentTarget && !isFirstTimeSetup) {
      closeSettings();
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case SETTINGS_TABS.MODES:
        return <ModeSelector onRestartGame={onRestartGame} />;
      case SETTINGS_TABS.NOTES:
        return <NoteRangeSettings />;
      case SETTINGS_TABS.CHORDS:
        return <NoteTrainingModeSettings />;
      case SETTINGS_TABS.TIMING:
        return <TimingSettings />;
      case SETTINGS_TABS.AUDIO:
        return <AudioSettings />;
      default:
        return null;
    }
  };

  return (
    <div className="settings-backdrop" onClick={handleBackdropClick}>
      <div className="settings-modal">
        <div className="settings-header">
          <h2>{isFirstTimeSetup ? 'Welcome to Practice Mode!' : 'Settings'}</h2>
          {!isFirstTimeSetup && (
            <button
              className="settings-close-button"
              onClick={closeSettings}
              aria-label="Close Settings"
            >
              ✕
            </button>
          )}
        </div>
        
        <div className="settings-tabs">
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`settings-tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span className="tab-icon">{tab.icon}</span>
              <span className="tab-label">{tab.label}</span>
            </button>
          ))}
        </div>
        
        <div className="settings-content">
          {renderTabContent()}
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;