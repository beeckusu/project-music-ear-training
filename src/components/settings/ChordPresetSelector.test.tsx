import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ChordPresetSelector from './ChordPresetSelector';
import { CHORD_FILTER_PRESETS } from '../../constants/chordPresets';
import { ChordType } from '../../types/music';

describe('ChordPresetSelector', () => {
  const mockOnPresetSelect = vi.fn();

  afterEach(() => {
    mockOnPresetSelect.mockClear();
  });

  it('should render with a preset selected', () => {
    const filter = CHORD_FILTER_PRESETS.BASIC_TRIADS.filter;

    render(
      <ChordPresetSelector
        currentFilter={filter}
        onPresetSelect={mockOnPresetSelect}
      />
    );

    const select = screen.getByRole('combobox');
    expect(select).toHaveValue('BASIC_TRIADS');
    expect(screen.getByText(/Beginner-friendly/i)).toBeInTheDocument();
  });

  it('should detect custom configuration', () => {
    const customFilter = {
      allowedChordTypes: [ChordType.MAJOR],
      allowedRootNotes: ['C', 'D', 'E'],
      allowedOctaves: [3],
      includeInversions: true,
    };

    render(
      <ChordPresetSelector
        currentFilter={customFilter}
        onPresetSelect={mockOnPresetSelect}
      />
    );

    const select = screen.getByRole('combobox');
    expect(select).toHaveValue('CUSTOM');
    expect(screen.getByText(/customized the chord filter/i)).toBeInTheDocument();
  });

  it('should call onPresetSelect when a preset is selected', () => {
    const filter = CHORD_FILTER_PRESETS.BASIC_TRIADS.filter;

    render(
      <ChordPresetSelector
        currentFilter={filter}
        onPresetSelect={mockOnPresetSelect}
      />
    );

    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'ALL_7TH_CHORDS' } });

    expect(mockOnPresetSelect).toHaveBeenCalledWith('ALL_7TH_CHORDS');
  });

  it('should not call onPresetSelect when CUSTOM is selected', () => {
    const customFilter = {
      allowedChordTypes: [ChordType.MAJOR],
      allowedRootNotes: ['C'],
      allowedOctaves: [4],
      includeInversions: false,
    };

    render(
      <ChordPresetSelector
        currentFilter={customFilter}
        onPresetSelect={mockOnPresetSelect}
      />
    );

    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'CUSTOM' } });

    expect(mockOnPresetSelect).not.toHaveBeenCalled();
  });

  it('should display all preset options', () => {
    const filter = CHORD_FILTER_PRESETS.BASIC_TRIADS.filter;

    render(
      <ChordPresetSelector
        currentFilter={filter}
        onPresetSelect={mockOnPresetSelect}
      />
    );

    const select = screen.getByRole('combobox');
    const options = select.querySelectorAll('option');

    // Should have all 5 presets (CUSTOM not shown when a preset is matched)
    expect(options.length).toBe(5);

    // Verify specific presets are present
    expect(screen.getByText('Basic Triads')).toBeInTheDocument();
    expect(screen.getByText('All Major & Minor Triads')).toBeInTheDocument();
    expect(screen.getByText('All 7th Chords')).toBeInTheDocument();
    expect(screen.getByText('Jazz Chords')).toBeInTheDocument();
    expect(screen.getByText('All Chords in C Major')).toBeInTheDocument();
  });

  it('should show correct description for selected preset', () => {
    const filter = CHORD_FILTER_PRESETS.JAZZ_CHORDS.filter;

    render(
      <ChordPresetSelector
        currentFilter={filter}
        onPresetSelect={mockOnPresetSelect}
      />
    );

    expect(screen.getByText(/jazz chords.*7ths.*9ths.*inversions/i)).toBeInTheDocument();
  });
});
