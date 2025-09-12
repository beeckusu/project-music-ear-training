import React, { useEffect, useState } from 'react';
import { useSettings } from '../hooks/useSettings';
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
        return (
          <div className="tab-content">
            <div className="setting-group">
              <label>Octave Range</label>
              <div className="octave-controls">
                <input type="number" min="1" max="8" value="4" disabled />
                <span>to</span>
                <input type="number" min="1" max="8" value="4" disabled />
              </div>
            </div>
            
            <div className="setting-group">
              <label>Key Type</label>
              <div className="radio-group">
                <label><input type="radio" name="keyType" value="all" checked disabled /> All Keys</label>
                <label><input type="radio" name="keyType" value="white" disabled /> White Keys Only</label>
                <label><input type="radio" name="keyType" value="black" disabled /> Black Keys Only</label>
              </div>
            </div>
            
            <div className="setting-group">
              <label>Exclude Specific Notes</label>
              <div className="note-grid">
                {['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'].map(note => (
                  <label key={note} className={`note-checkbox ${note.includes('#') ? 'settings-black-note' : 'settings-white-note'}`}>
                    <input type="checkbox" disabled />
                    {note}
                  </label>
                ))}
              </div>
            </div>
          </div>
        );

      case 'modes':
        return (
          <div className="tab-content">
            <div className="setting-group">
              <label>Practice Mode</label>
              <div className="radio-group">
                <label><input type="radio" name="practiceMode" value="note-identification" checked disabled /> Note Identification</label>
                <label><input type="radio" name="practiceMode" value="chord-recognition" disabled /> Chord Recognition</label>
                <label><input type="radio" name="practiceMode" value="interval-training" disabled /> Interval Training</label>
              </div>
            </div>
            <div className="setting-group">
              <label>Difficulty Level</label>
              <div className="radio-group">
                <label><input type="radio" name="difficulty" value="beginner" checked disabled /> Beginner</label>
                <label><input type="radio" name="difficulty" value="intermediate" disabled /> Intermediate</label>
                <label><input type="radio" name="difficulty" value="advanced" disabled /> Advanced</label>
              </div>
            </div>
          </div>
        );

      case 'timing':
        return (
          <div className="tab-content">
            <div className="setting-group">
              <label>BPM</label>
              <input type="range" min="60" max="180" value="120" disabled />
              <span className="range-value">120</span>
            </div>
            <div className="setting-group">
              <label>Note Duration</label>
              <select disabled>
                <option value="2n">Half Note</option>
                <option value="4n">Quarter Note</option>
                <option value="8n">Eighth Note</option>
              </select>
            </div>
            <div className="setting-group">
              <label>Auto-advance Speed</label>
              <input type="range" min="500" max="3000" value="1000" disabled />
              <span className="range-value">1.0s</span>
            </div>
          </div>
        );

      case 'goals':
        return (
          <div className="tab-content">
            <div className="setting-group">
              <label>Target Streak</label>
              <input type="number" min="5" max="50" value="10" disabled />
            </div>
            <div className="setting-group">
              <label>Target Accuracy</label>
              <input type="range" min="50" max="100" value="80" disabled />
              <span className="range-value">80%</span>
            </div>
            <div className="setting-group">
              <label>Session Goal</label>
              <select disabled>
                <option value="time">Practice for 15 minutes</option>
                <option value="correct">Get 25 correct answers</option>
                <option value="streak">Reach 10 note streak</option>
              </select>
            </div>
          </div>
        );

      case 'audio':
        return (
          <div className="tab-content">
            <div className="setting-group">
              <label>Volume</label>
              <input type="range" min="0" max="100" value="75" disabled />
              <span className="range-value">75%</span>
            </div>
            <div className="setting-group">
              <label>Instrument</label>
              <select disabled>
                <option value="piano">Piano</option>
                <option value="guitar">Guitar</option>
                <option value="synth">Synthesizer</option>
              </select>
            </div>
            <div className="setting-group">
              <label>Sound Effects</label>
              <div className="radio-group">
                <label><input type="radio" name="soundFx" value="on" checked disabled /> On</label>
                <label><input type="radio" name="soundFx" value="off" disabled /> Off</label>
              </div>
            </div>
          </div>
        );

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
              disabled
            >
              <span className="tab-icon">{tab.icon}</span>
              <span className="tab-label">{tab.label}</span>
            </button>
          ))}
        </div>
        
        <div className="settings-content disabled">
          {renderTabContent()}
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;