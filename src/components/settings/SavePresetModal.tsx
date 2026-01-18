import React, { useState, useEffect, useRef } from 'react';
import type { ChordFilter } from '../../types/music';
import { usePresets } from '../../hooks/usePresets';
import { isPresetNameAvailable } from '../../services/presetStorage';
import { CHORD_FILTER_PRESET_NAMES, CHORD_FILTER_PRESETS } from '../../constants/chordPresets';
import './SavePresetModal.css';

interface SavePresetModalProps {
  isOpen: boolean;
  onClose: () => void;
  filter: ChordFilter;
  onSaved: () => void;
}

const MAX_NAME_LENGTH = 50;
const MAX_DESCRIPTION_LENGTH = 200;

const SavePresetModal: React.FC<SavePresetModalProps> = ({
  isOpen,
  onClose,
  filter,
  onSaved,
}) => {
  const { saveCurrentAsPreset } = usePresets();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setName('');
      setDescription('');
      setError(null);
      setIsSaving(false);
    }
  }, [isOpen]);

  // Handle Escape key
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscKey);
    }

    return () => {
      document.removeEventListener('keydown', handleEscKey);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const validateName = (value: string): string | null => {
    const trimmed = value.trim();

    if (!trimmed) {
      return 'Name is required';
    }

    if (trimmed.length > MAX_NAME_LENGTH) {
      return `Name must be ${MAX_NAME_LENGTH} characters or less`;
    }

    // Check against predefined preset names
    const predefinedNames = CHORD_FILTER_PRESET_NAMES.map(
      key => CHORD_FILTER_PRESETS[key as keyof typeof CHORD_FILTER_PRESETS].name.toLowerCase()
    );
    if (predefinedNames.includes(trimmed.toLowerCase())) {
      return 'This name is reserved for a predefined preset';
    }

    // Check against existing custom presets
    if (!isPresetNameAvailable(trimmed)) {
      return 'A preset with this name already exists';
    }

    return null;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const nameError = validateName(name);
    if (nameError) {
      setError(nameError);
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      saveCurrentAsPreset(name.trim(), description.trim(), filter);
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save preset');
      setIsSaving(false);
    }
  };

  const handleBackdropClick = (event: React.MouseEvent) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value);
    if (error) {
      setError(null);
    }
  };

  return (
    <div className="save-preset-backdrop" onClick={handleBackdropClick}>
      <div className="save-preset-modal">
        <div className="save-preset-header">
          <h3>Save as Custom Preset</h3>
          <button
            type="button"
            className="save-preset-close-button"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="save-preset-form">
          <div className="form-group">
            <label htmlFor="preset-name">Name *</label>
            <input
              ref={inputRef}
              id="preset-name"
              type="text"
              value={name}
              onChange={handleNameChange}
              placeholder="My Custom Preset"
              maxLength={MAX_NAME_LENGTH}
              disabled={isSaving}
            />
            <small>{name.length}/{MAX_NAME_LENGTH}</small>
          </div>

          <div className="form-group">
            <label htmlFor="preset-description">Description (optional)</label>
            <textarea
              id="preset-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what this preset is for..."
              maxLength={MAX_DESCRIPTION_LENGTH}
              rows={3}
              disabled={isSaving}
            />
            <small>{description.length}/{MAX_DESCRIPTION_LENGTH}</small>
          </div>

          {error && (
            <div className="save-preset-error">
              {error}
            </div>
          )}

          <div className="save-preset-actions">
            <button
              type="button"
              className="cancel-button"
              onClick={onClose}
              disabled={isSaving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="save-button"
              disabled={isSaving || !name.trim()}
            >
              {isSaving ? 'Saving...' : 'Save Preset'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SavePresetModal;
