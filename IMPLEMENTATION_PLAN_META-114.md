# Implementation Plan: META-114

## Ticket Information
- **Ticket**: META-114
- **Title**: Add MIDI device selector in settings
- **Parent Epic**: META-49 (Note Training - MIDI Keyboard Integration)
- **Branch**: META-114 (created from META-49)
- **Status**: In Progress
- **Depends On**: META-113 (Detect and list available MIDI devices) ✅ COMPLETED

## Overview

Add a MIDI device selector dropdown in the audio settings to allow users to choose which MIDI input device to use for keyboard input. The selected device should be persisted in settings and automatically reconnected on app load.

## Current State Analysis

### What Already Exists ✅

1. **MidiManager Service** (`src/services/MidiManager.ts`)
   - Singleton service managing Web MIDI API
   - Device detection: `getAvailableInputs()`, `hasDevices()`
   - Device selection: `selectInputDevice(deviceId)`
   - Connection status tracking: `getConnectionStatus()`
   - Event system for device changes, note events, errors
   - Already implemented in META-112 ✅

2. **MIDI Types** (`src/types/midi.ts`)
   - `MidiDeviceInfo` interface with id, name, manufacturer, state
   - `MidiConnectionStatus` type
   - Event types for device connection/disconnection
   - Complete type safety for MIDI operations

3. **MIDI Utilities** (`src/utils/midiUtils.ts`)
   - MIDI message parsing
   - Note conversion utilities
   - Validation functions

4. **Settings System**
   - `AudioSettings` interface (`src/types/music.ts`)
   - `useSettings` hook with `updateAudioSettings()`
   - Settings persistence (presumably localStorage)
   - `AudioSettings.tsx` component for volume and instrument selection

### What's Missing ❌

1. **No MIDI device ID in settings type**
   - `AudioSettings` doesn't have `midiDeviceId` field
   - Settings system doesn't persist selected MIDI device

2. **No MIDI device selector UI**
   - No dropdown to list and select MIDI devices
   - No visual indication of connection status
   - No "No devices found" message

3. **No auto-connect logic**
   - App doesn't initialize MidiManager on load
   - Doesn't restore previously selected device
   - Doesn't handle device becoming unavailable

## Acceptance Criteria

From the Jira ticket, this feature is complete when:

✅ **Core Functionality:**
- [ ] Add MIDI device dropdown to audio settings
- [ ] Display all available MIDI input devices
- [ ] Show "No MIDI devices found" if none available
- [ ] Allow user to select device
- [ ] Save selected device to settings
- [ ] Auto-connect to previously selected device on app load
- [ ] Show connection status (connected/disconnected)

✅ **Technical Requirements:**
- [ ] Update `AudioSettings` type to include `midiDeviceId?: string`
- [ ] Create or update `AudioSettings.tsx` with MIDI selector
- [ ] Integrate with MidiManager service
- [ ] Handle device unavailability gracefully

## Implementation Plan

### Phase 1: Update Settings Types ⚙️

**File**: `src/types/music.ts`

Add MIDI device ID to the AudioSettings interface:

```typescript
export interface AudioSettings {
  volume: number; // 0-100
  instrument: InstrumentType;
  midiDeviceId?: string; // Selected MIDI input device ID (optional)
}
```

**Changes:**
- Add `midiDeviceId?: string` as optional field
- Optional because not all users will have MIDI devices
- Will be `undefined` if no device selected or no devices available

### Phase 2: Create MIDI Device Selector Component 🎹

**File**: `src/components/settings/MidiDeviceSelector.tsx` (NEW)

Create a reusable component for MIDI device selection:

