import { useState } from 'react'
import Sheet from '../Sheet'
import ClueCard, { AnswerPanel } from './ClueCard'
import DirtyHowToPlay from './DirtyHowToPlay'
import { DirtyTopBar, AllPlayed } from './DirtyGame'
import { buildDirtyDeck } from '../../data/dirtyDeck'

// Dirty Minds on one device: no room, no network.
export default function PassAndPlay({ onLeave }) {
  const [deck, setDeck] = useState(() => buildDirtyDeck())
  const [index, setIndex] = useState(0)
  const [shown, setShown] = useState(1)
  const [revealed, setRevealed] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)

  const goTo = (i) => {
    setIndex(i)
    setShown(1)
    setRevealed(false)
  }
  const restart = () => {
    setDeck(buildDirtyDeck())
    goTo(0)
  }
  const reveal = () => {
    setRevealed(true)
    setShown(deck[index].clues.length)
  }

  const card = deck[index]
  if (!card) {
    return (
      <AllPlayed total={deck.length}>
        <button className="btn btn-primary" onClick={restart}>Play again</button>
        <button className="link-btn" onClick={onLeave}>Back to home</button>
      </AllPlayed>
    )
  }

  const cluesLeft = card.clues.length - shown
  const leave = () => { if (window.confirm('Stop playing?')) onLeave() }

  return (
    <div className="screen">
      <DirtyTopBar cardNumber={index + 1} totalCards={deck.length} onLeave={leave} onHelp={() => setHelpOpen(true)} />

      <div className="screen-body game-body">
        <p className="phase-title"><span aria-hidden="true">😏</span> What am I?</p>
        <ClueCard clues={card.clues.slice(0, shown)} clueCount={card.clues.length} cardNumber={index + 1} />
        {revealed && <AnswerPanel answer={card.answer} />}
      </div>

      <div className="screen-footer">
        {revealed ? (
          <button className="btn btn-primary" onClick={() => goTo(index + 1)}>
            {index + 1 >= deck.length ? 'Finish' : 'Next card'}
          </button>
        ) : (
          <>
            <button className="btn btn-secondary" onClick={() => setShown(shown + 1)} disabled={cluesLeft === 0}>
              {cluesLeft ? `Next clue (${cluesLeft} left)` : 'No clues left'}
            </button>
            <button className="btn btn-primary" onClick={reveal}>Reveal answer</button>
          </>
        )}
      </div>

      <Sheet open={helpOpen} onClose={() => setHelpOpen(false)} title="How to play">
        <DirtyHowToPlay local />
        <button className="btn btn-primary" onClick={() => setHelpOpen(false)}>Got it</button>
      </Sheet>
    </div>
  )
}
