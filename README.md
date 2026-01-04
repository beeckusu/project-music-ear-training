# Music Practice App

A comprehensive web-based music practice application for ear training and chord training, built with React, TypeScript, and Tone.js.

## Features

### Ear Training
- **Note Identification**: Practice identifying musical notes played by the app
- **Multiple Training Modes**: Rush (target goal), Survival (time-based), and Sandbox (practice) modes
- **Customizable Difficulty**: Notes generated across different octave ranges

### Chord Training
- **Show Chord → Guess Notes**: Hear a chord and identify which notes are being played
- **Show Notes → Guess Chord**: See the notes and identify the chord name
- **Chord Filter Presets**: Quick access to curated chord sets (Major/Minor Triads, 7th Chords, Jazz Chords, etc.)
- **Custom Chord Filters**: Fine-tune practice by chord type, root notes, octaves, and inversions

### General Features
- **Interactive Piano Keyboard**: Visual piano keyboard for note selection
- **MIDI Keyboard Support**: Connect a real MIDI keyboard for hands-on practice (see [MIDI Setup Guide](docs/MIDI_SETUP_GUIDE.md))
- **Score Tracking**: Track your accuracy, streaks, and progress over time
- **Beautiful UI**: Modern, responsive design with gradient backgrounds

## Getting Started

### Prerequisites

- Node.js (version 16 or higher)
- npm (comes with Node.js)

### Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

3. Open your browser and navigate to `http://localhost:5173`

### Building for Production

```bash
npm run build
```

This will create a `dist` folder with the production build.

## How to Use

### Ear Training Mode

1. **Select Training Type**: Choose "Ear Training" from the main menu
2. **Choose a Mode**: Select Rush, Survival, or Sandbox mode
3. **Start Practice**: Click "Start Practice" to begin
4. **Listen**: Click "Play Note Again" to hear the note as many times as needed
5. **Identify**: Click on the piano keyboard or use your MIDI keyboard to identify the note
6. **Track Progress**: Your score, accuracy, and streaks are displayed at the top
7. **Continue**: Click "Next Note" to practice with a new random note

### Note Training Mode (Chord Training)

#### Show Chord → Guess Notes
1. **Select Training Type**: Choose "Note Training" from the main menu
2. **Select Sub-Mode**: Choose "Show Chord → Guess Notes"
3. **Configure Filters**: (Optional) Use chord filter presets or customize your practice set
4. **Start Practice**: Click "Start Practice" to begin
5. **Listen**: The app plays a chord - listen carefully
6. **Identify Notes**: Click on the piano keyboard to select all the notes you hear in the chord
7. **Submit**: Once you've selected all the notes, submit your answer
8. **Learn**: See the correct answer and chord name, then continue to the next chord

#### Show Notes → Guess Chord
1. **Select Training Type**: Choose "Note Training" from the main menu
2. **Select Sub-Mode**: Choose "Show Notes → Guess Chord"
3. **Configure Filters**: (Optional) Use chord filter presets or customize your practice set
4. **Start Practice**: Click "Start Practice" to begin
5. **Observe**: The app displays the notes of a chord on the piano keyboard
6. **Play**: (Optional) Click "Play Chord" to hear how it sounds
7. **Identify Chord**: Select the chord name from the available options
8. **Learn**: See if you were correct, then continue to the next chord

## Training Modes

### Ear Training Modes

#### Rush Mode
- **Goal**: Reach a target number of correct notes
- **Scoring**: Track your accuracy and consecutive correct answers (streak)
- **Best For**: Focused practice sessions with a clear objective
- **How It Works**: Practice continues until you reach the target goal, with your score and streak tracked throughout

#### Survival Mode
- **Goal**: Get as many correct answers as possible before time runs out
- **Scoring**: Race against the clock while maintaining accuracy
- **Best For**: Building speed and reflexes under pressure
- **How It Works**: You have a limited amount of time to identify as many notes as possible

#### Sandbox Mode
- **Goal**: Free practice without scoring pressure
- **Scoring**: Relaxed practice environment
- **Best For**: Learning and experimentation without time or score constraints
- **How It Works**: Practice at your own pace without goals or time limits

### Note Training Modes (Chord Training)

