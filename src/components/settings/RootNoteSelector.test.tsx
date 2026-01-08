import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import RootNoteSelector from './RootNoteSelector';
import { WHITE_KEYS, BLACK_KEYS, ALL_NOTES } from '../../types/music';

describe('RootNoteSelector', () => {
  const mockOnChange = vi.fn();

  afterEach(() => {
    mockOnChange.mockClear();
  });

  it('should render with all notes selected by default', () => {
    render(
      <RootNoteSelector
        selectedRootNotes={null}
        onChange={mockOnChange}
      />
    );

    expect(screen.getByText('12 root notes selected')).toBeInTheDocument();
    const allNotesRadio = screen.getByLabelText('All Notes') as HTMLInputElement;
    expect(allNotesRadio.checked).toBe(true);
  });

  it('should render with white keys selected', () => {
    render(
      <RootNoteSelector
        selectedRootNotes={WHITE_KEYS}
        onChange={mockOnChange}
      />
    );

    expect(screen.getByText('7 root notes selected')).toBeInTheDocument();
    const whiteKeysRadio = screen.getByLabelText('White Keys Only') as HTMLInputElement;
    expect(whiteKeysRadio.checked).toBe(true);
  });

  it('should render with black keys selected', () => {
    render(
      <RootNoteSelector
        selectedRootNotes={BLACK_KEYS}
        onChange={mockOnChange}
      />
    );

    expect(screen.getByText('5 root notes selected')).toBeInTheDocument();
    const blackKeysRadio = screen.getByLabelText('Black Keys Only') as HTMLInputElement;
    expect(blackKeysRadio.checked).toBe(true);
  });

  it('should show custom selection for custom note array', () => {
    render(
      <RootNoteSelector
        selectedRootNotes={['C', 'E', 'G']}
        onChange={mockOnChange}
      />
    );

    expect(screen.getByText('3 root notes selected')).toBeInTheDocument();
    const customRadio = screen.getByLabelText('Custom Selection') as HTMLInputElement;
    expect(customRadio.checked).toBe(true);
  });

  it('should call onChange with null when "All Notes" is selected', () => {
    render(
      <RootNoteSelector
        selectedRootNotes={WHITE_KEYS}
        onChange={mockOnChange}
      />
    );

    const allNotesRadio = screen.getByLabelText('All Notes');
    fireEvent.click(allNotesRadio);

    expect(mockOnChange).toHaveBeenCalledWith(null);
  });

  it('should call onChange with WHITE_KEYS when "White Keys Only" is selected', () => {
    render(
      <RootNoteSelector
        selectedRootNotes={null}
        onChange={mockOnChange}
      />
    );

    const whiteKeysRadio = screen.getByLabelText('White Keys Only');
    fireEvent.click(whiteKeysRadio);

    expect(mockOnChange).toHaveBeenCalledWith(expect.arrayContaining(WHITE_KEYS));
    expect(mockOnChange.mock.calls[0][0]).toHaveLength(WHITE_KEYS.length);
  });

  it('should call onChange with BLACK_KEYS when "Black Keys Only" is selected', () => {
    render(
      <RootNoteSelector
        selectedRootNotes={null}
        onChange={mockOnChange}
      />
    );

    const blackKeysRadio = screen.getByLabelText('Black Keys Only');
    fireEvent.click(blackKeysRadio);

    expect(mockOnChange).toHaveBeenCalledWith(expect.arrayContaining(BLACK_KEYS));
    expect(mockOnChange.mock.calls[0][0]).toHaveLength(BLACK_KEYS.length);
  });

  it('should toggle individual notes', () => {
    render(
      <RootNoteSelector
        selectedRootNotes={['C', 'D', 'E']}
        onChange={mockOnChange}
      />
    );

    // Find the checkbox for note C and click it to deselect
    const checkboxes = screen.getAllByRole('checkbox');
    const cCheckbox = checkboxes.find(cb =>
      cb.parentElement?.textContent?.includes('C') &&
      !cb.parentElement?.textContent?.includes('C#')
    );

    fireEvent.click(cCheckbox!);

    // Should be called with C removed
    expect(mockOnChange).toHaveBeenCalled();
    const newNotes = mockOnChange.mock.calls[0][0];
    expect(newNotes).toEqual(['D', 'E']);
  });

  it('should add a note when toggled on', () => {
    render(
      <RootNoteSelector
        selectedRootNotes={['C', 'E']}
        onChange={mockOnChange}
      />
    );

    // Find the checkbox for note D and click it to select
    const checkboxes = screen.getAllByRole('checkbox');
    const dCheckbox = checkboxes.find(cb =>
      cb.parentElement?.textContent?.includes('D') &&
      !cb.parentElement?.textContent?.includes('D#')
    );

    fireEvent.click(dCheckbox!);

    // Should be called with D added
    expect(mockOnChange).toHaveBeenCalled();
    const newNotes = mockOnChange.mock.calls[0][0];
    expect(newNotes).toContain('C');
    expect(newNotes).toContain('D');
    expect(newNotes).toContain('E');
  });

  it('should switch to "All Notes" when all notes are selected via checkboxes', () => {
    // Start with all but one note
    const almostAll = ALL_NOTES.slice(0, -1);

    render(
      <RootNoteSelector
        selectedRootNotes={almostAll}
        onChange={mockOnChange}
      />
    );

    // Find and click the last note's checkbox
    const lastNote = ALL_NOTES[ALL_NOTES.length - 1];
    const checkboxes = screen.getAllByRole('checkbox');
    const lastCheckbox = checkboxes.find(cb =>
      cb.parentElement?.textContent?.trim().startsWith(lastNote)
    );

    fireEvent.click(lastCheckbox!);

    // Should call onChange with null (all notes)
    expect(mockOnChange).toHaveBeenCalledWith(null);
  });

  it('should display all 12 chromatic notes', () => {
    render(
      <RootNoteSelector
        selectedRootNotes={null}
        onChange={mockOnChange}
      />
    );

    ALL_NOTES.forEach(note => {
      expect(screen.getByText(note)).toBeInTheDocument();
    });
  });

  it('should visually distinguish selected and unselected notes', () => {
    render(
      <RootNoteSelector
        selectedRootNotes={['C', 'E', 'G']}
        onChange={mockOnChange}
      />
    );

    const checkboxes = screen.getAllByRole('checkbox');

    // C should be checked
    const cCheckbox = checkboxes.find(cb =>
      cb.parentElement?.textContent?.includes('C') &&
      !cb.parentElement?.textContent?.includes('C#')
    ) as HTMLInputElement;
    expect(cCheckbox.checked).toBe(true);

    // D should be unchecked
    const dCheckbox = checkboxes.find(cb =>
      cb.parentElement?.textContent?.includes('D') &&
      !cb.parentElement?.textContent?.includes('D#')
    ) as HTMLInputElement;
    expect(dCheckbox.checked).toBe(false);
  });
});
