import { useState } from 'react'
import { SettingsProvider } from './contexts/SettingsContext'
import NoteIdentification from './components/NoteIdentification'
import ScoreTracker from './components/ScoreTracker'
import GuessHistory from './components/GuessHistory'
import type { GuessAttempt } from './types/music'
import './App.css'

function App() {
  const [score, setScore] = useState({ correct: 0, total: 0 })
  const [guessHistory, setGuessHistory] = useState<GuessAttempt[]>([])

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

  return (
    <SettingsProvider>
      <div className="app">
        <header className="app-header">
          <h1>Music Practice App</h1>
          <p>Improve your ear training with interactive exercises</p>
        </header>
        
        <main className="app-main">
          <div className="score-section">
            <ScoreTracker correct={score.correct} total={score.total} onReset={resetScore} />
            <GuessHistory attempts={guessHistory} />
          </div>
          
          <NoteIdentification onGuessAttempt={handleGuessAttempt} />
        </main>
      </div>
    </SettingsProvider>
  )
}

export default App
