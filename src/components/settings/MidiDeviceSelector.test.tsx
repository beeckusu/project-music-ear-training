import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MidiDeviceSelector } from './MidiDeviceSelector';
import { MidiManager } from '../../services/MidiManager';
import type { MidiDeviceInfo, MidiConnectionStatus, MidiError } from '../../types/midi';

// Mock MidiManager
vi.mock('../../services/MidiManager', () => {
  const mockEventHandlers = new Map<string, Function[]>();

  const mockMidiManager = {
    isSupported: vi.fn(() => true),
    isInitialized: vi.fn(() => false),
    initialize: vi.fn(() => Promise.resolve()),
    getAvailableInputs: vi.fn(() => []),
    getConnectionStatus: vi.fn(() => 'disconnected' as MidiConnectionStatus),
    selectInputDevice: vi.fn(),
    on: vi.fn((event: string, handler: Function) => {
      if (!mockEventHandlers.has(event)) {
        mockEventHandlers.set(event, []);
      }
      mockEventHandlers.get(event)!.push(handler);
    }),
    off: vi.fn((event: string, handler: Function) => {
      const handlers = mockEventHandlers.get(event);
      if (handlers) {
        const index = handlers.indexOf(handler);
        if (index > -1) {
          handlers.splice(index, 1);
        }
      }
    }),
    // Helper to emit events for testing
    _emit: (event: string, data: any) => {
      const handlers = mockEventHandlers.get(event);
      if (handlers) {
        handlers.forEach(handler => handler(data));
      }
    },
    _clearHandlers: () => {
      mockEventHandlers.clear();
    }
  };

  return {
    MidiManager: {
      getInstance: vi.fn(() => mockMidiManager)
    },
    _getMockManager: () => mockMidiManager
  };
});

// Helper to get mock manager
const getMockManager = () => {
  const manager = MidiManager.getInstance() as any;
  return manager;
};

