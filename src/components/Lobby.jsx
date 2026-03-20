import { useState } from 'react'
import PlayerAvatar from './PlayerAvatar'

const REFRESH_OPTIONS = [0, 1, 2, 3, 5, 10, -1]

export default function Lobby({
  roomCode,
  players,
  isHost,
  onStartGame,
  onLeave,
  onAddCustomQuestion,
  onAddCustomAnswer,
}) {
  const canStart = players.length >= 2
  const [customQ, setCustomQ] = useState('')
  const [customA, setCustomA] = useState('')
  const [showCustom, setShowCustom] = useState(false)
  const [copied, setCopied] = useState(false)
  const [maxRefreshes, setMaxRefreshes] = useState(2)

  const copyCode = async () => {
    await navigator.clipboard.writeText(roomCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleAddQ = (e) => {
    e.preventDefault()
    if (customQ.trim()) {
      onAddCustomQuestion(customQ.trim())
      setCustomQ('')
    }
  }

  const handleAddA = (e) => {
    e.preventDefault()
    if (customA.trim()) {
      onAddCustomAnswer(customA.trim())
      setCustomA('')
    }
  }

  return (
    <div className="lobby">
      <div className="lobby-header">
        <h2>Waiting Room</h2>
        <div className="room-code-display" onClick={copyCode}>
          <span className="room-code-label">Room Code</span>
          <span className="room-code-value">{roomCode}</span>
          <span className="room-code-hint">{copied ? 'Copied!' : 'tap to copy'}</span>
        </div>
      </div>

      <div className="players-list">
        <h3>Players ({players.length}/12)</h3>
        {players.map((p, i) => (
          <div key={p.id || i} className="player-item">
            <PlayerAvatar avatar={p.avatar} name={p.name} size={36} />
            <span className="player-name">{p.name}</span>
            {i === 0 && <span className="player-badge">Host</span>}
          </div>
        ))}
        {players.length < 2 && (
          <p className="waiting-text">Waiting for more players to join...</p>
        )}
      </div>

      {/* Custom Cards */}
      <div className="custom-section">
        <button
          className="btn btn-ghost"
          onClick={() => setShowCustom(!showCustom)}
        >
          {showCustom ? 'Hide Custom Cards' : '+ Add Custom Cards'}
        </button>
        {showCustom && (
          <div className="custom-forms">
            <form onSubmit={handleAddQ} className="custom-form">
              <input
                type="text"
                placeholder="Question (use _____ for blank)"
                value={customQ}
                onChange={(e) => setCustomQ(e.target.value)}
                className="input input-small"
              />
              <button type="submit" className="btn btn-secondary btn-sm" disabled={!customQ.trim()}>
                + Q
              </button>
            </form>
            <form onSubmit={handleAddA} className="custom-form">
              <input
                type="text"
                placeholder="Answer card text"
                value={customA}
                onChange={(e) => setCustomA(e.target.value)}
                className="input input-small"
              />
              <button type="submit" className="btn btn-secondary btn-sm" disabled={!customA.trim()}>
                + A
              </button>
            </form>
          </div>
        )}
      </div>

      {isHost && (
        <div className="setting-row">
          <span className="setting-label">Card refreshes per round</span>
          <div className="setting-options">
            {REFRESH_OPTIONS.map((n) => (
              <button
                key={n}
                className={`setting-option ${maxRefreshes === n ? 'active' : ''}`}
                onClick={() => setMaxRefreshes(n)}
              >
                {n === 0 ? 'None' : n === -1 ? '\u221E' : n}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="lobby-actions">
        {isHost ? (
          <button
            className="btn btn-primary btn-large"
            onClick={() => onStartGame(maxRefreshes)}
            disabled={!canStart}
          >
            {canStart
              ? 'Start Game'
              : `Need ${2 - players.length} more player(s)`}
          </button>
        ) : (
          <p className="waiting-text">Waiting for the host to start the game...</p>
        )}
        <button className="btn btn-ghost" onClick={onLeave}>
          Leave Room
        </button>
      </div>
    </div>
  )
}
