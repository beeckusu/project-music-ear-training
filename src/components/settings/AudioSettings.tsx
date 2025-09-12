import React from 'react';

const AudioSettings: React.FC = () => {
  return (
    <div className="tab-content">
      <div className="setting-group">
        <label>Volume</label>
        <input type="range" min="0" max="100" defaultValue="75" />
        <span className="range-value">75%</span>
      </div>
      <div className="setting-group">
        <label>Instrument</label>
        <select defaultValue="piano">
          <option value="piano">Piano</option>
          <option value="guitar">Guitar</option>
          <option value="synth">Synthesizer</option>
        </select>
      </div>
      <div className="setting-group">
        <label>Sound Effects</label>
        <div className="radio-group">
          <label><input type="radio" name="soundFx" value="on" defaultChecked /> On</label>
          <label><input type="radio" name="soundFx" value="off" /> Off</label>
        </div>
      </div>
    </div>
  );
};

export default AudioSettings;