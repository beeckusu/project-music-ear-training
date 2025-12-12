import * as Tone from 'tone';
import type { Note, Octave, NoteWithOctave, NoteFilter, Chord } from '../types/music';
import { InstrumentType } from '../types/music';
import { isNotePlayable, ALL_NOTES } from '../types/music';

export class AudioEngine {
  private instruments: Map<InstrumentType, any> = new Map();
  private isInitialized = false;
  private currentInstrument: InstrumentType = InstrumentType.SYNTH;
  private volume = 75;

  constructor() {
    this.initializeInstruments();
  }

  private initializeInstruments() {
    this.instruments.set(InstrumentType.SYNTH, new Tone.PolySynth(Tone.Synth).toDestination());
    this.instruments.set(InstrumentType.PIANO, new Tone.PolySynth(Tone.Synth).toDestination());
    this.instruments.set(InstrumentType.FM, new Tone.PolySynth(Tone.FMSynth).toDestination());
    this.instruments.set(InstrumentType.MONO, new Tone.MonoSynth().toDestination());

    this.updateVolume();
  }

  async initialize() {
    if (!this.isInitialized) {
      await Tone.start();
      this.isInitialized = true;
    }
  }

  setInstrument(instrument: InstrumentType) {
    this.currentInstrument = instrument;
  }

  setVolume(volume: number) {
    this.volume = Math.max(0, Math.min(100, volume));
    this.updateVolume();
  }

  private updateVolume() {
    const dbVolume = this.volume === 0 ? -Infinity : Tone.gainToDb(this.volume / 100);
    this.instruments.forEach(instrument => {
      if (instrument.volume) {
        instrument.volume.value = dbVolume;
      }
    });
  }

  playNote(noteWithOctave: NoteWithOctave, duration: string = '4n') {
    if (!this.isInitialized) {
      throw new Error('AudioEngine not initialized. Call initialize() first.');
    }

    const instrument = this.instruments.get(this.currentInstrument);
    if (!instrument) {
      throw new Error(`Instrument ${this.currentInstrument} not found`);
    }

    const noteString = `${noteWithOctave.note}${noteWithOctave.octave}`;
    instrument.triggerAttackRelease(noteString, duration);
  }

  /**
   * Plays a chord (multiple notes simultaneously).
   *
   * @param chord - The chord object containing notes to play
   * @param duration - Duration in Tone.js notation (e.g., '8n', '4n', '2n', '1n'). Defaults to '2n'.
   * @throws Error if AudioEngine is not initialized
   * @throws Error if chord has no notes
   * @throws Error if current instrument is MONO (cannot play chords)
   *
   * @example
   * ```typescript
   * const cMajor = { root: { note: 'C', octave: 4 }, notes: [{ note: 'C', octave: 4 }, { note: 'E', octave: 4 }, { note: 'G', octave: 4 }] };
   * audioEngine.playChord(cMajor, '2n');
   * ```
   */
  playChord(chord: Chord, duration: string = '2n') {
    if (!this.isInitialized) {
      throw new Error('AudioEngine not initialized. Call initialize() first.');
    }

    if (!chord.notes || chord.notes.length === 0) {
      throw new Error('Chord must contain at least one note');
    }

    const instrument = this.instruments.get(this.currentInstrument);
    if (!instrument) {
      throw new Error(`Instrument ${this.currentInstrument} not found`);
    }

    // MONO instrument cannot play chords (monophonic by design)
    if (this.currentInstrument === InstrumentType.MONO) {
      throw new Error('MONO instrument cannot play chords. Please switch to SYNTH, PIANO, or FM for polyphonic playback.');
    }

    // Convert chord notes to Tone.js note strings
    const noteStrings = chord.notes.map(note => `${note.note}${note.octave}`);

    // Play all notes simultaneously
    instrument.triggerAttackRelease(noteStrings, duration);
  }

