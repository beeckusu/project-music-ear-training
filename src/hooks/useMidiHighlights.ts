import { useState, useEffect, useCallback } from 'react';
import type { NoteHighlight, NoteWithOctave } from '../types/music';
import type { MidiNoteEvent } from '../types/midi';
import { MidiManager } from '../services/MidiManager';

/**
 * Creates a unique key for a note (for comparison purposes).
 * Matches the format used by PianoKeyboard: "C-4", "D#-5", etc.
 */
function getNoteKey(note: NoteWithOctave): string {
  return `${note.note}-${note.octave}`;
}

/**
 * Hook that provides real-time MIDI input highlights for the piano keyboard.
 *
 * Subscribes to MIDI note on/off events from the MidiManager and maintains
 * a set of currently pressed notes. Returns an array of NoteHighlight objects
 * that can be passed to PianoKeyboard's highlights prop.
 *
 * @returns Array of NoteHighlight objects for currently pressed MIDI notes
 *
 * @example
 * ```tsx
 * function PianoView() {
 *   const midiHighlights = useMidiHighlights();
 *   const [gameHighlights, setGameHighlights] = useState<NoteHighlight[]>([]);
 *
 *   // Merge MIDI highlights with game highlights (game takes precedence)
 *   const allHighlights = [...midiHighlights, ...gameHighlights];
 *
 *   return <PianoKeyboard highlights={allHighlights} />;
 * }
 * ```
 */
export function useMidiHighlights(): NoteHighlight[] {
  // Track currently pressed MIDI notes by their key string
  const [pressedNotes, setPressedNotes] = useState<Map<string, NoteWithOctave>>(new Map());

  // Handle note on event
  const handleNoteOn = useCallback((event: MidiNoteEvent) => {
    const noteKey = getNoteKey(event.note);
    setPressedNotes(prev => {
      const next = new Map(prev);
      next.set(noteKey, event.note);
      return next;
    });
  }, []);

  // Handle note off event
  const handleNoteOff = useCallback((event: MidiNoteEvent) => {
    const noteKey = getNoteKey(event.note);
    setPressedNotes(prev => {
      const next = new Map(prev);
      next.delete(noteKey);
      return next;
    });
  }, []);

  // Subscribe to MIDI events on mount
  useEffect(() => {
    const midiManager = MidiManager.getInstance();

    // Subscribe to note events
    midiManager.on('noteOn', handleNoteOn);
    midiManager.on('noteOff', handleNoteOff);

    // Cleanup subscriptions on unmount
    return () => {
      midiManager.off('noteOn', handleNoteOn);
      midiManager.off('noteOff', handleNoteOff);
    };
  }, [handleNoteOn, handleNoteOff]);

  // Convert pressed notes to NoteHighlight array
  const highlights: NoteHighlight[] = Array.from(pressedNotes.values()).map(note => ({
    note,
    type: 'midi-active' as const,
  }));

  return highlights;
}
