import { EventEmitter } from '../utils/EventEmitter';
import {
  isNoteOnMessage,
  isNoteOffMessage,
  getMidiNoteFromMessage,
  getVelocityFromMessage,
  midiNoteToNoteWithOctave,
  isPlayableMidiNote,
  type MidiMessage,
} from '../utils/midiUtils';
import type {
  MidiConnectionStatus,
  MidiDeviceInfo,
  MidiNoteEvent,
  MidiError,
  MidiErrorType,
  MidiManagerEvents,
} from '../types/midi';

/**
 * MidiManager - Singleton service for managing Web MIDI API interactions
 *
 * Provides centralized management of:
 * - MIDI device detection and selection
 * - MIDI message event handling
 * - Connection state management
 * - Device plug/unplug events
 *
 * @example
 * ```typescript
 * const midiManager = MidiManager.getInstance();
 *
 * // Initialize MIDI
 * await midiManager.initialize();
 *
 * // Listen for note events
 * midiManager.on('noteOn', (event) => {
 *   console.log(`Note played: ${event.note.note}${event.note.octave}`);
 * });
 *
 * // Get available devices
 * const devices = midiManager.getAvailableInputs();
 *
 * // Select a device
 * if (devices.length > 0) {
 *   midiManager.selectInputDevice(devices[0].id);
 * }
 * ```
 */
export class MidiManager extends EventEmitter<MidiManagerEvents> {
  private static instance: MidiManager | null = null;
  private midiAccess: MIDIAccess | null = null;
  private selectedInputId: string | null = null;
  private status: MidiConnectionStatus = 'disconnected';

  /**
   * Private constructor to enforce singleton pattern
   */
  private constructor() {
    super();
  }

  /**
   * Gets the singleton instance of MidiManager
   * @returns The MidiManager instance
   */
  public static getInstance(): MidiManager {
    if (!MidiManager.instance) {
      MidiManager.instance = new MidiManager();
    }
    return MidiManager.instance;
  }

  /**
   * Checks if Web MIDI API is supported in the current browser
   * @returns true if supported, false otherwise
   */
  public isSupported(): boolean {
    return 'requestMIDIAccess' in navigator;
  }

  /**
   * Initializes the MIDI system by requesting browser MIDI access
   * @throws {MidiError} If initialization fails
   */
  public async initialize(): Promise<void> {
    // Check browser support
    if (!this.isSupported()) {
      const error: MidiError = {
        type: 'not_supported',
        message: 'Web MIDI API is not supported in this browser',
      };
      this.updateStatus('unsupported');
      this.emit('error', error);
      throw error;
    }

    // Already initialized
    if (this.midiAccess) {
      return;
    }

    this.updateStatus('initializing');

    try {
      // Request MIDI access
      this.midiAccess = await navigator.requestMIDIAccess();

      // Listen for device state changes (plug/unplug)
      this.midiAccess.onstatechange = this.handleStateChange.bind(this);

      // If we had a previously selected device, try to reconnect
      if (this.selectedInputId) {
        const device = this.midiAccess.inputs.get(this.selectedInputId);
        if (device && device.state === 'connected') {
          await this.attachInputListener(device);
          this.updateStatus('connected');
        } else {
          this.selectedInputId = null;
          this.updateStatus('disconnected');
        }
      } else {
        this.updateStatus('disconnected');
      }
    } catch (error) {
      const midiError: MidiError = {
        type: error instanceof Error && error.name === 'SecurityError'
          ? 'permission_denied'
          : 'initialization_error',
        message: error instanceof Error ? error.message : 'Failed to initialize MIDI',
        originalError: error instanceof Error ? error : undefined,
      };

      this.updateStatus('error');
      this.emit('error', midiError);
      throw midiError;
    }
  }

  /**
   * Checks if MIDI system has been initialized
   * @returns true if initialized, false otherwise
   */
  public isInitialized(): boolean {
    return this.midiAccess !== null;
  }

  /**
   * Gets the current connection status
   * @returns Current MIDI connection status
   */
  public getConnectionStatus(): MidiConnectionStatus {
    return this.status;
  }

  /**
   * Gets list of available MIDI input devices
   * @returns Array of MIDI device information
   */
  public getAvailableInputs(): MidiDeviceInfo[] {
    if (!this.midiAccess) {
      return [];
    }

    const devices: MidiDeviceInfo[] = [];
    this.midiAccess.inputs.forEach((input) => {
      devices.push(this.convertToDeviceInfo(input));
    });

    return devices;
  }

  /**
   * Gets list of available MIDI output devices (for future use)
   * @returns Array of MIDI device information
   */
  public getAvailableOutputs(): MidiDeviceInfo[] {
    if (!this.midiAccess) {
      return [];
    }

    const devices: MidiDeviceInfo[] = [];
    this.midiAccess.outputs.forEach((output) => {
      devices.push(this.convertToDeviceInfo(output));
    });

    return devices;
  }

  /**
   * Checks if any MIDI devices are available
   * @returns true if at least one input device is available
   */
  public hasDevices(): boolean {
    return this.getAvailableInputs().length > 0;
  }

