import { questionParts } from '../../lib/gameLogic'

export const QUESTION_COLORS = ['#fbb92e', '#f4cfc4', '#dcd2f8', '#b3c55a', '#d9cebf']

export function questionColor(round) {
  return QUESTION_COLORS[Math.max(0, round - 1) % QUESTION_COLORS.length]
}

// Rendered as React text nodes only — card text is never treated as HTML.
export function QuestionText({ text, answers }) {
  return questionParts(text, answers).map((part, i) => {
    if (part.type === 'answer') return <mark key={i} className="answer-mark">{part.value}</mark>
    if (part.type === 'blank') return <span key={i} className="blank" aria-label="blank" />
    return <span key={i}>{part.value}</span>
  })
}

export default function QuestionCard({ question, answers = [], round, compact = false }) {
  if (!question) return null
  return (
    <div className={`question-card ${compact ? 'compact' : ''}`} style={{ background: questionColor(round) }}>
      {question.pick > 1 && <span className="pick-badge">Pick {question.pick}</span>}
      <p className="question-text">
        <QuestionText text={question.text} answers={answers} />
      </p>
    </div>
  )
}
