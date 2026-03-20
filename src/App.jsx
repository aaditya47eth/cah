import { useGame } from './hooks/useGame'
import Home from './components/Home'
import Lobby from './components/Lobby'
import Game from './components/Game'

export default function App() {
  const {
    state, createRoom, joinRoom, startGame, selectCard, submitCards,
    pickWinner, nextRound, playAgain, leaveGame,
    refreshHand, refreshQuestion, confirmQuestion, voteKick,
    addCustomQuestion, addCustomAnswer,
  } = useGame()

  if (state.phase === 'home') {
    return <Home onCreateRoom={createRoom} onJoinRoom={joinRoom} />
  }

  if (state.phase === 'lobby') {
    return (
      <Lobby
        roomCode={state.roomCode}
        players={state.players}
        isHost={state.isHost}
        onStartGame={startGame}
        onLeave={leaveGame}
        onAddCustomQuestion={addCustomQuestion}
        onAddCustomAnswer={addCustomAnswer}
      />
    )
  }

  return (
    <Game
      state={state}
      onSelectCard={selectCard}
      onSubmitCards={submitCards}
      onPickWinner={pickWinner}
      onNextRound={nextRound}
      onPlayAgain={playAgain}
      onLeave={leaveGame}
      onRefreshHand={refreshHand}
      onRefreshQuestion={refreshQuestion}
      onConfirmQuestion={confirmQuestion}
      onVoteKick={voteKick}
    />
  )
}
