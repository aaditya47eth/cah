import { useState } from 'react'
import QuestionCard from './QuestionCard'
import CardCarousel from './CardCarousel'
import WaitingList from './WaitingList'

const texts = (sub) => (sub ? sub.cards.map((c) => c.text) : [])

export default function VotePhase({ state, me, onVote }) {
  const { currentQuestion: question, submissions, round, players, playerId } = state
  const [active, setActive] = useState(0)
  const [votedFor, setVotedFor] = useState(null)
  const options = submissions.filter((s) => s.ownerId !== playerId)

  if (me.voted || options.length === 0) {
    return (
      <div className="screen-body game-body">
        <QuestionCard question={question} answers={texts(votedFor)} round={round} compact />
        <WaitingList
          title={me.voted ? '🗳️ Vote sent! Waiting for the others…' : 'Nothing to vote on this round'}
          players={players}
          myId={playerId}
          isDone={(p) => p.voted}
        />
      </div>
    )
  }

  const current = options[Math.min(active, options.length - 1)]

  const send = () => {
    setVotedFor(current)
    onVote(current.id)
  }

  return (
    <>
      <div className="screen-body game-body">
        <QuestionCard question={question} answers={texts(current)} round={round} />
        <div className="phase-head">
          <span className="phase-title"><span aria-hidden="true">🗳️</span> Vote for a card</span>
        </div>
        <CardCarousel
          items={options}
          active={active}
          onActiveChange={setActive}
          label="Answers to vote on"
          variant="vote"
          renderCard={(sub) => (
            <div className="answer-card">
              {sub.cards.map((c) => <p key={c.id}>{c.text}</p>)}
            </div>
          )}
        />
      </div>
      <div className="screen-footer">
        <button className="btn btn-primary" onClick={send}>Send</button>
      </div>
    </>
  )
}
