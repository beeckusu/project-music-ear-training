# Implementation Plan: META-111

## Ticket Information
- **Ticket**: META-111
- **Title**: Research and integrate Web MIDI API or webmidi library
- **Parent Epic**: META-49 (Note Training - MIDI Keyboard Integration)
- **Branch**: META-111

## Current State Analysis

### What Already Exists ✅
1. **MIDI Utilities** (`src/utils/midiUtils.ts`)
   - Complete MIDI note conversion utilities
   - `midiNoteToNoteWithOctave()` - Converts MIDI numbers to NoteWithOctave
   - `noteWithOctaveToMidiNote()` - Converts NoteWithOctave to MIDI numbers
   - `isPlayableMidiNote()` - Validates MIDI notes are in octaves 1-8
   - MIDI message parsing: `isNoteOnMessage()`, `isNoteOffMessage()`, `getMidiNoteFromMessage()`, `getVelocityFromMessage()`
   - MIDI constants: `MIDI_STATUS` (NOTE_ON, NOTE_OFF, NOTE_ON_MASK)
   - Comprehensive test coverage (100%)

2. **Documentation** (`docs/MIDI_SETUP_GUIDE.md`)
   - Complete user-facing MIDI setup guide
   - Browser compatibility info (Chrome, Edge, Opera supported)
   - MIDI technical reference
   - Troubleshooting guide
   - Code examples showing Web MIDI API usage

3. **MIDI Test Helpers** (`src/utils/__tests__/testHelpers/`)
   - `midiAssertions.ts` - Test assertion helpers
   - `midiMessageBuilder.ts` - MIDI message builders
   - `midiTestData.ts` - Test data generators
   - `midiTestHelpers.ts` - Test utilities

### What's Missing ❌
1. **No actual Web MIDI API integration**
   - No MidiManager or service class
   - No hook for React components to use MIDI
   - No device detection/selection
   - No MIDI message event handling
   - No connection status management

2. **No React Integration**
   - No `useMidi` hook for components
   - No MIDI context provider
   - No visual feedback for MIDI connection status

3. **No Component Integration**
   - Piano keyboard doesn't respond to MIDI input
   - Game orchestrator doesn't handle MIDI events
   - No MIDI-triggered note selection

## Research Findings

### Web MIDI API vs webmidi.js

#### Native Web MIDI API
**Pros:**
- Built into modern browsers (Chrome, Edge, Opera)
- No external dependencies
- Direct access to MIDI hardware
- Lightweight and fast
- Already documented in our MIDI_SETUP_GUIDE.md

**Cons:**
- Lower-level API requires more boilerplate
- Manual device management
- Must handle all MIDI message parsing manually
- More verbose code

**Browser Support:**
- ✅ Chrome 43+
- ✅ Edge 79+
- ✅ Opera 30+
- ❌ Firefox (requires polyfill)
- ❌ Safari (limited support)

#### webmidi.js Library
**Pros:**
- Higher-level abstraction
- Simplified device management
- Event-based API (easier to use)
- Built-in utilities for common MIDI operations
- TypeScript support available

**Cons:**
- External dependency (~50KB)
- Adds to bundle size
- Another library to maintain/update
- Abstraction may hide some control

### Recommendation: Use Native Web MIDI API ✅

**Rationale:**
1. We already have comprehensive MIDI utilities (`midiUtils.ts`)
2. Documentation already references Web MIDI API
3. No need for external dependencies
4. We have full control over implementation
5. Lightweight solution
6. Our utilities handle the low-level parsing already

## Implementation Plan

### Phase 1: Core MIDI Manager Service

**File**: `src/services/MidiManager.ts`

Create a singleton service to manage Web MIDI API integration:

```typescript
class MidiManager {
  // Device management
  - getMidiAccess(): Promise<MIDIAccess>
  - getAvailableInputs(): MIDIInput[]
  - getAvailableOutputs(): MIDIOutput[]
  - selectInputDevice(deviceId: string): void

  // Event handling
  - onMidiMessage(callback: (message: MidiMessage) => void): void
  - onDeviceConnected(callback: (device: MIDIInput) => void): void
  - onDeviceDisconnected(callback: (device: MIDIInput) => void): void

  // Connection management
  - initialize(): Promise<void>
  - disconnect(): void
  - getConnectionStatus(): ConnectionStatus
}
```

**Features:**
- Singleton pattern for global MIDI state
- Device detection and selection
- Event subscription system
- Connection status tracking
- Error handling for permission denial
- TypeScript types for all MIDI operations

### Phase 2: React Hook Integration

**File**: `src/hooks/useMidi.ts`

Create a React hook to provide MIDI functionality to components:

```typescript
function useMidi() {
  return {
    // Connection state
    isConnected: boolean
    isInitializing: boolean
    error: Error | null

    // Device management
    availableDevices: MIDIInput[]
    selectedDevice: MIDIInput | null
    selectDevice: (deviceId: string) => void

    // Event handlers
    onNoteOn: (callback: (note: NoteWithOctave, velocity: number) => void) => void
    onNoteOff: (callback: (note: NoteWithOctave) => void) => void

    // Utility
    requestPermission: () => Promise<void>
  }
}
```

