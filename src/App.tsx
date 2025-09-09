import { useState } from 'react'
import { SettingsProvider } from './contexts/SettingsContext'
import NoteIdentification from './components/NoteIdentification'
import ScoreTracker from './components/ScoreTracker'
import './App.css'

function App() {
  const [score, setScore] = useState({ correct: 0, total: 0 })

  const handleScoreUpdate = (correct: boolean) => {
    setScore(prevScore => ({
      correct: prevScore.correct + (correct ? 1 : 0),
      total: prevScore.total + 1
    }))
  }

  const resetScore = () => {
    setScore({ correct: 0, total: 0 })
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
            <ScoreTracker correct={score.correct} total={score.total} />
            {score.total > 0 && (
              <button onClick={resetScore} className="reset-button">
                Reset Score
              </button>
            )}
          </div>
          
          <NoteIdentification onScoreUpdate={handleScoreUpdate} />
        </main>
      </div>
    </SettingsProvider>
  )
}

export default App