describe('MidiDeviceSelector', () => {
  const mockOnDeviceChange = vi.fn();
  const mockDevices: MidiDeviceInfo[] = [
    {
      id: 'device1',
      name: 'Test MIDI Keyboard',
      manufacturer: 'TestCo',
      state: 'connected',
      type: 'input'
    },
    {
      id: 'device2',
      name: 'Another MIDI Device',
      manufacturer: 'AnotherCo',
      state: 'connected',
      type: 'input'
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    const mockManager = getMockManager();
    mockManager._clearHandlers();

    // Reset default mock implementations
    mockManager.isSupported.mockReturnValue(true);
    mockManager.isInitialized.mockReturnValue(false);
    mockManager.initialize.mockResolvedValue(undefined);
    mockManager.getAvailableInputs.mockReturnValue([]);
    mockManager.getConnectionStatus.mockReturnValue('disconnected');
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('Browser Support', () => {
    it('shows unsupported message when Web MIDI is not supported', () => {
      const mockManager = getMockManager();
      mockManager.isSupported.mockReturnValue(false);

      render(
        <MidiDeviceSelector
          selectedDeviceId={undefined}
          onDeviceChange={mockOnDeviceChange}
        />
      );

      expect(screen.getByText(/Web MIDI is not supported/i)).toBeInTheDocument();
      expect(screen.getByText(/Please use Chrome or Edge/i)).toBeInTheDocument();
    });

    it('does not attempt initialization when Web MIDI is unsupported', () => {
      const mockManager = getMockManager();
      mockManager.isSupported.mockReturnValue(false);

      render(
        <MidiDeviceSelector
          selectedDeviceId={undefined}
          onDeviceChange={mockOnDeviceChange}
        />
      );

      expect(mockManager.initialize).not.toHaveBeenCalled();
    });
  });

  describe('Initialization', () => {
    it('shows initializing message while MIDI is being initialized', async () => {
      const mockManager = getMockManager();
      mockManager.initialize.mockImplementation(() => new Promise(() => {})); // Never resolves

      render(
        <MidiDeviceSelector
          selectedDeviceId={undefined}
          onDeviceChange={mockOnDeviceChange}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/Detecting MIDI devices/i)).toBeInTheDocument();
      });
    });

    it('initializes MIDI on mount when not already initialized', async () => {
      const mockManager = getMockManager();

      render(
        <MidiDeviceSelector
          selectedDeviceId={undefined}
          onDeviceChange={mockOnDeviceChange}
        />
      );

      await waitFor(() => {
        expect(mockManager.initialize).toHaveBeenCalled();
      });
    });

    it('does not initialize MIDI if already initialized', async () => {
      const mockManager = getMockManager();
      mockManager.isInitialized.mockReturnValue(true);
      mockManager.getAvailableInputs.mockReturnValue(mockDevices);

      render(
        <MidiDeviceSelector
          selectedDeviceId={undefined}
          onDeviceChange={mockOnDeviceChange}
        />
      );

      await waitFor(() => {
        expect(mockManager.initialize).not.toHaveBeenCalled();
      });
    });
  });

  describe('Error Handling', () => {
    it('shows permission denied message when user denies MIDI access', async () => {
      const mockManager = getMockManager();
      const permissionError: MidiError = {
        type: 'permission_denied',
        message: 'User denied MIDI access'
      };
      mockManager.initialize.mockRejectedValue(permissionError);

      render(
        <MidiDeviceSelector
          selectedDeviceId={undefined}
          onDeviceChange={mockOnDeviceChange}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/MIDI access denied/i)).toBeInTheDocument();
        expect(screen.getByText(/Please grant permission/i)).toBeInTheDocument();
      });
    });

    it('shows error message for other initialization errors', async () => {
      const mockManager = getMockManager();
      const error: MidiError = {
        type: 'initialization_error',
        message: 'Failed to initialize MIDI'
      };
      mockManager.initialize.mockRejectedValue(error);

      render(
        <MidiDeviceSelector
          selectedDeviceId={undefined}
          onDeviceChange={mockOnDeviceChange}
        />
      );

      // Wait for initialization to fail
      await waitFor(() => {
        expect(mockManager.initialize).toHaveBeenCalled();
      });

      // Set connection status to error after initialization fails
      mockManager.getConnectionStatus.mockReturnValue('error');

      // Force rerender or emit statusChange event to update UI
      act(() => {
        mockManager._emit('statusChange', 'error');
      });

      await waitFor(() => {
        expect(screen.getByText(/Error initializing MIDI/i)).toBeInTheDocument();
        expect(screen.getByText(/Failed to initialize MIDI/i)).toBeInTheDocument();
      });
    });
  });

  describe('Device List', () => {
    it('shows "No MIDI devices found" message when no devices available', async () => {
      const mockManager = getMockManager();
      mockManager.getAvailableInputs.mockReturnValue([]);

      render(
        <MidiDeviceSelector
          selectedDeviceId={undefined}
          onDeviceChange={mockOnDeviceChange}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/No MIDI devices found/i)).toBeInTheDocument();
        expect(screen.getByText(/Connect a MIDI keyboard/i)).toBeInTheDocument();
      });
    });

    it('renders dropdown with available devices', async () => {
      const mockManager = getMockManager();
      mockManager.getAvailableInputs.mockReturnValue(mockDevices);

      render(
        <MidiDeviceSelector
          selectedDeviceId={undefined}
          onDeviceChange={mockOnDeviceChange}
        />
      );

      await waitFor(() => {
        const dropdown = screen.getByRole('combobox');
        expect(dropdown).toBeInTheDocument();

        // Check that device options are present
        expect(screen.getByText(/Test MIDI Keyboard/i)).toBeInTheDocument();
        expect(screen.getByText(/Another MIDI Device/i)).toBeInTheDocument();
      });
    });

    it('includes manufacturer name in device option text', async () => {
      const mockManager = getMockManager();
      mockManager.getAvailableInputs.mockReturnValue(mockDevices);

      render(
        <MidiDeviceSelector
          selectedDeviceId={undefined}
          onDeviceChange={mockOnDeviceChange}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/TestCo/i)).toBeInTheDocument();
        expect(screen.getByText(/AnotherCo/i)).toBeInTheDocument();
      });
    });

    it('includes "No device selected" option', async () => {
      const mockManager = getMockManager();
      mockManager.getAvailableInputs.mockReturnValue(mockDevices);

      render(
        <MidiDeviceSelector
          selectedDeviceId={undefined}
          onDeviceChange={mockOnDeviceChange}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/No device selected/i)).toBeInTheDocument();
      });
    });
  });

  describe('Device Selection', () => {
    it('calls onDeviceChange when user selects a device', async () => {
      const mockManager = getMockManager();
      mockManager.getAvailableInputs.mockReturnValue(mockDevices);

      render(
        <MidiDeviceSelector
          selectedDeviceId={undefined}
          onDeviceChange={mockOnDeviceChange}
        />
      );

      await waitFor(() => {
        const dropdown = screen.getByRole('combobox');
        expect(dropdown).toBeInTheDocument();
      });

      const dropdown = screen.getByRole('combobox') as HTMLSelectElement;
      fireEvent.change(dropdown, { target: { value: 'device1' } });

      expect(mockOnDeviceChange).toHaveBeenCalledWith('device1');
      expect(mockManager.selectInputDevice).toHaveBeenCalledWith('device1');
    });

    it('calls onDeviceChange with undefined when "No device selected" is chosen', async () => {
      const mockManager = getMockManager();
      mockManager.getAvailableInputs.mockReturnValue(mockDevices);

      render(
        <MidiDeviceSelector
          selectedDeviceId="device1"
          onDeviceChange={mockOnDeviceChange}
        />
      );

      await waitFor(() => {
        const dropdown = screen.getByRole('combobox');
        expect(dropdown).toBeInTheDocument();
      });

      const dropdown = screen.getByRole('combobox') as HTMLSelectElement;
      fireEvent.change(dropdown, { target: { value: '' } });

      expect(mockOnDeviceChange).toHaveBeenCalledWith(undefined);
      expect(mockManager.selectInputDevice).not.toHaveBeenCalled();
    });

    it('displays correct selected device in dropdown', async () => {
      const mockManager = getMockManager();
      mockManager.getAvailableInputs.mockReturnValue(mockDevices);

      render(
        <MidiDeviceSelector
          selectedDeviceId="device2"
          onDeviceChange={mockOnDeviceChange}
        />
      );

      await waitFor(() => {
        const dropdown = screen.getByRole('combobox') as HTMLSelectElement;
        expect(dropdown.value).toBe('device2');
      });
    });
  });

  describe('Connection Status', () => {
    it('shows connected status when device is selected and connected', async () => {
      const mockManager = getMockManager();
      mockManager.getAvailableInputs.mockReturnValue(mockDevices);
      mockManager.getConnectionStatus.mockReturnValue('connected');

      render(
        <MidiDeviceSelector
          selectedDeviceId="device1"
          onDeviceChange={mockOnDeviceChange}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/Connected/i)).toBeInTheDocument();
      });
    });

    it('shows disconnected status when device is selected but not connected', async () => {
      const mockManager = getMockManager();
      mockManager.getAvailableInputs.mockReturnValue(mockDevices);
      mockManager.getConnectionStatus.mockReturnValue('disconnected');

      render(
        <MidiDeviceSelector
          selectedDeviceId="device1"
          onDeviceChange={mockOnDeviceChange}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/Disconnected/i)).toBeInTheDocument();
      });
    });

    it('does not show connection status when no device is selected', async () => {
      const mockManager = getMockManager();
      mockManager.getAvailableInputs.mockReturnValue(mockDevices);

      render(
        <MidiDeviceSelector
          selectedDeviceId={undefined}
          onDeviceChange={mockOnDeviceChange}
        />
      );

      await waitFor(() => {
        expect(screen.queryByText(/Connected/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/Disconnected/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Device Plug/Unplug Events', () => {
    it('updates device list when a device is connected', async () => {
      const mockManager = getMockManager();
      mockManager.getAvailableInputs.mockReturnValue([]);

      const { rerender } = render(
        <MidiDeviceSelector
          selectedDeviceId={undefined}
          onDeviceChange={mockOnDeviceChange}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/No MIDI devices found/i)).toBeInTheDocument();
      });

      // Simulate device connection
      mockManager.getAvailableInputs.mockReturnValue([mockDevices[0]]);
      const newDevice = mockDevices[0];

      // Emit deviceConnected event
      act(() => {
        mockManager._emit('deviceConnected', newDevice);
      });

      await waitFor(() => {
        expect(screen.queryByText(/No MIDI devices found/i)).not.toBeInTheDocument();
        expect(screen.getByText(/Test MIDI Keyboard/i)).toBeInTheDocument();
      });
    });

    it('updates device list when a device is disconnected', async () => {
      const mockManager = getMockManager();
      mockManager.getAvailableInputs.mockReturnValue(mockDevices);

      render(
        <MidiDeviceSelector
          selectedDeviceId={undefined}
          onDeviceChange={mockOnDeviceChange}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/Test MIDI Keyboard/i)).toBeInTheDocument();
      });

      // Simulate device disconnection
      mockManager.getAvailableInputs.mockReturnValue([mockDevices[1]]);

      // Emit deviceDisconnected event
      act(() => {
        mockManager._emit('deviceDisconnected', mockDevices[0]);
      });

      await waitFor(() => {
        expect(screen.queryByText(/Test MIDI Keyboard/i)).not.toBeInTheDocument();
        expect(screen.getByText(/Another MIDI Device/i)).toBeInTheDocument();
      });
    });

    it('clears selection when selected device is disconnected', async () => {
      const mockManager = getMockManager();
      mockManager.getAvailableInputs.mockReturnValue(mockDevices);

      render(
        <MidiDeviceSelector
          selectedDeviceId="device1"
          onDeviceChange={mockOnDeviceChange}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/Test MIDI Keyboard/i)).toBeInTheDocument();
      });

      // Simulate disconnection of selected device
      mockManager.getAvailableInputs.mockReturnValue([mockDevices[1]]);
      act(() => {
        mockManager._emit('deviceDisconnected', mockDevices[0]);
      });

      await waitFor(() => {
        expect(mockOnDeviceChange).toHaveBeenCalledWith(undefined);
      });
    });

    it('does not clear selection when a different device is disconnected', async () => {
      const mockManager = getMockManager();
      mockManager.getAvailableInputs.mockReturnValue(mockDevices);

      render(
        <MidiDeviceSelector
          selectedDeviceId="device1"
          onDeviceChange={mockOnDeviceChange}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/Test MIDI Keyboard/i)).toBeInTheDocument();
      });

      // Simulate disconnection of different device
      mockManager.getAvailableInputs.mockReturnValue([mockDevices[0]]);
      act(() => {
        mockManager._emit('deviceDisconnected', mockDevices[1]);
      });

      await waitFor(() => {
        // onDeviceChange should not be called to clear selection
        expect(mockOnDeviceChange).not.toHaveBeenCalled();
      });
    });
  });

  describe('Event Cleanup', () => {
    it('unsubscribes from events on unmount', async () => {
      const mockManager = getMockManager();
      mockManager.getAvailableInputs.mockReturnValue(mockDevices);

      const { unmount } = render(
        <MidiDeviceSelector
          selectedDeviceId={undefined}
          onDeviceChange={mockOnDeviceChange}
        />
      );

      await waitFor(() => {
        expect(mockManager.on).toHaveBeenCalled();
      });

      const onCallCount = mockManager.on.mock.calls.length;

      unmount();

      // Should call 'off' for each event subscription
      expect(mockManager.off).toHaveBeenCalledTimes(onCallCount);
    });
  });
});
