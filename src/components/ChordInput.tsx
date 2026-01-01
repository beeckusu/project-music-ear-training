import React, { useState, useRef, useEffect } from 'react';
import './ChordInput.css';

interface ChordInputProps {
  /** Current input value */
  value: string;

  /** Callback when input changes */
  onChange: (value: string) => void;

  /** Callback when user submits guess */
  onSubmit: (value: string) => void;

  /** Whether input is disabled */
  disabled?: boolean;

  /** Placeholder text */
  placeholder?: string;

  /** Optional CSS classes */
  className?: string;
}

/**
 * Reusable chord name input component with autocomplete suggestions.
 * Supports various chord naming conventions and provides helpful suggestions.
 */
const ChordInput: React.FC<ChordInputProps> = ({
  value,
  onChange,
  onSubmit,
  disabled = false,
  placeholder = 'e.g., C, Dm, Gmaj7, F#m',
  className = ''
}) => {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Common chord suggestions based on input
  const getSuggestions = (input: string): string[] => {
    if (!input.trim()) return [];

    const normalized = input.trim().toLowerCase();
    const suggestions: string[] = [];

    // Root notes
    const roots = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B',
                   'Db', 'Eb', 'Gb', 'Ab', 'Bb'];

    // Common chord suffixes
    const suffixes = ['', 'm', 'maj7', 'm7', '7', 'dim', 'aug', 'sus2', 'sus4',
                      'm7b5', 'dim7', 'maj9', 'm9', '9', 'add9'];

    // Extract potential root
    let potentialRoot = '';

    // Check if first character is a note
    if (normalized.length >= 1 && /[a-g]/.test(normalized[0])) {
      potentialRoot = normalized[0].toUpperCase();

      // Check for sharp/flat
      if (normalized.length >= 2 && (normalized[1] === '#' || normalized[1] === 'b' || normalized[1] === '♯' || normalized[1] === '♭')) {
        potentialRoot += normalized[1] === '♯' ? '#' : normalized[1] === '♭' ? 'b' : normalized[1];
      }

      // Match root notes
      const matchingRoots = roots.filter(root =>
        root.toLowerCase().startsWith(potentialRoot.toLowerCase())
      );

      // If we have a root match, suggest chord completions
      if (matchingRoots.length > 0) {
        matchingRoots.forEach(root => {
          suffixes.forEach(suffix => {
            const chord = root + suffix;
            if (chord.toLowerCase().startsWith(normalized)) {
              suggestions.push(chord);
            }
          });
        });
      }
    }

    // Limit suggestions to 8
    return suggestions.slice(0, 8);
  };

  const suggestions = getSuggestions(value);

  // Handle input change
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    setShowSuggestions(true);
    setSelectedSuggestionIndex(-1);
  };

  // Handle clear
  const handleClear = () => {
    onChange('');
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  // Handle submit
  const handleSubmit = () => {
    if (value.trim()) {
      onSubmit(value.trim());
      setShowSuggestions(false);
    }
  };

  // Handle key press
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedSuggestionIndex >= 0 && suggestions[selectedSuggestionIndex]) {
        // Accept selected suggestion
        onChange(suggestions[selectedSuggestionIndex]);
        setShowSuggestions(false);
        setSelectedSuggestionIndex(-1);
      } else {
        // Submit current value
        handleSubmit();
      }
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
      setSelectedSuggestionIndex(-1);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (suggestions.length > 0) {
        setShowSuggestions(true);
        setSelectedSuggestionIndex(prev =>
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (suggestions.length > 0) {
        setShowSuggestions(true);
        setSelectedSuggestionIndex(prev =>
          prev > 0 ? prev - 1 : suggestions.length - 1
        );
      }
    }
  };

  // Handle suggestion click
  const handleSuggestionClick = (suggestion: string) => {
    onChange(suggestion);
    setShowSuggestions(false);
    setSelectedSuggestionIndex(-1);
    // Small delay to allow state to update before refocusing
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        inputRef.current &&
        !inputRef.current.contains(event.target as Node) &&
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={`chord-input-wrapper ${className}`}>
      <div className="chord-input-container">
        <input
          ref={inputRef}
          type="text"
          className="chord-input-field"
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => setShowSuggestions(true)}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete="off"
          aria-label="Chord name input"
          aria-autocomplete="list"
          aria-controls="chord-suggestions"
          aria-expanded={showSuggestions && suggestions.length > 0}
        />

        {value.length > 0 && !disabled && (
          <button
            className="chord-input-clear"
            onClick={handleClear}
            aria-label="Clear input"
            type="button"
          >
            ✕
          </button>
        )}
      </div>

      {/* Autocomplete Suggestions */}
      {showSuggestions && suggestions.length > 0 && !disabled && (
        <div
          ref={suggestionsRef}
          id="chord-suggestions"
          className="chord-suggestions"
          role="listbox"
        >
          {suggestions.map((suggestion, index) => (
            <div
              key={suggestion}
              className={`chord-suggestion-item ${index === selectedSuggestionIndex ? 'selected' : ''}`}
              onMouseDown={(e) => {
                e.preventDefault(); // Prevent input blur
                handleSuggestionClick(suggestion);
              }}
              role="option"
              aria-selected={index === selectedSuggestionIndex}
            >
              {suggestion}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ChordInput;
