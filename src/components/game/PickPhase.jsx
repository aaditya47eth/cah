import { useEffect, useRef, useState } from 'react'
import QuestionCard from './QuestionCard'
import CardCarousel from './CardCarousel'
import WaitingList from './WaitingList'

function Sparkles() {
  return (
    <span className="sparkles" aria-hidden="true">
      {['8% 12%', '46% 8%', '80% 14%', '14% 44%', '60% 34%', '88% 46%'].map((pos, i) => {
        const [left, top] = pos.split(' ')
        return <span key={pos} style={{ left, top, animationDelay: `${i * 0.08}s` }}>✦</span>
      })}
    </span>
  )
}

export default function PickPhase({ state, me, onSubmit, onExchange }) {
  const { currentQuestion: question, hand, settings, round, players, playerId } = state
  const pick = question.pick
  const [active, setActive] = useState(0)
  const [selected, setSelected] = useState([]) // card ids, in blank order (pick > 1)
  const [sent, setSent] = useState([])
  const [freshIds, setFreshIds] = useState([])
  const prevHand = useRef(hand)
  const freshTimer = useRef(0)

  // Sparkle the cards dealt by a hand exchange.
  useEffect(() => {
    const prev = new Set(prevHand.current.map((c) => c.id))
    prevHand.current = hand
    const dealt = hand.filter((c) => !prev.has(c.id)).map((c) => c.id)
    if (dealt.length === 0) return
    setFreshIds(dealt)
    clearTimeout(freshTimer.current)
    freshTimer.current = setTimeout(() => setFreshIds([]), 1600)
  }, [hand])

  useEffect(() => () => clearTimeout(freshTimer.current), [])

  if (me.submitted) {
    return (
      <div className="screen-body game-body">
        <QuestionCard question={question} answers={sent} round={round} compact />
        <WaitingList
          title="✅ Sent! Waiting for the others…"
          players={players}
          myId={playerId}
          isDone={(p) => p.submitted}
        />
      </div>
    )
  }

  const current = hand[active]
  const selectedCards = selected.map((id) => hand.find((c) => c.id === id)).filter(Boolean)
  const preview = pick === 1
    ? (current ? [current.text] : [])
    : [
        ...selectedCards.map((c) => c.text),
        ...(current && !selected.includes(current.id) && selected.length < pick ? [current.text] : []),
      ]

  const exchangesLeft = settings.maxExchanges === -1
    ? Infinity
    : settings.maxExchanges - (me.exchangesUsed || 0)
  const canSend = pick === 1 ? Boolean(current) : selectedCards.length === pick

  const toggle = (card) => {
    if (pick === 1) return
    setSelected((s) => {
      if (s.includes(card.id)) return s.filter((id) => id !== card.id)
      return s.length < pick ? [...s, card.id] : s
    })
  }

  const exchange = () => {
    setSelected([])
    onExchange()
  }

  const send = () => {
    const cards = pick === 1 ? [current] : selectedCards
    setSent(cards.map((c) => c.text))
    onSubmit(cards.map((c) => c.id))
  }

  return (
    <>
      <div className="screen-body game-body">
        <QuestionCard question={question} answers={preview} round={round} />
        <div className="phase-head">
          <span className="phase-title">
            <span aria-hidden="true">🤔</span> {pick > 1 ? `Select ${pick} cards` : 'Select a card'}
          </span>
          {settings.maxExchanges !== 0 && (
            <button
              className="pill pill-pink"
              onClick={exchange}
              disabled={exchangesLeft <= 0 || hand.length === 0}
              title="Swap all your cards for new ones"
            >
              <span className="pill-count">{exchangesLeft === Infinity ? '∞' : exchangesLeft}</span>
              Exchange hand
            </button>
          )}
        </div>
        {pick > 1 && <p className="hint">Tap cards in the order they fill the blanks.</p>}
        <CardCarousel
          items={hand}
          active={active}
          onActiveChange={setActive}
          onActivate={toggle}
          label="Your cards"
          renderCard={(card) => {
            const order = selected.indexOf(card.id)
            return (
              <div className={`answer-card ${order !== -1 ? 'selected' : ''}`}>
                {freshIds.includes(card.id) && <Sparkles />}
                {order !== -1 && <span className="select-order">{order + 1}</span>}
                <p>{card.text}</p>
              </div>
            )
          }}
        />
      </div>
      <div className="screen-footer">
        <button className="btn btn-primary" onClick={send} disabled={!canSend}>
          {pick > 1 ? `Send (${selectedCards.length}/${pick})` : 'Send'}
        </button>
      </div>
    </>
  )
}
