import React, { useEffect, useState } from 'react';
import { useSettings } from '../hooks/useSettings';
import { SETTINGS_TABS, type SettingsTab } from '../constants';
import NoteRangeSettings from './settings/NoteRangeSettings';
import TimingSettings from './settings/TimingSettings';
import ModeSelector from './settings/ModeSelector';
import AudioSettings from './settings/AudioSettings';
import './Settings.css';

interface SettingsModalProps {
  onRestartGame?: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ onRestartGame }) => {
  const { isSettingsOpen, closeSettings, isFirstTimeSetup, defaultTab } = useSettings();
  const [activeTab, setActiveTab] = useState<SettingsTab>(SETTINGS_TABS.NOTES);

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

  if (!isSettingsOpen) return null;

  const handleBackdropClick = (event: React.MouseEvent) => {
    if (event.target === event.currentTarget && !isFirstTimeSetup) {
      closeSettings();
    }
  };

  const tabs = [
    { id: SETTINGS_TABS.MODES, label: 'Modes', icon: '🎮' },
    { id: SETTINGS_TABS.NOTES, label: 'Note Range', icon: '🎵' },
    { id: SETTINGS_TABS.TIMING, label: 'Timing', icon: '⏱️' },
    { id: SETTINGS_TABS.AUDIO, label: 'Audio', icon: '🔊' }
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case SETTINGS_TABS.MODES:
        return <ModeSelector onRestartGame={onRestartGame} />;
      case SETTINGS_TABS.NOTES:
        return <NoteRangeSettings />;
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