```typescript
interface MidiDeviceSelectorProps {
  selectedDeviceId: string | undefined;
  onDeviceChange: (deviceId: string | undefined) => void;
}

export const MidiDeviceSelector: React.FC<MidiDeviceSelectorProps> = ({
  selectedDeviceId,
  onDeviceChange
}) => {
  // State
  const [devices, setDevices] = useState<MidiDeviceInfo[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<MidiConnectionStatus>('disconnected');
  const [isInitializing, setIsInitializing] = useState(false);
  const [error, setError] = useState<MidiError | null>(null);

  // Get MidiManager instance
  const midiManager = MidiManager.getInstance();

  // Initialize MIDI on mount
  useEffect(() => {
    const initializeMidi = async () => {
      if (!midiManager.isSupported()) {
        setConnectionStatus('unsupported');
        return;
      }

      if (midiManager.isInitialized()) {
        // Already initialized, just update device list
        setDevices(midiManager.getAvailableInputs());
        setConnectionStatus(midiManager.getConnectionStatus());
        return;
      }

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

    // Subscribe to device changes
    const handleDeviceConnected = (device: MidiDeviceInfo) => {
      setDevices(midiManager.getAvailableInputs());
    };

    const handleDeviceDisconnected = (device: MidiDeviceInfo) => {
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

    midiManager.on('deviceConnected', handleDeviceConnected);
    midiManager.on('deviceDisconnected', handleDeviceDisconnected);
    midiManager.on('statusChange', handleStatusChange);
    midiManager.on('error', handleError);

    // Cleanup
    return () => {
      midiManager.off('deviceConnected', handleDeviceConnected);
      midiManager.off('deviceDisconnected', handleDeviceDisconnected);
      midiManager.off('statusChange', handleStatusChange);
      midiManager.off('error', handleError);
    };
  }, [midiManager, selectedDeviceId, onDeviceChange]);

  // Handle device selection
  const handleDeviceSelect = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const deviceId = event.target.value || undefined;

    if (deviceId) {
      midiManager.selectInputDevice(deviceId);
    }

    onDeviceChange(deviceId);
  };

  // Render states
  if (connectionStatus === 'unsupported') {
    return (
      <div className="midi-selector-message">
        <span className="error-icon">⚠️</span>
        <span>Web MIDI is not supported in this browser. Please use Chrome or Edge.</span>
      </div>
    );
  }

  if (isInitializing) {
    return (
      <div className="midi-selector-message">
        <span>Detecting MIDI devices...</span>
      </div>
    );
  }

  if (error && error.type === 'permission_denied') {
    return (
      <div className="midi-selector-message">
        <span className="error-icon">⚠️</span>
        <span>MIDI access denied. Please grant permission in browser settings.</span>
      </div>
    );
  }

  if (devices.length === 0) {
    return (
      <div className="midi-selector-message">
        <span className="info-icon">ℹ️</span>
        <span>No MIDI devices found. Connect a MIDI keyboard to enable input.</span>
      </div>
    );
  }

  // Render device selector
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
            {device.name} {device.manufacturer && `(${device.manufacturer})`}
          </option>
        ))}
      </select>
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
```

**Features:**
- Automatic MIDI initialization on mount
- Device list updates when devices are plugged/unplugged
- Handles all error states (unsupported, permission denied, no devices)
- Shows connection status for selected device
- Clears selection if selected device is disconnected
- Clean event subscription/unsubscription

### Phase 3: Integrate into AudioSettings Component 🔧

**File**: `src/components/settings/AudioSettings.tsx`

Add MIDI device selector to the existing AudioSettings component:

```typescript
import { MidiDeviceSelector } from './MidiDeviceSelector';

const AudioSettings: React.FC = () => {
  const { settings, pendingSettings, updateAudioSettings } = useSettings();
  const { volume, instrument, midiDeviceId } = pendingSettings.audio;

  // ... existing volume and instrument handlers ...

  const handleMidiDeviceChange = (deviceId: string | undefined) => {
    updateAudioSettings({ midiDeviceId: deviceId });
  };

  return (
    <div className="tab-content">
      {/* Existing volume setting */}
      <div className="setting-group">
        <label>Volume</label>
        {/* ... existing volume slider ... */}
      </div>

      {/* Existing instrument setting */}
      <div className="setting-group">
        <label>Instrument</label>
        {/* ... existing instrument buttons ... */}
      </div>

      {/* NEW: MIDI device setting */}
      <div className="setting-group">
        <label>MIDI Input Device</label>
        <MidiDeviceSelector
          selectedDeviceId={midiDeviceId}
          onDeviceChange={handleMidiDeviceChange}
        />
      </div>
    </div>
  );
};
```

**Changes:**
- Import MidiDeviceSelector component
- Extract `midiDeviceId` from pending settings
- Add handler for device changes
- Add new setting group for MIDI device selection

### Phase 4: Auto-Connect on App Load 🚀

