import Avatar from '../Avatar'
import { CheckIcon } from '../icons'

export default function WaitingList({ title, players, myId, judgeId, isDone }) {
  return (
    <div className="waiting">
      <p className="phase-title">{title}</p>
      <div className="panel">
        {players.map((p) => (
          <div key={p.id} className="row">
            <Avatar avatar={p.avatar} name={p.name} size={40} />
            <span className="row-name">
              {p.name}
              {p.id === myId && <span className="muted"> (you)</span>}
              {p.id === judgeId && <span className="judge-tag" title="Judge">⚖️</span>}
            </span>
            {isDone(p)
              ? <span className="check-dot"><CheckIcon /></span>
              : <span className="spinner" aria-label="waiting" />}
          </div>
        ))}
      </div>
    </div>
  )
}
