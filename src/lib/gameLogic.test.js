import { describe, it, expect } from 'vitest'
import {
  shuffle, insertAtRandom, kickVotesNeeded, countBlanks, pickCount,
  questionParts, tallyVotes,
} from './gameLogic'

describe('shuffle', () => {
  it('returns a new array with the same items', () => {
    const src = [1, 2, 3, 4, 5]
    const out = shuffle(src)
    expect(out).not.toBe(src)
    expect([...out].sort()).toEqual(src)
  })
})

describe('insertAtRandom', () => {
  it('inserts at the index chosen by the random source', () => {
    expect(insertAtRandom([1, 2, 3], 'x', () => 0)).toEqual(['x', 1, 2, 3])
    expect(insertAtRandom([1, 2, 3], 'x', () => 0.99)).toEqual([1, 2, 3, 'x'])
    expect(insertAtRandom([1, 2, 3], 'x', () => 0.5)).toEqual([1, 2, 'x', 3])
  })

  it('mutates and returns the same array', () => {
    const deck = [1]
    expect(insertAtRandom(deck, 2)).toBe(deck)
    expect(deck).toHaveLength(2)
  })
})

describe('kickVotesNeeded', () => {
  it('needs a strict majority of the other players', () => {
    expect(kickVotesNeeded(2)).toBe(1)
    expect(kickVotesNeeded(3)).toBe(2)
    expect(kickVotesNeeded(4)).toBe(2)
    expect(kickVotesNeeded(5)).toBe(3)
    expect(kickVotesNeeded(12)).toBe(6)
  })
})

describe('countBlanks / pickCount', () => {
  it('counts runs of three or more underscores', () => {
    expect(countBlanks('No blank here?')).toBe(0)
    expect(countBlanks('I love _____.')).toBe(1)
    expect(countBlanks('_____ and ______ and ___')).toBe(3)
  })

  it('clamps pick between 1 and 3', () => {
    expect(pickCount('What?')).toBe(1)
    expect(pickCount('_____ + _____')).toBe(2)
    expect(pickCount('_____ _____ _____ _____')).toBe(3)
  })
})

describe('questionParts', () => {
  it('splits text around blanks', () => {
    expect(questionParts('I love _____ a lot.')).toEqual([
      { type: 'text', value: 'I love ' },
      { type: 'blank' },
      { type: 'text', value: ' a lot.' },
    ])
  })

  it('fills blanks with answers in order', () => {
    expect(questionParts('_____ beats _____.', ['Rock', 'Scissors'])).toEqual([
      { type: 'answer', value: 'Rock' },
      { type: 'text', value: ' beats ' },
      { type: 'answer', value: 'Scissors' },
      { type: 'text', value: '.' },
    ])
  })

  it('leaves unfilled blanks as blanks', () => {
    expect(questionParts('_____ beats _____.', ['Rock'])[2]).toEqual({ type: 'blank' })
  })

  it('appends the answer when the question has no blank', () => {
    expect(questionParts('What smells?', ['Feet'])).toEqual([
      { type: 'text', value: 'What smells?' },
      { type: 'text', value: ' ' },
      { type: 'answer', value: 'Feet' },
    ])
  })

  it('keeps markup as plain text', () => {
    const parts = questionParts('<img src=x onerror=alert(1)> _____', ['<b>hi</b>'])
    expect(parts[0]).toEqual({ type: 'text', value: '<img src=x onerror=alert(1)> ' })
    expect(parts[1]).toEqual({ type: 'answer', value: '<b>hi</b>' })
  })
})

describe('tallyVotes', () => {
  const subs = [
    { id: 'a', ownerId: 'p1' },
    { id: 'b', ownerId: 'p2' },
    { id: 'c', ownerId: 'p3' },
  ]

  it('picks the submission with the most votes', () => {
    const r = tallyVotes(subs, { p1: 'b', p3: 'b', p2: 'a' })
    expect(r.winnerIds).toEqual(['b'])
    expect(r.counts).toEqual({ a: 1, b: 2, c: 0 })
    expect(r.voters.b).toEqual(['p1', 'p3'])
  })

  it('returns every tied submission', () => {
    const r = tallyVotes(subs, { p1: 'b', p2: 'a' })
    expect(r.winnerIds.sort()).toEqual(['a', 'b'])
  })

  it('has no winner when nobody voted', () => {
    expect(tallyVotes(subs, {}).winnerIds).toEqual([])
  })

  it('ignores self-votes and votes for unknown submissions', () => {
    const r = tallyVotes(subs, { p1: 'a', p2: 'zzz', p3: 'b' })
    expect(r.counts).toEqual({ a: 0, b: 1, c: 0 })
    expect(r.winnerIds).toEqual(['b'])
  })
})
