import { describe, it, expect } from 'vitest'
import { buildQuestionDeck, buildAnswerDeck } from './decks'
import { normalAnswers, extremeAnswers } from './answers'
import { normalQuestions, extremeQuestions } from './questions'

describe('buildAnswerDeck', () => {
  it('uses only normal answers when hardcore is off', () => {
    const deck = buildAnswerDeck(false)
    expect(deck).toHaveLength(normalAnswers.length)
    expect(deck.every((c) => c.id.startsWith('n'))).toBe(true)
  })

  it('is half normal, half extreme when hardcore is on', () => {
    const deck = buildAnswerDeck(true)
    const half = Math.min(normalAnswers.length, extremeAnswers.length)
    expect(deck).toHaveLength(half * 2)
    expect(deck.filter((c) => c.id.startsWith('e'))).toHaveLength(half)
  })

  it('has unique ids even though normal and extreme ids overlap', () => {
    const ids = buildAnswerDeck(true).map((c) => c.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('returns { id, text } cards with non-empty text', () => {
    for (const c of buildAnswerDeck(true)) {
      expect(typeof c.text).toBe('string')
      expect(c.text.trim()).not.toBe('')
    }
  })
})

describe('buildQuestionDeck', () => {
  const extremeIds = new Set(extremeQuestions.map((q) => `q${q.id}`))

  it('uses only normal questions when hardcore is off', () => {
    const deck = buildQuestionDeck(false)
    expect(deck).toHaveLength(normalQuestions.length)
    expect(deck.some((q) => extremeIds.has(q.id))).toBe(false)
  })

  it('is half normal, half extreme when hardcore is on, with unique ids', () => {
    const deck = buildQuestionDeck(true)
    const half = Math.min(normalQuestions.length, extremeQuestions.length)
    expect(deck).toHaveLength(half * 2)
    expect(deck.filter((q) => extremeIds.has(q.id))).toHaveLength(half)
    expect(new Set(deck.map((q) => q.id)).size).toBe(deck.length)
  })

  it('has a pick that matches the blanks (1–3)', () => {
    for (const q of buildQuestionDeck(true)) {
      const blanks = (q.text.match(/_{3,}/g) || []).length
      expect(q.pick).toBe(Math.min(3, Math.max(1, blanks)))
    }
  })
})

describe('normal cards', () => {
  // Normal mode is for under-18 tables; anything matching this belongs in the extreme lists.
  const adult = /\b(fuck\w*|shit\w*|bitch\w*|cock|penis|vagina|porn\w*|horny|sex|sexual\w*|cum|ass|nude|naked|rape\w*|cocaine|heroin|beer|drunk)\b/i

  it('contain no explicit words', () => {
    const texts = [...normalAnswers.map(([, t]) => t), ...normalQuestions.map((q) => q.text)]
    expect(texts.filter((t) => adult.test(t))).toEqual([])
  })
})
