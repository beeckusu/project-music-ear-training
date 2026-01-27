import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { SettingsProvider } from '../contexts/SettingsContext';
import { PresetProvider } from '../contexts/PresetContext';
import { useSettings } from '../hooks/useSettings';

/**
 * Renders a component wrapped with all required providers for integration tests.
 * Includes SettingsProvider and PresetProvider.
 */
export const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <SettingsProvider>
      <PresetProvider>
        {ui}
      </PresetProvider>
    </SettingsProvider>
  );
};

/**
 * Renders a component wrapped with SettingsProvider only.
 * Use when PresetProvider is not needed.
 */
export const renderWithSettings = (ui: React.ReactElement) => {
  return render(
    <SettingsProvider>
      {ui}
    </SettingsProvider>
  );
};

/**
 * Test component that exposes settings state for verification in tests.
 * Renders data-testid elements for pending and committed settings.
 */
export const SettingsStateDisplay: React.FC = () => {
  const { pendingSettings, settings } = useSettings();
  return (
    <div data-testid="settings-state">
      <span data-testid="pending-training-type">{pendingSettings.trainingType}</span>
      <span data-testid="pending-selected-mode">{pendingSettings.modes.selectedMode}</span>
      <span data-testid="committed-training-type">{settings.trainingType}</span>
      <span data-testid="committed-selected-mode">{settings.modes.selectedMode}</span>
    </div>
  );
};

/**
 * Clicks a mode card by its title text.
 * @param title - The title of the mode card to click
 * @returns The clicked mode card element
 */
export const clickModeCard = (title: string) => {
  const card = screen.getByText(title).closest('.mode-card');
  if (!card) {
    throw new Error(`Mode card with title "${title}" not found`);
  }
  fireEvent.click(card);
  return card;
};

/**
 * Gets a mode card element by its title text.
 * @param title - The title of the mode card
 * @returns The mode card element
 */
export const getModeCard = (title: string) => {
  const card = screen.getByText(title).closest('.mode-card');
  if (!card) {
    throw new Error(`Mode card with title "${title}" not found`);
  }
  return card;
};
