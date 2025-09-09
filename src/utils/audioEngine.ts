import * as Tone from 'tone';
import type { Note, Octave, NoteWithOctave, NoteFilter } from '../types/music';
import { isNotePlayable, ALL_NOTES } from '../types/music';

export class AudioEngine {
  private synth: Tone.Synth;
  private isInitialized = false;

  constructor() {
    this.synth = new Tone.Synth().toDestination();
  }

  async initialize() {
    if (!this.isInitialized) {
      await Tone.start();
      this.isInitialized = true;
    }
  }

  playNote(noteWithOctave: NoteWithOctave, duration: string = '4n') {
    if (!this.isInitialized) {
      throw new Error('AudioEngine not initialized. Call initialize() first.');
    }
    
    const noteString = `${noteWithOctave.note}${noteWithOctave.octave}`;
    this.synth.triggerAttackRelease(noteString, duration);
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