**Features:**
- React state management for MIDI connection
- Automatic cleanup on unmount
- Type-safe event callbacks
- Easy integration with existing components

### Phase 3: Component Integration

**Files to Update:**
1. `src/components/PianoKeyboard.tsx` (or equivalent)
   - Add MIDI input handling
   - Highlight keys when MIDI notes are played
   - Visual feedback for MIDI connection

2. `src/game/GameOrchestrator.ts` (or equivalent)
   - Accept MIDI note events as input
   - Integrate with existing handleUserAction

3. Settings/UI Components
   - MIDI device selection dropdown
   - Connection status indicator
   - Enable/disable MIDI toggle

### Phase 4: Testing

**Files to Create:**
1. `src/services/__tests__/MidiManager.test.ts`
   - Test device detection
   - Test message parsing
   - Test connection states
   - Mock Web MIDI API

2. `src/hooks/__tests__/useMidi.test.ts`
   - Test hook initialization
   - Test event handlers
   - Test device selection
   - Test cleanup

3. Integration tests
   - E2E MIDI input flow
   - Device connection/disconnection
   - Permission handling

### Phase 5: Documentation

**Files to Update:**
1. `README.md` - Add MIDI features section
2. Create `docs/MIDI_INTEGRATION.md` - Developer guide for MIDI integration
3. Add JSDoc comments to MidiManager and useMidi

## Acceptance Criteria

✅ This ticket (META-111) is complete when:

1. **Web MIDI API is integrated** (not webmidi.js library)
2. **MidiManager service is implemented** with:
   - Device detection
   - Connection management
   - Event handling
   - Error handling
3. **useMidi React hook is created** and tested
4. **Browser compatibility is verified** (Chrome, Edge)
5. **TypeScript types are properly defined**
6. **Unit tests are written** with good coverage
7. **Decision is documented** in this plan

## Next Steps (Future Tickets)

After META-111 is complete, the following tickets will build on this foundation:

- **META-112**: Create MidiManager utility class (✅ covered in this ticket)
- **META-113**: Add MIDI event handlers to game components
- **META-114**: Create MIDI device selection UI
- **META-115**: Add visual feedback for MIDI connection status
- **META-116**: Test MIDI integration with Note Training modes

## Technical Notes

### Permission Handling
Web MIDI API requires user permission. We'll:
1. Request permission on first MIDI feature access
2. Handle permission denial gracefully
3. Provide clear UI feedback about permission status

### Browser Detection
```typescript
const isMidiSupported = 'requestMIDIAccess' in navigator;
```

### Security Considerations
- MIDI access requires HTTPS (or localhost)
- User must grant explicit permission
- No MIDI data is transmitted externally (local-only processing)

### Performance
- MIDI events are high-frequency (can be 1000+ per second)
- Use debouncing/throttling where appropriate
- Optimize message parsing with our existing midiUtils

## File Structure

```
src/
├── services/
│   ├── MidiManager.ts          [NEW]
│   └── __tests__/
│       └── MidiManager.test.ts [NEW]
├── hooks/
│   ├── useMidi.ts              [NEW]
│   └── __tests__/
│       └── useMidi.test.ts     [NEW]
├── utils/
│   └── midiUtils.ts            [EXISTS - no changes needed]
└── types/
    └── midi.ts                 [NEW - TypeScript types]
```

## Implementation Timeline

1. **MidiManager Service** - Core MIDI integration (2-3 hours)
2. **useMidi Hook** - React integration (1-2 hours)
3. **TypeScript Types** - Type definitions (30 min)
4. **Testing** - Unit tests for service and hook (2-3 hours)
5. **Documentation** - Update docs with implementation details (1 hour)

**Total Estimated Time**: 7-10 hours

## Decision Summary

**Chosen Solution**: Native Web MIDI API

**Reasoning**:
1. No external dependencies needed
2. We already have MIDI utilities built
3. Documentation already covers Web MIDI API
4. Full control over implementation
5. Smaller bundle size
6. Aligns with existing architecture

**Installation Required**: None (Web MIDI API is built into browsers)

**TypeScript Support**: Yes, via `@types/webmidi` if needed, or custom type definitions

## Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| Browser compatibility issues | Detect support, show clear fallback message for unsupported browsers |
| Permission denial | Graceful error handling, clear UI to request permission again |
| Multiple devices confusing users | Default to first device, provide device selection UI |
| High-frequency events causing performance issues | Debounce/throttle where appropriate, optimize parsing |
| MIDI device disconnection during practice | Detect disconnection, show reconnection UI |

## Success Metrics

- ✅ Web MIDI API successfully integrated
- ✅ No external MIDI libraries added
- ✅ TypeScript types properly defined
- ✅ MidiManager service tested with >80% coverage
- ✅ useMidi hook tested with >80% coverage
- ✅ Documentation updated
- ✅ Decision documented and justified

---

**Status**: Ready for implementation
**Assigned to**: Development team
**Blocked by**: None
**Blocks**: META-112, META-113, META-114, META-115, META-116
