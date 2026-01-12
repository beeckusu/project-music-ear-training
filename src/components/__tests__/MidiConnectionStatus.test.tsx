import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { MidiConnectionStatus } from '../MidiConnectionStatus';
import type { MidiDeviceStatus } from '../../hooks/useMidiDeviceStatus';

// Mock the useMidiDeviceStatus hook
vi.mock('../../hooks/useMidiDeviceStatus', () => ({
  useMidiDeviceStatus: vi.fn(),
}));

// Import after mocking
import { useMidiDeviceStatus } from '../../hooks/useMidiDeviceStatus';

describe('MidiConnectionStatus', () => {
  const mockUseMidiDeviceStatus = vi.mocked(useMidiDeviceStatus);

  const createMockStatus = (overrides?: Partial<MidiDeviceStatus>): MidiDeviceStatus => ({
    connectionStatus: 'disconnected',
    availableDevices: [],
    selectedDevice: null,
    lastEvent: null,
    isDeviceConnected: false,
    hasDevices: false,
    ...overrides,
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Status Display', () => {
    it('should show connected status when device is connected', () => {
      mockUseMidiDeviceStatus.mockReturnValue(
        createMockStatus({
          connectionStatus: 'connected',
          isDeviceConnected: true,
          selectedDevice: {
            id: 'device-1',
            name: 'Test MIDI Device',
            manufacturer: 'Test Manufacturer',
            state: 'connected',
            type: 'input',
          },
        })
      );

      const { container } = render(<MidiConnectionStatus />);

      const icon = container.querySelector('.midi-status-connected');
      expect(icon).toBeInTheDocument();
      expect(icon).toHaveTextContent('●');
    });

    it('should show disconnected status when disconnected but devices available', () => {
      mockUseMidiDeviceStatus.mockReturnValue(
        createMockStatus({
          connectionStatus: 'disconnected',
          hasDevices: true,
        })
      );

      const { container } = render(<MidiConnectionStatus />);

      const icon = container.querySelector('.midi-status-disconnected');
      expect(icon).toBeInTheDocument();
    });

    it('should show no devices status when no devices available', () => {
      mockUseMidiDeviceStatus.mockReturnValue(
        createMockStatus({
          connectionStatus: 'disconnected',
          hasDevices: false,
        })
      );

      const { container } = render(<MidiConnectionStatus />);

      const icon = container.querySelector('.midi-status-no-devices');
      expect(icon).toBeInTheDocument();
    });

    it('should show unsupported status when MIDI not supported', () => {
      mockUseMidiDeviceStatus.mockReturnValue(
        createMockStatus({
          connectionStatus: 'unsupported',
        })
      );

      const { container } = render(<MidiConnectionStatus />);

      const icon = container.querySelector('.midi-status-unsupported');
      expect(icon).toBeInTheDocument();
    });

    it('should show initializing status when MIDI is initializing', () => {
      mockUseMidiDeviceStatus.mockReturnValue(
        createMockStatus({
          connectionStatus: 'initializing',
        })
      );

      const { container } = render(<MidiConnectionStatus />);

      const icon = container.querySelector('.midi-status-initializing');
      expect(icon).toBeInTheDocument();
    });

    it('should show error status when MIDI has an error', () => {
      mockUseMidiDeviceStatus.mockReturnValue(
        createMockStatus({
          connectionStatus: 'error',
        })
      );

      const { container } = render(<MidiConnectionStatus />);

      const icon = container.querySelector('.midi-status-error');
      expect(icon).toBeInTheDocument();
    });
  });

  describe('Text Display', () => {
    it('should show only icon by default (showText=false)', () => {
      mockUseMidiDeviceStatus.mockReturnValue(
        createMockStatus({
          connectionStatus: 'connected',
          selectedDevice: {
            id: 'device-1',
            name: 'Test MIDI Device',
            manufacturer: 'Test Manufacturer',
            state: 'connected',
            type: 'input',
          },
        })
      );

      const { container } = render(<MidiConnectionStatus />);

      const statusText = container.querySelector('.midi-status-text');
      expect(statusText).not.toBeInTheDocument();
    });

    it('should show text when showText=true', () => {
      mockUseMidiDeviceStatus.mockReturnValue(
        createMockStatus({
          connectionStatus: 'connected',
          isDeviceConnected: true,
          selectedDevice: {
            id: 'device-1',
            name: 'Test MIDI Device',
            manufacturer: 'Test Manufacturer',
            state: 'connected',
            type: 'input',
          },
        })
      );

      const { container } = render(<MidiConnectionStatus showText />);

      const statusText = container.querySelector('.midi-status-text');
      expect(statusText).toBeInTheDocument();
      expect(statusText).toHaveTextContent('Connected: Test MIDI Device');
    });

    it('should show device name in text when connected', () => {
      mockUseMidiDeviceStatus.mockReturnValue(
        createMockStatus({
          connectionStatus: 'connected',
          isDeviceConnected: true,
          selectedDevice: {
            id: 'device-1',
            name: 'My Keyboard',
            manufacturer: 'Yamaha',
            state: 'connected',
            type: 'input',
          },
        })
      );

      render(<MidiConnectionStatus showText />);

      expect(screen.getByText(/Connected: My Keyboard/)).toBeInTheDocument();
    });

    it('should show "Disconnected" text when disconnected with devices available', () => {
      mockUseMidiDeviceStatus.mockReturnValue(
        createMockStatus({
          connectionStatus: 'disconnected',
          hasDevices: true,
        })
      );

      render(<MidiConnectionStatus showText />);

      expect(screen.getByText('Disconnected')).toBeInTheDocument();
    });

    it('should show "No Devices" text when no devices available', () => {
      mockUseMidiDeviceStatus.mockReturnValue(
        createMockStatus({
          connectionStatus: 'disconnected',
          hasDevices: false,
        })
      );

      render(<MidiConnectionStatus showText />);

      expect(screen.getByText('No Devices')).toBeInTheDocument();
    });

    it('should show "Not Supported" text when MIDI not supported', () => {
      mockUseMidiDeviceStatus.mockReturnValue(
        createMockStatus({
          connectionStatus: 'unsupported',
        })
      );

      render(<MidiConnectionStatus showText />);

      expect(screen.getByText('Not Supported')).toBeInTheDocument();
    });

    it('should show "Initializing..." text when initializing', () => {
      mockUseMidiDeviceStatus.mockReturnValue(
        createMockStatus({
          connectionStatus: 'initializing',
        })
      );

      render(<MidiConnectionStatus showText />);

      expect(screen.getByText('Initializing...')).toBeInTheDocument();
    });
  });

  describe('Tooltips', () => {
    it('should have tooltip for connected status', () => {
      mockUseMidiDeviceStatus.mockReturnValue(
        createMockStatus({
          connectionStatus: 'connected',
          selectedDevice: {
            id: 'device-1',
            name: 'Test Device',
            manufacturer: 'Test',
            state: 'connected',
            type: 'input',
          },
        })
      );

      const { container } = render(<MidiConnectionStatus />);

      const statusContainer = container.querySelector('.midi-connection-status');
      expect(statusContainer).toHaveAttribute('title', 'MIDI connected to Test Device');
    });

    it('should have tooltip for disconnected status with devices', () => {
      mockUseMidiDeviceStatus.mockReturnValue(
        createMockStatus({
          connectionStatus: 'disconnected',
          hasDevices: true,
        })
      );

      const { container } = render(<MidiConnectionStatus />);

      const statusContainer = container.querySelector('.midi-connection-status');
      expect(statusContainer).toHaveAttribute('title', 'MIDI devices available but not connected');
    });

    it('should have tooltip for no devices status', () => {
      mockUseMidiDeviceStatus.mockReturnValue(
        createMockStatus({
          connectionStatus: 'disconnected',
          hasDevices: false,
        })
      );

      const { container } = render(<MidiConnectionStatus />);

      const statusContainer = container.querySelector('.midi-connection-status');
      expect(statusContainer).toHaveAttribute('title', 'No MIDI devices detected');
    });

    it('should have tooltip for unsupported browser', () => {
      mockUseMidiDeviceStatus.mockReturnValue(
        createMockStatus({
          connectionStatus: 'unsupported',
        })
      );

      const { container } = render(<MidiConnectionStatus />);

      const statusContainer = container.querySelector('.midi-connection-status');
      expect(statusContainer).toHaveAttribute('title', 'Web MIDI API not supported in this browser');
    });
  });

  describe('CSS Classes', () => {
    it('should apply base class', () => {
      mockUseMidiDeviceStatus.mockReturnValue(createMockStatus());

      const { container } = render(<MidiConnectionStatus />);

      const statusContainer = container.querySelector('.midi-connection-status');
      expect(statusContainer).toBeInTheDocument();
    });

    it('should apply custom className when provided', () => {
      mockUseMidiDeviceStatus.mockReturnValue(createMockStatus());

      const { container } = render(<MidiConnectionStatus className="custom-class" />);

      const statusContainer = container.querySelector('.midi-connection-status');
      expect(statusContainer).toHaveClass('custom-class');
    });

    it('should maintain base class when custom className is provided', () => {
      mockUseMidiDeviceStatus.mockReturnValue(createMockStatus());

      const { container } = render(<MidiConnectionStatus className="custom-class" />);

      const statusContainer = container.querySelector('.midi-connection-status');
      expect(statusContainer).toHaveClass('midi-connection-status');
      expect(statusContainer).toHaveClass('custom-class');
    });
  });

  describe('Edge Cases', () => {
    it('should handle null selected device gracefully', () => {
      mockUseMidiDeviceStatus.mockReturnValue(
        createMockStatus({
          connectionStatus: 'connected',
          selectedDevice: null,
        })
      );

      render(<MidiConnectionStatus showText />);

      expect(screen.getByText(/Connected: Unknown/)).toBeInTheDocument();
    });

    it('should handle device without manufacturer', () => {
      mockUseMidiDeviceStatus.mockReturnValue(
        createMockStatus({
          connectionStatus: 'connected',
          selectedDevice: {
            id: 'device-1',
            name: 'Test Device',
            manufacturer: '',
            state: 'connected',
            type: 'input',
          },
        })
      );

      const { container } = render(<MidiConnectionStatus />);

      const statusContainer = container.querySelector('.midi-connection-status');
      expect(statusContainer).toHaveAttribute('title', 'MIDI connected to Test Device');
    });
  });
});
