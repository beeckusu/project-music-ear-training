import React, { useEffect, useState } from 'react';
import { useMidiDeviceStatus } from '../hooks/useMidiDeviceStatus';
import './MidiDisconnectionHandler.css';

/**
 * Props for MidiDisconnectionHandler
 */
export interface MidiDisconnectionHandlerProps {
  /** Whether a practice session is currently active */
  isSessionActive: boolean;
  /** Callback to pause the practice session */
  onPause: () => void;
  /** Callback to resume the practice session */
  onResume: () => void;
  /** Currently selected MIDI device ID (from settings) */
  selectedDeviceId: string | undefined;
}

/**
 * MidiDisconnectionHandler
 *
 * Monitors MIDI device connection status during practice sessions and handles
 * disconnection events gracefully. When a selected MIDI device disconnects
 * during an active practice session, this component:
 *
 * 1. Automatically pauses the session
 * 2. Displays a modal notification
 * 3. Offers options to wait for reconnection or continue with on-screen keyboard
 * 4. Auto-resumes when device reconnects (if waiting)
 *
 * @example
 * ```tsx
 * <MidiDisconnectionHandler
 *   isSessionActive={isPlaying}
 *   onPause={() => setIsPaused(true)}
 *   onResume={() => setIsPaused(false)}
 *   selectedDeviceId={settings.audio.midiDeviceId}
 * />
 * ```
 */
export function MidiDisconnectionHandler({
  isSessionActive,
  onPause,
  onResume,
  selectedDeviceId,
}: MidiDisconnectionHandlerProps): React.ReactElement | null {
  const { lastEvent, selectedDevice, isDeviceConnected } = useMidiDeviceStatus();

  // Track whether we're waiting for reconnection
  const [isWaitingForReconnection, setIsWaitingForReconnection] = useState(false);

  // Track whether we've shown the disconnection modal
  const [showDisconnectionModal, setShowDisconnectionModal] = useState(false);

  // Store the disconnected device name for display
  const [disconnectedDeviceName, setDisconnectedDeviceName] = useState<string>('');

  // Handle device disconnection during active session
  useEffect(() => {
    // Only handle disconnection if:
    // 1. A session is active
    // 2. A device was selected
    // 3. The disconnection event is for the selected device
    if (
      isSessionActive &&
      selectedDeviceId &&
      lastEvent?.type === 'disconnected' &&
      lastEvent.device.id === selectedDeviceId
    ) {
      // Pause the session
      onPause();

      // Show modal
      setShowDisconnectionModal(true);
      setDisconnectedDeviceName(lastEvent.device.name);
      setIsWaitingForReconnection(true);
    }
  }, [isSessionActive, selectedDeviceId, lastEvent, onPause]);

  // Handle device reconnection
  useEffect(() => {
    // Only handle reconnection if:
    // 1. We're waiting for reconnection
    // 2. The device reconnected is the selected device
    // 3. Device is now connected
    if (
      isWaitingForReconnection &&
      selectedDeviceId &&
      lastEvent?.type === 'connected' &&
      lastEvent.device.id === selectedDeviceId &&
      isDeviceConnected
    ) {
      // Auto-resume session
      handleResume();
    }
  }, [isWaitingForReconnection, selectedDeviceId, lastEvent, isDeviceConnected]);

  // Handle "Continue with On-Screen Keyboard" button
  const handleContinueWithKeyboard = () => {
    setShowDisconnectionModal(false);
    setIsWaitingForReconnection(false);
    // Resume the session - user will use on-screen piano
    onResume();
  };

  // Handle "Wait for Reconnection" button (default behavior)
  const handleWaitForReconnection = () => {
    // Just close the modal, keep paused, keep waiting
    setShowDisconnectionModal(false);
    // isWaitingForReconnection remains true
  };

  // Handle auto-resume when device reconnects
  const handleResume = () => {
    setShowDisconnectionModal(false);
    setIsWaitingForReconnection(false);
    onResume();
  };

  // Handle manual cancel waiting
  const handleCancelWaiting = () => {
    setShowDisconnectionModal(false);
    setIsWaitingForReconnection(false);
    // Leave session paused
  };

  // Don't render anything if modal isn't shown
  if (!showDisconnectionModal) {
    return null;
  }

  return (
    <div className="midi-disconnection-backdrop">
      <div className="midi-disconnection-modal">
        <div className="midi-disconnection-header">
          <span className="midi-disconnection-icon">⚠️</span>
          <h2>MIDI Device Disconnected</h2>
        </div>

        <div className="midi-disconnection-body">
          <p>
            Your MIDI device <strong>{disconnectedDeviceName}</strong> has been
            disconnected.
          </p>
          <p>
            The practice session has been paused. You can:
          </p>
        </div>

        <div className="midi-disconnection-actions">
          <button
            className="midi-disconnection-button primary"
            onClick={handleWaitForReconnection}
          >
            Wait for Reconnection
          </button>
          <button
            className="midi-disconnection-button secondary"
            onClick={handleContinueWithKeyboard}
          >
            Continue with On-Screen Keyboard
          </button>
          <button
            className="midi-disconnection-button tertiary"
            onClick={handleCancelWaiting}
          >
            Stay Paused
          </button>
        </div>

        {isWaitingForReconnection && !showDisconnectionModal && (
          <div className="midi-reconnection-waiting">
            <p>Waiting for device to reconnect...</p>
            <div className="midi-reconnection-spinner"></div>
          </div>
        )}
      </div>
    </div>
  );
}
