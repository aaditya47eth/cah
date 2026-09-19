import { useState } from 'react'
import Avatar from '../Avatar'
import Leaderboard from './Leaderboard'
import { QuestionText } from './QuestionCard'
import { MIN_PLAYERS } from '../../lib/hostEngine'

export default function GameOver({ state, onPlayAgain, onLeave }) {
  const { players, playerId, isHost, history } = state
  const [showRecap, setShowRecap] = useState(false)
  const top = Math.max(0, ...players.map((p) => p.score))
  const winners = players.filter((p) => p.score === top)
  const missing = Math.max(0, MIN_PLAYERS - players.length)

  return (
    <div className="screen">
      <div className="screen-body">
        <h1 className="gameover-title">Game over!</h1>
        <div className="winner-hero">
          <div className="winners">
            {winners.map((w) => (
              <div key={w.id} className="winner-item">
                <span className="crown" aria-hidden="true">👑</span>
                <Avatar avatar={w.avatar} name={w.name} size={72} />
                <p className="winner-name">{w.name}</p>
              </div>
            ))}
          </div>
          <p className="muted">{top} points{winners.length > 1 ? ' · shared win' : ''}</p>
        </div>

        <h2 className="section-title"><span aria-hidden="true">🎖️</span> Leaderboard</h2>
        <Leaderboard players={players} myId={playerId} />

        {history.length > 0 && (
          <>
            <button className="link-btn" onClick={() => setShowRecap(!showRecap)} aria-expanded={showRecap}>
              {showRecap ? 'Hide round recap' : 'Show round recap'}
            </button>
            {showRecap && (
              <div className="recap">
                {history.map((h, i) => (
                  <div key={i} className="recap-item">
                    <span className="recap-round">R{i + 1}</span>
                    <div>
                      <p className="recap-q">
                        <QuestionText text={h.question.text} answers={h.winners[0]?.cards.map((c) => c.text) || []} />
                      </p>
                      <p className="muted small">
                        {h.winners.length ? `Won by ${h.winners.map((w) => w.name).join(' & ')}` : 'No votes'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
      <div className="screen-footer">
        {isHost ? (
          <button className="btn btn-primary" onClick={onPlayAgain} disabled={missing > 0}>
            {missing > 0 ? `Need ${missing} more player${missing === 1 ? '' : 's'}` : 'Play again'}
          </button>
        ) : (
          <p className="muted center">Waiting for the host to start a new game…</p>
        )}
        <button className="link-btn" onClick={onLeave}>Leave</button>
      </div>
    </div>
  )
}
