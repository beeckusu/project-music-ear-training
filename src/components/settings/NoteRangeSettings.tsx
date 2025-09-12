import React from 'react';

const NoteRangeSettings: React.FC = () => {
  return (
    <div className="tab-content">
      <div className="setting-group">
        <label>Octave Range</label>
        <div className="octave-controls">
          <input type="number" min="1" max="8" defaultValue="4" />
          <span>to</span>
          <input type="number" min="1" max="8" defaultValue="4" />
        </div>
      </div>
      
      <div className="setting-group">
        <label>Key Type</label>
        <div className="radio-group">
          <label><input type="radio" name="keyType" value="all" defaultChecked /> All Keys</label>
          <label><input type="radio" name="keyType" value="white" /> White Keys Only</label>
          <label><input type="radio" name="keyType" value="black" /> Black Keys Only</label>
        </div>
      </div>
      
      <div className="setting-group">
        <label>Exclude Specific Notes</label>
        <div className="note-grid">
          {['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'].map(note => (
            <label key={note} className={`note-checkbox ${note.includes('#') ? 'settings-black-note' : 'settings-white-note'}`}>
              <input type="checkbox" />
              {note}
            </label>
          ))}
        </div>
      </div>
    </div>
  );
};

export default NoteRangeSettings;