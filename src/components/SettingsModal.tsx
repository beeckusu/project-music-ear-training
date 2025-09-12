import React, { useEffect, useState } from 'react';
import { useSettings } from '../hooks/useSettings';
import NoteRangeSettings from './settings/NoteRangeSettings';
import PracticeModeSettings from './settings/PracticeModeSettings';
import TimingSettings from './settings/TimingSettings';
import GoalsSettings from './settings/GoalsSettings';
import AudioSettings from './settings/AudioSettings';
import './Settings.css';

type SettingsTab = 'notes' | 'modes' | 'timing' | 'goals' | 'audio';

const SettingsModal: React.FC = () => {
  const { isSettingsOpen, closeSettings } = useSettings();
  const [activeTab, setActiveTab] = useState<SettingsTab>('notes');

  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
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
  }, [isSettingsOpen, closeSettings]);

  if (!isSettingsOpen) return null;

  const handleBackdropClick = (event: React.MouseEvent) => {
    if (event.target === event.currentTarget) {
      closeSettings();
    }
  };

  const tabs = [
    { id: 'notes' as SettingsTab, label: 'Note Range', icon: '🎵' },
    { id: 'modes' as SettingsTab, label: 'Practice', icon: '🎯' },
    { id: 'timing' as SettingsTab, label: 'Timing', icon: '⏱️' },
    { id: 'goals' as SettingsTab, label: 'Goals', icon: '🏆' },
    { id: 'audio' as SettingsTab, label: 'Audio', icon: '🔊' }
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'notes':
        return <NoteRangeSettings />;
      case 'modes':
        return <PracticeModeSettings />;
      case 'timing':
        return <TimingSettings />;
      case 'goals':
        return <GoalsSettings />;
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
          <h2>Settings</h2>
          <button 
            className="settings-close-button" 
            onClick={closeSettings}
            aria-label="Close Settings"
          >
            ✕
          </button>
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