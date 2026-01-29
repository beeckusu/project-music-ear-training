import { vi } from 'vitest';
import { MidiManager } from '../../../services/MidiManager';

/**
 * Mock Web MIDI API classes for testing
 * Extracted for reuse across MidiManager unit tests and integration tests
 */

export class MockMIDIInput implements Partial<MIDIInput> {
  id: string;
  manufacturer: string;
  name: string;
  state: MIDIPortDeviceState;
  type: MIDIPortType = 'input';
  connection: MIDIPortConnectionState = 'closed';
  onmidimessage: ((event: MIDIMessageEvent) => void) | null = null;
  onstatechange: ((event: Event) => void) | null = null;

  constructor(
    id: string,
    name: string = 'Test MIDI Device',
    manufacturer: string = 'Test Manufacturer',
    state: MIDIPortDeviceState = 'connected'
  ) {
    this.id = id;
    this.name = name;
    this.manufacturer = manufacturer;
    this.state = state;
  }

  open(): Promise<MIDIPort> {
    this.connection = 'open';
    return Promise.resolve(this as unknown as MIDIPort);
  }

  close(): Promise<MIDIPort> {
    this.connection = 'closed';
    return Promise.resolve(this as unknown as MIDIPort);
  }

  /**
   * Simulate receiving a MIDI message
   */
  simulateMessage(data: number[], timestamp: number = Date.now()): void {
    if (this.onmidimessage) {
      const event = {
        data: new Uint8Array(data),
        timeStamp: timestamp,
      } as MIDIMessageEvent;
      this.onmidimessage(event);
    }
  }

  /**
   * Simulate a note on message
   */
  simulateNoteOn(midiNote: number, velocity: number = 64, channel: number = 0): void {
    this.simulateMessage([0x90 + channel, midiNote, velocity]);
  }

  /**
   * Simulate a note off message
   */
  simulateNoteOff(midiNote: number, velocity: number = 64, channel: number = 0): void {
    this.simulateMessage([0x80 + channel, midiNote, velocity]);
  }
}

export class MockMIDIAccess implements Partial<MIDIAccess> {
  inputs: Map<string, MIDIInput>;
  outputs: Map<string, MIDIOutput>;
  onstatechange: ((event: MIDIConnectionEvent) => void) | null = null;
  sysexEnabled: boolean = false;

  constructor(inputs: MockMIDIInput[] = []) {
    this.inputs = new Map();
    this.outputs = new Map();
    inputs.forEach(input => {
      this.inputs.set(input.id, input as unknown as MIDIInput);
    });
  }

  /**
   * Simulate a device being connected (plugged in)
   */
  simulateDeviceConnected(device: MockMIDIInput): void {
    this.inputs.set(device.id, device as unknown as MIDIInput);
    if (this.onstatechange) {
      const event = {
        port: device as unknown as MIDIPort,
      } as MIDIConnectionEvent;
      this.onstatechange(event);
    }
  }

  /**
   * Simulate a device being disconnected (unplugged)
   */
  simulateDeviceDisconnected(deviceId: string): void {
    const device = this.inputs.get(deviceId) as unknown as MockMIDIInput;
    if (device) {
      device.state = 'disconnected';
      if (this.onstatechange) {
        const event = {
          port: device as unknown as MIDIPort,
        } as MIDIConnectionEvent;
        this.onstatechange(event);
      }
    }
  }
}

/**
 * Test fixture for MIDI tests - provides common setup/teardown
 */
export interface MidiTestFixture {
  midiManager: MidiManager;
  mockMidiAccess: MockMIDIAccess;
  mockDevice1: MockMIDIInput;
  mockDevice2: MockMIDIInput;
}

/**
 * Create a standard MIDI test fixture with two mock devices
 */
export function createMidiTestFixture(): MidiTestFixture {
  // Reset MidiManager singleton
  // @ts-expect-error - Accessing private static property for testing
  MidiManager.instance = null;

  const mockDevice1 = new MockMIDIInput('device-1', 'MIDI Keyboard 1', 'Manufacturer A');
  const mockDevice2 = new MockMIDIInput('device-2', 'MIDI Keyboard 2', 'Manufacturer B');
  const mockMidiAccess = new MockMIDIAccess([mockDevice1, mockDevice2]);

  // Mock navigator.requestMIDIAccess
  global.navigator = {
    ...global.navigator,
    requestMIDIAccess: vi.fn().mockResolvedValue(mockMidiAccess),
  };

  const midiManager = MidiManager.getInstance();

  return { midiManager, mockMidiAccess, mockDevice1, mockDevice2 };
}

/**
 * Initialize MIDI and optionally select a device
 */
export async function setupMidiWithDevice(
  fixture: MidiTestFixture,
  selectDevice: boolean = true
): Promise<void> {
  await fixture.midiManager.initialize();
  if (selectDevice) {
    await fixture.midiManager.selectInputDevice('device-1');
  }
}

/**
 * Cleanup MIDI test fixture
 */
export function cleanupMidiTestFixture(fixture: MidiTestFixture): void {
  fixture.midiManager.disconnect();
  vi.clearAllMocks();
}

/**
 * Error test case data for parameterized testing
 */
export const MIDI_ERROR_TEST_CASES = [
  {
    name: 'Web MIDI API not supported',
    setup: () => {
      // @ts-expect-error - Removing requestMIDIAccess for test
      delete global.navigator.requestMIDIAccess;
    },
    expectedError: { type: 'not_supported' },
    expectedStatus: 'unsupported',
  },
  {
    name: 'Permission denied',
    setup: () => {
      const securityError = new Error('Permission denied');
      securityError.name = 'SecurityError';
      global.navigator.requestMIDIAccess = vi.fn().mockRejectedValue(securityError);
    },
    expectedError: { type: 'permission_denied' },
    expectedStatus: 'error',
  },
  {
    name: 'Generic initialization failure',
    setup: () => {
      global.navigator.requestMIDIAccess = vi.fn().mockRejectedValue(
        new Error('Unknown error')
      );
    },
    expectedError: { type: 'initialization_error' },
    expectedStatus: 'error',
  },
] as const;
