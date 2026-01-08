import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import KeyFilterSelector from './KeyFilterSelector';

describe('KeyFilterSelector', () => {
  const mockOnChange = vi.fn();

  afterEach(() => {
    mockOnChange.mockClear();
  });

  it('should render with key filter disabled by default', () => {
    render(
      <KeyFilterSelector
        keyFilter={undefined}
        onChange={mockOnChange}
      />
    );

    const checkbox = screen.getByRole('checkbox') as HTMLInputElement;
    expect(checkbox.checked).toBe(false);
    expect(screen.getByText(/Enable to restrict chords/i)).toBeInTheDocument();
  });

  it('should render with key filter enabled', () => {
    render(
      <KeyFilterSelector
        keyFilter={{ key: 'C', scale: 'major' }}
        onChange={mockOnChange}
      />
    );

    const checkbox = screen.getByRole('checkbox') as HTMLInputElement;
    expect(checkbox.checked).toBe(true);
    expect(screen.getByText(/Only practice chords.*C major/i)).toBeInTheDocument();
  });

  it('should enable key filter with default values when checkbox is checked', () => {
    render(
      <KeyFilterSelector
        keyFilter={undefined}
        onChange={mockOnChange}
      />
    );

    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);

    expect(mockOnChange).toHaveBeenCalledWith({ key: 'C', scale: 'major' });
  });

  it('should disable key filter when checkbox is unchecked', () => {
    render(
      <KeyFilterSelector
        keyFilter={{ key: 'G', scale: 'minor' }}
        onChange={mockOnChange}
      />
    );

    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);

    expect(mockOnChange).toHaveBeenCalledWith(undefined);
  });

  it('should show key and scale selectors when enabled', () => {
    render(
      <KeyFilterSelector
        keyFilter={{ key: 'D', scale: 'major' }}
        onChange={mockOnChange}
      />
    );

    expect(screen.getByLabelText('Key:')).toBeInTheDocument();
    expect(screen.getByLabelText('Scale:')).toBeInTheDocument();

    const keySelect = screen.getByLabelText('Key:') as HTMLSelectElement;
    const scaleSelect = screen.getByLabelText('Scale:') as HTMLSelectElement;

    expect(keySelect.value).toBe('D');
    expect(scaleSelect.value).toBe('major');
  });

  it('should call onChange when key is changed', () => {
    render(
      <KeyFilterSelector
        keyFilter={{ key: 'C', scale: 'major' }}
        onChange={mockOnChange}
      />
    );

    const keySelect = screen.getByLabelText('Key:');
    fireEvent.change(keySelect, { target: { value: 'G' } });

    expect(mockOnChange).toHaveBeenCalledWith({ key: 'G', scale: 'major' });
  });

  it('should call onChange when scale is changed', () => {
    render(
      <KeyFilterSelector
        keyFilter={{ key: 'C', scale: 'major' }}
        onChange={mockOnChange}
      />
    );

    const scaleSelect = screen.getByLabelText('Scale:');
    fireEvent.change(scaleSelect, { target: { value: 'minor' } });

    expect(mockOnChange).toHaveBeenCalledWith({ key: 'C', scale: 'minor' });
  });

  it('should display correct description for different keys and scales', () => {
    const { rerender } = render(
      <KeyFilterSelector
        keyFilter={{ key: 'C', scale: 'major' }}
        onChange={mockOnChange}
      />
    );

    expect(screen.getByText(/C major/i)).toBeInTheDocument();

    rerender(
      <KeyFilterSelector
        keyFilter={{ key: 'F#', scale: 'minor' }}
        onChange={mockOnChange}
      />
    );

    expect(screen.getByText(/F# minor/i)).toBeInTheDocument();
  });

  it('should have all 12 chromatic notes in key selector', () => {
    render(
      <KeyFilterSelector
        keyFilter={{ key: 'C', scale: 'major' }}
        onChange={mockOnChange}
      />
    );

    const keySelect = screen.getByLabelText('Key:');
    const options = keySelect.querySelectorAll('option');

    expect(options.length).toBe(12);
  });

  it('should have major and minor options in scale selector', () => {
    render(
      <KeyFilterSelector
        keyFilter={{ key: 'C', scale: 'major' }}
        onChange={mockOnChange}
      />
    );

    const scaleSelect = screen.getByLabelText('Scale:');
    const options = scaleSelect.querySelectorAll('option');

    expect(options.length).toBe(2);
    expect(options[0].value).toBe('major');
    expect(options[1].value).toBe('minor');
  });

  it('should not show controls when disabled', () => {
    render(
      <KeyFilterSelector
        keyFilter={undefined}
        onChange={mockOnChange}
      />
    );

    expect(screen.queryByLabelText('Key:')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Scale:')).not.toBeInTheDocument();
  });
});