  /**
   * Plays multiple notes simultaneously from an array.
   * More flexible than playChord() as it doesn't require a full Chord object.
   *
   * @param notes - Array of notes to play simultaneously
   * @param duration - Duration in Tone.js notation (e.g., '8n', '4n', '2n', '1n'). Defaults to '2n'.
   * @throws Error if AudioEngine is not initialized
   * @throws Error if notes array is empty
   * @throws Error if current instrument is MONO (cannot play multiple notes)
   *
   * @example
   * ```typescript
   * audioEngine.playNotes([{ note: 'C', octave: 4 }, { note: 'E', octave: 4 }, { note: 'G', octave: 4 }], '4n');
   * ```
   */
  playNotes(notes: NoteWithOctave[], duration: string = '2n') {
    if (!this.isInitialized) {
      throw new Error('AudioEngine not initialized. Call initialize() first.');
    }

    if (!notes || notes.length === 0) {
      throw new Error('Notes array must contain at least one note');
    }

    const instrument = this.instruments.get(this.currentInstrument);
    if (!instrument) {
      throw new Error(`Instrument ${this.currentInstrument} not found`);
    }

    // MONO instrument cannot play multiple notes (monophonic by design)
    if (this.currentInstrument === InstrumentType.MONO && notes.length > 1) {
      throw new Error('MONO instrument cannot play multiple notes simultaneously. Please switch to SYNTH, PIANO, or FM for polyphonic playback.');
    }

    // Convert notes to Tone.js note strings
    const noteStrings = notes.map(note => `${note.note}${note.octave}`);

    // Play all notes simultaneously
    instrument.triggerAttackRelease(noteStrings, duration);
  }

  /**
   * Plays a chord with notes in sequence (arpeggio) rather than simultaneously.
   * Notes are played in ascending pitch order.
   *
   * @param chord - The chord object containing notes to arpeggiate
   * @param noteDuration - Duration each note plays in seconds
   * @param delayBetweenNotes - Delay between note starts in seconds
   * @throws Error if AudioEngine is not initialized
   * @throws Error if chord has no notes
   * @throws Error if current instrument is not found
   * @throws Error if noteDuration or delayBetweenNotes are not positive numbers
   *
   * @example
   * ```typescript
   * const cMajor = { root: { note: 'C', octave: 4 }, notes: [{ note: 'C', octave: 4 }, { note: 'E', octave: 4 }, { note: 'G', octave: 4 }] };
   * // Play each note for 0.5 seconds with 0.1 second delay between starts
   * audioEngine.playChordArpeggio(cMajor, 0.5, 0.1);
   * ```
   */
  playChordArpeggio(chord: Chord, noteDuration: number, delayBetweenNotes: number): void {
    if (!this.isInitialized) {
      throw new Error('AudioEngine not initialized. Call initialize() first.');
    }

    if (!chord.notes || chord.notes.length === 0) {
      throw new Error('Chord must contain at least one note');
    }

    const instrument = this.instruments.get(this.currentInstrument);
    if (!instrument) {
      throw new Error(`Instrument ${this.currentInstrument} not found`);
    }

    if (noteDuration <= 0) {
      throw new Error('noteDuration must be a positive number');
    }

    if (delayBetweenNotes <= 0) {
      throw new Error('delayBetweenNotes must be a positive number');
    }

    // Play each note sequentially with configurable delay
    // Notes are already sorted by pitch in ascending order per Chord interface
    chord.notes.forEach((note, index) => {
      const noteString = `${note.note}${note.octave}`;
      const startTime = index * delayBetweenNotes * 1000; // Convert to milliseconds

      setTimeout(() => {
        instrument.triggerAttackRelease(noteString, noteDuration);
      }, startTime);
    });
  }

  static noteToFrequency(noteWithOctave: NoteWithOctave): number {
    return Tone.Frequency(noteWithOctave.note + noteWithOctave.octave).toFrequency();
  }

  static getRandomNote(octaveMin: Octave = 3, octaveMax: Octave = 5): NoteWithOctave {
    const notes: Note[] = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const randomNote = notes[Math.floor(Math.random() * notes.length)];
    const randomOctave = Math.floor(Math.random() * (octaveMax - octaveMin + 1) + octaveMin) as Octave;
    
    return { note: randomNote, octave: randomOctave };
  }

  static getRandomNoteFromFilter(filter: NoteFilter): NoteWithOctave {
    const { octaveRange } = filter;
    const playableNotes: NoteWithOctave[] = [];

    // Generate all possible notes within the filter constraints
    for (let octave = octaveRange.min; octave <= octaveRange.max; octave++) {
      for (const note of ALL_NOTES) {
        const noteWithOctave: NoteWithOctave = { note, octave: octave as Octave };
        if (isNotePlayable(noteWithOctave, filter)) {
          playableNotes.push(noteWithOctave);
        }
      }
    }

    if (playableNotes.length === 0) {
      throw new Error('No playable notes available with current filter settings');
    }

    const randomIndex = Math.floor(Math.random() * playableNotes.length);
    return playableNotes[randomIndex];
  }
}

export const audioEngine = new AudioEngine();