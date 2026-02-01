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
  // Default to C major if no keyFilter is set yet
  const currentKey = keyFilter?.key ?? 'C';
  const currentScale = keyFilter?.scale ?? 'major';

  // Ensure keyFilter is set on first render if not already
  React.useEffect(() => {
    if (!keyFilter) {
      onChange({ key: 'C', scale: 'major' });
    }
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  const handleKeyChange = (key: Note) => {
    onChange({ key, scale: currentScale });
  };

  const handleScaleChange = (scale: 'major' | 'minor') => {
    onChange({ key: currentKey, scale });
  };

  return (
    <div className="setting-group">
      <div className="key-filter-controls">
        <div className="key-filter-row">
          <div className="key-filter-field">
            <label htmlFor="key-select">Key:</label>
            <select
              id="key-select"
              value={currentKey}
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
              value={currentScale}
              onChange={(e) => handleScaleChange(e.target.value as 'major' | 'minor')}
              className="scale-select"
            >
              <option value="major">Major</option>
              <option value="minor">Minor</option>
            </select>
          </div>
        </div>

        <small className="key-filter-description">
          Only chords diatonic to the selected key will appear
        </small>
      </div>
    </div>
  );
};

export default KeyFilterSelector;
