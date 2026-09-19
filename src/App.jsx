import { useState } from 'react'
import { useGame } from './hooks/useGame'
import Home from './components/Home'
import Lobby from './components/Lobby'
import Game from './components/game/Game'
import DirtyGame from './components/dirty/DirtyGame'
import PassAndPlay from './components/dirty/PassAndPlay'

export default function App() {
  const {
    state, createRoom, joinRoom, updateSettings, startGame, continueGame, playAgain,
    submitCards, vote, exchangeHand, voteKick, addCustomQuestion, addCustomAnswer, leaveGame,
    nextClue, revealAnswer, nextCard,
  } = useGame()
  const [localGame, setLocalGame] = useState(null) // pass & play needs no room

  let screen
  if (localGame === 'dirty') {
    screen = <PassAndPlay onLeave={() => setLocalGame(null)} />
  } else if (state.phase === 'home') {
    screen = <Home onCreateRoom={createRoom} onJoinRoom={joinRoom} onPassAndPlay={setLocalGame} />
  } else if (state.phase === 'lobby') {
    screen = (
      <Lobby
        state={state}
        onStartGame={startGame}
        onUpdateSettings={updateSettings}
        onLeave={leaveGame}
        onAddCustomQuestion={addCustomQuestion}
        onAddCustomAnswer={addCustomAnswer}
      />
    )
  } else if (state.game === 'dirty') {
    screen = (
      <DirtyGame
        state={state}
        onNextClue={nextClue}
        onReveal={revealAnswer}
        onNextCard={nextCard}
        onPlayAgain={playAgain}
        onLeave={leaveGame}
      />
    )
  } else {
    screen = (
      <Game
        state={state}
        onSubmitCards={submitCards}
        onVote={vote}
        onExchangeHand={exchangeHand}
        onContinue={continueGame}
        onPlayAgain={playAgain}
        onVoteKick={voteKick}
        onLeave={leaveGame}
      />
    )
  }

  return (
    <>
      {screen}
      {state.error && <div className="toast" role="alert">{state.error}</div>}
    </>
  )
}