**Location**: App initialization (e.g., `App.tsx` or main component)

Add logic to restore and auto-connect to previously selected MIDI device:

```typescript
// In App.tsx or similar top-level component
useEffect(() => {
  const initializeMidi = async () => {
    const midiManager = MidiManager.getInstance();

    // Check if MIDI is supported
    if (!midiManager.isSupported()) {
      return;
    }

    try {
      // Initialize MIDI system
      await midiManager.initialize();

      // Get saved device ID from settings
      const savedDeviceId = settings.audio.midiDeviceId;

      if (savedDeviceId) {
        // Check if the saved device is still available
        const availableDevices = midiManager.getAvailableInputs();
        const savedDevice = availableDevices.find(d => d.id === savedDeviceId);

        if (savedDevice && savedDevice.state === 'connected') {
          // Auto-connect to previously selected device
          midiManager.selectInputDevice(savedDeviceId);
          console.log('Auto-connected to MIDI device:', savedDevice.name);
        } else {
          // Device no longer available, clear from settings
          console.warn('Previously selected MIDI device not found:', savedDeviceId);
          // Optionally: updateAudioSettings({ midiDeviceId: undefined });
        }
      }
    } catch (error) {
      console.error('Failed to initialize MIDI:', error);
      // Error is already handled by MidiManager and emitted as event
    }
  };

  initializeMidi();
}, [settings.audio.midiDeviceId]);
```

**Features:**
- Runs once on app mount
- Only initializes if MIDI is supported
- Checks if saved device is still available
- Auto-connects if device is found and connected
- Handles case where device is no longer available
- Logs events for debugging

### Phase 5: Styling 🎨

**File**: `src/components/settings/AudioSettings.css` (or global styles)

Add styles for MIDI device selector:

```css
/* MIDI Device Selector */
.midi-device-selector {
  display: flex;
  align-items: center;
  gap: 12px;
}

.midi-device-dropdown {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #ccc;
  border-radius: 4px;
  background-color: white;
  font-size: 14px;
  cursor: pointer;
}

.midi-device-dropdown:hover {
  border-color: #999;
}

.midi-device-dropdown:focus {
  outline: none;
  border-color: #007bff;
  box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
}

.connection-status {
  font-size: 12px;
  padding: 4px 8px;
  border-radius: 4px;
  white-space: nowrap;
}

.connection-status.connected {
  color: #28a745;
  background-color: #d4edda;
}

.connection-status.disconnected {
  color: #6c757d;
  background-color: #e9ecef;
}

.midi-selector-message {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  background-color: #f8f9fa;
  border-radius: 4px;
  font-size: 14px;
  color: #495057;
}

.midi-selector-message .error-icon {
  color: #dc3545;
}

.midi-selector-message .info-icon {
  color: #17a2b8;
}
```

### Phase 6: Testing 🧪

**Test Files to Create:**

1. **`src/components/settings/__tests__/MidiDeviceSelector.test.tsx`**
   - Test component renders with no devices
   - Test device list rendering
   - Test device selection
   - Test connection status display
   - Test error states (unsupported, permission denied)
   - Test device plug/unplug events
   - Test cleanup on unmount

2. **`src/components/settings/__tests__/AudioSettings.test.tsx`** (UPDATE)
   - Test MIDI device selector is rendered
   - Test MIDI device change updates settings
   - Test integration with useSettings hook

3. **Integration Tests**
   - Test auto-connect on app load
   - Test device persistence across sessions
   - Test device unavailability handling

**Test Scenarios:**

