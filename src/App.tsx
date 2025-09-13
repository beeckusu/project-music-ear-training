import { useState } from 'react'
import { SettingsProvider } from './contexts/SettingsContext'
import NoteIdentification from './components/NoteIdentification'
import ScoreTracker from './components/ScoreTracker'
import GuessHistory from './components/GuessHistory'
import SettingsButton from './components/SettingsButton'
import SettingsModal from './components/SettingsModal'
import type { GuessAttempt } from './types/music'
import './App.css'

function App() {
  const [score, setScore] = useState({ correct: 0, total: 0 })
  const [guessHistory, setGuessHistory] = useState<GuessAttempt[]>([])
  const [isPaused, setIsPaused] = useState(false)

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

  const togglePause = () => {
    setIsPaused(prev => !prev)
  }

  return (
    <SettingsProvider>
      <div className="app">
        <header className="app-header">
          <button 
            className="pause-button header-left"
            onClick={togglePause}
            aria-label={isPaused ? 'Resume' : 'Pause'}
          >
            {isPaused ? '▶️' : '⏸️'}
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
            isPaused={isPaused}
            onPauseChange={setIsPaused}
          />
        </main>
        
        <SettingsModal />
      </div>
    </SettingsProvider>
  )
}

export default App
