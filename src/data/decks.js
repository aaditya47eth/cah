import { normalQuestions, extremeQuestions } from './questions'
import { normalAnswers, extremeAnswers } from './answers'
import { pickCount, shuffle } from '../lib/gameLogic'

// Normal and extreme answers both number from 1, so ids get a prefix.
const toCards = (list, prefix) => list.map(([id, text]) => ({ id: `${prefix}${id}`, text }))

// Hardcore decks are half normal, half extreme: the bigger list is randomly
// trimmed to the size of the smaller one, so every draw is a coin flip.
function evenMix(normal, extreme) {
  const n = Math.min(normal.length, extreme.length)
  return [...shuffle(normal).slice(0, n), ...shuffle(extreme).slice(0, n)]
}

export function buildAnswerDeck(hardcore) {
  const normal = toCards(normalAnswers, 'n')
  return hardcore ? evenMix(normal, toCards(extremeAnswers, 'e')) : normal
}

// Question ids are unique across both lists, so one prefix is enough.
export function buildQuestionDeck(hardcore) {
  const toDeck = (list) => list.map((q) => ({ id: `q${q.id}`, text: q.text, pick: pickCount(q.text) }))
  const normal = toDeck(normalQuestions)
  return hardcore ? evenMix(normal, toDeck(extremeQuestions)) : normal
}
