import { useState } from 'react'
import Avatar from '../Avatar'
import Sheet from '../Sheet'
import ClueCard, { AnswerPanel, SecretAnswer } from './ClueCard'
import DirtyHowToPlay from './DirtyHowToPlay'
import { CloseIcon, HelpIcon } from '../icons'
import { MIN_PLAYERS } from '../../lib/dirtyEngine'

export function DirtyTopBar({ cardNumber, totalCards, onLeave, onHelp }) {
  return (
    <div className="topbar">
      <div className="topbar-side">
        <button className="icon-btn" onClick={onLeave} aria-label="Leave game"><CloseIcon /></button>
      </div>
      <span className="timer timer-round">Card {cardNumber} / {totalCards}</span>
      <div className="topbar-side topbar-right">
        <button className="icon-btn" onClick={onHelp} aria-label="How to play"><HelpIcon /></button>
      </div>
    </div>
  )
}

export function AllPlayed({ total, children }) {
  return (
    <div className="screen">
      <div className="screen-body center-body">
        <p className="big-emoji" aria-hidden="true">🎉</p>
        <h1>All cards played</h1>
        <p className="muted">That was all {total} cards. Your minds are officially filthy.</p>
      </div>
      <div className="screen-footer">{children}</div>
    </div>
  )
}

export default function DirtyGame({ state, onNextClue, onReveal, onNextCard, onPlayAgain, onLeave }) {
  const [helpOpen, setHelpOpen] = useState(false)
  const { phase, players, playerId, isHost, readerId, card, cardNumber, totalCards, revealed } = state

  if (phase === 'kicked') {
    return (
      <div className="screen">
        <div className="screen-body center-body">
          <p className="big-emoji" aria-hidden="true">👋</p>
          <h1>You left the room</h1>
          <p className="muted">You were disconnected for too long.</p>
        </div>
        <div className="screen-footer">
          <button className="btn btn-primary" onClick={onLeave}>Back to home</button>
        </div>
      </div>
    )
  }

  if (phase === 'finished') {
    const missing = Math.max(0, MIN_PLAYERS - players.length)
    return (
      <AllPlayed total={totalCards}>
        {isHost ? (
          <button className="btn btn-primary" onClick={onPlayAgain} disabled={missing > 0}>
            {missing > 0 ? `Need ${missing} more player${missing === 1 ? '' : 's'}` : 'Play again'}
          </button>
        ) : (
          <p className="muted center">Waiting for the host to play again…</p>
        )}
        <button className="link-btn" onClick={onLeave}>Leave</button>
      </AllPlayed>
    )
  }

  if (!card) {
    return (
      <div className="screen">
        <div className="screen-body center-body"><span className="spinner" aria-label="Loading" /></div>
      </div>
    )
  }

  const reader = players.find((p) => p.id === readerId)
  const readerName = reader?.name || 'The reader'
  const isReader = readerId === playerId
  const cluesLeft = card.clueCount - card.clues.length
  const leave = () => { if (window.confirm('Leave this game?')) onLeave() }

  return (
    <div className="screen">
      <DirtyTopBar cardNumber={cardNumber} totalCards={totalCards} onLeave={leave} onHelp={() => setHelpOpen(true)} />

      <div className="screen-body game-body">
        {isReader ? (
          <p className="phase-title"><span aria-hidden="true">🎤</span> You’re the reader</p>
        ) : (
          <div className="reader-banner">
            <Avatar avatar={reader?.avatar} name={readerName} size={40} />
            <span><b>{readerName}</b> is reading <span aria-hidden="true">🤫</span></span>
          </div>
        )}
        {isReader && !revealed && <SecretAnswer key={card.id} answer={card.answer} />}
        <ClueCard clues={card.clues} clueCount={card.clueCount} cardNumber={cardNumber} />
        {revealed && <AnswerPanel answer={card.answer} />}
      </div>

      <div className="screen-footer">
        {isReader && revealed && (
          <button className="btn btn-primary" onClick={onNextCard}>
            {cardNumber >= totalCards ? 'Finish' : 'Next card'}
          </button>
        )}
        {isReader && !revealed && (
          <>
            <button className="btn btn-secondary" onClick={onNextClue} disabled={cluesLeft === 0}>
              {cluesLeft ? `Next clue (${cluesLeft} left)` : 'No clues left'}
            </button>
            <button className="btn btn-primary" onClick={onReveal}>Reveal answer</button>
          </>
        )}
        {!isReader && (
          <p className="muted center">
            {revealed ? `Waiting for ${readerName} to deal the next card…` : 'Shout your guesses out loud!'}
          </p>
        )}
      </div>

      <Sheet open={helpOpen} onClose={() => setHelpOpen(false)} title="How to play">
        <DirtyHowToPlay />
        <button className="btn btn-primary" onClick={() => setHelpOpen(false)}>Got it</button>
      </Sheet>
    </div>
  )
}
