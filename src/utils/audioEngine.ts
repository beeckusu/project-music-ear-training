import * as Tone from 'tone';
import type { Note, Octave, NoteWithOctave, NoteFilter } from '../types/music';
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
    this.instruments.set(InstrumentType.SYNTH, new Tone.Synth().toDestination());
    this.instruments.set(InstrumentType.PIANO, new Tone.PolySynth(Tone.Synth).toDestination());
    this.instruments.set(InstrumentType.FM, new Tone.FMSynth().toDestination());
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