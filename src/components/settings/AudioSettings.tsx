import React, { useEffect } from 'react';
import { useSettings } from '../../hooks/useSettings';
import { audioEngine } from '../../utils/audioEngine';
import { InstrumentType } from '../../types/music';

const AudioSettings: React.FC = () => {
  const { settings, pendingSettings, updateAudioSettings } = useSettings();
  const { volume, instrument } = pendingSettings.audio;

  // Apply audio changes from current settings (not pending) to the audio engine
  useEffect(() => {
    audioEngine.setVolume(settings.audio.volume);
    audioEngine.setInstrument(settings.audio.instrument);
  }, [settings.audio.volume, settings.audio.instrument]);

  const handleVolumeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseInt(event.target.value);
    updateAudioSettings({ volume: newVolume });
  };

  const instrumentOptions = [
    { value: InstrumentType.SYNTH, label: 'Synthesizer' },
    { value: InstrumentType.PIANO, label: 'Piano' },
    { value: InstrumentType.FM, label: 'FM Bell' },
    { value: InstrumentType.MONO, label: 'Analog Synth' }
  ];

  return (
    <div className="tab-content">
      <div className="setting-group">
        <label>Volume</label>
        <input
          type="range"
          min="0"
          max="100"
          value={volume}
          onChange={handleVolumeChange}
        />
        <span className="range-value">{volume}%</span>
      </div>
      <div className="setting-group">
        <label>Instrument</label>
        <div className="instrument-buttons">
          {instrumentOptions.map(option => (
            <button
              key={option.value}
              className={`instrument-button ${instrument === option.value ? 'active' : ''}`}
              onClick={() => updateAudioSettings({ instrument: option.value })}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AudioSettings;