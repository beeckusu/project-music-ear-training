import { useState, useEffect } from 'react'
import { SettingsProvider } from './contexts/SettingsContext'
import { useSettings } from './hooks/useSettings'
import NoteIdentification from './components/NoteIdentification'
import ScoreTracker from './components/ScoreTracker'
import GuessHistory from './components/GuessHistory'
import SettingsButton from './components/SettingsButton'
import SettingsModal from './components/SettingsModal'
import type { GuessAttempt } from './types/music'
import './App.css'

// Main app content component that can access settings context
function AppContent() {
  const { isSettingsOpen, closeSettings } = useSettings()
  const [score, setScore] = useState({ correct: 0, total: 0 })
  const [guessHistory, setGuessHistory] = useState<GuessAttempt[]>([])
  const [isPaused, setIsPaused] = useState(false)
  const [gameResetTrigger, setGameResetTrigger] = useState(0)

  // Auto-pause when settings are open, unpause when closed
  useEffect(() => {
    if (isSettingsOpen) {
      setIsPaused(true)
    } else {
      setIsPaused(false)
    }
  }, [isSettingsOpen])

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
        <div className="score-section">
          <ScoreTracker correct={score.correct} total={score.total} onReset={resetScore} />
          <GuessHistory attempts={guessHistory} />
        </div>

        <NoteIdentification
          onGuessAttempt={handleGuessAttempt}
          isPaused={gameIsPaused}
          resetTrigger={gameResetTrigger}
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
