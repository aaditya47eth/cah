import { describe, it, expect } from 'vitest'
import {
  createHostState, addPlayer, removePlayer, startGame, handleAction, publicState, PLAYER_ACTIONS,
} from './dirtyEngine'
import { dirtyCards } from '../data/dirtyDeck'

function setup(n = 3) {
  const hs = createHostState({ id: 'p1', name: 'Alice', avatar: '😆' })
  for (let i = 2; i <= n; i++) addPlayer(hs, { id: `p${i}`, name: `P${i}`, avatar: '🙈' })
  return hs
}

const act = (hs, playerId, type) => handleAction(hs, { type, playerId })

describe('start', () => {
  it('needs 2 players', () => {
    const hs = setup(1)
    expect(startGame(hs)).toBe(false)
    addPlayer(hs, { id: 'p2', name: 'B' })
    expect(startGame(hs)).toBe(true)
  })

  it('deals the first card with one clue, first player reads', () => {
    const hs = setup(3)
    startGame(hs)
    expect(hs.phase).toBe('reading')
    expect(hs.readerId).toBe('p1')
    expect(hs.cardNumber).toBe(1)
    expect(hs.totalCards).toBe(dirtyCards.length)
    expect(hs.cluesShown).toBe(1)
    expect(hs.revealed).toBe(false)
  })

  it('ignores duplicate joins and caps at 12 players', () => {
    const hs = setup(12)
    expect(addPlayer(hs, { id: 'p2', name: 'again' })).toBe(false)
    expect(addPlayer(hs, { id: 'p13', name: 'extra' })).toBe(false)
    expect(hs.players).toHaveLength(12)
  })
})

describe('reader actions', () => {
  it('only the reader can act', () => {
    const hs = setup(3)
    startGame(hs)
    expect(act(hs, 'p2', 'next_clue')).toBe(false)
    expect(act(hs, 'p2', 'reveal')).toBe(false)
    expect(act(hs, 'p1', 'next_clue')).toBe(true)
    expect(hs.cluesShown).toBe(2)
  })

  it('stops at the last clue', () => {
    const hs = setup(2)
    startGame(hs)
    for (let i = 0; i < 4; i++) expect(act(hs, 'p1', 'next_clue')).toBe(true)
    expect(hs.cluesShown).toBe(5)
    expect(act(hs, 'p1', 'next_clue')).toBe(false)
  })

  it('reveal shows every clue and blocks further clues', () => {
    const hs = setup(2)
    startGame(hs)
    expect(act(hs, 'p1', 'reveal')).toBe(true)
    expect(hs.revealed).toBe(true)
    expect(hs.cluesShown).toBe(5)
    expect(act(hs, 'p1', 'reveal')).toBe(false)
    expect(act(hs, 'p1', 'next_clue')).toBe(false)
  })

  it('next card needs a reveal, then rotates the reader', () => {
    const hs = setup(3)
    startGame(hs)
    const first = hs.card.id
    expect(act(hs, 'p1', 'next_card')).toBe(false)
    act(hs, 'p1', 'reveal')
    expect(act(hs, 'p1', 'next_card')).toBe(true)
    expect(hs.readerId).toBe('p2')
    expect(hs.card.id).not.toBe(first)
    expect(hs.cardNumber).toBe(2)
    expect(hs.cluesShown).toBe(1)
    expect(hs.revealed).toBe(false)
  })

  it('reader wraps around to the first player', () => {
    const hs = setup(2)
    startGame(hs)
    for (const id of ['p1', 'p2']) {
      act(hs, id, 'reveal')
      act(hs, id, 'next_card')
    }
    expect(hs.readerId).toBe('p1')
  })

  it('finishes after the last card, and can start again', () => {
    const hs = setup(2)
    startGame(hs)
    for (let i = 0; i < dirtyCards.length; i++) {
      act(hs, hs.readerId, 'reveal')
      act(hs, hs.readerId, 'next_card')
    }
    expect(hs.phase).toBe('finished')
    expect(act(hs, hs.readerId, 'next_clue')).toBe(false)
    expect(startGame(hs)).toBe(true)
    expect(hs.phase).toBe('reading')
    expect(hs.cardNumber).toBe(1)
  })

  it('rejects actions outside PLAYER_ACTIONS', () => {
    expect(PLAYER_ACTIONS.has('next_clue')).toBe(true)
    expect(PLAYER_ACTIONS.has('start')).toBe(false)
    const hs = setup(2)
    startGame(hs)
    expect(act(hs, 'p1', 'start')).toBe(false)
  })
})

describe('players leaving', () => {
  it('hands the reader role to the next player', () => {
    const hs = setup(3)
    startGame(hs)
    act(hs, 'p1', 'next_clue')
    expect(act(hs, 'p1', 'leave')).toBe(true)
    expect(hs.readerId).toBe('p2')
    expect(hs.cluesShown).toBe(2) // card state is kept
  })

  it('wraps when the last player was reading', () => {
    const hs = setup(3)
    startGame(hs)
    hs.readerId = 'p3'
    removePlayer(hs, 'p3')
    expect(hs.readerId).toBe('p1')
  })

  it('keeps the reader when someone else leaves', () => {
    const hs = setup(3)
    startGame(hs)
    removePlayer(hs, 'p2')
    expect(hs.readerId).toBe('p1')
  })
})

describe('publicState', () => {
  it('only exposes the clues shown so far', () => {
    const hs = setup(2)
    startGame(hs)
    act(hs, 'p1', 'next_clue')
    const pub = publicState(hs)
    expect(pub.game).toBe('dirty')
    expect(pub.card.clues).toEqual(hs.card.clues.slice(0, 2))
    expect(pub.card.clueCount).toBe(5)
    expect(pub.card.answer).toBe(hs.card.answer)
    expect(pub.readerId).toBe('p1')
  })

  it('has no card in the lobby', () => {
    expect(publicState(setup(2)).card).toBe(null)
  })
})
