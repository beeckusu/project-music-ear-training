import React, { useState } from 'react';
import type { Note } from '../../types/music';
import { ALL_NOTES, WHITE_KEYS, BLACK_KEYS } from '../../types/music';

interface RootNoteSelectorProps {
  selectedRootNotes: Note[] | null;
  onChange: (rootNotes: Note[] | null) => void;
}

const RootNoteSelector: React.FC<RootNoteSelectorProps> = ({
  selectedRootNotes,
  onChange,
}) => {
  const [filterType, setFilterType] = useState<'all' | 'white' | 'black' | 'custom'>(() => {
    if (selectedRootNotes === null) return 'all';
    if (arraysEqual(selectedRootNotes, WHITE_KEYS)) return 'white';
    if (arraysEqual(selectedRootNotes, BLACK_KEYS)) return 'black';
    return 'custom';
  });

  const handleFilterTypeChange = (type: 'all' | 'white' | 'black') => {
    setFilterType(type);

    switch (type) {
      case 'all':
        onChange(null);
        break;
      case 'white':
        onChange([...WHITE_KEYS]);
        break;
      case 'black':
        onChange([...BLACK_KEYS]);
        break;
    }
  };

  const handleNoteToggle = (note: Note) => {
    const currentNotes = selectedRootNotes || [...ALL_NOTES];

    const newNotes = currentNotes.includes(note)
      ? currentNotes.filter(n => n !== note)
      : [...currentNotes, note].sort((a, b) => ALL_NOTES.indexOf(a) - ALL_NOTES.indexOf(b));

    // If all notes selected, set to null
    if (newNotes.length === ALL_NOTES.length) {
      setFilterType('all');
      onChange(null);
    } else {
      setFilterType('custom');
      onChange(newNotes);
    }
  };

  const getSelectedCount = () => {
    if (selectedRootNotes === null) return ALL_NOTES.length;
    return selectedRootNotes.length;
  };

  const isNoteSelected = (note: Note): boolean => {
    if (selectedRootNotes === null) return true;
    return selectedRootNotes.includes(note);
  };

  return (
    <div className="setting-group">
      <div className="setting-header">
        <label>Root Note Filter</label>
        <div className="notes-info">
          <span className="available-count">{getSelectedCount()} root notes selected</span>
        </div>
      </div>

      <div className="radio-group">
        <label>
          <input
            type="radio"
            name="rootNoteFilter"
            value="all"
            checked={filterType === 'all'}
            onChange={() => handleFilterTypeChange('all')}
          />
          All Notes
        </label>
        <label>
          <input
            type="radio"
            name="rootNoteFilter"
            value="white"
            checked={filterType === 'white'}
            onChange={() => handleFilterTypeChange('white')}
          />
          White Keys Only
        </label>
        <label>
          <input
            type="radio"
            name="rootNoteFilter"
            value="black"
            checked={filterType === 'black'}
            onChange={() => handleFilterTypeChange('black')}
          />
          Black Keys Only
        </label>
        <label>
          <input
            type="radio"
            name="rootNoteFilter"
            value="custom"
            checked={filterType === 'custom'}
            readOnly
          />
          Custom Selection
        </label>
      </div>

      <div className="note-grid-modern">
        {ALL_NOTES.map(note => {
          const isBlackKey = note.includes('#');
          const isSelected = isNoteSelected(note);

          return (
            <label
              key={note}
              className={`
                note-checkbox-modern
                ${isBlackKey ? 'black-note-modern' : 'white-note-modern'}
                ${!isSelected ? 'excluded' : ''}
              `}
            >
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => handleNoteToggle(note)}
              />
              <span className="note-label">{note}</span>
              {!isSelected && <span className="exclude-indicator">✕</span>}
            </label>
          );
        })}
      </div>

      <small>Select which root notes chords can be built from</small>
    </div>
  );
};

// Helper function to compare arrays
function arraysEqual<T>(arr1: T[], arr2: T[]): boolean {
  if (arr1.length !== arr2.length) return false;
  const sorted1 = [...arr1].sort();
  const sorted2 = [...arr2].sort();
  return sorted1.every((val, index) => val === sorted2[index]);
}

export default RootNoteSelector;
