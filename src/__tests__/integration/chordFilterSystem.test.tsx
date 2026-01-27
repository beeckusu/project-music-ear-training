import { screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import NoteTrainingModeSettings from '../../components/settings/NoteTrainingModeSettings';
import { renderWithSettings } from '../../test/testUtils';

describe('Chord Filter System Integration Tests', () => {
  const renderComponent = () => renderWithSettings(<NoteTrainingModeSettings />);

  it('should render all chord filter components', () => {
    renderComponent();

    // Check that all filter components are present
    expect(screen.getAllByText(/Chord Types/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Root Note Filter/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Filter by Key/i)).toBeInTheDocument();
  });

  it('should allow enabling and configuring key filter', () => {
    renderComponent();

    // Find the key filter checkbox
    const keyFilterCheckbox = screen.getByLabelText(/Filter by Key/i);
    expect(keyFilterCheckbox).not.toBeChecked();

    // Enable key filter
    fireEvent.click(keyFilterCheckbox);

    // Now key and scale selectors should appear
    expect(screen.getByLabelText('Key:')).toBeInTheDocument();
    expect(screen.getByLabelText('Scale:')).toBeInTheDocument();
  });

  it('should update root notes filter', () => {
    renderComponent();

    // Should see root notes selected count
    expect(screen.getByText(/root notes selected/i)).toBeInTheDocument();

    // Find the "All Notes" radio button and verify it exists
    const allNotesRadio = screen.getByLabelText('All Notes');
    expect(allNotesRadio).toBeInTheDocument();
  });

  it('should handle key filter with different keys and scales', () => {
    renderComponent();

    // Enable key filter
    const keyFilterCheckbox = screen.getByLabelText(/Filter by Key/i);
    fireEvent.click(keyFilterCheckbox);

    // Change key to G
    const keySelect = screen.getByLabelText('Key:');
    fireEvent.change(keySelect, { target: { value: 'G' } });

    // Description should update
    expect(screen.getByText(/G major/i)).toBeInTheDocument();

    // Change scale to minor
    const scaleSelect = screen.getByLabelText('Scale:');
    fireEvent.change(scaleSelect, { target: { value: 'minor' } });

    // Description should update
    expect(screen.getByText(/G minor/i)).toBeInTheDocument();
  });

  it('should show correct chord type counts', () => {
    renderComponent();

    // Initially should show some count
    expect(screen.getByText(/\d+ types selected/)).toBeInTheDocument();
  });

  it('should disable key filter when unchecked', () => {
    renderComponent();

    // Enable key filter
    const keyFilterCheckbox = screen.getByLabelText(/Filter by Key/i);
    fireEvent.click(keyFilterCheckbox);

    // Selectors should be visible
    expect(screen.getByLabelText('Key:')).toBeInTheDocument();

    // Disable key filter
    fireEvent.click(keyFilterCheckbox);

    // Selectors should be hidden
    expect(screen.queryByLabelText('Key:')).not.toBeInTheDocument();
  });

  it('should display chord categories', () => {
    renderComponent();

    // Check for chord category headings (there may be multiple instances)
    expect(screen.getAllByText(/Triads/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/7th Chords/i).length).toBeGreaterThan(0);
  });

  it('should have collapsible chord type categories', () => {
    renderComponent();

    // Check that there are expand/collapse buttons
    const buttons = screen.getAllByRole('button');
    const categoryButtons = buttons.filter(btn =>
      btn.textContent?.includes('▶') || btn.textContent?.includes('▼')
    );

    // Should have category toggle buttons
    expect(categoryButtons.length).toBeGreaterThan(0);
  });
});
