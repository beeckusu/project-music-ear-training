import React, { useState, useEffect } from 'react';
import { useSettings } from '../../hooks/useSettings';
import type { NoteDuration } from '../../types/music';
import { DEFAULT_TIMING_SETTINGS } from '../../types/music';

const TimingSettings: React.FC = () => {
  const { settings, updateTimingSettings } = useSettings();
  const { timing } = settings;
  
  const [responseTimeLimit, setResponseTimeLimit] = useState<number | null>(timing.responseTimeLimit);
  const [autoAdvanceSpeed, setAutoAdvanceSpeed] = useState<number>(timing.autoAdvanceSpeed);
  const [noteDuration, setNoteDuration] = useState<NoteDuration>(timing.noteDuration);
  const [unlimitedTime, setUnlimitedTime] = useState<boolean>(timing.responseTimeLimit === null);

  // Update local state when settings change externally
  useEffect(() => {
    setResponseTimeLimit(timing.responseTimeLimit);
    setAutoAdvanceSpeed(timing.autoAdvanceSpeed);
    setNoteDuration(timing.noteDuration);
    setUnlimitedTime(timing.responseTimeLimit === null);
  }, [timing]);

  const handleTimeLimit = (newLimit: number) => {
    setResponseTimeLimit(newLimit);
    updateTimingSettings({ responseTimeLimit: newLimit });
  };

  const handleUnlimitedTimeToggle = (unlimited: boolean) => {
    setUnlimitedTime(unlimited);
    const newLimit = unlimited ? null : DEFAULT_TIMING_SETTINGS.responseTimeLimit;
    setResponseTimeLimit(newLimit);
    updateTimingSettings({ responseTimeLimit: newLimit });
  };

  const handleAutoAdvanceSpeed = (newSpeed: number) => {
    setAutoAdvanceSpeed(newSpeed);
    updateTimingSettings({ autoAdvanceSpeed: newSpeed });
  };

  const handleNoteDuration = (newDuration: NoteDuration) => {
    setNoteDuration(newDuration);
    updateTimingSettings({ noteDuration: newDuration });
  };

  const resetToDefaults = () => {
    setResponseTimeLimit(DEFAULT_TIMING_SETTINGS.responseTimeLimit);
    setAutoAdvanceSpeed(DEFAULT_TIMING_SETTINGS.autoAdvanceSpeed);
    setNoteDuration(DEFAULT_TIMING_SETTINGS.noteDuration);
    setUnlimitedTime(false);
    
    updateTimingSettings({
      responseTimeLimit: DEFAULT_TIMING_SETTINGS.responseTimeLimit,
      autoAdvanceSpeed: DEFAULT_TIMING_SETTINGS.autoAdvanceSpeed,
      noteDuration: DEFAULT_TIMING_SETTINGS.noteDuration
    });
  };


  return (
    <div className="tab-content">
      <div className="setting-group">
        <div className="setting-header">
          <label>Response Time Limit</label>
          <div className="timing-info">
            <span className="timing-display">
              {unlimitedTime ? 'Unlimited' : `${responseTimeLimit}s`}
            </span>
          </div>
        </div>
        
        <div className="timing-controls">
          <label className="unlimited-toggle">
            <input 
              type="checkbox"
              checked={unlimitedTime}
              onChange={(e) => handleUnlimitedTimeToggle(e.target.checked)}
            />
            Unlimited Time
          </label>
          
          {!unlimitedTime && (
            <div className="time-slider">
              <input 
                type="range" 
                min="1"
                max="30" 
                step="1"
                value={responseTimeLimit || DEFAULT_TIMING_SETTINGS.responseTimeLimit}
                onChange={(e) => handleTimeLimit(parseInt(e.target.value))}
                className="timing-range"
              />
              <div className="range-labels">
                <span>3s</span>
                <span>30s</span>
              </div>
            </div>
          )}
        </div>
      </div>
      
      <div className="setting-group">
        <div className="setting-header">
          <label>Auto-advance Speed</label>
          <div className="timing-info">
            <span className="timing-display">{autoAdvanceSpeed}s</span>
          </div>
        </div>
        <div className="time-slider">
          <input 
            type="range" 
            min="0.5" 
            max="5" 
            step="0.1"
            value={autoAdvanceSpeed}
            onChange={(e) => handleAutoAdvanceSpeed(parseFloat(e.target.value))}
            className="timing-range"
          />
          <div className="range-labels">
            <span>0.5s</span>
            <span>5.0s</span>
          </div>
        </div>
        <p className="setting-description">
          Time between correct answer and next note (or remaining time, whichever is shorter)
        </p>
      </div>
      
      <div className="setting-group">
        <label>Note Duration</label>
        <select 
          value={noteDuration}
          onChange={(e) => handleNoteDuration(e.target.value as NoteDuration)}
          className="duration-select"
        >
          <option value="8n">Eighth Note (♪)</option>
          <option value="4n">Quarter Note (♩)</option>
          <option value="2n">Half Note (♪)</option>
          <option value="1n">Whole Note (○)</option>
        </select>
        <p className="setting-description">
          How long each note plays when generated
        </p>
      </div>
      
      <div className="setting-group">
        <button 
          className="reset-button"
          onClick={resetToDefaults}
        >
          Reset to Defaults
        </button>
      </div>
    </div>
  );
};

export default TimingSettings;