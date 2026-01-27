import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, within, fireEvent } from '@testing-library/react';
import React from 'react';
import ModeSelector from '../../components/settings/ModeSelector';
import { TRAINING_MODES, EAR_TRAINING_SUB_MODES, NOTE_TRAINING_SUB_MODES } from '../../constants';
import { modeRegistry } from '../../game/ModeRegistry';
import {
  renderWithProviders,
  SettingsStateDisplay,
  clickModeCard,
  getModeCard
} from '../../test/testUtils';

// Test component that combines ModeSelector with state display
const TestModeSelector: React.FC<{ onRestartGame?: () => void }> = ({ onRestartGame }) => (
  <>
    <ModeSelector onRestartGame={onRestartGame} />
    <SettingsStateDisplay />
  </>
);

/**
 * Integration Test Suite for Training Type Switching
 *
 * Tests the complete flow of switching between Ear Training and Note Training modes,
 * verifying that training type updates correctly when modes are selected.
 */
describe('Training Type Switching Integration Test', () => {
  let mockOnRestartGame: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockOnRestartGame = vi.fn();
    vi.clearAllMocks();
  });

  describe('Mode Registry Setup', () => {
    it('should have all expected modes registered with correct training types', () => {
      // Verify ear training modes
      const earTrainingModes = modeRegistry.getAllByType(TRAINING_MODES.EAR_TRAINING);
      expect(earTrainingModes.length).toBe(3);
      expect(modeRegistry.get(EAR_TRAINING_SUB_MODES.RUSH)?.type).toBe(TRAINING_MODES.EAR_TRAINING);
      expect(modeRegistry.get(EAR_TRAINING_SUB_MODES.SURVIVAL)?.type).toBe(TRAINING_MODES.EAR_TRAINING);
      expect(modeRegistry.get(EAR_TRAINING_SUB_MODES.SANDBOX)?.type).toBe(TRAINING_MODES.EAR_TRAINING);

      // Verify note training modes
      const noteTrainingModes = modeRegistry.getAllByType(TRAINING_MODES.NOTE_TRAINING);
      expect(noteTrainingModes.length).toBe(2);
      expect(modeRegistry.get(NOTE_TRAINING_SUB_MODES.SHOW_CHORD_GUESS_NOTES)?.type).toBe(TRAINING_MODES.NOTE_TRAINING);
      expect(modeRegistry.get(NOTE_TRAINING_SUB_MODES.SHOW_NOTES_GUESS_CHORD)?.type).toBe(TRAINING_MODES.NOTE_TRAINING);
    });
  });

  describe('Cross-Training Type Switching', () => {
    it.each`
      fromTitle                 | fromType                        | toTitle                    | toMode                                             | toType
      ${'Rush'}                 | ${TRAINING_MODES.EAR_TRAINING}  | ${'Chord Training'}        | ${NOTE_TRAINING_SUB_MODES.SHOW_CHORD_GUESS_NOTES}  | ${TRAINING_MODES.NOTE_TRAINING}
      ${'Survival'}             | ${TRAINING_MODES.EAR_TRAINING}  | ${'Chord Identification'}  | ${NOTE_TRAINING_SUB_MODES.SHOW_NOTES_GUESS_CHORD}  | ${TRAINING_MODES.NOTE_TRAINING}
      ${'Sandbox'}              | ${TRAINING_MODES.EAR_TRAINING}  | ${'Chord Training'}        | ${NOTE_TRAINING_SUB_MODES.SHOW_CHORD_GUESS_NOTES}  | ${TRAINING_MODES.NOTE_TRAINING}
      ${'Chord Training'}       | ${TRAINING_MODES.NOTE_TRAINING} | ${'Rush'}                  | ${EAR_TRAINING_SUB_MODES.RUSH}                     | ${TRAINING_MODES.EAR_TRAINING}
      ${'Chord Identification'} | ${TRAINING_MODES.NOTE_TRAINING} | ${'Survival'}              | ${EAR_TRAINING_SUB_MODES.SURVIVAL}                 | ${TRAINING_MODES.EAR_TRAINING}
      ${'Chord Training'}       | ${TRAINING_MODES.NOTE_TRAINING} | ${'Sandbox'}               | ${EAR_TRAINING_SUB_MODES.SANDBOX}                  | ${TRAINING_MODES.EAR_TRAINING}
    `(
      'should switch from $fromTitle ($fromType) to $toTitle ($toType)',
      ({ fromTitle, fromType, toTitle, toMode, toType }) => {
        renderWithProviders(<TestModeSelector onRestartGame={mockOnRestartGame} />);

        // Select initial mode and verify training type
        clickModeCard(fromTitle);
        expect(screen.getByTestId('pending-training-type')).toHaveTextContent(fromType);

        // Switch to target mode and verify training type changed
        clickModeCard(toTitle);
        expect(screen.getByTestId('pending-selected-mode')).toHaveTextContent(toMode);
        expect(screen.getByTestId('pending-training-type')).toHaveTextContent(toType);
      }
    );
  });

  describe('Same-Training Type Switching', () => {
    it.each`
      modeSequence                                                        | expectedType
      ${['Rush', 'Survival', 'Sandbox', 'Rush']}                         | ${TRAINING_MODES.EAR_TRAINING}
      ${['Chord Training', 'Chord Identification', 'Chord Training']}    | ${TRAINING_MODES.NOTE_TRAINING}
    `(
      'should maintain $expectedType when switching between $modeSequence',
      ({ modeSequence, expectedType }) => {
        renderWithProviders(<TestModeSelector onRestartGame={mockOnRestartGame} />);

        for (const modeTitle of modeSequence) {
          clickModeCard(modeTitle);
          expect(screen.getByTestId('pending-training-type')).toHaveTextContent(expectedType);
        }
      }
    );
  });

  describe('ModeSelector Auto-Update of Training Type', () => {
    it('should automatically set correct training type for all registered modes', () => {
      renderWithProviders(<TestModeSelector onRestartGame={mockOnRestartGame} />);

      const allModes = modeRegistry.getAll();

      for (const mode of allModes) {
        clickModeCard(mode.title);
        expect(screen.getByTestId('pending-training-type')).toHaveTextContent(mode.type);
        expect(screen.getByTestId('pending-selected-mode')).toHaveTextContent(mode.id);
      }
    });
  });

  describe('Mode Selection Visual Feedback', () => {
    it('should show selected indicator only on the active mode card', () => {
      renderWithProviders(<TestModeSelector onRestartGame={mockOnRestartGame} />);

      // Select Rush mode
      const rushCard = clickModeCard('Rush');
      expect(rushCard).toHaveClass('selected');
      expect(within(rushCard).getByText('✓')).toBeInTheDocument();

      // Verify other cards are not selected
      expect(getModeCard('Survival')).not.toHaveClass('selected');
      expect(getModeCard('Chord Training')).not.toHaveClass('selected');

      // Switch to Chord Training
      const chordCard = clickModeCard('Chord Training');
      expect(chordCard).toHaveClass('selected');
      expect(rushCard).not.toHaveClass('selected');
    });

    it('should show mode-specific settings when a mode is selected', () => {
      renderWithProviders(<TestModeSelector onRestartGame={mockOnRestartGame} />);

      clickModeCard('Rush');

      const settingsSection = document.querySelector('.mode-specific-settings');
      expect(settingsSection).toBeInTheDocument();
    });
  });

  describe('Restart Game Integration', () => {
    it('should call onRestartGame when clicking Restart Current Session', () => {
      renderWithProviders(<TestModeSelector onRestartGame={mockOnRestartGame} />);

      clickModeCard('Rush');

      const restartButton = screen.getByText(/Restart Current Session/);
      fireEvent.click(restartButton);

      expect(mockOnRestartGame).toHaveBeenCalledTimes(1);
    });
  });
});