  /**
   * Selects a MIDI input device by ID
   * @param deviceId - The ID of the device to select
   * @throws {Error} If MIDI is not initialized or device not found
   */
  public async selectInputDevice(deviceId: string): Promise<void> {
    if (!this.midiAccess) {
      throw new Error('MIDI not initialized. Call initialize() first.');
    }

    const device = this.midiAccess.inputs.get(deviceId);
    if (!device) {
      throw new Error(`MIDI input device with ID ${deviceId} not found`);
    }

    // Remove listener from previously selected device
    if (this.selectedInputId) {
      const previousDevice = this.midiAccess.inputs.get(this.selectedInputId);
      if (previousDevice) {
        previousDevice.onmidimessage = null;
      }
    }

    // Attach listener to new device
    this.selectedInputId = deviceId;
    await this.attachInputListener(device);
    this.updateStatus('connected');
  }

  /**
   * Gets information about the currently selected device
   * @returns Device information or null if no device selected
   */
  public getSelectedDevice(): MidiDeviceInfo | null {
    if (!this.midiAccess || !this.selectedInputId) {
      return null;
    }

    const device = this.midiAccess.inputs.get(this.selectedInputId);
    return device ? this.convertToDeviceInfo(device) : null;
  }

  /**
   * Disconnects from MIDI and cleans up resources
   */
  public disconnect(): void {
    if (this.midiAccess) {
      // Remove all device listeners
      this.midiAccess.inputs.forEach((input) => {
        input.onmidimessage = null;
      });

      // Remove state change listener
      this.midiAccess.onstatechange = null;
    }

    this.midiAccess = null;
    this.selectedInputId = null;
    this.removeAllListeners();
    this.updateStatus('disconnected');
  }

  /**
   * Handles MIDI device state changes (connect/disconnect)
   * @private
   */
  private handleStateChange(event: MIDIConnectionEvent): void {
    const port = event.port;

    // Only handle input devices
    if (port.type !== 'input') {
      return;
    }

    const deviceInfo = this.convertToDeviceInfo(port);

    if (port.state === 'connected') {
      this.emit('deviceConnected', deviceInfo);

      // If this was our selected device, reattach listener
      if (port.id === this.selectedInputId) {
        // Fire and forget - don't await in event handler
        this.attachInputListener(port as MIDIInput).then(() => {
          this.updateStatus('connected');
        });
      }
    } else if (port.state === 'disconnected') {
      this.emit('deviceDisconnected', deviceInfo);

      // If this was our selected device, update status
      if (port.id === this.selectedInputId) {
        this.updateStatus('disconnected');
      }
    }
  }

  /**
   * Attaches MIDI message listener to an input device
   * @private
   */
  private async attachInputListener(input: MIDIInput): Promise<void> {
    // Open the MIDI port if it's not already open
    if (input.connection !== 'open') {
      try {
        await input.open();
      } catch (err) {
        console.error('[MidiManager] Failed to open MIDI port:', err);
        return;
      }
    }

    input.onmidimessage = (event: MIDIMessageEvent) => {
      this.handleMidiMessage(event);
    };
  }

  /**
   * Handles incoming MIDI messages
   * @private
   */
  private handleMidiMessage(event: MIDIMessageEvent): void {
    const data = event.data;

    // Emit raw message event
    this.emit('message', {
      data,
      timestamp: event.timeStamp,
    });

    // Parse message
    const message: MidiMessage = {
      status: data[0],
      data1: data[1],
      data2: data[2],
    };

    // Handle note events
    if (isNoteOnMessage(message)) {
      this.handleNoteOn(message, event.timeStamp);
    } else if (isNoteOffMessage(message)) {
      this.handleNoteOff(message, event.timeStamp);
    }
  }

  /**
   * Handles note on messages
   * @private
   */
  private handleNoteOn(message: MidiMessage, timestamp: number): void {
    const midiNote = getMidiNoteFromMessage(message);
    const velocity = getVelocityFromMessage(message);

    if (midiNote === null || velocity === null) {
      return;
    }

    // Only emit events for playable notes (octaves 1-8)
    if (!isPlayableMidiNote(midiNote)) {
      return;
    }

    try {
      const note = midiNoteToNoteWithOctave(midiNote);
      const noteEvent: MidiNoteEvent = {
        note,
        midiNote,
        velocity,
        timestamp,
      };

      this.emit('noteOn', noteEvent);
    } catch (error) {
      // Silently ignore notes that can't be converted
      // (they're outside our playable range)
    }
  }

  /**
   * Handles note off messages
   * @private
   */
  private handleNoteOff(message: MidiMessage, timestamp: number): void {
    const midiNote = getMidiNoteFromMessage(message);
    const velocity = getVelocityFromMessage(message) ?? 0;

    if (midiNote === null) {
      return;
    }

    // Only emit events for playable notes (octaves 1-8)
    if (!isPlayableMidiNote(midiNote)) {
      return;
    }

    try {
      const note = midiNoteToNoteWithOctave(midiNote);
      const noteEvent: MidiNoteEvent = {
        note,
        midiNote,
        velocity,
        timestamp,
      };

      this.emit('noteOff', noteEvent);
    } catch (error) {
      // Silently ignore notes that can't be converted
    }
  }

  /**
   * Converts MIDIInput/MIDIOutput to MidiDeviceInfo
   * @private
   */
  private convertToDeviceInfo(port: MIDIInput | MIDIOutput): MidiDeviceInfo {
    return {
      id: port.id,
      manufacturer: port.manufacturer || 'Unknown',
      name: port.name || 'Unknown Device',
      state: port.state as 'connected' | 'disconnected',
      type: port.type as 'input' | 'output',
    };
  }

  /**
   * Updates connection status and emits status change event
   * @private
   */
  private updateStatus(newStatus: MidiConnectionStatus): void {
    if (this.status !== newStatus) {
      this.status = newStatus;
      this.emit('statusChange', newStatus);
    }
  }
}
