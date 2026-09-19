import { useState } from 'react'
import TopBar from './TopBar'
import PickPhase from './PickPhase'
import VotePhase from './VotePhase'
import ResultsPhase from './ResultsPhase'
import GameOver from './GameOver'
import Leaderboard from './Leaderboard'
import Sheet from '../Sheet'
import HowToPlay from '../HowToPlay'
import { kickVotesNeeded } from '../../lib/gameLogic'

export default function Game({
  state, onSubmitCards, onVote, onExchangeHand, onContinue, onPlayAgain, onVoteKick, onLeave,
}) {
  const [sheet, setSheet] = useState(null) // 'help' | 'board' | null
  const { phase, players, playerId, kickVotes } = state
  const me = players.find((p) => p.id === playerId)

  if (phase === 'kicked') {
    return (
      <div className="screen">
        <div className="screen-body center-body">
          <p className="big-emoji" aria-hidden="true">🥾</p>
          <h1>You were kicked</h1>
          <p className="muted">The other players voted to remove you from the game.</p>
        </div>
        <div className="screen-footer">
          <button className="btn btn-primary" onClick={onLeave}>Back to home</button>
        </div>
      </div>
    )
  }

  if (phase === 'gameOver') {
    return <GameOver state={state} onPlayAgain={onPlayAgain} onLeave={onLeave} />
  }

  if (!me) {
    return (
      <div className="screen">
        <div className="screen-body center-body"><span className="spinner" aria-label="Loading" /></div>
      </div>
    )
  }

  const leave = () => { if (window.confirm('Leave this game?')) onLeave() }
  const kick = (p) => { if (window.confirm(`Vote to kick ${p.name}?`)) onVoteKick(p.id) }

  return (
    <div className="screen">
      <TopBar
        deadline={state.deadline}
        round={state.round}
        onLeave={leave}
        onHelp={() => setSheet('help')}
        onLeaderboard={() => setSheet('board')}
      />
      {phase === 'picking' && (
        <PickPhase key={state.round} state={state} me={me} onSubmit={onSubmitCards} onExchange={onExchangeHand} />
      )}
      {phase === 'voting' && <VotePhase key={state.round} state={state} me={me} onVote={onVote} />}
      {phase === 'results' && <ResultsPhase state={state} onContinue={onContinue} />}

      <Sheet open={sheet === 'board'} onClose={() => setSheet(null)} title="🎖️ Leaderboard">
        <Leaderboard players={players} myId={playerId} kickVotes={kickVotes} onKick={kick} />
        <p className="muted small">
          Kicking someone needs {kickVotesNeeded(players.length)} vote{kickVotesNeeded(players.length) === 1 ? '' : 's'}.
        </p>
        <button className="btn btn-primary" onClick={() => setSheet(null)}>Back to game</button>
      </Sheet>
      <Sheet open={sheet === 'help'} onClose={() => setSheet(null)} title="How to play">
        <HowToPlay />
        <button className="btn btn-primary" onClick={() => setSheet(null)}>Got it</button>
      </Sheet>
    </div>
  )
}
