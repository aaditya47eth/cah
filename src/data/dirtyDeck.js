import data from './dirty-minds.json'
import { shuffle } from '../lib/gameLogic'

// To add cards, append to `cards` in dirty-minds.json: a unique id, the clean
// answer, and exactly 5 clues (dirtiest first, most obvious last).
export const dirtyCards = data.cards.map((c) => ({ id: `d${c.id}`, answer: c.answer, clues: c.clues }))

export function buildDirtyDeck() {
  return shuffle(dirtyCards)
}
