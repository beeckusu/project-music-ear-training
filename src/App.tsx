import { useState, useEffect, useRef } from 'react'
import { SettingsProvider } from './contexts/SettingsContext'
import { PresetProvider } from './contexts/PresetContext'
import { useSettings } from './hooks/useSettings'
import NoteIdentification from './components/NoteIdentification'
import ScoreTracker from './components/ScoreTracker'
import GuessHistory from './components/GuessHistory'
import SettingsButton from './components/SettingsButton'
import SettingsModal from './components/SettingsModal'
import { TRAINING_MODES } from './constants'
import type { GuessAttempt } from './types/game'
import { MidiManager } from './services/MidiManager'
import { MidiDisconnectionHandler } from './components/MidiDisconnectionHandler'
import './App.css'

// Main app content component that can access settings context
function AppContent() {
  const { isSettingsOpen, closeSettings, settings, commitPendingSettings, updateAudioSettings } = useSettings()
  const [score, setScore] = useState({ correct: 0, total: 0 })
  const [guessHistory, setGuessHistory] = useState<GuessAttempt[]>([])
  const [isPaused, setIsPaused] = useState(false)
  const [gameResetTrigger, setGameResetTrigger] = useState(0)
  const [isSessionActive, setIsSessionActive] = useState(false)
  const [midiReady, setMidiReady] = useState(false)

  // Track if MIDI has been initialized to prevent auto-select loops
  const midiInitialized = useRef(false)

  // Check if we're in ear training mode (show ScoreTracker and GuessHistory)
  const isEarTrainingMode = settings.trainingType === TRAINING_MODES.EAR_TRAINING

  // Auto-pause when settings are open, unpause when closed
  useEffect(() => {
    if (isSettingsOpen) {
      setIsPaused(true)
    } else {
      setIsPaused(false)
    }
  }, [isSettingsOpen])

  // Track if a practice session is active (user has started playing)
  // Session is active as long as there's a score, regardless of pause state
  useEffect(() => {
    if (score.total > 0) {
      setIsSessionActive(true)
    } else {
      setIsSessionActive(false)
    }
  }, [score.total])

  // Sync MidiManager selection to settings
  useEffect(() => {
    const midiManager = MidiManager.getInstance()
    if (!midiManager.isSupported() || !midiManager.isInitialized()) return

    const selectedDevice = midiManager.getSelectedDevice()
    const settingsDeviceId = settings.audio.midiDeviceId

    // If MidiManager has a device but settings doesn't, sync them
    if (selectedDevice && selectedDevice.id !== settingsDeviceId) {
      console.log('Syncing MidiManager device to settings:', selectedDevice.id)
      updateAudioSettings({ midiDeviceId: selectedDevice.id })
      setTimeout(() => commitPendingSettings(), 0)
    }
  }, [midiReady, settings.audio.midiDeviceId, updateAudioSettings, commitPendingSettings])

  // Initialize MIDI and auto-connect to saved device
  useEffect(() => {
    const midiManager = MidiManager.getInstance()

    // Check if MIDI is supported in the browser
    if (!midiManager.isSupported()) {
      return
    }

    // Handler for auto-selecting device when it connects
    const handleDeviceConnected = async (device: any) => {
      // Don't auto-select during initial setup to avoid infinite loops
      if (!midiInitialized.current) return

      const selectedDevice = midiManager.getSelectedDevice()

      // If no device is currently selected, or the selected device is disconnected, auto-select this newly connected device
      if (!selectedDevice || selectedDevice.state !== 'connected') {
        await midiManager.selectInputDevice(device.id)
        console.log('Auto-selected newly connected MIDI device:', device.name, 'ID:', device.id)
      }

      // Update settings with whatever device MidiManager has selected now
      const currentDevice = midiManager.getSelectedDevice()
      if (currentDevice) {
        updateAudioSettings({ midiDeviceId: currentDevice.id })
        setTimeout(() => commitPendingSettings(), 100)
      }
    }

    const initializeMidi = async () => {
      try {
        // Initialize MIDI system
        await midiManager.initialize()
        setMidiReady(true)

        // Only run auto-selection logic on first initialization
        if (!midiInitialized.current) {
          // Get saved device ID from settings
          const savedDeviceId = settings.audio.midiDeviceId
          const availableDevices = midiManager.getAvailableInputs()

          if (savedDeviceId) {
            // Check if the saved device is still available
            const savedDevice = availableDevices.find(d => d.id === savedDeviceId)

            if (savedDevice && savedDevice.state === 'connected') {
              // Auto-connect to previously selected device
              await midiManager.selectInputDevice(savedDeviceId)
              console.log('Auto-connected to MIDI device:', savedDevice.name)
            } else {
              // Device no longer available
              console.warn('Previously selected MIDI device not found:', savedDeviceId)
            }
          } else if (availableDevices.length > 0) {
            // No saved device, but devices are available - auto-select first device
            const firstDevice = availableDevices[0]
            await midiManager.selectInputDevice(firstDevice.id)
            console.log('Auto-selected first MIDI device:', firstDevice.name)
          }

          // Mark as initialized so the deviceConnected handler can run
          midiInitialized.current = true
        }

        // Listen for device connections to auto-select first device
        midiManager.on('deviceConnected', handleDeviceConnected)
      } catch (error) {
        // Error is already handled by MidiManager and emitted as event
        console.error('Failed to initialize MIDI:', error)
      }
    }

    initializeMidi()

    // Cleanup listener on unmount
    return () => {
      midiManager.off('deviceConnected', handleDeviceConnected)
    }
    // Only re-run when the saved device ID changes from settings
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.audio.midiDeviceId])

  const handleScoreUpdate = (correct: boolean) => {
    setScore(prevScore => ({
      correct: prevScore.correct + (correct ? 1 : 0),
      total: prevScore.total + 1
    }))
  }

  const handleGuessAttempt = (attempt: GuessAttempt) => {
    setGuessHistory(prevHistory => [...prevHistory, attempt])
    handleScoreUpdate(attempt.isCorrect)
  }

  const resetScore = () => {
    setScore({ correct: 0, total: 0 })
    setGuessHistory([])
  }

  const resetGame = () => {
    commitPendingSettings() // Apply staged settings
    resetScore()
    setIsPaused(false)
    setGameResetTrigger(prev => prev + 1) // Trigger game reset
    closeSettings() // Close settings to show the Start Practice button
  }

  const togglePause = () => {
    // Don't allow manual unpause if settings are open
    if (isSettingsOpen) return
    setIsPaused(prev => !prev)
  }

  // Determine if game is paused (either manually or due to settings)
  const gameIsPaused = isPaused || isSettingsOpen

  return (
    <div className="app">
      <header className="app-header">
        <button
          className="pause-button header-left"
          onClick={togglePause}
          aria-label={gameIsPaused ? 'Resume' : 'Pause'}
          disabled={isSettingsOpen}
        >
          {gameIsPaused ? '▶️' : '⏸️'}
        </button>
        <SettingsButton />
        <h1>Music Practice App</h1>
        <p>Improve your ear training with interactive exercises</p>
      </header>

      <main className="app-main">
        {isEarTrainingMode && (
          <div className="score-section">
            <ScoreTracker correct={score.correct} total={score.total} onReset={resetScore} />
            <GuessHistory attempts={guessHistory} />
          </div>
        )}

        <NoteIdentification
          onGuessAttempt={handleGuessAttempt}
          isPaused={gameIsPaused}
          resetTrigger={gameResetTrigger}
          onScoreReset={resetScore}
        />
      </main>

      <SettingsModal onRestartGame={resetGame} />

      <MidiDisconnectionHandler
        isSessionActive={isSessionActive}
        onPause={() => setIsPaused(true)}
        onResume={() => setIsPaused(false)}
        selectedDeviceId={settings.audio.midiDeviceId}
      />
    </div>
  )
}

function App() {
  return (
    <SettingsProvider>
      <PresetProvider>
        <AppContent />
      </PresetProvider>
    </SettingsProvider>
  )
}

export default App
