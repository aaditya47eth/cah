import { useState, useEffect } from 'react'
import PlayerAvatar from './PlayerAvatar'

export default function Game({
  state,
  onSelectCard,
  onSubmitCards,
  onPickWinner,
  onNextRound,
  onPlayAgain,
  onLeave,
  onRefreshHand,
  onRefreshQuestion,
  onConfirmQuestion,
  onVoteKick,
}) {
  const {
    phase, players, playerId, currentQuestion, hand, submissions,
    selectedCards, czarId, roundWinnerId, roundWinnerName,
    winningSubmission, isHost, roomCode, kickVotes, history,
    refreshesLeft,
  } = state

  const isCzar = playerId === czarId
  const me = players.find((p) => p.id === playerId)
  const hasSubmitted = players.find((p) => p.id === playerId)?.submitted
  const pick = currentQuestion?.pick || 1
  const canSubmit = selectedCards.length === pick && !hasSubmitted && !isCzar
  const czarName = players.find((p) => p.id === czarId)?.name || 'Unknown'

  const [selectedSub, setSelectedSub] = useState(null)
  const [showHistory, setShowHistory] = useState(false)

  useEffect(() => { setSelectedSub(null) }, [phase])

  const handleKick = (targetId) => {
    const target = players.find((p) => p.id === targetId)
    if (window.confirm(`Vote to kick ${target?.name || 'this player'}?`)) {
      onVoteKick(targetId)
    }
  }

  const renderQuestion = () => {
    if (!currentQuestion) return ''
    let text = currentQuestion.text
    if (phase === 'reveal' && winningSubmission) {
      for (const card of winningSubmission) {
        text = text.replace('_____', `<u>${card.text}</u>`)
      }
      if (!currentQuestion.text.includes('_____')) {
        text += ` <u>${winningSubmission.map((c) => c.text).join(', ')}</u>`
      }
    }
    return text
  }

  // ─── Kicked ──────────────────────────────────────────────────

  if (phase === 'kicked') {
    return (
      <div className="game">
        <div className="game-over">
          <h2>You were kicked</h2>
          <p className="waiting-text">The other players voted to remove you from the game.</p>
          <button className="btn btn-primary btn-large" onClick={onLeave}>
            Back to Home
          </button>
        </div>
      </div>
    )
  }

  // ─── Game Over ────────────────────────────────────────────────

  if (phase === 'gameOver') {
    const winner = players.reduce((a, b) => (a.score > b.score ? a : b))
    const sortedPlayers = [...players].sort((a, b) => b.score - a.score)

    return (
      <div className="game">
        <div className="game-over">
          <h2 className="animate-bounce">Game Over!</h2>
          <div className="winner-banner animate-scale-in">
            <span className="winner-crown">&#128081;</span>
            <span className="winner-name">{winner.name}</span>
            <span className="winner-score">{winner.score} points</span>
          </div>
          <div className="final-scores">
            {sortedPlayers.map((p, i) => (
              <div key={p.id} className="score-row animate-slide-in" style={{ animationDelay: `${i * 0.1}s` }}>
                <span className="score-rank">#{i + 1}</span>
                <span className="score-name">
                  <PlayerAvatar avatar={p.avatar} name={p.name} size={24} />
                  {p.name}
                </span>
                <span className="score-value">{p.score}</span>
              </div>
            ))}
          </div>

          {history && history.length > 0 && (
            <div className="history-section">
              <button className="btn btn-ghost" onClick={() => setShowHistory(!showHistory)}>
                {showHistory ? 'Hide Recap' : 'Show Round Recap'}
              </button>
              {showHistory && (
                <div className="history-list">
                  {history.map((h, i) => (
                    <div key={i} className="history-item animate-slide-in" style={{ animationDelay: `${i * 0.05}s` }}>
                      <span className="history-round">R{i + 1}</span>
                      <div className="history-content">
                        <p className="history-q">{h.question?.text}</p>
                        <p className="history-a">{h.answer?.map((a) => a.text).join(' + ')}</p>
                        <span className="history-winner">Won by {h.winnerName}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {isHost && (
            <button className="btn btn-primary btn-large" onClick={onPlayAgain}>
              Play Again
            </button>
          )}
          <button className="btn btn-ghost" onClick={onLeave}>Leave</button>
        </div>
      </div>
    )
  }

  // ─── Main Game ────────────────────────────────────────────────

  return (
    <div className="game">
      {/* Header */}
      <div className="game-header">
        <div className="game-header-left">
          <span className="room-badge">{roomCode}</span>
          <span className="czar-badge">Judge: {czarName}</span>
        </div>
        <div className="game-header-right">
          <span className="score-badge">{me?.score || 0} pts</span>
        </div>
      </div>

      {/* Scoreboard */}
      <div className="scoreboard">
        {players.map((p) => {
          const kv = kickVotes?.[p.id] || []
          const needed = Math.ceil((players.length - 1) / 2)
          const alreadyVoted = kv.includes?.(playerId)
          return (
            <div
              key={p.id}
              className={`score-chip ${p.id === czarId ? 'is-czar' : ''} ${p.id === playerId ? 'is-me' : ''}`}
            >
              <PlayerAvatar avatar={p.avatar} name={p.name} size={28} />
              <span className="chip-name">{p.name}</span>
              <span className="chip-score">{p.score}</span>
              {p.submitted && phase === 'picking' && (
                <span className="chip-check">&#10003;</span>
              )}
              {p.id !== playerId && phase !== 'gameOver' && (
                <button
                  className={`chip-kick ${alreadyVoted ? 'voted' : ''}`}
                  onClick={() => handleKick(p.id)}
                  title={`Vote kick (${kv.length}/${needed})`}
                  disabled={alreadyVoted}
                >
                  {kv.length > 0 ? `${kv.length}/${needed}` : '\u00D7'}
                </button>
              )}
            </div>
          )
        })}
      </div>

      {/* Confirm Question phase — only judge sees the question */}
      {phase === 'confirmQuestion' && (
        <div className="phase-content">
          {isCzar ? (
            <div className="confirm-question-wrap">
              {currentQuestion && (
                <div className="card card-black animate-flip-in">
                  <p dangerouslySetInnerHTML={{ __html: currentQuestion.text }} />
                  {pick > 1 && <span className="pick-badge">PICK {pick}</span>}
                </div>
              )}
              <div className="confirm-question-actions">
                <button className="btn btn-primary btn-large" onClick={onConfirmQuestion}>
                  Confirm Question
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={onRefreshQuestion}
                  disabled={refreshesLeft !== undefined && refreshesLeft <= 0}
                >
                  &#8635; Different Question{refreshesLeft !== undefined ? ` (${refreshesLeft})` : ''}
                </button>
              </div>
            </div>
          ) : (
            <div className="status-message">
              <p>The Judge is picking a question...</p>
            </div>
          )}
        </div>
      )}

      {/* Question card — shown during picking, judging, reveal */}
      {(phase === 'picking' || phase === 'judging' || phase === 'reveal') && currentQuestion && (
        <div className="card card-black animate-flip-in">
          <p dangerouslySetInnerHTML={{ __html: renderQuestion() }} />
          {pick > 1 && <span className="pick-badge">PICK {pick}</span>}
        </div>
      )}

      {/* Phase content */}
      {phase === 'picking' && (
        <div className="phase-content">
          {isCzar ? (
            <div className="status-message">
              <p>You are the Judge this round.</p>
              <p>Waiting for players to submit...</p>
              <div className="submit-progress">
                {players.filter((p) => p.id !== czarId).map((p) => (
                  <span key={p.id} className={`progress-dot ${p.submitted ? 'done' : ''}`} title={p.name}>
                    <PlayerAvatar avatar={p.avatar} name={p.name} size={24} />
                  </span>
                ))}
              </div>
            </div>
          ) : hasSubmitted ? (
            <div className="status-message">
              <p>Cards submitted! Waiting for others...</p>
            </div>
          ) : (
            <>
              <div className="instruction-row">
                <p className="instruction">Pick {pick} card{pick > 1 ? 's' : ''}</p>
                <button
                  className="btn btn-secondary btn-refresh-small"
                  onClick={onRefreshHand}
                  disabled={refreshesLeft !== undefined && refreshesLeft <= 0}
                >
                  &#8635; New Cards{refreshesLeft !== undefined ? ` (${refreshesLeft})` : ''}
                </button>
              </div>
              <div className="hand-grid">
                {hand.map((card, idx) => (
                  <div
                    key={card.id}
                    className={`card card-white card-slide-in ${selectedCards.includes(idx) ? 'selected' : ''}`}
                    style={{ animationDelay: `${idx * 0.05}s` }}
                    onClick={() => onSelectCard(idx)}
                  >
                    <p>{card.text}</p>
                    {selectedCards.includes(idx) && (
                      <span className="select-order">{selectedCards.indexOf(idx) + 1}</span>
                    )}
                  </div>
                ))}
              </div>
              {canSubmit && (
                <button className="btn btn-submit" onClick={onSubmitCards}>Submit</button>
              )}
            </>
          )}
        </div>
      )}

      {phase === 'judging' && (
        <div className="phase-content">
          {isCzar ? (
            <>
              <p className="instruction">
                {selectedSub !== null ? 'Confirm your pick or choose another' : 'Tap the funniest answer!'}
              </p>
              <div className="submissions">
                {submissions.map((sub, idx) => (
                  <div
                    key={idx}
                    className={`card card-white submission-card card-slide-in ${selectedSub === idx ? 'selected' : ''}`}
                    style={{ animationDelay: `${idx * 0.08}s` }}
                    onClick={() => setSelectedSub(idx)}
                  >
                    {sub.cards.map((c, ci) => (
                      <p key={ci}>{c.text}</p>
                    ))}
                  </div>
                ))}
              </div>
              {selectedSub !== null && (
                <button className="btn btn-submit" onClick={() => { onPickWinner(selectedSub); setSelectedSub(null) }}>
                  Confirm Winner
                </button>
              )}
            </>
          ) : (
            <div className="status-message">
              <p>The Judge is choosing...</p>
              <div className="submissions submissions-readonly">
                {submissions.map((sub, idx) => (
                  <div key={idx} className="card card-white submission-card card-slide-in" style={{ animationDelay: `${idx * 0.08}s` }}>
                    {sub.cards.map((c, ci) => (
                      <p key={ci}>{c.text}</p>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {phase === 'reveal' && (
        <div className="phase-content">
          <div className="reveal-banner animate-scale-in">
            <h3>{roundWinnerName} wins this round!</h3>
          </div>
          <div className="submissions">
            {submissions.map((sub, idx) => (
              <div
                key={idx}
                className={`card card-white submission-card card-slide-in ${
                  sub.playerId === roundWinnerId ? 'winner animate-celebrate' : ''
                }`}
                style={{ animationDelay: `${idx * 0.08}s` }}
              >
                {sub.cards.map((c, ci) => (
                  <p key={ci}>{c.text}</p>
                ))}
                <span className="submission-author">
                  {sub.playerName}
                  {sub.playerId === roundWinnerId && ' \u2605'}
                </span>
              </div>
            ))}
          </div>
          {(isHost || isCzar) && (
            <button className="btn btn-primary btn-large" onClick={onNextRound}>Next Round</button>
          )}
        </div>
      )}
    </div>
  )
}
