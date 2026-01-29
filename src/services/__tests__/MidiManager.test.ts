import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { MidiManager } from '../MidiManager';
import {
  MidiMessages,
  MIDI_TEST_CONSTANTS,
  MockMIDIInput,
  MockMIDIAccess,
  createMidiTestFixture,
  cleanupMidiTestFixture,
  type MidiTestFixture,
} from '../../utils/__tests__/testHelpers';
import type { MidiNoteEvent, MidiError, MidiDeviceInfo } from '../../types/midi';

/**
 * Test suite for MidiManager
 */
describe('MidiManager', () => {
  let midiManager: MidiManager;
  let mockMidiAccess: MockMIDIAccess;
  let mockDevice1: MockMIDIInput;
  let mockDevice2: MockMIDIInput;

  beforeEach(() => {
    // Use shared test fixture
    const fixture = createMidiTestFixture();
    midiManager = fixture.midiManager;
    mockMidiAccess = fixture.mockMidiAccess;
    mockDevice1 = fixture.mockDevice1;
    mockDevice2 = fixture.mockDevice2;
  });

  afterEach(() => {
    midiManager.disconnect();
    vi.clearAllMocks();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance on multiple calls to getInstance()', () => {
      const instance1 = MidiManager.getInstance();
      const instance2 = MidiManager.getInstance();

      expect(instance1).toBe(instance2);
    });

    it('should maintain state across getInstance() calls', async () => {
      await midiManager.initialize();
      const instance2 = MidiManager.getInstance();

      expect(instance2.isInitialized()).toBe(true);
    });
  });

  describe('Browser Support Detection', () => {
    it('should return true when Web MIDI API is supported', () => {
      expect(midiManager.isSupported()).toBe(true);
    });

    it('should return false when Web MIDI API is not supported', () => {
      const originalNavigator = global.navigator;
      // @ts-expect-error - Removing requestMIDIAccess for test
      delete global.navigator.requestMIDIAccess;

      expect(midiManager.isSupported()).toBe(false);

      global.navigator = originalNavigator;
    });
  });

  describe('Initialization', () => {
    it('should initialize successfully with MIDI access', async () => {
      await midiManager.initialize();

      expect(midiManager.isInitialized()).toBe(true);
      expect(midiManager.getConnectionStatus()).toBe('disconnected');
      expect(navigator.requestMIDIAccess).toHaveBeenCalledTimes(1);
    });

    it('should set status to "initializing" during initialization', async () => {
      const statusChanges: string[] = [];
      midiManager.on('statusChange', (status) => {
        statusChanges.push(status);
      });

      await midiManager.initialize();

      expect(statusChanges).toContain('initializing');
    });

    it('should not re-initialize if already initialized', async () => {
      await midiManager.initialize();
      await midiManager.initialize();

      expect(navigator.requestMIDIAccess).toHaveBeenCalledTimes(1);
    });

    it('should throw error when Web MIDI API is not supported', async () => {
      const originalNavigator = global.navigator;
      // @ts-expect-error - Removing requestMIDIAccess for test
      delete global.navigator.requestMIDIAccess;

      const midiManager = MidiManager.getInstance();

      await expect(midiManager.initialize()).rejects.toMatchObject({
        type: 'not_supported',
        message: 'Web MIDI API is not supported in this browser',
      });

      expect(midiManager.getConnectionStatus()).toBe('unsupported');

      global.navigator = originalNavigator;
    });

    it('should emit error event when initialization fails', async () => {
      const originalNavigator = global.navigator;
      // @ts-expect-error - Removing requestMIDIAccess for test
      delete global.navigator.requestMIDIAccess;

      const errorSpy = vi.fn();
      midiManager.on('error', errorSpy);

      await expect(midiManager.initialize()).rejects.toThrow();

      expect(errorSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'not_supported',
        })
      );

      global.navigator = originalNavigator;
    });

    it('should handle permission denied error', async () => {
      const securityError = new Error('Permission denied');
      securityError.name = 'SecurityError';

      global.navigator.requestMIDIAccess = vi.fn().mockRejectedValue(securityError);

      await expect(midiManager.initialize()).rejects.toMatchObject({
        type: 'permission_denied',
        message: 'Permission denied',
      });

      expect(midiManager.getConnectionStatus()).toBe('error');
    });

    it('should handle generic initialization error', async () => {
      global.navigator.requestMIDIAccess = vi.fn().mockRejectedValue(
        new Error('Generic error')
      );

      await expect(midiManager.initialize()).rejects.toMatchObject({
        type: 'initialization_error',
        message: 'Generic error',
      });

      expect(midiManager.getConnectionStatus()).toBe('error');
    });
  });

  describe('Device Management', () => {
    beforeEach(async () => {
      await midiManager.initialize();
    });

    it('should list available input devices', () => {
      const devices = midiManager.getAvailableInputs();

      expect(devices).toHaveLength(2);
      expect(devices[0]).toMatchObject({
        id: 'device-1',
        name: 'MIDI Keyboard 1',
        manufacturer: 'Manufacturer A',
        type: 'input',
        state: 'connected',
      });
      expect(devices[1]).toMatchObject({
        id: 'device-2',
        name: 'MIDI Keyboard 2',
        manufacturer: 'Manufacturer B',
        type: 'input',
        state: 'connected',
      });
    });

    it('should return empty array when not initialized', () => {
      midiManager.disconnect();

      const devices = midiManager.getAvailableInputs();

      expect(devices).toEqual([]);
    });

    it('should check if devices are available', () => {
      expect(midiManager.hasDevices()).toBe(true);
    });

    it('should return false when no devices available', () => {
      mockMidiAccess.inputs.clear();

      expect(midiManager.hasDevices()).toBe(false);
    });

    it('should select a MIDI input device', async () => {
      await midiManager.selectInputDevice('device-1');

      const selectedDevice = midiManager.getSelectedDevice();

      expect(selectedDevice).toMatchObject({
        id: 'device-1',
        name: 'MIDI Keyboard 1',
      });
      expect(midiManager.getConnectionStatus()).toBe('connected');
    });

    it('should throw error when selecting non-existent device', async () => {
      await expect(async () => {
        await midiManager.selectInputDevice('non-existent');
      }).rejects.toThrow('MIDI input device with ID non-existent not found');
    });

    it('should throw error when selecting device before initialization', async () => {
      midiManager.disconnect();

      await expect(async () => {
        await midiManager.selectInputDevice('device-1');
      }).rejects.toThrow('MIDI not initialized. Call initialize() first.');
    });

    it('should switch between devices correctly', async () => {
      await midiManager.selectInputDevice('device-1');
      expect(midiManager.getSelectedDevice()?.id).toBe('device-1');

      await midiManager.selectInputDevice('device-2');
      expect(midiManager.getSelectedDevice()?.id).toBe('device-2');

      // Previous device should have listener removed
      expect(mockDevice1.onmidimessage).toBeNull();
      expect(mockDevice2.onmidimessage).not.toBeNull();
    });

    it('should return null when no device selected', () => {
      expect(midiManager.getSelectedDevice()).toBeNull();
    });

    it('should list available output devices', () => {
      const outputs = midiManager.getAvailableOutputs();

      expect(outputs).toEqual([]);
    });
  });

  describe('MIDI Message Handling', () => {
    beforeEach(async () => {
      await midiManager.initialize();
      await midiManager.selectInputDevice('device-1');
    });

    it('should emit raw message event for all MIDI messages', () => {
      const messageSpy = vi.fn();
      midiManager.on('message', messageSpy);

      const midiData = [0x90, 60, 64]; // Note on, Middle C, velocity 64
      mockDevice1.simulateMessage(midiData, 1000);

      expect(messageSpy).toHaveBeenCalledWith({
        data: new Uint8Array(midiData),
        timestamp: 1000,
      });
    });

    it('should emit noteOn event for note on messages', () => {
      const noteOnSpy = vi.fn();
      midiManager.on('noteOn', noteOnSpy);

      const message = MidiMessages.noteOn(60, 64); // Middle C
      mockDevice1.simulateMessage([message.status, message.data1, message.data2!]);

      expect(noteOnSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          note: { note: 'C', octave: 5 },
          midiNote: 60,
          velocity: 64,
        })
      );
    });

    it('should emit noteOff event for note off messages', () => {
      const noteOffSpy = vi.fn();
      midiManager.on('noteOff', noteOffSpy);

      const message = MidiMessages.noteOff(60, 64);
      mockDevice1.simulateMessage([message.status, message.data1, message.data2!]);

      expect(noteOffSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          note: { note: 'C', octave: 5 },
          midiNote: 60,
          velocity: 64,
        })
      );
    });

    it('should emit noteOff event for note on with velocity 0', () => {
      const noteOffSpy = vi.fn();
      midiManager.on('noteOff', noteOffSpy);

      const message = MidiMessages.noteOnVelocityZero(60);
      mockDevice1.simulateMessage([message.status, message.data1, message.data2!]);

      expect(noteOffSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          note: { note: 'C', octave: 5 },
          midiNote: 60,
          velocity: 0,
        })
      );
    });

    it('should only emit events for playable notes (octaves 1-8)', () => {
      const noteOnSpy = vi.fn();
      midiManager.on('noteOn', noteOnSpy);

      // Note in octave 0 (not playable)
      const message1 = MidiMessages.noteOn(0, 64);
      mockDevice1.simulateMessage([message1.status, message1.data1, message1.data2!]);

      // Note in octave 9 (not playable)
      const message2 = MidiMessages.noteOn(127, 64);
      mockDevice1.simulateMessage([message2.status, message2.data1, message2.data2!]);

      // Should not emit events for out-of-range notes
      expect(noteOnSpy).not.toHaveBeenCalled();
    });

    it('should emit events for all playable notes', () => {
      const noteOnSpy = vi.fn();
      midiManager.on('noteOn', noteOnSpy);

      // Test octave 1 (lowest playable)
      const message1 = MidiMessages.noteOn(12, 64); // C1
      mockDevice1.simulateMessage([message1.status, message1.data1, message1.data2!]);

      // Test octave 8 (highest playable)
      const message2 = MidiMessages.noteOn(107, 64); // B8
      mockDevice1.simulateMessage([message2.status, message2.data1, message2.data2!]);

      expect(noteOnSpy).toHaveBeenCalledTimes(2);
      expect(noteOnSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          note: { note: 'C', octave: 1 },
        })
      );
      expect(noteOnSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          note: { note: 'B', octave: 8 },
        })
      );
    });

    it('should handle MIDI messages on all channels', () => {
      const noteOnSpy = vi.fn();
      midiManager.on('noteOn', noteOnSpy);

      // Test multiple channels
      for (let channel = 0; channel < 16; channel++) {
        const message = MidiMessages.noteOn(60, 64, channel);
        mockDevice1.simulateMessage([message.status, message.data1, message.data2!]);
      }

      expect(noteOnSpy).toHaveBeenCalledTimes(16);
    });

    it('should ignore non-note messages', () => {
      const noteOnSpy = vi.fn();
      const noteOffSpy = vi.fn();
      midiManager.on('noteOn', noteOnSpy);
      midiManager.on('noteOff', noteOffSpy);

      // Control change message
      const message = MidiMessages.controlChange(7, 100);
      mockDevice1.simulateMessage([message.status, message.data1, message.data2!]);

      expect(noteOnSpy).not.toHaveBeenCalled();
      expect(noteOffSpy).not.toHaveBeenCalled();
    });

    it('should handle messages with invalid note numbers gracefully', () => {
      const noteOnSpy = vi.fn();
      midiManager.on('noteOn', noteOnSpy);

      // Invalid MIDI message (should not crash)
      mockDevice1.simulateMessage([0x90, 255, 64]);

      expect(noteOnSpy).not.toHaveBeenCalled();
    });
  });

  describe('Device Connection Events', () => {
    beforeEach(async () => {
      await midiManager.initialize();
    });

    it('should emit deviceConnected event when device is plugged in', () => {
      const deviceConnectedSpy = vi.fn();
      midiManager.on('deviceConnected', deviceConnectedSpy);

      const newDevice = new MockMIDIInput('device-3', 'New Keyboard');
      mockMidiAccess.simulateDeviceConnected(newDevice);

      expect(deviceConnectedSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'device-3',
          name: 'New Keyboard',
          state: 'connected',
        })
      );
    });

    it('should emit deviceDisconnected event when device is unplugged', () => {
      const deviceDisconnectedSpy = vi.fn();
      midiManager.on('deviceDisconnected', deviceDisconnectedSpy);

      mockMidiAccess.simulateDeviceDisconnected('device-1');

      expect(deviceDisconnectedSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'device-1',
          state: 'disconnected',
        })
      );
    });

    it('should update status to disconnected when selected device is unplugged', async () => {
      await midiManager.selectInputDevice('device-1');
      expect(midiManager.getConnectionStatus()).toBe('connected');

      mockMidiAccess.simulateDeviceDisconnected('device-1');

      expect(midiManager.getConnectionStatus()).toBe('disconnected');
    });

    it('should not change status when non-selected device is unplugged', async () => {
      await midiManager.selectInputDevice('device-1');

      mockMidiAccess.simulateDeviceDisconnected('device-2');

      expect(midiManager.getConnectionStatus()).toBe('connected');
    });

    it('should reattach listener when selected device reconnects', async () => {
      await midiManager.selectInputDevice('device-1');

      mockMidiAccess.simulateDeviceDisconnected('device-1');
      expect(midiManager.getConnectionStatus()).toBe('disconnected');

      // Reconnect device
      mockDevice1.state = 'connected';
      mockMidiAccess.simulateDeviceConnected(mockDevice1);

      // Need to wait for the async reattachment to complete
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(midiManager.getConnectionStatus()).toBe('connected');
      expect(mockDevice1.onmidimessage).not.toBeNull();
    });

    it('should ignore output device state changes', () => {
      const deviceConnectedSpy = vi.fn();
      const deviceDisconnectedSpy = vi.fn();
      midiManager.on('deviceConnected', deviceConnectedSpy);
      midiManager.on('deviceDisconnected', deviceDisconnectedSpy);

      // Simulate output device event (should be ignored)
      const outputDevice = new MockMIDIInput('output-1');
      outputDevice.type = 'output';
      mockMidiAccess.simulateDeviceConnected(outputDevice);

      expect(deviceConnectedSpy).not.toHaveBeenCalled();
      expect(deviceDisconnectedSpy).not.toHaveBeenCalled();
    });
  });

  describe('Connection Status Management', () => {
    it('should start with disconnected status', () => {
      expect(midiManager.getConnectionStatus()).toBe('disconnected');
    });

    it('should emit statusChange event when status changes', async () => {
      const statusChangeSpy = vi.fn();
      midiManager.on('statusChange', statusChangeSpy);

      await midiManager.initialize();

      expect(statusChangeSpy).toHaveBeenCalledWith('initializing');
      expect(statusChangeSpy).toHaveBeenCalledWith('disconnected');
    });

    it('should not emit statusChange if status does not change', async () => {
      await midiManager.initialize();

      const statusChangeSpy = vi.fn();
      midiManager.on('statusChange', statusChangeSpy);

      // Try to initialize again (should not change status)
      await midiManager.initialize();

      expect(statusChangeSpy).not.toHaveBeenCalled();
    });

    it('should update status to connected when device is selected', async () => {
      await midiManager.initialize();

      const statusChangeSpy = vi.fn();
      midiManager.on('statusChange', statusChangeSpy);

      await midiManager.selectInputDevice('device-1');

      expect(statusChangeSpy).toHaveBeenCalledWith('connected');
    });
  });

  describe('Cleanup and Disconnection', () => {
    beforeEach(async () => {
      await midiManager.initialize();
      await midiManager.selectInputDevice('device-1');
    });

    it('should clean up resources on disconnect', () => {
      midiManager.disconnect();

      expect(midiManager.isInitialized()).toBe(false);
      expect(midiManager.getSelectedDevice()).toBeNull();
      expect(midiManager.getConnectionStatus()).toBe('disconnected');
    });

    it('should remove all device listeners on disconnect', () => {
      expect(mockDevice1.onmidimessage).not.toBeNull();

      midiManager.disconnect();

      expect(mockDevice1.onmidimessage).toBeNull();
      expect(mockDevice2.onmidimessage).toBeNull();
    });

    it('should remove state change listener on disconnect', () => {
      midiManager.disconnect();

      expect(mockMidiAccess.onstatechange).toBeNull();
    });

    it('should remove all event listeners on disconnect', () => {
      const noteOnSpy = vi.fn();
      midiManager.on('noteOn', noteOnSpy);

      midiManager.disconnect();

      // Try to emit event after disconnect
      const message = MidiMessages.noteOn(60, 64);
      mockDevice1.simulateMessage([message.status, message.data1, message.data2!]);

      expect(noteOnSpy).not.toHaveBeenCalled();
    });
  });

  describe('Event Subscription', () => {
    beforeEach(async () => {
      await midiManager.initialize();
      midiManager.selectInputDevice('device-1');
    });

    it('should allow subscribing to noteOn events', () => {
      const handler = vi.fn();
      const unsubscribe = midiManager.on('noteOn', handler);

      expect(typeof unsubscribe).toBe('function');

      const message = MidiMessages.noteOn(60, 64);
      mockDevice1.simulateMessage([message.status, message.data1, message.data2!]);

      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should allow unsubscribing from events', () => {
      const handler = vi.fn();
      const unsubscribe = midiManager.on('noteOn', handler);

      unsubscribe();

      const message = MidiMessages.noteOn(60, 64);
      mockDevice1.simulateMessage([message.status, message.data1, message.data2!]);

      expect(handler).not.toHaveBeenCalled();
    });

    it('should support multiple subscribers to the same event', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      midiManager.on('noteOn', handler1);
      midiManager.on('noteOn', handler2);

      const message = MidiMessages.noteOn(60, 64);
      mockDevice1.simulateMessage([message.status, message.data1, message.data2!]);

      expect(handler1).toHaveBeenCalledTimes(1);
      expect(handler2).toHaveBeenCalledTimes(1);
    });

    it('should allow removing all listeners', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      midiManager.on('noteOn', handler1);
      midiManager.on('noteOff', handler2);

      midiManager.removeAllListeners();

      const message1 = MidiMessages.noteOn(60, 64);
      const message2 = MidiMessages.noteOff(60, 64);
      mockDevice1.simulateMessage([message1.status, message1.data1, message1.data2!]);
      mockDevice1.simulateMessage([message2.status, message2.data1, message2.data2!]);

      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).not.toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle rapid device switching', async () => {
      await midiManager.initialize();

      await midiManager.selectInputDevice('device-1');
      await midiManager.selectInputDevice('device-2');
      await midiManager.selectInputDevice('device-1');
      await midiManager.selectInputDevice('device-2');

      expect(midiManager.getSelectedDevice()?.id).toBe('device-2');
    });

    it('should handle rapid MIDI messages', async () => {
      await midiManager.initialize();
      await midiManager.selectInputDevice('device-1');

      const noteOnSpy = vi.fn();
      midiManager.on('noteOn', noteOnSpy);

      // Send 100 rapid messages
      for (let i = 0; i < 100; i++) {
        const message = MidiMessages.noteOn(60 + (i % 12), 64);
        mockDevice1.simulateMessage([message.status, message.data1, message.data2!]);
      }

      expect(noteOnSpy).toHaveBeenCalledTimes(100);
    });

    it('should handle disconnect before initialization', () => {
      expect(() => {
        midiManager.disconnect();
      }).not.toThrow();
    });

    it('should handle multiple disconnect calls', async () => {
      await midiManager.initialize();

      midiManager.disconnect();
      midiManager.disconnect();

      expect(midiManager.isInitialized()).toBe(false);
    });
  });
});
