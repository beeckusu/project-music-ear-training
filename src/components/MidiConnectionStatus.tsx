import React from 'react';
import { useMidiDeviceStatus } from '../hooks/useMidiDeviceStatus';
import './MidiConnectionStatus.css';

/**
 * Props for MidiConnectionStatus component
 */
export interface MidiConnectionStatusProps {
  /** Show full status text alongside icon (default: false) */
  showText?: boolean;
  /** CSS class name for custom styling */
  className?: string;
}

/**
 * Visual indicator for MIDI device connection status
 *
 * Displays a colored status indicator that shows the current MIDI connection state:
 * - Green: Connected to a device
 * - Yellow: Disconnected but devices are available
 * - Red: No devices available
 * - Gray: MIDI not supported by browser
 *
 * @example
 * ```tsx
 * // Simple icon indicator
 * <MidiConnectionStatus />
 *
 * // With status text
 * <MidiConnectionStatus showText />
 * ```
 */
export function MidiConnectionStatus({
  showText = false,
  className = '',
}: MidiConnectionStatusProps): React.ReactElement {
  const {
    connectionStatus,
    isDeviceConnected,
    hasDevices,
    selectedDevice,
  } = useMidiDeviceStatus();

  // Determine status display properties
  const getStatusInfo = () => {
    switch (connectionStatus) {
      case 'connected':
        return {
          className: 'midi-status-connected',
          icon: '●',
          text: `Connected: ${selectedDevice?.name || 'Unknown'}`,
          title: `MIDI connected to ${selectedDevice?.name || 'Unknown device'}`,
        };

      case 'disconnected':
        if (hasDevices) {
          return {
            className: 'midi-status-disconnected',
            icon: '●',
            text: 'Disconnected',
            title: 'MIDI devices available but not connected',
          };
        } else {
          return {
            className: 'midi-status-no-devices',
            icon: '●',
            text: 'No Devices',
            title: 'No MIDI devices detected',
          };
        }

      case 'unsupported':
        return {
          className: 'midi-status-unsupported',
          icon: '●',
          text: 'Not Supported',
          title: 'Web MIDI API not supported in this browser',
        };

      case 'initializing':
        return {
          className: 'midi-status-initializing',
          icon: '●',
          text: 'Initializing...',
          title: 'Initializing MIDI connection',
        };

      case 'error':
        return {
          className: 'midi-status-error',
          icon: '●',
          text: 'Error',
          title: 'MIDI connection error',
        };

      default:
        return {
          className: 'midi-status-disconnected',
          icon: '●',
          text: 'Unknown',
          title: 'MIDI status unknown',
        };
    }
  };

  const statusInfo = getStatusInfo();

  return (
    <div
      className={`midi-connection-status ${className}`}
      title={statusInfo.title}
    >
      <span className={`midi-status-icon ${statusInfo.className}`}>
        {statusInfo.icon}
      </span>
      {showText && (
        <span className="midi-status-text">{statusInfo.text}</span>
      )}
    </div>
  );
}
