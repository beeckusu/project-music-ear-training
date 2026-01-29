import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { MidiManager } from '../../services/MidiManager';
import { useMidiHighlights } from '../../hooks/useMidiHighlights';
import {
  MidiMessages,
  MIDI_TEST_CONSTANTS,
  MockMIDIInput,
  MockMIDIAccess,
  createMidiTestFixture,
  setupMidiWithDevice,
  cleanupMidiTestFixture,
  MIDI_ERROR_TEST_CASES,
  generateBoundaryTestCases,
  type MidiTestFixture,
} from '../../utils/__tests__/testHelpers';
import type { MidiNoteEvent } from '../../types/midi';

/**
 * MIDI Keyboard Integration Tests
 *
 * Tests the complete end-to-end MIDI keyboard workflow:
 * - Device detection and initialization
 * - Device selection and connection management
 * - MIDI note input processing
 * - Integration with piano keyboard highlights
 * - Device connection/disconnection events
 * - Error handling
 */
describe('MIDI Keyboard Integration Tests', () => {
  let fixture: MidiTestFixture;

  beforeEach(() => {
    fixture = createMidiTestFixture();
  });

  afterEach(() => {
    cleanupMidiTestFixture(fixture);
  });

  describe('Device Detection and Initialization', () => {
    it('should initialize MIDI access successfully', async () => {
      await fixture.midiManager.initialize();

      expect(fixture.midiManager.isInitialized()).toBe(true);
      expect(navigator.requestMIDIAccess).toHaveBeenCalledTimes(1);
    });

    it('should detect available MIDI input devices', async () => {
      await fixture.midiManager.initialize();

      const devices = fixture.midiManager.getAvailableInputs();

      expect(devices).toHaveLength(2);
      expect(devices[0]).toMatchObject({
        id: 'device-1',
        name: 'MIDI Keyboard 1',
        manufacturer: 'Manufacturer A',
        type: 'input',
        state: 'connected',
      });
    });

    it.each([
      { hasDevices: true, description: 'true when devices available' },
      { hasDevices: false, description: 'false when no devices available' },
    ])('should report hasDevices() $description', async ({ hasDevices }) => {
      if (!hasDevices) {
        fixture.mockMidiAccess.inputs.clear();
      }
      await fixture.midiManager.initialize();

      expect(fixture.midiManager.hasDevices()).toBe(hasDevices);
    });

    it('should transition through correct status during initialization', async () => {
      const statusChanges: string[] = [];
      fixture.midiManager.on('statusChange', (status) => {
        statusChanges.push(status);
      });

      await fixture.midiManager.initialize();

      expect(statusChanges).toContain('initializing');
      expect(statusChanges).toContain('disconnected');
      expect(fixture.midiManager.getConnectionStatus()).toBe('disconnected');
    });
  });

  describe('Device Selection', () => {
    beforeEach(async () => {
      await fixture.midiManager.initialize();
    });

    it('should select a MIDI input device successfully', async () => {
      await fixture.midiManager.selectInputDevice('device-1');

      const selectedDevice = fixture.midiManager.getSelectedDevice();

      expect(selectedDevice).toMatchObject({
        id: 'device-1',
        name: 'MIDI Keyboard 1',
      });
      expect(fixture.midiManager.getConnectionStatus()).toBe('connected');
    });

    it('should update status to connected after device selection', async () => {
      const statusChangeSpy = vi.fn();
      fixture.midiManager.on('statusChange', statusChangeSpy);

      await fixture.midiManager.selectInputDevice('device-1');

      expect(statusChangeSpy).toHaveBeenCalledWith('connected');
    });

    it.each([
      { deviceId: 'device-1', name: 'MIDI Keyboard 1', manufacturer: 'Manufacturer A' },
      { deviceId: 'device-2', name: 'MIDI Keyboard 2', manufacturer: 'Manufacturer B' },
    ])('should return correct info for $deviceId via getSelectedDevice()', async ({ deviceId, name, manufacturer }) => {
      await fixture.midiManager.selectInputDevice(deviceId);

      const device = fixture.midiManager.getSelectedDevice();

      expect(device?.id).toBe(deviceId);
      expect(device?.name).toBe(name);
      expect(device?.manufacturer).toBe(manufacturer);
    });

    it('should clean up previous device listener when switching devices', async () => {
      await fixture.midiManager.selectInputDevice('device-1');
      expect(fixture.mockDevice1.onmidimessage).not.toBeNull();

      await fixture.midiManager.selectInputDevice('device-2');

      expect(fixture.mockDevice1.onmidimessage).toBeNull();
      expect(fixture.mockDevice2.onmidimessage).not.toBeNull();
    });

    it('should throw error when selecting non-existent device', async () => {
      await expect(fixture.midiManager.selectInputDevice('non-existent'))
        .rejects.toThrow('MIDI input device with ID non-existent not found');
    });
  });

  describe('MIDI Note Input Processing', () => {
    beforeEach(async () => {
      await setupMidiWithDevice(fixture);
    });

    it('should emit noteOn event for note on messages', () => {
      const noteOnSpy = vi.fn();
      fixture.midiManager.on('noteOn', noteOnSpy);

      const message = MidiMessages.noteOn(60, 64); // Middle C
      fixture.mockDevice1.simulateMessage([message.status, message.data1, message.data2!]);

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
      fixture.midiManager.on('noteOff', noteOffSpy);

      const message = MidiMessages.noteOff(60, 64);
      fixture.mockDevice1.simulateMessage([message.status, message.data1, message.data2!]);

      expect(noteOffSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          note: { note: 'C', octave: 5 },
          midiNote: 60,
          velocity: 64,
        })
      );
    });

    it('should treat note on with velocity 0 as note off', () => {
      const noteOffSpy = vi.fn();
      fixture.midiManager.on('noteOff', noteOffSpy);

      const message = MidiMessages.noteOnVelocityZero(60);
      fixture.mockDevice1.simulateMessage([message.status, message.data1, message.data2!]);

      expect(noteOffSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          note: { note: 'C', octave: 5 },
          midiNote: 60,
          velocity: 0,
        })
      );
    });

    describe('playable note range filtering', () => {
      it.each(MIDI_TEST_CONSTANTS.MIDI_RANGES.OUT_OF_RANGE_LOW)(
        'should NOT emit events for out-of-range note %i (octave 0)',
        (midiNote) => {
          const noteOnSpy = vi.fn();
          fixture.midiManager.on('noteOn', noteOnSpy);

          fixture.mockDevice1.simulateNoteOn(midiNote, 64);

          expect(noteOnSpy).not.toHaveBeenCalled();
        }
      );

      it.each(MIDI_TEST_CONSTANTS.MIDI_RANGES.OUT_OF_RANGE_HIGH)(
        'should NOT emit events for out-of-range note %i (octave 9+)',
        (midiNote) => {
          const noteOnSpy = vi.fn();
          fixture.midiManager.on('noteOn', noteOnSpy);

          fixture.mockDevice1.simulateNoteOn(midiNote, 64);

          expect(noteOnSpy).not.toHaveBeenCalled();
        }
      );

      it.each(generateBoundaryTestCases().filter(c => c.shouldPass))(
        'should emit events for $name (MIDI $midi)',
        ({ midi }) => {
          const noteOnSpy = vi.fn();
          fixture.midiManager.on('noteOn', noteOnSpy);

          fixture.mockDevice1.simulateNoteOn(midi, 64);

          expect(noteOnSpy).toHaveBeenCalledTimes(1);
        }
      );
    });

    describe('MIDI channel support', () => {
      it.each(MIDI_TEST_CONSTANTS.MIDI_CHANNELS)(
        'should process messages on channel %i',
        (channel) => {
          const noteOnSpy = vi.fn();
          fixture.midiManager.on('noteOn', noteOnSpy);

          fixture.mockDevice1.simulateNoteOn(60, 64, channel);

          expect(noteOnSpy).toHaveBeenCalledTimes(1);
        }
      );

      it('should process messages on all 16 channels', () => {
        const noteOnSpy = vi.fn();
        fixture.midiManager.on('noteOn', noteOnSpy);

        MIDI_TEST_CONSTANTS.MIDI_CHANNELS.forEach(channel => {
          fixture.mockDevice1.simulateNoteOn(60, 64, channel);
        });

        expect(noteOnSpy).toHaveBeenCalledTimes(16);
      });
    });

    it('should emit raw message events for all MIDI data', () => {
      const messageSpy = vi.fn();
      fixture.midiManager.on('message', messageSpy);

      const midiData = [0x90, 60, 64];
      fixture.mockDevice1.simulateMessage(midiData, 1000);

      expect(messageSpy).toHaveBeenCalledWith({
        data: new Uint8Array(midiData),
        timestamp: 1000,
      });
    });
  });

  describe('Piano Keyboard Visual Feedback (useMidiHighlights)', () => {
    beforeEach(async () => {
      await setupMidiWithDevice(fixture);
    });

    it('should track pressed notes via useMidiHighlights hook', async () => {
      const { result } = renderHook(() => useMidiHighlights());

      expect(result.current).toHaveLength(0);

      await act(async () => {
        fixture.mockDevice1.simulateNoteOn(60, 64);
      });

      expect(result.current).toHaveLength(1);
      expect(result.current[0]).toMatchObject({
        note: { note: 'C', octave: 5 },
        type: 'midi-active',
      });
    });

    it('should remove highlight when note is released', async () => {
      const { result } = renderHook(() => useMidiHighlights());

      await act(async () => {
        fixture.mockDevice1.simulateNoteOn(60, 64);
      });
      expect(result.current).toHaveLength(1);

      await act(async () => {
        fixture.mockDevice1.simulateNoteOff(60, 64);
      });
      expect(result.current).toHaveLength(0);
    });

    it.each([
      { notes: [60, 64, 67], expectedNotes: ['C', 'E', 'G'], chord: 'C major' },
      { notes: [62, 65, 69], expectedNotes: ['D', 'F', 'A'], chord: 'D minor' },
    ])('should handle multiple simultaneous notes ($chord)', async ({ notes, expectedNotes }) => {
      const { result } = renderHook(() => useMidiHighlights());

      await act(async () => {
        notes.forEach(note => fixture.mockDevice1.simulateNoteOn(note, 64));
      });

      expect(result.current).toHaveLength(notes.length);
      const noteNames = result.current.map(h => h.note.note);
      expectedNotes.forEach(note => expect(noteNames).toContain(note));
    });

    it('should handle rapid press/release cycles', async () => {
      const { result } = renderHook(() => useMidiHighlights());

      await act(async () => {
        for (let i = 0; i < 10; i++) {
          fixture.mockDevice1.simulateNoteOn(60, 64);
          fixture.mockDevice1.simulateNoteOff(60, 64);
        }
      });

      expect(result.current).toHaveLength(0);
    });

    it('should cleanup subscriptions on unmount', async () => {
      const { unmount } = renderHook(() => useMidiHighlights());

      unmount();

      expect(() => {
        fixture.mockDevice1.simulateNoteOn(60, 64);
      }).not.toThrow();
    });
  });

  describe('Device Connection Events', () => {
    beforeEach(async () => {
      await fixture.midiManager.initialize();
    });

    it('should emit deviceConnected event when device is plugged in', () => {
      const deviceConnectedSpy = vi.fn();
      fixture.midiManager.on('deviceConnected', deviceConnectedSpy);

      const newDevice = new MockMIDIInput('device-3', 'New Keyboard');
      fixture.mockMidiAccess.simulateDeviceConnected(newDevice);

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
      fixture.midiManager.on('deviceDisconnected', deviceDisconnectedSpy);

      fixture.mockMidiAccess.simulateDeviceDisconnected('device-1');

      expect(deviceDisconnectedSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'device-1',
          state: 'disconnected',
        })
      );
    });

    it.each([
      { selectedDevice: 'device-1', disconnectedDevice: 'device-1', expectedStatus: 'disconnected' },
      { selectedDevice: 'device-1', disconnectedDevice: 'device-2', expectedStatus: 'connected' },
    ])(
      'should have status $expectedStatus when $disconnectedDevice is unplugged while $selectedDevice is selected',
      async ({ selectedDevice, disconnectedDevice, expectedStatus }) => {
        await fixture.midiManager.selectInputDevice(selectedDevice);

        fixture.mockMidiAccess.simulateDeviceDisconnected(disconnectedDevice);

        expect(fixture.midiManager.getConnectionStatus()).toBe(expectedStatus);
      }
    );

    it('should reattach listener when selected device reconnects', async () => {
      await fixture.midiManager.selectInputDevice('device-1');

      fixture.mockMidiAccess.simulateDeviceDisconnected('device-1');
      expect(fixture.midiManager.getConnectionStatus()).toBe('disconnected');

      fixture.mockDevice1.state = 'connected';
      fixture.mockMidiAccess.simulateDeviceConnected(fixture.mockDevice1);

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(fixture.midiManager.getConnectionStatus()).toBe('connected');
      expect(fixture.mockDevice1.onmidimessage).not.toBeNull();
    });
  });

  describe('Error Handling', () => {
    // Save original navigator for restoration
    let originalNavigator: Navigator;

    beforeEach(() => {
      originalNavigator = global.navigator;
    });

    afterEach(() => {
      global.navigator = originalNavigator;
    });

    it.each(MIDI_ERROR_TEST_CASES)(
      'should handle $name',
      async ({ setup, expectedError, expectedStatus }) => {
        setup();

        const errorSpy = vi.fn();
        fixture.midiManager.on('error', errorSpy);

        await expect(fixture.midiManager.initialize()).rejects.toMatchObject(expectedError);
        expect(fixture.midiManager.getConnectionStatus()).toBe(expectedStatus);
      }
    );

    it('should return empty device list when not initialized', () => {
      const devices = fixture.midiManager.getAvailableInputs();
      expect(devices).toEqual([]);
    });

    it('should throw when selecting device before initialization', async () => {
      await expect(fixture.midiManager.selectInputDevice('device-1'))
        .rejects.toThrow('MIDI not initialized');
    });
  });

  describe('End-to-End Workflow', () => {
    it('should complete full workflow from initialization to note processing', async () => {
      const noteEvents: MidiNoteEvent[] = [];

      // Step 1: Initialize
      await fixture.midiManager.initialize();
      expect(fixture.midiManager.isInitialized()).toBe(true);

      // Step 2: Verify devices available
      expect(fixture.midiManager.hasDevices()).toBe(true);
      const devices = fixture.midiManager.getAvailableInputs();
      expect(devices.length).toBeGreaterThan(0);

      // Step 3: Select device
      await fixture.midiManager.selectInputDevice(devices[0].id);
      expect(fixture.midiManager.getConnectionStatus()).toBe('connected');

      // Step 4: Subscribe to note events
      fixture.midiManager.on('noteOn', (event) => noteEvents.push(event));

      // Step 5: Simulate playing C major scale
      const notesToPlay = [60, 62, 64, 65, 67]; // C D E F G
      notesToPlay.forEach(note => fixture.mockDevice1.simulateNoteOn(note, 80));

      // Step 6: Verify all notes received
      expect(noteEvents).toHaveLength(5);
      expect(noteEvents.map(e => e.note.note)).toEqual(['C', 'D', 'E', 'F', 'G']);

      // Step 7: Disconnect
      fixture.midiManager.disconnect();
      expect(fixture.midiManager.isInitialized()).toBe(false);
    });

    it('should integrate with useMidiHighlights for visual feedback', async () => {
      await setupMidiWithDevice(fixture);
      const { result } = renderHook(() => useMidiHighlights());

      // Play a chord
      await act(async () => {
        [60, 64, 67].forEach(note => fixture.mockDevice1.simulateNoteOn(note, 64));
      });

      expect(result.current).toHaveLength(3);
      expect(result.current.every(h => h.type === 'midi-active')).toBe(true);

      // Release one note
      await act(async () => {
        fixture.mockDevice1.simulateNoteOff(64, 64);
      });
      expect(result.current).toHaveLength(2);

      // Release all
      await act(async () => {
        [60, 67].forEach(note => fixture.mockDevice1.simulateNoteOff(note, 64));
      });
      expect(result.current).toHaveLength(0);
    });

    it('should handle device hot-swap during active session', async () => {
      await setupMidiWithDevice(fixture);

      const noteOnSpy = vi.fn();
      fixture.midiManager.on('noteOn', noteOnSpy);

      // Play note on device 1
      fixture.mockDevice1.simulateNoteOn(60, 64);
      expect(noteOnSpy).toHaveBeenCalledTimes(1);

      // Switch to device 2
      await fixture.midiManager.selectInputDevice('device-2');

      // Play note on device 2
      fixture.mockDevice2.simulateNoteOn(62, 64);
      expect(noteOnSpy).toHaveBeenCalledTimes(2);

      // Notes on device 1 should no longer trigger events
      fixture.mockDevice1.simulateNoteOn(64, 64);
      expect(noteOnSpy).toHaveBeenCalledTimes(2); // Still 2
    });
  });
});
