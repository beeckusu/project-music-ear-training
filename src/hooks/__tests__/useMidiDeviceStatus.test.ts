import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useMidiDeviceStatus } from '../useMidiDeviceStatus';
import { MidiManager } from '../../services/MidiManager';
import type { MidiDeviceInfo, MidiConnectionStatus } from '../../types/midi';

// Mock the MidiManager
vi.mock('../../services/MidiManager');

describe('useMidiDeviceStatus', () => {
  let mockMidiManager: {
    getInstance: () => any;
    getConnectionStatus: vi.Mock;
    isInitialized: vi.Mock;
    getAvailableInputs: vi.Mock;
    getSelectedDevice: vi.Mock;
    on: vi.Mock;
    off: vi.Mock;
  };

  const mockDevice1: MidiDeviceInfo = {
    id: 'device-1',
    name: 'Test Device 1',
    manufacturer: 'Test Manufacturer',
    state: 'connected',
    type: 'input',
  };

  const mockDevice2: MidiDeviceInfo = {
    id: 'device-2',
    name: 'Test Device 2',
    manufacturer: 'Test Manufacturer',
    state: 'connected',
    type: 'input',
  };

  beforeEach(() => {
    // Create mock methods
    const mockMethods = {
      getConnectionStatus: vi.fn(() => 'disconnected' as MidiConnectionStatus),
      isInitialized: vi.fn(() => true),
      getAvailableInputs: vi.fn(() => []),
      getSelectedDevice: vi.fn(() => null),
      on: vi.fn(),
      off: vi.fn(),
    };

    // Setup the mock
    mockMidiManager = {
      getInstance: vi.fn(() => mockMethods),
      ...mockMethods,
    };

    // Mock MidiManager.getInstance()
    vi.mocked(MidiManager.getInstance).mockReturnValue(mockMethods as any);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize with default values when MIDI is not initialized', () => {
      const mockInstance = MidiManager.getInstance();
      vi.mocked(mockInstance.isInitialized).mockReturnValue(false);

      const { result } = renderHook(() => useMidiDeviceStatus());

      expect(result.current.connectionStatus).toBe('disconnected');
      expect(result.current.availableDevices).toEqual([]);
      expect(result.current.selectedDevice).toBe(null);
      expect(result.current.lastEvent).toBe(null);
      expect(result.current.isDeviceConnected).toBe(false);
      expect(result.current.hasDevices).toBe(false);
    });

    it('should initialize with current MIDI state when initialized', () => {
      const mockInstance = MidiManager.getInstance();
      vi.mocked(mockInstance.isInitialized).mockReturnValue(true);
      vi.mocked(mockInstance.getConnectionStatus).mockReturnValue('connected');
      vi.mocked(mockInstance.getAvailableInputs).mockReturnValue([mockDevice1]);
      vi.mocked(mockInstance.getSelectedDevice).mockReturnValue(mockDevice1);

      const { result } = renderHook(() => useMidiDeviceStatus());

      expect(result.current.connectionStatus).toBe('connected');
      expect(result.current.availableDevices).toEqual([mockDevice1]);
      expect(result.current.selectedDevice).toEqual(mockDevice1);
      expect(result.current.isDeviceConnected).toBe(true);
      expect(result.current.hasDevices).toBe(true);
    });

    it('should subscribe to MidiManager events on mount', () => {
      const mockInstance = MidiManager.getInstance();
      renderHook(() => useMidiDeviceStatus());

      expect(mockInstance.on).toHaveBeenCalledWith('statusChange', expect.any(Function));
      expect(mockInstance.on).toHaveBeenCalledWith('deviceConnected', expect.any(Function));
      expect(mockInstance.on).toHaveBeenCalledWith('deviceDisconnected', expect.any(Function));
    });

    it('should unsubscribe from MidiManager events on unmount', () => {
      const mockInstance = MidiManager.getInstance();
      const { unmount } = renderHook(() => useMidiDeviceStatus());

      unmount();

      expect(mockInstance.off).toHaveBeenCalledWith('statusChange', expect.any(Function));
      expect(mockInstance.off).toHaveBeenCalledWith('deviceConnected', expect.any(Function));
      expect(mockInstance.off).toHaveBeenCalledWith('deviceDisconnected', expect.any(Function));
    });
  });

  describe('Event Handling', () => {
    it('should update connection status when statusChange event fires', () => {
      const mockInstance = MidiManager.getInstance();
      let statusChangeHandler: ((status: MidiConnectionStatus) => void) | undefined;

      vi.mocked(mockInstance.on).mockImplementation((event, handler) => {
        if (event === 'statusChange') {
          statusChangeHandler = handler as (status: MidiConnectionStatus) => void;
        }
      });

      const { result } = renderHook(() => useMidiDeviceStatus());

      // Simulate status change
      act(() => {
        statusChangeHandler?.('connected');
      });

      expect(result.current.connectionStatus).toBe('connected');
      expect(result.current.isDeviceConnected).toBe(true);
    });

    it('should update device list and record event when device connects', () => {
      const mockInstance = MidiManager.getInstance();
      let deviceConnectedHandler: ((device: MidiDeviceInfo) => void) | undefined;

      vi.mocked(mockInstance.on).mockImplementation((event, handler) => {
        if (event === 'deviceConnected') {
          deviceConnectedHandler = handler as (device: MidiDeviceInfo) => void;
        }
      });

      vi.mocked(mockInstance.getAvailableInputs).mockReturnValue([mockDevice1]);

      const { result } = renderHook(() => useMidiDeviceStatus());

      // Simulate device connection
      act(() => {
        deviceConnectedHandler?.(mockDevice1);
      });

      expect(result.current.availableDevices).toEqual([mockDevice1]);
      expect(result.current.hasDevices).toBe(true);
      expect(result.current.lastEvent).toEqual({
        type: 'connected',
        device: mockDevice1,
        timestamp: expect.any(Number),
      });
    });

    it('should update device list and record event when device disconnects', () => {
      const mockInstance = MidiManager.getInstance();
      let deviceDisconnectedHandler: ((device: MidiDeviceInfo) => void) | undefined;

      vi.mocked(mockInstance.on).mockImplementation((event, handler) => {
        if (event === 'deviceDisconnected') {
          deviceDisconnectedHandler = handler as (device: MidiDeviceInfo) => void;
        }
      });

      // Start with a device
      vi.mocked(mockInstance.getAvailableInputs).mockReturnValue([mockDevice1]);
      const { result } = renderHook(() => useMidiDeviceStatus());

      // Simulate device disconnection
      vi.mocked(mockInstance.getAvailableInputs).mockReturnValue([]);
      vi.mocked(mockInstance.getSelectedDevice).mockReturnValue(null);

      act(() => {
        deviceDisconnectedHandler?.(mockDevice1);
      });

      expect(result.current.availableDevices).toEqual([]);
      expect(result.current.hasDevices).toBe(false);
      expect(result.current.selectedDevice).toBe(null);
      expect(result.current.lastEvent).toEqual({
        type: 'disconnected',
        device: mockDevice1,
        timestamp: expect.any(Number),
      });
    });

    it('should handle multiple device connections', () => {
      const mockInstance = MidiManager.getInstance();
      let deviceConnectedHandler: ((device: MidiDeviceInfo) => void) | undefined;

      vi.mocked(mockInstance.on).mockImplementation((event, handler) => {
        if (event === 'deviceConnected') {
          deviceConnectedHandler = handler as (device: MidiDeviceInfo) => void;
        }
      });

      const { result } = renderHook(() => useMidiDeviceStatus());

      // Connect first device
      vi.mocked(mockInstance.getAvailableInputs).mockReturnValue([mockDevice1]);
      act(() => {
        deviceConnectedHandler?.(mockDevice1);
      });

      expect(result.current.availableDevices).toEqual([mockDevice1]);

      // Connect second device
      vi.mocked(mockInstance.getAvailableInputs).mockReturnValue([mockDevice1, mockDevice2]);
      act(() => {
        deviceConnectedHandler?.(mockDevice2);
      });

      expect(result.current.availableDevices).toEqual([mockDevice1, mockDevice2]);
      expect(result.current.lastEvent?.device).toEqual(mockDevice2);
    });
  });

  describe('Derived State', () => {
    it('should correctly calculate isDeviceConnected', () => {
      const mockInstance = MidiManager.getInstance();
      vi.mocked(mockInstance.getConnectionStatus).mockReturnValue('disconnected');

      let statusChangeHandler: ((status: MidiConnectionStatus) => void) | undefined;
      vi.mocked(mockInstance.on).mockImplementation((event, handler) => {
        if (event === 'statusChange') {
          statusChangeHandler = handler as (status: MidiConnectionStatus) => void;
        }
      });

      const { result } = renderHook(() => useMidiDeviceStatus());
      expect(result.current.isDeviceConnected).toBe(false);

      // Update to connected
      act(() => {
        statusChangeHandler?.('connected');
      });

      expect(result.current.isDeviceConnected).toBe(true);
    });

    it('should correctly calculate hasDevices', () => {
      const mockInstance = MidiManager.getInstance();
      vi.mocked(mockInstance.getAvailableInputs).mockReturnValue([]);

      let deviceConnectedHandler: ((device: MidiDeviceInfo) => void) | undefined;
      vi.mocked(mockInstance.on).mockImplementation((event, handler) => {
        if (event === 'deviceConnected') {
          deviceConnectedHandler = handler as (device: MidiDeviceInfo) => void;
        }
      });

      const { result } = renderHook(() => useMidiDeviceStatus());
      expect(result.current.hasDevices).toBe(false);

      // Add a device
      vi.mocked(mockInstance.getAvailableInputs).mockReturnValue([mockDevice1]);

      act(() => {
        deviceConnectedHandler?.(mockDevice1);
      });

      expect(result.current.hasDevices).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle rapid connect/disconnect events', () => {
      const mockInstance = MidiManager.getInstance();
      let deviceConnectedHandler: ((device: MidiDeviceInfo) => void) | undefined;
      let deviceDisconnectedHandler: ((device: MidiDeviceInfo) => void) | undefined;

      vi.mocked(mockInstance.on).mockImplementation((event, handler) => {
        if (event === 'deviceConnected') {
          deviceConnectedHandler = handler as (device: MidiDeviceInfo) => void;
        }
        if (event === 'deviceDisconnected') {
          deviceDisconnectedHandler = handler as (device: MidiDeviceInfo) => void;
        }
      });

      const { result } = renderHook(() => useMidiDeviceStatus());

      // Rapid connect/disconnect
      act(() => {
        vi.mocked(mockInstance.getAvailableInputs).mockReturnValue([mockDevice1]);
        deviceConnectedHandler?.(mockDevice1);

        vi.mocked(mockInstance.getAvailableInputs).mockReturnValue([]);
        deviceDisconnectedHandler?.(mockDevice1);

        vi.mocked(mockInstance.getAvailableInputs).mockReturnValue([mockDevice1]);
        deviceConnectedHandler?.(mockDevice1);
      });

      expect(result.current.availableDevices).toEqual([mockDevice1]);
      expect(result.current.lastEvent?.type).toBe('connected');
    });

    it('should update selected device when status changes', () => {
      const mockInstance = MidiManager.getInstance();
      let statusChangeHandler: ((status: MidiConnectionStatus) => void) | undefined;

      vi.mocked(mockInstance.on).mockImplementation((event, handler) => {
        if (event === 'statusChange') {
          statusChangeHandler = handler as (status: MidiConnectionStatus) => void;
        }
      });

      vi.mocked(mockInstance.getSelectedDevice).mockReturnValue(null);

      const { result } = renderHook(() => useMidiDeviceStatus());
      expect(result.current.selectedDevice).toBe(null);

      // Simulate device selection
      vi.mocked(mockInstance.getSelectedDevice).mockReturnValue(mockDevice1);
      act(() => {
        statusChangeHandler?.('connected');
      });

      expect(result.current.selectedDevice).toEqual(mockDevice1);
    });
  });
});
