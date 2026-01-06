import React, { useState, useEffect } from 'react';
import { useSettings } from '../../hooks/useSettings';
import type { Note, KeyType, Octave } from '../../types/music';
import { ALL_NOTES, WHITE_KEYS, BLACK_KEYS } from '../../types/music';

const NoteRangeSettings: React.FC = () => {
  const { pendingSettings, updateNoteFilter, updateShowNoteLabels } = useSettings();
  const { noteFilter, showNoteLabels } = pendingSettings;
  
  const [minOctave, setMinOctave] = useState<number>(noteFilter.octaveRange.min);
  const [maxOctave, setMaxOctave] = useState<number>(noteFilter.octaveRange.max);
  const [keyType, setKeyType] = useState<KeyType>(noteFilter.keyType);
  const [excludedNotes, setExcludedNotes] = useState<Note[]>(() => {
    if (!noteFilter.allowedNotes) return [];
    return ALL_NOTES.filter(note => !noteFilter.allowedNotes!.includes(note));
  });

  // Update local state when settings change externally
  useEffect(() => {
    setMinOctave(noteFilter.octaveRange.min);
    setMaxOctave(noteFilter.octaveRange.max);
    setKeyType(noteFilter.keyType);
    setExcludedNotes(noteFilter.allowedNotes 
      ? ALL_NOTES.filter(note => !noteFilter.allowedNotes!.includes(note))
      : []
    );
  }, [noteFilter]);

  const handleOctaveChange = (newMin: number, newMax: number) => {
    // Validate range
    const validMin = Math.max(1, Math.min(8, newMin));
    const validMax = Math.max(validMin, Math.min(8, newMax));
    
    setMinOctave(validMin);
    setMaxOctave(validMax);
    
    updateNoteFilter({
      octaveRange: { min: validMin as Octave, max: validMax as Octave }
    });
  };

  const handleKeyTypeChange = (newKeyType: KeyType) => {
    setKeyType(newKeyType);
    
    // Clear excluded notes when changing key type for cleaner UX
    setExcludedNotes([]);
    
    updateNoteFilter({
      keyType: newKeyType,
      allowedNotes: undefined
    });
  };

  const handleNoteExclusionToggle = (note: Note) => {
    const newExcludedNotes = excludedNotes.includes(note)
      ? excludedNotes.filter(n => n !== note)
      : [...excludedNotes, note];
    
    setExcludedNotes(newExcludedNotes);
    
    // Calculate allowed notes (inverse of excluded)
    const allowedNotes = newExcludedNotes.length === 0 
      ? undefined 
      : ALL_NOTES.filter(n => !newExcludedNotes.includes(n));
    
    updateNoteFilter({
      allowedNotes
    });
  };

  const getAvailableNotesCount = () => {
    let availableNotes = ALL_NOTES;
    
    // Filter by key type
    if (keyType === 'white') {
      availableNotes = WHITE_KEYS;
    } else if (keyType === 'black') {
      availableNotes = BLACK_KEYS;
    }
    
    // Filter by excluded notes
    availableNotes = availableNotes.filter(note => !excludedNotes.includes(note));
    
    // Multiply by octave range
    const octaveCount = maxOctave - minOctave + 1;
    return availableNotes.length * octaveCount;
  };

  const resetToDefaults = () => {
    setMinOctave(4);
    setMaxOctave(4);
    setKeyType('all');
    setExcludedNotes([]);
    
    updateNoteFilter({
      octaveRange: { min: 4, max: 4 },
      keyType: 'all',
      allowedNotes: undefined
    });
  };

  return (
    <div className="tab-content">
      <div className="setting-group">
        <div className="setting-header">
          <label>Octave Range</label>
          <div className="octave-range-display">
            <span className="range-indicator">
              {minOctave === maxOctave ? `Octave ${minOctave}` : `Octaves ${minOctave}-${maxOctave}`}
            </span>
          </div>
        </div>
        <div className="octave-selection">
          <div className="octave-bounds">
            <div className="octave-bound-section">
              <span className="bound-label">Min:</span>
              <div className="octave-buttons">
                {[1, 2, 3, 4, 5, 6, 7, 8].map(octave => (
                  <button
                    key={`min-${octave}`}
                    className={`octave-button ${octave === minOctave ? 'selected' : ''} ${octave > maxOctave ? 'disabled' : ''}`}
                    onClick={() => octave <= maxOctave && handleOctaveChange(octave, maxOctave)}
                    disabled={octave > maxOctave}
                  >
                    {octave}
                  </button>
                ))}
              </div>
            </div>
            <div className="octave-bound-section">
              <span className="bound-label">Max:</span>
              <div className="octave-buttons">
                {[1, 2, 3, 4, 5, 6, 7, 8].map(octave => (
                  <button
                    key={`max-${octave}`}
                    className={`octave-button ${octave === maxOctave ? 'selected' : ''} ${octave < minOctave ? 'disabled' : ''}`}
                    onClick={() => octave >= minOctave && handleOctaveChange(minOctave, octave)}
                    disabled={octave < minOctave}
                  >
                    {octave}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="setting-group">
        <label>Key Type</label>
        <div className="radio-group">
          <label>
            <input 
              type="radio" 
              name="keyType" 
              value="all" 
              checked={keyType === 'all'}
              onChange={() => handleKeyTypeChange('all')}
            /> 
            All Keys
          </label>
          <label>
            <input 
              type="radio" 
              name="keyType" 
              value="white" 
              checked={keyType === 'white'}
              onChange={() => handleKeyTypeChange('white')}
            /> 
            White Keys Only
          </label>
          <label>
            <input 
              type="radio" 
              name="keyType" 
              value="black" 
              checked={keyType === 'black'}
              onChange={() => handleKeyTypeChange('black')}
            /> 
            Black Keys Only
          </label>
        </div>
      </div>
      
      <div className="setting-group">
        <div className="setting-header">
          <label>Exclude Specific Notes</label>
          <div className="notes-info">
            <span className="available-count">{getAvailableNotesCount()} notes available</span>
          </div>
        </div>
        <div className="note-grid-modern">
          {ALL_NOTES.map(note => {
            const isBlackKey = note.includes('#');
            const isExcluded = excludedNotes.includes(note);
            const isDisabledByKeyType = (keyType === 'white' && isBlackKey) || (keyType === 'black' && !isBlackKey);
            
            return (
              <label 
                key={note} 
                className={`
                  note-checkbox-modern 
                  ${isBlackKey ? 'black-note-modern' : 'white-note-modern'}
                  ${isExcluded ? 'excluded' : ''}
                  ${isDisabledByKeyType ? 'disabled' : ''}
                `}
              >
                <input 
                  type="checkbox" 
                  checked={isExcluded}
                  disabled={isDisabledByKeyType}
                  onChange={() => !isDisabledByKeyType && handleNoteExclusionToggle(note)}
                />
                <span className="note-label">{note}</span>
                {isExcluded && <span className="exclude-indicator">✕</span>}
              </label>
            );
          })}
        </div>
      </div>
      
      <div className="setting-group">
        <label>Show Note Labels on Piano</label>
        <input
          type="checkbox"
          checked={showNoteLabels}
          onChange={(e) => updateShowNoteLabels(e.target.checked)}
          className="setting-checkbox"
        />
        <p className="setting-description">
          Display note names directly on the piano keys to help with learning.
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

export default NoteRangeSettings;