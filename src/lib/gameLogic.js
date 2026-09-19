// Pure game helpers — no React, no network. Covered by gameLogic.test.js.

const BLANK_RE = /_{3,}/g

export function shuffle(array) {
  const a = [...array]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// Inserts in place so custom cards don't all land at the end of a deck.
export function insertAtRandom(array, item, rand = Math.random) {
  const index = Math.min(array.length, Math.floor(rand() * (array.length + 1)))
  array.splice(index, 0, item)
  return array
}

// Strict majority of the players other than the target.
export function kickVotesNeeded(playerCount) {
  return Math.max(1, Math.floor((playerCount - 1) / 2) + 1)
}

export function countBlanks(text) {
  return (text.match(BLANK_RE) || []).length
}

export function pickCount(text) {
  return Math.min(3, Math.max(1, countBlanks(text)))
}

// Splits a question into text / blank / answer parts so it can be rendered
// as React nodes (never as HTML). Questions without a blank get the answers
// appended at the end.
export function questionParts(text, answers = []) {
  const parts = []
  const chunks = text.split(BLANK_RE)

  if (chunks.length === 1) {
    parts.push({ type: 'text', value: text })
    if (answers.length > 0) {
      parts.push({ type: 'text', value: ' ' })
      parts.push({ type: 'answer', value: answers.join(', ') })
    }
    return parts
  }

  chunks.forEach((chunk, i) => {
    if (chunk) parts.push({ type: 'text', value: chunk })
    if (i < chunks.length - 1) {
      parts.push(answers[i] ? { type: 'answer', value: answers[i] } : { type: 'blank' })
    }
  })
  return parts
}

// submissions: [{ id, ownerId }], votes: { voterId: submissionId }
export function tallyVotes(submissions, votes) {
  const counts = {}
  const voters = {}
  const owners = {}
  for (const s of submissions) {
    counts[s.id] = 0
    voters[s.id] = []
    owners[s.id] = s.ownerId
  }

  for (const [voterId, subId] of Object.entries(votes)) {
    if (!(subId in counts)) continue
    if (owners[subId] === voterId) continue
    counts[subId] += 1
    voters[subId].push(voterId)
  }

  const max = Math.max(0, ...Object.values(counts))
  const winnerIds = max > 0 ? Object.keys(counts).filter((id) => counts[id] === max) : []
  return { counts, voters, winnerIds }
}