#### Show Chord → Guess Notes
- **Goal**: Identify all the individual notes within a played chord
- **Skill Focus**: Ear training for chord voicings and note separation
- **Best For**: Developing the ability to hear individual notes within complex harmonies
- **How It Works**:
  - The app plays a chord
  - You select all the notes you hear on the piano keyboard
  - The app shows you the correct notes and identifies the chord
  - Perfect for learning chord voicings and training your ear to pick out individual notes

#### Show Notes → Guess Chord
- **Goal**: Identify the chord name from seeing its notes
- **Skill Focus**: Music theory and chord recognition
- **Best For**: Learning chord construction and naming conventions
- **How It Works**:
  - The app displays notes on the piano keyboard
  - You identify what chord those notes form
  - Choose from available chord name options
  - Optionally play the chord to hear how it sounds
  - Perfect for reinforcing music theory knowledge and chord vocabulary

## Chord Filter System

The Note Training mode includes a powerful chord filtering system that lets you customize your practice sessions.

### Available Presets

- **All Major & Minor Triads**: Basic three-note chords (major and minor only)
- **All 7th Chords**: Four-note chords including maj7, min7, dom7, min7♭5, and dim7
- **All Chords in C Major**: Diatonic chords in the key of C (great for beginners)
- **Jazz Chords**: Extended chords commonly used in jazz (9ths, 11ths, 13ths, altered chords)
- **Basic Triads**: Major, minor, augmented, and diminished triads

### Custom Filter Options

You can fine-tune your practice by customizing:

- **Chord Types**: Select specific chord qualities (major, minor, dominant, diminished, augmented, suspended, etc.)
- **Root Notes**: Choose which root notes to include (e.g., only white keys, only certain notes)
- **Octave Range**: Limit chords to specific octave ranges
- **Inversions**: Include or exclude chord inversions (root position, 1st inversion, 2nd inversion)

This flexibility allows you to:
- Focus on specific chord families you're struggling with
- Progressively increase difficulty as you improve
- Practice chords relevant to a specific key or style
- Build custom practice sets tailored to your learning goals

## Technical Details

### Architecture

- **Frontend**: React with TypeScript
- **Audio Engine**: Tone.js for Web Audio API integration
- **Styling**: CSS with modern gradients and animations
- **Build Tool**: Vite for fast development and building

### Key Components

#### Audio & Music Engine
- `AudioEngine`: Handles note generation and playback using Tone.js
- `ChordEngine`: Manages chord generation, playback, and validation
- `MIDIService`: Handles MIDI keyboard input and connection management

#### Training Strategy Components
- `EarTrainingStrategy`: Implements note identification training modes (Rush, Survival, Sandbox)
- `ChordTrainingStrategy`: Implements chord training modes (Show Chord → Guess Notes, Show Notes → Guess Chord)

#### UI Components
- `PianoKeyboard`: Interactive piano keyboard component with note selection and display
- `ScoreTracker`: Progress tracking and display with streaks and accuracy
- `ChordFilterSelector`: UI for selecting and customizing chord filter presets

#### Utilities
- `chordUtils.ts`: Chord naming, construction, and validation utilities
- `midiUtils.ts`: MIDI note conversion and keyboard mapping

### Audio Features

- Generates random notes across configurable octave ranges
- Plays chords with configurable voicings and inversions
- Uses Web Audio API through Tone.js for high-quality sound synthesis
- Supports different instrument timbres (currently piano/synth)
- MIDI keyboard integration for hands-on practice

## Future Enhancements

- **Interval Training**: Practice identifying intervals between notes
- **Chord Progression Training**: Practice recognizing and playing common chord progressions
- **Multiple Instrument Sounds**: Expand beyond piano/synth to include guitar, bass, strings, etc.
- **Advanced Chord Types**: Add support for more exotic chord extensions and alterations
- **Adaptive Difficulty**: Automatically adjust difficulty based on performance
- **Pitch Detection**: Sing or play along with a real instrument and get feedback
- **Progress Persistence**: Save your progress and stats across sessions
- **Mobile-Responsive Design**: Improved touch controls and layout for mobile devices
- **Customizable Themes**: Dark mode and other visual customization options

## Browser Compatibility

This app requires a modern browser with Web Audio API support:
- Chrome 66+
- Firefox 60+
- Safari 14.1+
- Edge 79+
