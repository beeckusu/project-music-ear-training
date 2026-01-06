import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { SettingsProvider, SettingsContext } from './contexts/SettingsContext';
import { useContext, useState } from 'react';
import { TRAINING_MODES } from './constants';

// Simplified integration tests focusing on the App's resetGame behavior
// Full UI integration tests are covered by the SettingsContext unit tests
describe('App - Staged Settings Integration', () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <SettingsProvider>{children}</SettingsProvider>
  );

  const useSettings = () => {
    const context = useContext(SettingsContext);
    if (!context) {
      throw new Error('useSettings must be used within SettingsProvider');
    }
    return context;
  };

  // Simulate the App's resetGame behavior
  const useAppResetGame = () => {
    const { commitPendingSettings, settings } = useSettings();
    const [gameResetCount, setGameResetCount] = useState(0);

    const resetGame = () => {
      commitPendingSettings(); // This is what App.tsx does
      setGameResetCount(prev => prev + 1);
    };

    return { resetGame, gameResetCount, settings };
  };

  it('should commit pending settings when resetGame is called', () => {
    const { result } = renderHook(() => {
      const settingsContext = useSettings();
      const appLogic = useAppResetGame();
      return { ...settingsContext, ...appLogic };
    }, { wrapper });

    // Stage some settings changes
    act(() => {
      result.current.updateModeSettings({ selectedMode: 'survival' });
      result.current.updateTrainingType(TRAINING_MODES.EAR_TRAINING);
    });

    // Verify they're staged but not committed
    expect(result.current.pendingSettings.modes.selectedMode).toBe('survival');
    expect(result.current.settings.modes.selectedMode).not.toBe('survival');

    // Call resetGame (simulating clicking "Restart Current Session")
    act(() => {
      result.current.resetGame();
    });

    // Verify settings were committed
    expect(result.current.settings.modes.selectedMode).toBe('survival');
    expect(result.current.gameResetCount).toBe(1);
  });

  it('should keep current settings unchanged when closing without restart', () => {
    const { result } = renderHook(() => useSettings(), { wrapper });

    const originalMode = result.current.settings.modes.selectedMode;

    // Open settings and make changes
    act(() => {
      result.current.openSettings();
    });

    act(() => {
      result.current.updateModeSettings({ selectedMode: 'survival' });
    });

    // Verify staging worked
    expect(result.current.pendingSettings.modes.selectedMode).toBe('survival');
    expect(result.current.settings.modes.selectedMode).toBe(originalMode);

    // Close settings without committing
    act(() => {
      result.current.closeSettings();
    });

    // Verify current settings unchanged and pending was reverted
    expect(result.current.settings.modes.selectedMode).toBe(originalMode);
    expect(result.current.pendingSettings.modes.selectedMode).toBe(originalMode);
  });

  it('should stage and commit multiple setting changes together', () => {
    const { result } = renderHook(() => {
      const settingsContext = useSettings();
      const appLogic = useAppResetGame();
      return { ...settingsContext, ...appLogic };
    }, { wrapper });

    // Stage multiple changes
    act(() => {
      result.current.updateModeSettings({ selectedMode: 'rush' });
      result.current.updateNoteFilter({ octaveRange: { min: 2, max: 6 } });
      result.current.updateTimingSettings({ autoAdvanceSpeed: 3.5 });
    });

    // Verify all staged
    expect(result.current.pendingSettings.modes.selectedMode).toBe('rush');
    expect(result.current.pendingSettings.noteFilter.octaveRange).toEqual({ min: 2, max: 6 });
    expect(result.current.pendingSettings.timing.autoAdvanceSpeed).toBe(3.5);

    // Verify none committed yet
    expect(result.current.settings.modes.selectedMode).not.toBe('rush');

    // Commit via resetGame
    act(() => {
      result.current.resetGame();
    });

    // Verify all committed together
    expect(result.current.settings.modes.selectedMode).toBe('rush');
    expect(result.current.settings.noteFilter.octaveRange).toEqual({ min: 2, max: 6 });
    expect(result.current.settings.timing.autoAdvanceSpeed).toBe(3.5);
  });
});
