import type {
  CustomChordFilterPreset,
  CreateCustomPresetData,
  UpdateCustomPresetData,
} from '../types/presets';

const STORAGE_KEY = 'custom-chord-presets';
const MAX_PRESETS = 20;

/**
 * Generate a unique ID for a new preset.
 */
function generateId(): string {
  return `preset-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Load all custom presets from localStorage.
 * Returns an empty array if no presets exist or if there's an error.
 */
export function loadCustomPresets(): CustomChordFilterPreset[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return [];
    }

    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) {
      console.warn('Invalid preset data in localStorage, expected array');
      return [];
    }

    // Validate each preset has required fields
    return parsed.filter((preset): preset is CustomChordFilterPreset => {
      return (
        preset &&
        typeof preset.id === 'string' &&
        typeof preset.name === 'string' &&
        typeof preset.filter === 'object' &&
        preset.isCustom === true
      );
    });
  } catch (error) {
    console.error('Failed to load custom presets:', error);
    return [];
  }
}

/**
 * Save all custom presets to localStorage.
 */
function savePresets(presets: CustomChordFilterPreset[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
  } catch (error) {
    console.error('Failed to save custom presets:', error);
    throw new Error('Failed to save preset. Storage may be full.');
  }
}

/**
 * Create and save a new custom preset.
 * Returns the created preset with generated id and timestamps.
 * Throws if maximum preset limit is reached or name is duplicate.
 */
export function saveCustomPreset(data: CreateCustomPresetData): CustomChordFilterPreset {
  const presets = loadCustomPresets();

  // Check maximum limit
  if (presets.length >= MAX_PRESETS) {
    throw new Error(`Maximum of ${MAX_PRESETS} custom presets allowed. Delete some to add more.`);
  }

  // Check for duplicate name
  if (presets.some(p => p.name.toLowerCase() === data.name.toLowerCase())) {
    throw new Error(`A preset named "${data.name}" already exists.`);
  }

  const now = new Date().toISOString();
  const newPreset: CustomChordFilterPreset = {
    id: generateId(),
    name: data.name,
    description: data.description,
    filter: { ...data.filter },
    isCustom: true,
    createdAt: now,
    updatedAt: now,
  };

  presets.push(newPreset);
  savePresets(presets);

  return newPreset;
}

/**
 * Update an existing custom preset.
 * Returns the updated preset or throws if not found.
 */
export function updateCustomPreset(
  id: string,
  updates: UpdateCustomPresetData
): CustomChordFilterPreset {
  const presets = loadCustomPresets();
  const index = presets.findIndex(p => p.id === id);

  if (index === -1) {
    throw new Error(`Preset with id "${id}" not found.`);
  }

  // Check for duplicate name if name is being updated
  if (updates.name) {
    const duplicateIndex = presets.findIndex(
      p => p.id !== id && p.name.toLowerCase() === updates.name!.toLowerCase()
    );
    if (duplicateIndex !== -1) {
      throw new Error(`A preset named "${updates.name}" already exists.`);
    }
  }

  const updatedPreset: CustomChordFilterPreset = {
    ...presets[index],
    ...updates,
    filter: updates.filter ? { ...updates.filter } : presets[index].filter,
    updatedAt: new Date().toISOString(),
  };

  presets[index] = updatedPreset;
  savePresets(presets);

  return updatedPreset;
}

/**
 * Delete a custom preset by id.
 * Returns true if deleted, false if not found.
 */
export function deleteCustomPreset(id: string): boolean {
  const presets = loadCustomPresets();
  const index = presets.findIndex(p => p.id === id);

  if (index === -1) {
    return false;
  }

  presets.splice(index, 1);
  savePresets(presets);

  return true;
}

/**
 * Get a single custom preset by id.
 */
export function getCustomPreset(id: string): CustomChordFilterPreset | undefined {
  const presets = loadCustomPresets();
  return presets.find(p => p.id === id);
}

/**
 * Check if a name is available for a new preset.
 * Optionally exclude a preset id from the check (for updates).
 */
export function isPresetNameAvailable(name: string, excludeId?: string): boolean {
  const presets = loadCustomPresets();
  return !presets.some(
    p => p.id !== excludeId && p.name.toLowerCase() === name.toLowerCase()
  );
}
