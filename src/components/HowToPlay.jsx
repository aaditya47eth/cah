import { HAND_SIZE, WINNING_SCORE } from '../lib/hostEngine'

export default function HowToPlay() {
  return (
    <ol className="how-to">
      <li>Everyone holds {HAND_SIZE} answer cards. Don’t like them? <b>Exchange hand</b> swaps all {HAND_SIZE}.</li>
      <li>Each round, swipe to the card that best fills the blank and hit <b>Send</b>.</li>
      <li>One player is the <b>judge</b> each round (it rotates). They can <b>skip</b> a question for a new one, but they play and vote like everyone else.</li>
      <li>Then vote for the funniest answer. You can’t vote for your own.</li>
      <li>Most votes scores a point, and ties all score. First to {WINNING_SCORE} wins.</li>
    </ol>
  )
}
