import Avatar from '../Avatar'
import { StarIcon } from '../icons'
import { kickVotesNeeded } from '../../lib/gameLogic'

// Competition ranking: ties share a rank (1, 2, 3, 3, 3).
const rankIn = (score, scores) => 1 + scores.filter((s) => s > score).length

export default function Leaderboard({ players, myId, prevScores, kickVotes, onKick }) {
  const scores = players.map((p) => p.score)
  const before = (p) => prevScores?.[p.id] ?? p.score
  const prevList = players.map(before)
  const ranked = [...players].sort((a, b) => b.score - a.score)
  const needed = kickVotesNeeded(players.length)

  return (
    <div className="panel leaderboard">
      {ranked.map((p) => {
        const rank = rankIn(p.score, scores)
        const prevRank = rankIn(before(p), prevList)
        const delta = p.score - before(p)
        const kicks = kickVotes?.[p.id] || []
        const iVoted = kicks.includes(myId)
        return (
          <div key={p.id} className="row">
            <span className="rank">
              {rank}
              {prevScores && rank > prevRank && <span className="rank-down" aria-label="down">▼</span>}
              {prevScores && rank < prevRank && <span className="rank-up" aria-label="up">▲</span>}
            </span>
            <Avatar avatar={p.avatar} name={p.name} size={40} />
            <span className="row-name">
              {p.name}
              {p.id === myId && <span className="muted"> (you)</span>}
            </span>
            {delta > 0 && <span className="delta">+{delta}</span>}
            <span className="score">{p.score}<StarIcon size={22} /></span>
            {onKick && p.id !== myId && (
              <button
                className={`kick-btn ${iVoted ? 'voted' : ''}`}
                onClick={() => onKick(p)}
                disabled={iVoted}
                aria-label={`Vote to kick ${p.name} (${kicks.length} of ${needed})`}
              >
                {kicks.length > 0 ? `${kicks.length}/${needed}` : 'Kick'}
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}
