import type { NoteFilter, AudioSettings, TimingSettings } from './music';
import type { ModeSettings } from './game';

export interface AppSettings {
  noteFilter: NoteFilter;
  timing: TimingSettings;
  audio: AudioSettings;
  modes: ModeSettings;
  showNoteLabels: boolean;
}