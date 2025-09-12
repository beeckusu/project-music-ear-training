import React from 'react';

const PracticeModeSettings: React.FC = () => {
  return (
    <div className="tab-content">
      <div className="setting-group">
        <label>Practice Mode</label>
        <div className="radio-group">
          <label><input type="radio" name="practiceMode" value="note-identification" defaultChecked /> Note Identification</label>
          <label><input type="radio" name="practiceMode" value="chord-recognition" /> Chord Recognition</label>
          <label><input type="radio" name="practiceMode" value="interval-training" /> Interval Training</label>
        </div>
      </div>
      <div className="setting-group">
        <label>Difficulty Level</label>
        <div className="radio-group">
          <label><input type="radio" name="difficulty" value="beginner" defaultChecked /> Beginner</label>
          <label><input type="radio" name="difficulty" value="intermediate" /> Intermediate</label>
          <label><input type="radio" name="difficulty" value="advanced" /> Advanced</label>
        </div>
      </div>
    </div>
  );
};

export default PracticeModeSettings;