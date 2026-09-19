import Avatar from '../Avatar'
import QuestionCard from './QuestionCard'
import Leaderboard from './Leaderboard'
import { WINNING_SCORE } from '../../lib/hostEngine'

function ResultCard({ sub, byId }) {
  const owner = byId[sub.ownerId]
  return (
    <div className={`result-card ${sub.winner ? 'winner' : ''}`}>
      <div className="result-owner">
        <Avatar avatar={owner?.avatar} name={sub.ownerName} size={52} />
        <div>
          <p className="result-label">
            {sub.winner ? 'Receives a point' : `${sub.votes} vote${sub.votes === 1 ? '' : 's'}`}
          </p>
          <p className="result-name">{sub.ownerName}</p>
        </div>
      </div>
      <p className="result-answer">{sub.cards.map((c) => c.text).join(' / ')}</p>
      {sub.voters.length > 0 ? (
        <>
          <div className="divider-label"><span>They chose this answer</span></div>
          <div className="chips">
            {sub.voters.map((id) => (
              <span key={id} className="chip">
                <Avatar avatar={byId[id]?.avatar} name={byId[id]?.name} size={26} />
                {byId[id]?.name || 'Someone'}
              </span>
            ))}
          </div>
        </>
      ) : (
        <p className="muted small">No votes</p>
      )}
    </div>
  )
}

export default function ResultsPhase({ state, onContinue }) {
  const { result, currentQuestion: question, round, players, playerId, isHost } = state
  const byId = Object.fromEntries(players.map((p) => [p.id, p]))
  const winners = result.subs.filter((s) => s.winner)
  const gameEnds = players.some((p) => p.score >= WINNING_SCORE)

  return (
    <>
      <div className="screen-body game-body">
        <QuestionCard
          question={question}
          answers={winners[0] ? winners[0].cards.map((c) => c.text) : []}
          round={round}
          compact
        />
        {winners.length === 0 && <p className="notice">No votes this round, so nobody scores.</p>}
        {winners.length > 1 && <p className="notice">It’s a tie! Everyone tied gets a point.</p>}
        {result.subs.map((sub) => <ResultCard key={sub.id} sub={sub} byId={byId} />)}

        <h2 className="section-title"><span aria-hidden="true">🎖️</span> Leaderboard</h2>
        <Leaderboard players={players} myId={playerId} prevScores={result.prevScores} />
      </div>
      <div className="screen-footer">
        {isHost ? (
          <button className="btn btn-primary" onClick={onContinue}>
            {gameEnds ? 'See final results' : 'Continue playing'}
          </button>
        ) : (
          <p className="muted center">Waiting for the host to continue…</p>
        )}
      </div>
    </>
  )
}
