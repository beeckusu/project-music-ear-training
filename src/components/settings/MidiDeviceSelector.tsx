import React, { useEffect, useState } from 'react';
import { MidiManager } from '../../services/MidiManager';
import type {
  MidiDeviceInfo,
  MidiConnectionStatus,
  MidiError,
} from '../../types/midi';

interface MidiDeviceSelectorProps {
  selectedDeviceId: string | undefined;
  onDeviceChange: (deviceId: string | undefined) => void;
}

/**
 * MidiDeviceSelector - Component for selecting MIDI input devices
 *
 * Features:
 * - Displays dropdown of available MIDI input devices
 * - Shows connection status (connected/disconnected)
 * - Handles device plug/unplug events
 * - Displays appropriate messages for edge cases:
 *   - No devices available
 *   - Browser doesn't support Web MIDI
 *   - User denied MIDI permissions
 *
 * @param selectedDeviceId - Currently selected device ID (from settings)
 * @param onDeviceChange - Callback when user selects a different device
 */
export const MidiDeviceSelector: React.FC<MidiDeviceSelectorProps> = ({
  selectedDeviceId,
  onDeviceChange,
}) => {
  // State
  const [devices, setDevices] = useState<MidiDeviceInfo[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<MidiConnectionStatus>('disconnected');
  const [isInitializing, setIsInitializing] = useState(false);
  const [error, setError] = useState<MidiError | null>(null);

  // Get MidiManager singleton instance
  const midiManager = MidiManager.getInstance();

  // Initialize MIDI and subscribe to events
  useEffect(() => {
    const initializeMidi = async () => {
      // Check browser support
      if (!midiManager.isSupported()) {
        setConnectionStatus('unsupported');
        return;
      }

      // If already initialized, just update state
      if (midiManager.isInitialized()) {
        setDevices(midiManager.getAvailableInputs());
        setConnectionStatus(midiManager.getConnectionStatus());
        return;
      }

      // Initialize MIDI system
      setIsInitializing(true);
      try {
        await midiManager.initialize();
        setDevices(midiManager.getAvailableInputs());
        setConnectionStatus(midiManager.getConnectionStatus());
      } catch (err) {
        setError(err as MidiError);
      } finally {
        setIsInitializing(false);
      }
    };

    initializeMidi();

    // Event handlers
    const handleDeviceConnected = (device: MidiDeviceInfo) => {
      // Update device list when a device is plugged in
      setDevices(midiManager.getAvailableInputs());
    };

    const handleDeviceDisconnected = (device: MidiDeviceInfo) => {
      // Update device list when a device is unplugged
      setDevices(midiManager.getAvailableInputs());

      // If the disconnected device was selected, clear selection
      if (device.id === selectedDeviceId) {
        onDeviceChange(undefined);
      }
    };

    const handleStatusChange = (status: MidiConnectionStatus) => {
      setConnectionStatus(status);
    };

    const handleError = (err: MidiError) => {
      setError(err);
    };

    // Subscribe to events
    midiManager.on('deviceConnected', handleDeviceConnected);
    midiManager.on('deviceDisconnected', handleDeviceDisconnected);
    midiManager.on('statusChange', handleStatusChange);
    midiManager.on('error', handleError);

    // Cleanup: unsubscribe from events on unmount
    return () => {
      midiManager.off('deviceConnected', handleDeviceConnected);
      midiManager.off('deviceDisconnected', handleDeviceDisconnected);
      midiManager.off('statusChange', handleStatusChange);
      midiManager.off('error', handleError);
    };
  }, [midiManager, selectedDeviceId, onDeviceChange]);

  // Handle device selection from dropdown
  const handleDeviceSelect = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const deviceId = event.target.value || undefined;

    // Tell MidiManager to connect to the selected device
    if (deviceId) {
      midiManager.selectInputDevice(deviceId);
    }

    // Update settings with new device ID
    onDeviceChange(deviceId);
  };

  // Render: Browser doesn't support Web MIDI
  if (connectionStatus === 'unsupported') {
    return (
      <div className="midi-selector-message">
        <span className="error-icon">⚠️</span>
        <span>Web MIDI is not supported in this browser. Please use Chrome or Edge.</span>
      </div>
    );
  }

  // Render: Initializing MIDI
  if (isInitializing) {
    return (
      <div className="midi-selector-message">
        <span>Detecting MIDI devices...</span>
      </div>
    );
  }

  // Render: Permission denied error
  if (error && error.type === 'permission_denied') {
    return (
      <div className="midi-selector-message">
        <span className="error-icon">⚠️</span>
        <span>MIDI access denied. Please grant permission in browser settings.</span>
      </div>
    );
  }

  // Render: Other errors
  if (error && connectionStatus === 'error') {
    return (
      <div className="midi-selector-message">
        <span className="error-icon">⚠️</span>
        <span>Error initializing MIDI: {error.message}</span>
      </div>
    );
  }

  // Render: No devices available
  if (devices.length === 0) {
    return (
      <div className="midi-selector-message">
        <span className="info-icon">ℹ️</span>
        <span>No MIDI devices found. Connect a MIDI keyboard to enable input.</span>
      </div>
    );
  }

  // Render: Device selector with connection status
  return (
    <div className="midi-device-selector">
      <select
        value={selectedDeviceId || ''}
        onChange={handleDeviceSelect}
        className="midi-device-dropdown"
      >
        <option value="">No device selected</option>
        {devices.map(device => (
          <option key={device.id} value={device.id}>
            {device.name}
            {device.manufacturer && ` (${device.manufacturer})`}
          </option>
        ))}
      </select>

      {/* Connection status indicator */}
      {selectedDeviceId && connectionStatus === 'connected' && (
        <span className="connection-status connected">
          ✓ Connected
        </span>
      )}
      {selectedDeviceId && connectionStatus === 'disconnected' && (
        <span className="connection-status disconnected">
          ○ Disconnected
        </span>
      )}
    </div>
  );
};
