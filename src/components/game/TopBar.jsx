import { useEffect, useState } from 'react'
import { CloseIcon, HelpIcon, StarIcon } from '../icons'

function useSecondsLeft(deadline) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!deadline) return undefined
    const id = setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(id)
  }, [deadline])
  return deadline ? Math.max(0, Math.ceil((deadline - now) / 1000)) : null
}

export default function TopBar({ deadline, round, onLeave, onHelp, onLeaderboard }) {
  const secs = useSecondsLeft(deadline)
  const mm = String(Math.floor((secs ?? 0) / 60)).padStart(2, '0')
  const ss = String((secs ?? 0) % 60).padStart(2, '0')

  return (
    <div className="topbar">
      <div className="topbar-side">
        <button className="icon-btn" onClick={onLeave} aria-label="Leave game"><CloseIcon /></button>
        <button className="icon-btn" onClick={onHelp} aria-label="How to play"><HelpIcon /></button>
      </div>
      {secs !== null ? (
        <span className={`timer ${secs <= 5 ? 'timer-low' : ''}`} role="timer" aria-label={`${secs} seconds left`}>
          {mm}:{ss}
        </span>
      ) : (
        <span className="timer timer-round">Round {round}</span>
      )}
      <div className="topbar-side topbar-right">
        <button className="icon-btn" onClick={onLeaderboard} aria-label="Leaderboard"><StarIcon /></button>
      </div>
    </div>
  )
}
