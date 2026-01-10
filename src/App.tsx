import { useState, useEffect } from 'react'
import { SettingsProvider } from './contexts/SettingsContext'
import { useSettings } from './hooks/useSettings'
import NoteIdentification from './components/NoteIdentification'
import ScoreTracker from './components/ScoreTracker'
import GuessHistory from './components/GuessHistory'
import SettingsButton from './components/SettingsButton'
import SettingsModal from './components/SettingsModal'
import { TRAINING_MODES } from './constants'
import type { GuessAttempt } from './types/game'
import { MidiManager } from './services/MidiManager'
import './App.css'

// Main app content component that can access settings context
function AppContent() {
  const { isSettingsOpen, closeSettings, settings, commitPendingSettings } = useSettings()
  const [score, setScore] = useState({ correct: 0, total: 0 })
  const [guessHistory, setGuessHistory] = useState<GuessAttempt[]>([])
  const [isPaused, setIsPaused] = useState(false)
  const [gameResetTrigger, setGameResetTrigger] = useState(0)

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

  // Initialize MIDI and auto-connect to saved device
  useEffect(() => {
    const initializeMidi = async () => {
      const midiManager = MidiManager.getInstance()

      // Check if MIDI is supported in the browser
      if (!midiManager.isSupported()) {
        return
      }

      try {
        // Initialize MIDI system
        await midiManager.initialize()

        // Get saved device ID from settings
        const savedDeviceId = settings.audio.midiDeviceId

        if (savedDeviceId) {
          // Check if the saved device is still available
          const availableDevices = midiManager.getAvailableInputs()
          const savedDevice = availableDevices.find(d => d.id === savedDeviceId)

          if (savedDevice && savedDevice.state === 'connected') {
            // Auto-connect to previously selected device
            midiManager.selectInputDevice(savedDeviceId)
            console.log('Auto-connected to MIDI device:', savedDevice.name)
          } else {
            // Device no longer available
            console.warn('Previously selected MIDI device not found:', savedDeviceId)
          }
        }
      } catch (error) {
        // Error is already handled by MidiManager and emitted as event
        console.error('Failed to initialize MIDI:', error)
      }
    }

    initializeMidi()
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
    </div>
  )
}

function App() {
  return (
    <SettingsProvider>
      <AppContent />
    </SettingsProvider>
  )
}

export default App
