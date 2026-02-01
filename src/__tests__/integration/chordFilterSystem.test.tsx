import { screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import ChordFilterSettings from '../../components/settings/ChordFilterSettings';
import { renderWithSettings } from '../../test/testUtils';

describe('Chord Filter System Integration Tests', () => {
  const renderComponent = () => renderWithSettings(<ChordFilterSettings />);

  it('should render subtabs and default to Custom tab', () => {
    renderComponent();

    // Subtabs should be present
    expect(screen.getByText('Custom')).toBeInTheDocument();
    expect(screen.getByText('Keys')).toBeInTheDocument();

    // Custom tab content should be visible by default
    expect(screen.getAllByText(/Chord Types/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Root Note Filter/i)).toBeInTheDocument();
  });

  it('should switch to Keys subtab and show key filter controls', () => {
    renderComponent();

    // Click on Keys subtab
    fireEvent.click(screen.getByText('Keys'));

    // Key and scale selectors should appear
    expect(screen.getByLabelText('Key:')).toBeInTheDocument();
    expect(screen.getByLabelText('Scale:')).toBeInTheDocument();
    expect(screen.getByText(/Only chords diatonic to the selected key will appear/i)).toBeInTheDocument();
  });

  it('should handle key filter with different keys and scales in Keys subtab', () => {
    renderComponent();

    // Switch to Keys subtab
    fireEvent.click(screen.getByText('Keys'));

    // Change key to G
    const keySelect = screen.getByLabelText('Key:');
    fireEvent.change(keySelect, { target: { value: 'G' } });

    // Change scale to minor
    const scaleSelect = screen.getByLabelText('Scale:');
    fireEvent.change(scaleSelect, { target: { value: 'minor' } });

    // Selectors should reflect the changes
    expect((keySelect as HTMLSelectElement).value).toBe('G');
    expect((scaleSelect as HTMLSelectElement).value).toBe('minor');
  });

  it('should show correct chord type counts', () => {
    renderComponent();

    // Initially should show some count
    expect(screen.getByText(/\d+ types selected/)).toBeInTheDocument();
  });

  it('should hide key filter when switching back to Custom tab', () => {
    renderComponent();

    // Switch to Keys subtab
    fireEvent.click(screen.getByText('Keys'));
    expect(screen.getByLabelText('Key:')).toBeInTheDocument();

    // Switch back to Custom subtab
    fireEvent.click(screen.getByText('Custom'));

    // Key filter controls should not be visible in Custom tab
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

  it('should show chord type selector in Keys subtab', () => {
    renderComponent();

    // Switch to Keys subtab
    fireEvent.click(screen.getByText('Keys'));

    // Chord type selector should still be available in Keys tab
    expect(screen.getAllByText(/Chord Types/i).length).toBeGreaterThan(0);
  });

  it('should show inversions checkbox in both subtabs', () => {
    renderComponent();

    // Custom tab should have inversions checkbox
    expect(screen.getByLabelText(/Include Inversions/i)).toBeInTheDocument();

    // Switch to Keys subtab
    fireEvent.click(screen.getByText('Keys'));

    // Keys tab should also have inversions checkbox
    expect(screen.getByLabelText(/Include Inversions/i)).toBeInTheDocument();
  });
});
