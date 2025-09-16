import React, { useEffect, useState } from 'react';
import { useSettings } from '../hooks/useSettings';
import NoteRangeSettings from './settings/NoteRangeSettings';
import TimingSettings from './settings/TimingSettings';
import ModeSelector from './settings/ModeSelector';
import AudioSettings from './settings/AudioSettings';
import './Settings.css';

type SettingsTab = 'notes' | 'modes' | 'timing' | 'audio';

interface SettingsModalProps {
  onRestartGame?: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ onRestartGame }) => {
  const { isSettingsOpen, closeSettings, isFirstTimeSetup, defaultTab } = useSettings();
  const [activeTab, setActiveTab] = useState<SettingsTab>('notes');

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
    { id: 'modes' as SettingsTab, label: 'Modes', icon: '🎮' },
    { id: 'notes' as SettingsTab, label: 'Note Range', icon: '🎵' },
    { id: 'timing' as SettingsTab, label: 'Timing', icon: '⏱️' },
    { id: 'audio' as SettingsTab, label: 'Audio', icon: '🔊' }
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'modes':
        return <ModeSelector onRestartGame={onRestartGame} />;
      case 'notes':
        return <NoteRangeSettings />;
      case 'timing':
        return <TimingSettings />;
      case 'audio':
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