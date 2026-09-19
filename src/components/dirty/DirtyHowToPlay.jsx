export default function DirtyHowToPlay({ local = false }) {
  return (
    <ol className="how-to">
      <li>Every card has 5 filthy-sounding clues for a totally innocent answer.</li>
      {local ? (
        <li>One person reads the clues out loud, or just pass the phone around.</li>
      ) : (
        <li>One player is the <b>Reader</b> and secretly sees the answer. The role moves on every card.</li>
      )}
      <li>Reveal clues one at a time. Everyone shouts out guesses.</li>
      <li>Someone got it, or nobody can? Hit <b>Reveal answer</b>, then the next card.</li>
    </ol>
  )
}
