/**
 * Debug logging utility for Chord Training mode
 */

// Install global debug helper
if (typeof window !== 'undefined') {
  (window as any).saveChordLogs = () => {
    const logs = (window as any).__chordDebugLogs || 'No logs yet';
    const blob = new Blob([logs], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chord-debug-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    console.log('Logs saved! Downloaded as:', a.download);
  };

  (window as any).clearChordLogs = () => {
    (window as any).__chordDebugLogs = '';
    console.log('Logs cleared!');
  };

  (window as any).showChordLogs = () => {
    console.log((window as any).__chordDebugLogs || 'No logs yet');
  };

  console.log('Chord Training Debug Helpers loaded:');
  console.log('  - window.saveChordLogs()  -> Download logs as file');
  console.log('  - window.showChordLogs()  -> Print logs to console');
  console.log('  - window.clearChordLogs() -> Clear all logs');
}
