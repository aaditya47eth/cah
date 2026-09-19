import { describe, it, expect } from 'vitest'
import { dirtyCards, buildDirtyDeck } from './dirtyDeck'

describe('dirty minds cards', () => {
  it('have unique ids', () => {
    const ids = dirtyCards.map((c) => c.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('each have an answer and exactly 5 non-empty clues', () => {
    for (const c of dirtyCards) {
      expect(c.answer.trim()).not.toBe('')
      expect(c.clues).toHaveLength(5)
      expect(c.clues.every((clue) => typeof clue === 'string' && clue.trim())).toBe(true)
    }
  })

  it('buildDirtyDeck returns a shuffled copy of every card', () => {
    const deck = buildDirtyDeck()
    expect(deck).not.toBe(dirtyCards)
    expect(new Set(deck.map((c) => c.id))).toEqual(new Set(dirtyCards.map((c) => c.id)))
    expect(deck).toHaveLength(dirtyCards.length)
  })
})
