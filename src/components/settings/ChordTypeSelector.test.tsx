import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ChordTypeSelector from './ChordTypeSelector';
import { ChordType, CHORD_TYPES } from '../../types/music';

describe('ChordTypeSelector', () => {
  const mockOnChange = vi.fn();

  afterEach(() => {
    mockOnChange.mockClear();
  });

  it('should render with selected chord types', () => {
    const selectedTypes = [ChordType.MAJOR, ChordType.MINOR];

    render(
      <ChordTypeSelector
        selectedChordTypes={selectedTypes}
        onChange={mockOnChange}
      />
    );

    expect(screen.getByText('2 types selected')).toBeInTheDocument();
  });

  it('should show Triads and 7th Chords expanded by default', () => {
    render(
      <ChordTypeSelector
        selectedChordTypes={[]}
        onChange={mockOnChange}
      />
    );

    // Triads should be expanded
    expect(screen.getByText('Major')).toBeInTheDocument();
    expect(screen.getByText('Minor')).toBeInTheDocument();

    // 7th Chords should be expanded
    expect(screen.getByText('Major 7th')).toBeInTheDocument();
    expect(screen.getByText('Dominant 7th')).toBeInTheDocument();
  });

  it('should toggle category expansion when header is clicked', () => {
    render(
      <ChordTypeSelector
        selectedChordTypes={[]}
        onChange={mockOnChange}
      />
    );

    // Find the Extended Chords category toggle button by text content
    const buttons = screen.getAllByRole('button');
    const extendedButton = buttons.find(btn =>
      btn.textContent?.includes('Extended Chords') && btn.textContent?.includes('▶')
    );

    expect(extendedButton).toBeDefined();

    // Extended chords should not be visible initially
    expect(screen.queryByText('Major 9th')).not.toBeInTheDocument();

    // Click to expand
    fireEvent.click(extendedButton!);

    // Now extended chords should be visible
    expect(screen.getByText('Major 9th')).toBeInTheDocument();
  });

  it('should call onChange when a chord type is selected', () => {
    render(
      <ChordTypeSelector
        selectedChordTypes={[]}
        onChange={mockOnChange}
      />
    );

    const majorCheckbox = screen.getByLabelText('Major');
    fireEvent.click(majorCheckbox);

    expect(mockOnChange).toHaveBeenCalledWith([ChordType.MAJOR]);
  });

  it('should call onChange when a chord type is deselected', () => {
    render(
      <ChordTypeSelector
        selectedChordTypes={[ChordType.MAJOR, ChordType.MINOR]}
        onChange={mockOnChange}
      />
    );

    const majorCheckbox = screen.getByLabelText('Major');
    fireEvent.click(majorCheckbox);

    expect(mockOnChange).toHaveBeenCalledWith([ChordType.MINOR]);
  });

  it('should select all chord types in a category when "Select All" is clicked', () => {
    render(
      <ChordTypeSelector
        selectedChordTypes={[]}
        onChange={mockOnChange}
      />
    );

    // Find the "Select All" button for Triads
    const selectAllButtons = screen.getAllByText('Select All');
    const triadsSelectAll = selectAllButtons[0]; // First category (Triads)

    fireEvent.click(triadsSelectAll);

    expect(mockOnChange).toHaveBeenCalledWith(
      expect.arrayContaining(CHORD_TYPES.TRIADS)
    );
  });

  it('should deselect all chord types in a category when "Clear All" is clicked', () => {
    const allTriads = [...CHORD_TYPES.TRIADS];

    render(
      <ChordTypeSelector
        selectedChordTypes={allTriads}
        onChange={mockOnChange}
      />
    );

    // Find the "Clear All" button for Triads (should show "Clear All" when all are selected)
    const clearAllButton = screen.getByText('Clear All');
    fireEvent.click(clearAllButton);

    expect(mockOnChange).toHaveBeenCalledWith([]);
  });

  it('should show correct count for each category', () => {
    const selectedTypes = [ChordType.MAJOR, ChordType.MINOR]; // 2 out of 4 triads

    render(
      <ChordTypeSelector
        selectedChordTypes={selectedTypes}
        onChange={mockOnChange}
      />
    );

    // Triads category should show (2/4)
    expect(screen.getByText('(2/4)')).toBeInTheDocument();
  });

  it('should display all 5 chord categories', () => {
    render(
      <ChordTypeSelector
        selectedChordTypes={[]}
        onChange={mockOnChange}
      />
    );

    expect(screen.getByText(/Triads/i)).toBeInTheDocument();
    expect(screen.getByText(/7th Chords/i)).toBeInTheDocument();
    expect(screen.getByText(/Extended Chords/i)).toBeInTheDocument();
    expect(screen.getByText(/Suspended Chords/i)).toBeInTheDocument();
    expect(screen.getByText(/Added Tone Chords/i)).toBeInTheDocument();
  });

  it('should maintain selection state when toggling categories', () => {
    render(
      <ChordTypeSelector
        selectedChordTypes={[ChordType.MAJOR]}
        onChange={mockOnChange}
      />
    );

    const majorCheckbox = screen.getByLabelText('Major') as HTMLInputElement;
    expect(majorCheckbox.checked).toBe(true);

    // Find Triads toggle button
    const buttons = screen.getAllByRole('button');
    const triadsToggle = buttons.find(btn =>
      btn.textContent?.includes('Triads') && btn.textContent?.includes('▼')
    );

    expect(triadsToggle).toBeDefined();

    // Collapse and re-expand Triads
    fireEvent.click(triadsToggle!); // Collapse
    fireEvent.click(triadsToggle!); // Re-expand

    const majorCheckboxAfter = screen.getByLabelText('Major') as HTMLInputElement;
    expect(majorCheckboxAfter.checked).toBe(true);
  });

  it('should handle selecting all chord types across all categories', () => {
    render(
      <ChordTypeSelector
        selectedChordTypes={[]}
        onChange={mockOnChange}
      />
    );

    // Expand all categories first by finding buttons with ▶
    const buttons = screen.getAllByRole('button');
    const collapsedButtons = buttons.filter(btn =>
      btn.textContent?.includes('▶')
    );

    collapsedButtons.forEach(btn => fireEvent.click(btn));

    // Click all "Select All" buttons
    const selectAllButtons = screen.getAllByText('Select All');
    selectAllButtons.forEach(button => fireEvent.click(button));

    // Should have been called 5 times (once per category)
    expect(mockOnChange).toHaveBeenCalledTimes(5);
  });

  it('should show "Select All" when category is partially selected', () => {
    render(
      <ChordTypeSelector
        selectedChordTypes={[ChordType.MAJOR]} // Only one triad out of 4
        onChange={mockOnChange}
      />
    );

    // Triads category should show "Select All" (not all selected)
    const selectAllButtons = screen.getAllByText('Select All');
    expect(selectAllButtons.length).toBeGreaterThan(0);
  });

  it('should display user-friendly chord type names', () => {
    render(
      <ChordTypeSelector
        selectedChordTypes={[]}
        onChange={mockOnChange}
      />
    );

    // Check for friendly names (not technical names like "major7")
    expect(screen.getByText('Major')).toBeInTheDocument();
    expect(screen.getByText('Minor')).toBeInTheDocument();
    expect(screen.getByText('Diminished')).toBeInTheDocument();
    expect(screen.getByText('Augmented')).toBeInTheDocument();
  });
});
