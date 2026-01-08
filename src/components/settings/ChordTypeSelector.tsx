import React, { useState } from 'react';
import type { ChordType } from '../../types/music';
import { CHORD_TYPES } from '../../types/music';
import { CHORD_TYPE_DISPLAY_NAMES, CHORD_CATEGORY_DISPLAY_NAMES } from '../../constants/chordDisplayNames';

interface ChordTypeSelectorProps {
  selectedChordTypes: ChordType[];
  onChange: (chordTypes: ChordType[]) => void;
}

type CategoryKey = keyof typeof CHORD_TYPES;

const ChordTypeSelector: React.FC<ChordTypeSelectorProps> = ({
  selectedChordTypes,
  onChange,
}) => {
  const [expandedCategories, setExpandedCategories] = useState<Set<CategoryKey>>(
    new Set(['TRIADS', 'SEVENTH_CHORDS'])
  );

  const toggleCategory = (category: CategoryKey) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const handleChordTypeToggle = (chordType: ChordType) => {
    const newSelection = selectedChordTypes.includes(chordType)
      ? selectedChordTypes.filter(ct => ct !== chordType)
      : [...selectedChordTypes, chordType];
    onChange(newSelection);
  };

  const handleCategorySelectAll = (category: CategoryKey) => {
    const categoryChords = CHORD_TYPES[category];
    const allSelected = categoryChords.every(ct => selectedChordTypes.includes(ct));

    if (allSelected) {
      // Deselect all in category
      onChange(selectedChordTypes.filter(ct => !categoryChords.includes(ct)));
    } else {
      // Select all in category
      const newSelection = [...selectedChordTypes];
      categoryChords.forEach(ct => {
        if (!newSelection.includes(ct)) {
          newSelection.push(ct);
        }
      });
      onChange(newSelection);
    }
  };

  const getCategorySelectedCount = (category: CategoryKey): number => {
    return CHORD_TYPES[category].filter(ct => selectedChordTypes.includes(ct)).length;
  };

  const isCategoryFullySelected = (category: CategoryKey): boolean => {
    return CHORD_TYPES[category].every(ct => selectedChordTypes.includes(ct));
  };

  return (
    <div className="setting-group">
      <div className="setting-header">
        <label>Chord Types</label>
        <div className="notes-info">
          <span className="available-count">{selectedChordTypes.length} types selected</span>
        </div>
      </div>

      <div className="chord-type-categories">
        {(Object.keys(CHORD_TYPES) as CategoryKey[]).map(categoryKey => {
          const isExpanded = expandedCategories.has(categoryKey);
          const selectedCount = getCategorySelectedCount(categoryKey);
          const totalCount = CHORD_TYPES[categoryKey].length;
          const allSelected = isCategoryFullySelected(categoryKey);

          return (
            <div key={categoryKey} className="chord-category">
              <div className="chord-category-header">
                <button
                  type="button"
                  className="chord-category-toggle"
                  onClick={() => toggleCategory(categoryKey)}
                  aria-expanded={isExpanded}
                >
                  <span className="category-icon">{isExpanded ? '▼' : '▶'}</span>
                  <span className="category-name">
                    {CHORD_CATEGORY_DISPLAY_NAMES[categoryKey]}
                  </span>
                  <span className="category-count">
                    ({selectedCount}/{totalCount})
                  </span>
                </button>

                <button
                  type="button"
                  className="category-select-all-btn"
                  onClick={() => handleCategorySelectAll(categoryKey)}
                >
                  {allSelected ? 'Clear All' : 'Select All'}
                </button>
              </div>

              {isExpanded && (
                <div className="chord-type-grid">
                  {CHORD_TYPES[categoryKey].map(chordType => (
                    <label key={chordType} className="chord-type-checkbox">
                      <input
                        type="checkbox"
                        checked={selectedChordTypes.includes(chordType)}
                        onChange={() => handleChordTypeToggle(chordType)}
                      />
                      <span className="chord-type-label">
                        {CHORD_TYPE_DISPLAY_NAMES[chordType]}
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <small>Select which chord types to include in your practice sessions</small>
    </div>
  );
};

export default ChordTypeSelector;