```typescript
// Mock MidiManager for tests
jest.mock('../../../services/MidiManager', () => ({
  MidiManager: {
    getInstance: jest.fn(() => ({
      isSupported: jest.fn(() => true),
      isInitialized: jest.fn(() => false),
      initialize: jest.fn(() => Promise.resolve()),
      getAvailableInputs: jest.fn(() => [
        { id: 'device1', name: 'Test MIDI Keyboard', manufacturer: 'Test', state: 'connected', type: 'input' }
      ]),
      getConnectionStatus: jest.fn(() => 'connected'),
      selectInputDevice: jest.fn(),
      on: jest.fn(),
      off: jest.fn(),
    })),
  },
}));

describe('MidiDeviceSelector', () => {
  it('shows "No MIDI devices found" when no devices available', () => {
    // Mock empty device list
    // Render component
    // Assert message is displayed
  });

  it('renders device dropdown when devices are available', () => {
    // Mock device list
    // Render component
    // Assert dropdown is rendered with devices
  });

  it('calls onDeviceChange when device is selected', () => {
    // Mock device selection
    // Simulate user selecting device
    // Assert onDeviceChange is called with correct device ID
  });

  it('shows connection status when device is selected', () => {
    // Mock connected device
    // Render with selected device
    // Assert connection status is displayed
  });

  it('handles device disconnection', () => {
    // Mock device disconnection event
    // Assert device is removed from list
    // Assert onDeviceChange is called with undefined
  });
});
```

## Edge Cases and Error Handling

### 1. No MIDI Devices Available
**Scenario**: User has no MIDI keyboard connected

**Handling**:
- Display message: "No MIDI devices found. Connect a MIDI keyboard to enable input."
- Show info icon
- Disable dropdown or show placeholder

### 2. Browser Doesn't Support Web MIDI
**Scenario**: User opens app in Firefox or Safari

**Handling**:
- Display message: "Web MIDI is not supported in this browser. Please use Chrome or Edge."
- Show warning icon
- Don't show dropdown
- Set connection status to 'unsupported'

### 3. User Denies MIDI Permission
**Scenario**: Browser prompts for MIDI access, user clicks "Deny"

**Handling**:
- Display message: "MIDI access denied. Please grant permission in browser settings."
- Show warning icon
- Provide link/instructions to reset permissions

### 4. Previously Selected Device No Longer Available
**Scenario**: User selected device in previous session, but it's disconnected now

**Handling**:
- On app load, check if saved device ID exists in available devices
- If not found, log warning and don't auto-connect
- Optionally clear `midiDeviceId` from settings
- Show "No device selected" in dropdown
- Connection status shows "disconnected"

### 5. Device Disconnects During Use
**Scenario**: User is using app, unplugs MIDI keyboard

**Handling**:
- MidiManager emits 'deviceDisconnected' event
- MidiDeviceSelector receives event
- Updates device list (removes disconnected device)
- If disconnected device was selected, clear selection
- Call `onDeviceChange(undefined)` to update settings
- Show message: "MIDI device disconnected"

### 6. Multiple Devices Available
**Scenario**: User has multiple MIDI keyboards connected

**Handling**:
- Show all devices in dropdown
- Display manufacturer name to help distinguish
- User can switch between devices
- Only one device active at a time

### 7. Device State Changes (Reconnection)
**Scenario**: User unplugs and replugs the same device

**Handling**:
- MidiManager detects device reconnection
- If device ID matches saved device, could auto-reconnect
- Or wait for user to manually select again
- Update connection status indicator

## File Structure

```
src/
├── components/
│   └── settings/
│       ├── AudioSettings.tsx           [UPDATE - add MIDI selector]
│       ├── MidiDeviceSelector.tsx      [NEW - device selector component]
│       └── __tests__/
│           ├── AudioSettings.test.tsx  [UPDATE - test MIDI integration]
│           └── MidiDeviceSelector.test.tsx [NEW - test selector]
├── services/
│   └── MidiManager.ts                  [EXISTS - no changes needed]
├── types/
│   ├── music.ts                        [UPDATE - add midiDeviceId to AudioSettings]
│   └── midi.ts                         [EXISTS - no changes needed]
└── App.tsx (or main component)         [UPDATE - add auto-connect logic]
```

## Migration and Backwards Compatibility

### Settings Migration

**Issue**: Existing users have `AudioSettings` without `midiDeviceId`

**Solution**: Field is optional (`midiDeviceId?: string`)
- Existing settings remain valid
- New field is `undefined` until user selects device
- No migration script needed

### Default Value

**When no device selected**: `midiDeviceId` is `undefined`

**First-time users**:
- Field is undefined
- No auto-connect attempt
- User must manually select device

**Returning users with saved device**:
- Settings contain `midiDeviceId: "device123"`
- App attempts to auto-connect on load
- Falls back to undefined if device not available

## Success Metrics

This ticket is complete when:

