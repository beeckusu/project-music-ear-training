import { useState, useEffect } from 'react';
import { MidiManager } from '../services/MidiManager';
import type { MidiConnectionStatus, MidiDeviceInfo } from '../types/midi';

/**
 * Event describing a device connection/disconnection
 */
export interface MidiDeviceEvent {
  type: 'connected' | 'disconnected';
  device: MidiDeviceInfo;
  timestamp: number;
}

/**
 * Return type for useMidiDeviceStatus hook
 */
export interface MidiDeviceStatus {
  /** Current connection status */
  connectionStatus: MidiConnectionStatus;
  /** List of available MIDI input devices */
  availableDevices: MidiDeviceInfo[];
  /** Currently selected device (null if none) */
  selectedDevice: MidiDeviceInfo | null;
  /** Last connection/disconnection event (for notifications) */
  lastEvent: MidiDeviceEvent | null;
  /** Convenience flag: true if status is 'connected' */
  isDeviceConnected: boolean;
  /** Convenience flag: true if any devices are available */
  hasDevices: boolean;
}

/**
 * React hook for monitoring MIDI device connection status
 *
 * Subscribes to MidiManager events and provides real-time state updates
 * for device connections, disconnections, and overall connection status.
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const {
 *     connectionStatus,
 *     availableDevices,
 *     selectedDevice,
 *     lastEvent,
 *     isDeviceConnected,
 *     hasDevices
 *   } = useMidiDeviceStatus();
 *
 *   // Show notification when device connects/disconnects
 *   useEffect(() => {
 *     if (lastEvent?.type === 'disconnected') {
 *       toast.warn(`Device ${lastEvent.device.name} disconnected`);
 *     }
 *   }, [lastEvent]);
 *
 *   return (
 *     <div>
 *       Status: {connectionStatus}
 *       {isDeviceConnected && <span>✓ Connected</span>}
 *     </div>
 *   );
 * }
 * ```
 */
export function useMidiDeviceStatus(): MidiDeviceStatus {
  const midiManager = MidiManager.getInstance();

  const [connectionStatus, setConnectionStatus] = useState<MidiConnectionStatus>(
    midiManager.getConnectionStatus()
  );

  const [availableDevices, setAvailableDevices] = useState<MidiDeviceInfo[]>(
    midiManager.isInitialized() ? midiManager.getAvailableInputs() : []
  );

  const [selectedDevice, setSelectedDevice] = useState<MidiDeviceInfo | null>(
    midiManager.isInitialized() ? midiManager.getSelectedDevice() : null
  );

  const [lastEvent, setLastEvent] = useState<MidiDeviceEvent | null>(null);

  useEffect(() => {
    // Handler for status changes
    const handleStatusChange = (status: MidiConnectionStatus) => {
      setConnectionStatus(status);
      // Update selected device when status changes
      setSelectedDevice(midiManager.getSelectedDevice());
    };

    // Handler for device connection
    const handleDeviceConnected = (device: MidiDeviceInfo) => {
      // Update available devices list
      setAvailableDevices(midiManager.getAvailableInputs());

      // Record event for notifications
      setLastEvent({
        type: 'connected',
        device,
        timestamp: Date.now(),
      });
    };

    // Handler for device disconnection
    const handleDeviceDisconnected = (device: MidiDeviceInfo) => {
      // Update available devices list
      setAvailableDevices(midiManager.getAvailableInputs());

      // Update selected device (may now be null)
      setSelectedDevice(midiManager.getSelectedDevice());

      // Record event for notifications
      setLastEvent({
        type: 'disconnected',
        device,
        timestamp: Date.now(),
      });
    };

    // Subscribe to MidiManager events
    midiManager.on('statusChange', handleStatusChange);
    midiManager.on('deviceConnected', handleDeviceConnected);
    midiManager.on('deviceDisconnected', handleDeviceDisconnected);

    // Cleanup: unsubscribe on unmount
    return () => {
      midiManager.off('statusChange', handleStatusChange);
      midiManager.off('deviceConnected', handleDeviceConnected);
      midiManager.off('deviceDisconnected', handleDeviceDisconnected);
    };
  }, [midiManager]);

  return {
    connectionStatus,
    availableDevices,
    selectedDevice,
    lastEvent,
    isDeviceConnected: connectionStatus === 'connected',
    hasDevices: availableDevices.length > 0,
  };
}
