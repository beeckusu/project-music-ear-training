import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import KeyFilterSelector from './KeyFilterSelector';

describe('KeyFilterSelector', () => {
  const mockOnChange = vi.fn();

  afterEach(() => {
    mockOnChange.mockClear();
  });

  it('should render key and scale selectors', () => {
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

  it('should set default keyFilter when rendered without one', () => {
    render(
      <KeyFilterSelector
        keyFilter={undefined}
        onChange={mockOnChange}
      />
    );

    // useEffect should fire to set default
    expect(mockOnChange).toHaveBeenCalledWith({ key: 'C', scale: 'major' });
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

  it('should display description about diatonic filtering', () => {
    render(
      <KeyFilterSelector
        keyFilter={{ key: 'C', scale: 'major' }}
        onChange={mockOnChange}
      />
    );

    expect(screen.getByText(/Only chords diatonic to the selected key will appear/i)).toBeInTheDocument();
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

  it('should display correct values for different keys and scales', () => {
    const { rerender } = render(
      <KeyFilterSelector
        keyFilter={{ key: 'C', scale: 'major' }}
        onChange={mockOnChange}
      />
    );

    let keySelect = screen.getByLabelText('Key:') as HTMLSelectElement;
    let scaleSelect = screen.getByLabelText('Scale:') as HTMLSelectElement;
    expect(keySelect.value).toBe('C');
    expect(scaleSelect.value).toBe('major');

    rerender(
      <KeyFilterSelector
        keyFilter={{ key: 'F#', scale: 'minor' }}
        onChange={mockOnChange}
      />
    );

    keySelect = screen.getByLabelText('Key:') as HTMLSelectElement;
    scaleSelect = screen.getByLabelText('Scale:') as HTMLSelectElement;
    expect(keySelect.value).toBe('F#');
    expect(scaleSelect.value).toBe('minor');
  });
});