- ✅ `AudioSettings` type includes `midiDeviceId?: string`
- ✅ `MidiDeviceSelector` component created and functional
- ✅ MIDI device dropdown rendered in AudioSettings
- ✅ User can select MIDI device from dropdown
- ✅ Selected device is saved to settings
- ✅ Selected device persists across sessions
- ✅ App auto-connects to saved device on load
- ✅ Connection status indicator shows connected/disconnected
- ✅ "No MIDI devices found" message shown when appropriate
- ✅ Unsupported browser message shown for Firefox/Safari
- ✅ Permission denied error handled gracefully
- ✅ Device disconnection handled properly
- ✅ Tests written with good coverage (>80%)
- ✅ Styling is clean and consistent with app design

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| MidiManager not initialized before selector renders | Component shows "No devices" incorrectly | Initialize MIDI in selector's useEffect, handle initializing state |
| Device ID persists but device no longer exists | Auto-connect fails, confusing user | Check device availability before auto-connect, clear invalid ID |
| Multiple rapid device changes | State updates race, UI flickers | Debounce device change events, use proper cleanup |
| User has many MIDI devices | Dropdown becomes unwieldy | Show manufacturer to distinguish, use native dropdown scrolling |
| Settings update race condition | Selected device not persisted | Use proper React state management, ensure settings hook handles updates correctly |

## Dependencies

**Depends On:**
- ✅ META-112: MidiManager service (COMPLETED)
- ✅ META-113: Device detection (COMPLETED - MidiManager has `getAvailableInputs()`)

**Blocks:**
- Future tickets for MIDI input handling in game components
- Visual feedback when MIDI notes are played

## Technical Notes

### MidiManager API Usage

```typescript
const midiManager = MidiManager.getInstance();

// Check support
midiManager.isSupported(); // true/false

// Initialize
await midiManager.initialize(); // throws MidiError on failure

// Get devices
const devices = midiManager.getAvailableInputs(); // MidiDeviceInfo[]

// Select device
midiManager.selectInputDevice(deviceId); // void

// Get status
const status = midiManager.getConnectionStatus(); // MidiConnectionStatus

// Subscribe to events
midiManager.on('deviceConnected', (device) => { ... });
midiManager.on('deviceDisconnected', (device) => { ... });
midiManager.on('statusChange', (status) => { ... });
midiManager.on('error', (error) => { ... });

// Unsubscribe (important for cleanup!)
midiManager.off('deviceConnected', handler);
```

### Settings Hook Usage

```typescript
const { settings, pendingSettings, updateAudioSettings } = useSettings();

// Get current saved device ID
const savedDeviceId = settings.audio.midiDeviceId;

// Get pending (not yet saved) device ID
const pendingDeviceId = pendingSettings.audio.midiDeviceId;

// Update device ID
updateAudioSettings({ midiDeviceId: 'new-device-id' });

// Clear device ID
updateAudioSettings({ midiDeviceId: undefined });
```

## Timeline Estimate

1. **Update AudioSettings type** - 15 minutes
2. **Create MidiDeviceSelector component** - 2-3 hours
   - Component structure and logic
   - Event handling and state management
   - Error states and messages
3. **Integrate into AudioSettings** - 30 minutes
4. **Add auto-connect logic** - 1 hour
5. **Styling** - 1 hour
6. **Testing** - 2-3 hours
   - Unit tests for MidiDeviceSelector
   - Update AudioSettings tests
   - Integration tests
7. **Documentation and cleanup** - 30 minutes

**Total Estimated Time**: 7-9 hours

## Next Steps After This Ticket

Once META-114 is complete, the following tickets can proceed:

1. **META-115**: Add MIDI event handlers to game components
   - Handle note-on events from MIDI
   - Integrate with game orchestrator
   - Visual feedback when MIDI notes played

2. **META-116**: Test MIDI integration with Note Training modes
   - E2E testing with real MIDI input
   - Verify note identification works
   - Test chord input

3. **Future Enhancements**:
   - MIDI velocity sensitivity settings
   - Sustain pedal support
   - MIDI learn mode
   - MIDI channel filtering

---

**Status**: Ready for implementation
**Branch**: META-114 (based on META-49)
**Assigned to**: Development team
**Blocked by**: None (dependencies completed)
**Estimated Completion**: 7-9 hours
