# MIDI Keyboard Setup Guide

Welcome to the MIDI Keyboard Setup Guide for the Music Practice App! This guide will help you connect and configure your MIDI keyboard to practice with real piano input instead of clicking on-screen keys.

## Table of Contents

- [Introduction](#introduction)
- [Quick Start](#quick-start)
- [Detailed Setup Instructions](#detailed-setup-instructions)
  - [Hardware Connection](#hardware-connection)
  - [Browser Permissions](#browser-permissions)
  - [Testing MIDI Connection](#testing-midi-connection)
- [Using MIDI with Practice Modes](#using-midi-with-practice-modes)
- [MIDI Technical Reference](#midi-technical-reference)
- [Troubleshooting](#troubleshooting)
- [Supported MIDI Keyboards](#supported-midi-keyboards)
- [Advanced Configuration](#advanced-configuration)
- [FAQ](#faq)
- [Resources](#resources)

---

## Introduction

### Why Use a MIDI Keyboard?

Connecting a physical MIDI keyboard to the Music Practice App provides a more authentic practice experience:

- **Hands-on Learning**: Practice with the same muscle memory you'll use on a real piano
- **Natural Input**: Play notes naturally instead of clicking with a mouse
- **Velocity Sensitivity**: Experience dynamic playing with keyboards that support velocity
- **Faster Practice**: Input notes and chords more quickly than with on-screen clicks

### Browser Compatibility

The Music Practice App uses the **Web MIDI API** to connect with MIDI keyboards. This technology is supported by:

- **Chrome 66+** (Recommended)
- **Edge 79+** (Recommended)
- **Opera 53+**

**Not supported:**
- Firefox (requires WebMIDI polyfill)
- Safari (limited/no native support)

For the best experience, we recommend using **Google Chrome** or **Microsoft Edge**.

---

## Quick Start

Follow these 5 simple steps to get started quickly:

1. **Connect your MIDI keyboard** to your computer via USB
2. **Open the app** in Chrome or Edge browser
3. **Grant MIDI permissions** when prompted by the browser
4. **Test your keyboard** by playing a few keys and watching the on-screen piano light up
5. **Start practicing** - your MIDI keyboard input will work in all practice modes!

---

## Detailed Setup Instructions

### Hardware Connection

#### USB MIDI Keyboards

Most modern MIDI keyboards connect via USB and are plug-and-play:

1. Plug your MIDI keyboard's USB cable into an available USB port on your computer
2. Wait for your operating system to recognize the device (usually automatic)
3. No driver installation is typically needed for class-compliant USB MIDI devices

**Tip**: If your keyboard has a power switch, make sure it's turned on before connecting.

#### Bluetooth MIDI Keyboards

For Bluetooth MIDI keyboards:

1. Enable Bluetooth on your computer
2. Put your MIDI keyboard in pairing mode (consult your keyboard's manual)
3. Pair the device through your computer's Bluetooth settings
4. Once paired, the keyboard should appear as a MIDI input device

**Note**: Bluetooth MIDI may have slightly higher latency than USB connections.

#### MIDI Interfaces and Adapters

If you have a keyboard with traditional 5-pin MIDI connectors:

1. Connect a USB-to-MIDI interface to your computer
2. Connect your keyboard's MIDI OUT to the interface's MIDI IN
3. The interface will appear as a MIDI device to your browser

### Browser Permissions

The Web MIDI API requires explicit user permission to access MIDI devices for privacy and security.

#### Granting Permission

When you first open the Music Practice App (or when MIDI functionality is triggered):

1. Your browser will display a permission dialog asking: **"Allow this site to access your MIDI devices?"**
2. Click **"Allow"** to grant permission
3. The app will now be able to detect and use your MIDI keyboard

#### Managing Permissions

If you accidentally denied permission or want to change settings:

**Chrome/Edge:**
1. Click the lock icon in the address bar
2. Find "MIDI devices" in the permissions list
3. Change from "Block" to "Allow"
4. Refresh the page

**Privacy Note**: The app only uses MIDI data for local music input. No MIDI data is stored, transmitted, or shared with external services.

### Testing MIDI Connection

Once your keyboard is connected and permissions are granted:

1. **Visual Feedback**: Play any key on your MIDI keyboard
2. **Watch the Screen**: The corresponding key on the on-screen piano should highlight
3. **Check the Range**: Try playing notes across different octaves
4. **Test Velocity**: If your keyboard supports velocity, try playing keys with different force levels

**Success Indicators:**
- On-screen piano keys light up when you press physical keys
- Notes are registered in practice modes
- MIDI connection status indicator shows "Connected" (if implemented)

**If nothing happens**, proceed to the [Troubleshooting](#troubleshooting) section.

---

## Using MIDI with Practice Modes

### Note Identification Mode

In Note Identification mode:

1. The app plays a random note
2. Instead of clicking the on-screen keyboard, **press the corresponding key on your MIDI keyboard**
3. The app will register your MIDI input and provide feedback (correct/incorrect)
4. Press "Next Note" to continue practicing

**MIDI Behavior:**
- Only **note-on events** (key press) are registered
- Note-off events (key release) are ignored for input
- You can play the note briefly - no need to hold it down

### Chord Identification Modes

When practicing chord identification:

1. The app plays a chord
2. **Press all the chord's notes simultaneously** (or quickly in succession) on your MIDI keyboard
3. The app will detect the multi-note input and validate your answer

**MIDI Behavior:**
- The app accumulates note-on events
- Hold down all chord notes simultaneously for best results
- Release all notes before attempting the next chord

**Sustain Pedal Support:**
- If your keyboard has a sustain pedal, check if the app supports it (feature-dependent)
- The sustain pedal may help hold chord notes for easier input

---

## MIDI Technical Reference

### Supported MIDI Features

The Music Practice App supports the following MIDI capabilities:

#### MIDI Messages

- **Note On (0x90)**: Triggered when you press a key
  - Includes note number (0-127) and velocity (1-127)
  - Velocity 0 is treated as Note Off
- **Note Off (0x80)**: Triggered when you release a key
  - Includes note number (0-127) and velocity (0-127)

#### Velocity Sensitivity

- **Range**: 0-127
  - 0 = Note off
  - 1-127 = Note on with varying intensity
- The app can detect velocity values for keyboards that support velocity sensitivity
- Velocity affects how strongly the note is registered (feature-dependent)

#### MIDI Channels

- The app listens to all MIDI channels (1-16)
- You don't need to configure specific channels

### MIDI Note Mapping

The app uses standard MIDI note numbering:

#### Octave System

The app supports **octaves 1-8** (MIDI notes 12-107):

| Note | MIDI Number | Description |
|------|-------------|-------------|
| C1   | 12          | Lowest playable octave |
| C2   | 24          | |
| C3   | 36          | |
| C4   | 48          | |
| C5   | 60          | **Middle C** (standard reference) |
| A5   | 69          | **A440** (concert pitch) |
| C6   | 72          | |
| C7   | 84          | |
| C8   | 96          | |
| B8   | 107         | Highest playable note |

#### MIDI Note Formula

MIDI notes are calculated as:
```
MIDI Note Number = (Octave × 12) + Note Index
```

Where Note Index is:
- C = 0, C# = 1, D = 2, D# = 3, E = 4, F = 5
- F# = 6, G = 7, G# = 8, A = 9, A# = 10, B = 11

**Examples:**
- Middle C (C5): 5 × 12 + 0 = 60
- A440 (A5): 5 × 12 + 9 = 69
- D4: 4 × 12 + 2 = 50

#### Supported Note Range

- **Full MIDI Range**: 0-127 (10+ octaves)
- **Playable Range**: 12-107 (octaves 1-8)
- **Notes outside this range** will be rejected with an error message

**Why this range?**
- Most musical content falls within these 8 octaves
- Matches the app's on-screen piano keyboard range
- Prevents out-of-bounds errors in the audio engine

### Code Example

Here's how the app processes MIDI messages:

```typescript
// Checking if browser supports Web MIDI API
if (navigator.requestMIDIAccess) {
  navigator.requestMIDIAccess()
    .then(onMIDISuccess, onMIDIFailure);
} else {
  console.error('Web MIDI API not supported');
}

// Handling MIDI messages
function onMIDIMessage(message) {
  const [status, note, velocity] = message.data;

  // Check if it's a note on event
  if ((status & 0xF0) === 0x90 && velocity > 0) {
    console.log(`Note On: ${note}, Velocity: ${velocity}`);
    // Process note input...
  }

  // Check if it's a note off event
  if ((status & 0xF0) === 0x80 || ((status & 0xF0) === 0x90 && velocity === 0)) {
    console.log(`Note Off: ${note}`);
    // Handle note release...
  }
}
```

For the full MIDI utilities implementation, see: `src/utils/midiUtils.ts`

---

## Troubleshooting

### MIDI Keyboard Not Detected

**Problem**: The app doesn't recognize your MIDI keyboard.

**Solutions**:

1. **Check Browser Compatibility**
   - Are you using Chrome, Edge, or Opera?
   - Firefox and Safari don't fully support Web MIDI API
   - Try switching to Chrome or Edge

2. **Verify USB Connection**
   - Is the USB cable properly connected?
   - Try a different USB port
   - Try a different USB cable (if available)
   - Restart your MIDI keyboard (unplug and replug)

3. **Check MIDI Permissions**
   - Did you grant MIDI access permission?
   - Check browser settings (click lock icon in address bar)
   - Look for "MIDI devices" and ensure it's set to "Allow"

4. **Refresh the Page**
   - After connecting your keyboard, refresh the browser
   - This ensures the Web MIDI API re-scans for devices

5. **Test in Another App**
   - Verify your MIDI keyboard works in other software (DAW, online MIDI tester)
   - This confirms the keyboard itself is functioning

6. **Check Device Manager** (Windows)
   - Open Device Manager
   - Look under "Sound, video and game controllers"
   - Verify your MIDI keyboard is listed without errors

7. **System Preferences** (macOS)
   - Open Audio MIDI Setup utility
   - Check if your MIDI device appears in the MIDI Studio

### Notes Not Registering

**Problem**: The keyboard is detected but notes don't work in the app.

**Solutions**:

1. **Octave Range**
   - The app only accepts notes in **octaves 1-8** (MIDI 12-107)
   - Your keyboard might be set to octave 0 or 9
   - Use your keyboard's octave shift buttons to adjust

2. **Velocity Settings**
   - Some keyboards have velocity sensitivity on/off
   - Ensure velocity is enabled (notes with velocity 0 are treated as note-off)
   - Try pressing keys harder if you have a light touch

3. **Visual Feedback Missing**
   - Check if on-screen piano is visible
   - MIDI input might be working but visual feedback isn't rendering
   - Check browser console for errors (F12 → Console tab)

4. **App State**
   - Are you in an active practice session?
   - Some MIDI features may only work during active practice modes
   - Try starting a new practice session

### Delayed or Missed Notes

**Problem**: MIDI notes are delayed or some notes don't register.

**Solutions**:

1. **USB Connection**
   - Use a direct USB port on your computer (not a hub)
   - USB hubs can introduce latency
   - Try different USB ports

2. **Browser Performance**
   - Close unnecessary browser tabs
   - Close other applications using audio
   - Restart your browser

3. **Audio Buffer Settings**
   - If the app has audio settings, try adjusting the buffer size
   - Smaller buffers = lower latency but higher CPU usage

4. **Bluetooth Latency**
   - If using Bluetooth MIDI, latency is expected
   - Switch to USB connection for lower latency

### Multiple MIDI Devices

**Problem**: You have multiple MIDI devices and the app is using the wrong one.

**Solutions**:

1. **Disconnect Unused Devices**
   - Temporarily disconnect other MIDI devices
   - This forces the app to use your intended keyboard

2. **Device Selection** (if implemented)
   - Check if the app has a settings menu for MIDI device selection
   - Select your preferred keyboard from the list

3. **Check Web MIDI API**
   - Open browser console (F12)
   - Type: `navigator.requestMIDIAccess().then(access => console.log(access.inputs))`
   - This lists all available MIDI input devices

### Browser-Specific Issues

#### Chrome/Edge

- **Permission Denied**: Check site settings (chrome://settings/content/midi)
- **Incognito Mode**: MIDI permissions may not persist in incognito mode

#### Firefox

- **No Native Support**: Web MIDI API not natively supported
- **Workaround**: Use WebMIDI polyfill (advanced users) or switch to Chrome/Edge

#### Safari

- **Limited Support**: Web MIDI API is not fully supported
- **Solution**: Use Chrome or Edge instead

### Still Having Issues?

If none of the above solutions work:

1. **Check Browser Console**
   - Press F12 to open Developer Tools
   - Go to the Console tab
   - Look for MIDI-related error messages
   - Share these errors when seeking help

2. **Test with Online MIDI Tester**
   - Visit an online MIDI test tool (search "Web MIDI API tester")
   - Verify your keyboard works there
   - This isolates whether the issue is with the keyboard or the app

3. **Report the Issue**
   - Provide details: browser version, keyboard model, OS version
   - Include any error messages from the console
   - Describe the exact steps you took

---

## Supported MIDI Keyboards

### Requirements

Any MIDI keyboard should work with the Music Practice App as long as it:

1. **Connects via USB** or **Bluetooth MIDI**
2. **Sends standard MIDI note messages** (Note On/Off)
3. **Is class-compliant** (no driver installation required for USB)

### Recommended Features

For the best experience, look for keyboards with:

- **Velocity Sensitivity**: Responds to how hard you press keys
- **Full-Size Keys**: Standard piano key size for realistic practice
- **At least 25 keys**: Minimum for playing basic scales and chords
- **49-88 keys**: Ideal for comprehensive practice across multiple octaves
- **Octave Shift Buttons**: Allows access to the full 8-octave range supported by the app

### Tested Keyboards

The following keyboards have been tested with the app:

- (List specific models here as testing is completed)

### General Compatibility

**Small Controllers (25-32 keys)**
- Great for portability and basic practice
- Use octave shift buttons to access the full range
- Suitable for note identification practice

**Mid-Size Keyboards (49-61 keys)**
- Good balance of range and portability
- Covers most practice scenarios
- Recommended for intermediate users

**Full-Size Keyboards (76-88 keys)**
- Complete piano range
- No octave shifting needed
- Best for serious practice and chord work

---

## Advanced Configuration

### MIDI Velocity Response

Some keyboards allow you to adjust velocity sensitivity:

- **Hard/Heavy**: Requires more force to reach high velocity values
- **Medium**: Balanced response
- **Light/Soft**: Easier to reach high velocity with less force

Consult your keyboard's manual for velocity curve adjustments.

### Note Mapping Adjustments

The app uses standard MIDI note mapping (see [MIDI Technical Reference](#midi-technical-reference)). If you need custom mappings:

- This would require modifying the app's source code (`src/utils/midiUtils.ts`)
- Advanced users can extend the MIDI utilities to support custom note ranges

### Transpose Settings

If your keyboard has a transpose function:

- Be aware this will shift all MIDI note numbers
- May cause notes to fall outside the supported range (octaves 1-8)
- Generally recommended to keep transpose at 0 for this app

### MIDI Channel Selection

The app listens to **all MIDI channels** (1-16):

- You don't need to configure specific channels
- Your keyboard can be set to any channel

If you need to filter specific channels, this would require code modification.

### For Developers

Want to extend the MIDI functionality?

**Key Files:**
- `src/utils/midiUtils.ts` - Core MIDI utility functions
  - `midiNoteToNoteWithOctave()` - Converts MIDI numbers to note names
  - `noteWithOctaveToMidiNote()` - Converts note names to MIDI numbers
  - `isPlayableMidiNote()` - Validates MIDI notes are in octaves 1-8
  - `isNoteOnMessage()` / `isNoteOffMessage()` - Message type detection
  - `getMidiNoteFromMessage()` - Extracts note from MIDI message
  - `getVelocityFromMessage()` - Extracts velocity from MIDI message

**Extending MIDI Support:**
- Add sustain pedal support (Control Change 64)
- Implement pitch bend handling
- Add MIDI device selection UI
- Support MIDI learning mode (auto-detect keyboard range)
- Record MIDI input for practice session playback

**Resources for Development:**
- [Web MIDI API Specification](https://webaudio.github.io/web-midi-api/)
- [MIDI Messages Reference](https://www.midi.org/specifications-old/item/table-1-summary-of-midi-message)

---

## FAQ

### Do I need special software to use MIDI keyboards?

No! The app uses the Web MIDI API built into modern browsers (Chrome, Edge, Opera). No drivers or additional software needed for most USB MIDI keyboards.

### Can I use MIDI controllers (pads, knobs, etc.)?

The app is designed for piano-style keyboards that send note on/off messages. MIDI controllers with pads may work if they send standard note messages, but knobs and faders typically send Control Change messages which the app doesn't currently use.

### Does the app work with MIDI over Bluetooth?

Yes, if your operating system supports Bluetooth MIDI and the device is properly paired. However, USB connections generally have lower latency and are recommended for practice.

### What about MIDI keyboards with fewer than 88 keys?

Absolutely! Any keyboard with at least 25 keys will work. Use the octave shift buttons on your keyboard to access the full range of octaves 1-8 supported by the app.

### Can I use multiple MIDI keyboards simultaneously?

The Web MIDI API supports multiple input devices. However, the app's current implementation may use the first available device or aggregate all inputs. Check the app's MIDI settings (if available) for device selection options.

### Why isn't my MIDI keyboard working in Firefox?

Firefox doesn't natively support the Web MIDI API. We recommend using Chrome or Edge for the best MIDI experience. Advanced users can try a WebMIDI polyfill, but this isn't officially supported.

### Does the app support sustain pedals?

This depends on the app's implementation. Check the app's feature list or settings. Sustain pedal support requires handling MIDI Control Change message 64.

### Can I record my MIDI practice sessions?

MIDI recording functionality depends on the app's current feature set. If not available, this could be a future enhancement. The underlying MIDI data is accessible and could be logged or recorded.

### What's the difference between velocity-sensitive and non-velocity keyboards?

- **Velocity-sensitive**: Detects how hard you press each key (velocity 1-127), allowing for dynamic expression
- **Non-velocity**: All notes are played at a fixed velocity (usually 64 or 127), regardless of how hard you press

Both types work with the app, but velocity-sensitive keyboards provide a more realistic piano experience.

### My keyboard has MIDI OUT and MIDI THRU - which do I use?

- **MIDI OUT**: Use this port - it sends the notes you play to the computer
- **MIDI THRU**: This echoes incoming MIDI data and isn't needed for this app
- **MIDI IN**: This receives MIDI data (not used when the keyboard is the input device)

---

## Resources

### Official Documentation

- [Web MIDI API Specification](https://webaudio.github.io/web-midi-api/) - Official W3C specification
- [MDN Web MIDI API Guide](https://developer.mozilla.org/en-US/docs/Web/API/Web_MIDI_API) - Comprehensive developer guide
- [MIDI.org](https://www.midi.org/) - MIDI Manufacturers Association

### MIDI Technical Resources

- [MIDI Messages Reference](https://www.midi.org/specifications-old/item/table-1-summary-of-midi-message) - Complete MIDI message specification
- [MIDI Note Number Chart](https://www.inspiredacoustics.com/en/MIDI_note_numbers_and_center_frequencies) - Visual reference for MIDI note mapping

### Browser Compatibility

- [Can I Use - Web MIDI API](https://caniuse.com/midi) - Current browser support status
- [Chrome MIDI Permissions](https://support.google.com/chrome/answer/114662) - Managing site permissions in Chrome

### App-Specific Resources

- **MIDI Utilities Source Code**: `src/utils/midiUtils.ts` - View the app's MIDI implementation
- **Main README**: [README.md](../README.md) - General app documentation and features

### Online Tools

- [WebMIDI Test Page](https://www.onlinemusictools.com/webmiditest/) - Test your MIDI keyboard in the browser
- [MIDI Monitor](https://www.snoize.com/MIDIMonitor/) (macOS) - See raw MIDI data from your keyboard

---

## Summary

MIDI keyboard integration transforms the Music Practice App into a hands-on learning experience. By following this guide, you should be able to:

1. Connect your MIDI keyboard via USB or Bluetooth
2. Grant browser permissions for Web MIDI API
3. Test your connection and verify note input
4. Use MIDI input in all practice modes
5. Troubleshoot common issues
6. Understand the MIDI technical implementation

**Remember**: Use Chrome or Edge for the best experience, and ensure your keyboard is set to octaves 1-8 (MIDI notes 12-107).

Happy practicing!

---

**Need help?** If you encounter issues not covered in this guide, check the browser console for error messages and consult the [Troubleshooting](#troubleshooting) section.
