import React from 'react';
import type { Note } from '../../types/music';
import { ALL_NOTES } from '../../types/music';

interface KeyFilterSelectorProps {
  keyFilter?: { key: Note; scale: 'major' | 'minor' };
  onChange: (keyFilter?: { key: Note; scale: 'major' | 'minor' }) => void;
}

const KeyFilterSelector: React.FC<KeyFilterSelectorProps> = ({
  keyFilter,
  onChange,
}) => {
  const isEnabled = keyFilter !== undefined;

  const handleEnableToggle = (enabled: boolean) => {
    if (enabled) {
      // Enable with default values
      onChange({ key: 'C', scale: 'major' });
    } else {
      // Disable
      onChange(undefined);
    }
  };

  const handleKeyChange = (key: Note) => {
    if (keyFilter) {
      onChange({ ...keyFilter, key });
    }
  };

  const handleScaleChange = (scale: 'major' | 'minor') => {
    if (keyFilter) {
      onChange({ ...keyFilter, scale });
    }
  };

  return (
    <div className="setting-group">
      <label className="checkbox-label">
        <input
          type="checkbox"
          checked={isEnabled}
          onChange={(e) => handleEnableToggle(e.target.checked)}
        />
        Filter by Key (Diatonic Chords Only)
      </label>

      {isEnabled && keyFilter && (
        <div className="key-filter-controls">
          <div className="key-filter-row">
            <div className="key-filter-field">
              <label htmlFor="key-select">Key:</label>
              <select
                id="key-select"
                value={keyFilter.key}
                onChange={(e) => handleKeyChange(e.target.value as Note)}
                className="key-select"
              >
                {ALL_NOTES.map(note => (
                  <option key={note} value={note}>
                    {note}
                  </option>
                ))}
              </select>
            </div>

            <div className="key-filter-field">
              <label htmlFor="scale-select">Scale:</label>
              <select
                id="scale-select"
                value={keyFilter.scale}
                onChange={(e) => handleScaleChange(e.target.value as 'major' | 'minor')}
                className="scale-select"
              >
                <option value="major">Major</option>
                <option value="minor">Minor</option>
              </select>
            </div>
          </div>

          <small className="key-filter-description">
            Only practice chords that are diatonic to {keyFilter.key} {keyFilter.scale}
          </small>
        </div>
      )}

      {!isEnabled && (
        <small>Enable to restrict chords to those in a specific key and scale</small>
      )}
    </div>
  );
};

export default KeyFilterSelector;
