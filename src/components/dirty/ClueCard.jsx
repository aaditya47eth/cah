import { useState } from 'react'
import { questionColor } from '../game/QuestionCard'

// Every clue slot is shown; the ones not revealed yet stay locked.
export default function ClueCard({ clues, clueCount, cardNumber }) {
  return (
    <div className="clue-card" style={{ background: questionColor(cardNumber) }}>
      <ol className="clue-list">
        {Array.from({ length: clueCount }, (_, i) => (
          <li key={i} className={`clue ${i < clues.length ? '' : 'clue-locked'}`}>
            <span className="clue-num">{i + 1}</span>
            <span>{i < clues.length ? clues[i] : 'Locked'}</span>
          </li>
        ))}
      </ol>
    </div>
  )
}

export function AnswerPanel({ answer }) {
  return (
    <div className="answer-reveal" role="status">
      <span className="eyebrow">It was…</span>
      <p>{answer}</p>
    </div>
  )
}

// The reader's copy of the answer, hidden until tapped so neighbours can't peek.
export function SecretAnswer({ answer }) {
  const [shown, setShown] = useState(false)
  return (
    <button type="button" className="secret-answer" onClick={() => setShown(!shown)} aria-pressed={shown}>
      <span className="eyebrow">Answer · only you can see this</span>
      <span className="secret-answer-text">{shown ? answer : 'Tap to peek 👀'}</span>
    </button>
  )
}
