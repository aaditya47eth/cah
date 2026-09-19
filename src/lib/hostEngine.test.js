import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  createHostState, addPlayer, removePlayer, updateSettings, startGame,
  submitCards, castVote, exchangeHand, voteKick, addCustomQuestion, addCustomAnswer,
  progress, onTimeout, advance, publicState, handleAction, PLAYER_ACTIONS, HAND_SIZE, WINNING_SCORE,
} from './hostEngine'
import { extremeQuestions } from '../data/questions'

function setup(n = 3, settings = {}) {
  const hs = createHostState({ id: 'p1', name: 'Alice', avatar: '😆' })
  for (let i = 2; i <= n; i++) addPlayer(hs, { id: `p${i}`, name: `P${i}`, avatar: '🙈' })
  updateSettings(hs, settings)
  return hs
}

function playAll(hs) {
  for (const p of hs.players) {
    submitCards(hs, p.id, p.hand.slice(0, hs.currentQuestion.pick).map((c) => c.id))
  }
  progress(hs)
}

describe('lobby', () => {
  it('needs 2 players to start', () => {
    const hs = setup(1)
    expect(startGame(hs)).toBe(false)
    addPlayer(hs, { id: 'p2', name: 'B' })
    expect(startGame(hs)).toBe(true)
    expect(hs.phase).toBe('picking')
    expect(hs.players.every((p) => p.hand.length === HAND_SIZE)).toBe(true)
  })

  it('ignores duplicate joins', () => {
    const hs = setup(3)
    expect(addPlayer(hs, { id: 'p2', name: 'again' })).toBe(false)
    expect(hs.players).toHaveLength(3)
  })

  it('only accepts known setting values', () => {
    const hs = setup(3)
    updateSettings(hs, { timerSec: 999, maxExchanges: 3, hardcore: 'yes' })
    expect(hs.settings.timerSec).toBe(45)
    expect(hs.settings.maxExchanges).toBe(3)
    expect(hs.settings.hardcore).toBe(false)
  })

  it('uses extreme cards only with hardcore on', () => {
    const extremeQ = new Set(extremeQuestions.map((q) => `q${q.id}`))
    const soft = setup(3, { hardcore: false })
    startGame(soft)
    expect(soft.answerDeck.some((c) => c.id.startsWith('e'))).toBe(false)
    expect([soft.currentQuestion, ...soft.questionDeck].some((q) => extremeQ.has(q.id))).toBe(false)
    const hard = setup(3, { hardcore: true })
    startGame(hard)
    const all = [...hard.answerDeck, ...hard.players.flatMap((p) => p.hand)]
    expect(all.some((c) => c.id.startsWith('e'))).toBe(true)
    expect([hard.currentQuestion, ...hard.questionDeck].some((q) => extremeQ.has(q.id))).toBe(true)
  })

  it('shuffles custom cards into the decks on start', () => {
    const hs = setup(3)
    addCustomQuestion(hs, 'My custom _____ and ______')
    addCustomAnswer(hs, 'My custom answer')
    expect(publicState(hs).customCounts).toEqual({ questions: 1, answers: 1 })
    startGame(hs)
    const qs = [hs.currentQuestion, ...hs.questionDeck]
    const custom = qs.find((q) => q.id.startsWith('cq'))
    expect(custom).toMatchObject({ text: 'My custom _____ and _____', pick: 2 })
    const answers = [...hs.answerDeck, ...hs.players.flatMap((p) => p.hand)]
    expect(answers.some((c) => c.text === 'My custom answer')).toBe(true)
  })
})

describe('round flow', () => {
  let hs
  beforeEach(() => {
    hs = setup(3, { timerSec: 0 })
    startGame(hs)
    hs.currentQuestion = { id: 'qx', text: 'Test _____', pick: 1 }
  })

  it('moves to voting once everyone has submitted', () => {
    const [a, b, c] = hs.players
    submitCards(hs, a.id, [a.hand[0].id])
    submitCards(hs, b.id, [b.hand[0].id])
    progress(hs)
    expect(hs.phase).toBe('picking')
    submitCards(hs, c.id, [c.hand[0].id])
    progress(hs)
    expect(hs.phase).toBe('voting')
    expect(hs.submissions).toHaveLength(3)
  })

  it('rejects wrong card counts, unknown cards and double submits', () => {
    const [a] = hs.players
    expect(submitCards(hs, a.id, [])).toBe(false)
    expect(submitCards(hs, a.id, ['not-in-hand'])).toBe(false)
    expect(submitCards(hs, a.id, [a.hand[0].id])).toBe(true)
    expect(submitCards(hs, a.id, [a.hand[0].id])).toBe(false)
  })

  it('rejects self-votes and scores the most-voted card', () => {
    playAll(hs)
    const subOf = (id) => hs.submissions.find((s) => s.ownerId === id).id
    expect(castVote(hs, 'p1', subOf('p1'))).toBe(false)
    castVote(hs, 'p1', subOf('p2'))
    castVote(hs, 'p3', subOf('p2'))
    castVote(hs, 'p2', subOf('p1'))
    progress(hs)
    expect(hs.phase).toBe('results')
    expect(hs.result.winnerIds).toEqual(['p2'])
    expect(hs.players.find((p) => p.id === 'p2').score).toBe(1)
    expect(hs.players.find((p) => p.id === 'p1').score).toBe(0)
    expect(hs.result.subs[0]).toMatchObject({ ownerId: 'p2', votes: 2, winner: true })
    expect(hs.history).toHaveLength(1)
  })

  it('gives every tied player a point', () => {
    playAll(hs)
    const subOf = (id) => hs.submissions.find((s) => s.ownerId === id).id
    castVote(hs, 'p1', subOf('p2'))
    castVote(hs, 'p2', subOf('p3'))
    castVote(hs, 'p3', subOf('p1'))
    progress(hs)
    expect(hs.players.map((p) => p.score)).toEqual([1, 1, 1])
  })

  it('starts a fresh round on continue and tops hands up', () => {
    playAll(hs)
    onTimeout(hs) // end voting with no votes
    expect(hs.phase).toBe('results')
    advance(hs)
    expect(hs.phase).toBe('picking')
    expect(hs.round).toBe(2)
    expect(hs.players.every((p) => p.hand.length === HAND_SIZE)).toBe(true)
  })

  it('ends the game on continue once someone reaches the winning score', () => {
    playAll(hs)
    onTimeout(hs)
    hs.players[1].score = WINNING_SCORE
    advance(hs)
    expect(hs.phase).toBe('gameOver')
  })
})

describe('timer', () => {
  beforeEach(() => vi.useFakeTimers({ now: 1_000_000 }))

  it('sets deadlines only when the timer is on', () => {
    const off = setup(3, { timerSec: 0 })
    startGame(off)
    expect(off.deadline).toBeNull()
    expect(publicState(off).remainingMs).toBeNull()

    const on = setup(3, { timerSec: 30 })
    startGame(on)
    expect(on.deadline).toBe(1_000_000 + 30_000)
    vi.setSystemTime(1_010_000)
    expect(publicState(on).remainingMs).toBe(20_000)
  })

  it('auto-plays for missing players when picking times out', () => {
    const hs = setup(3, { timerSec: 30 })
    startGame(hs)
    const a = hs.players[0]
    submitCards(hs, a.id, a.hand.slice(0, hs.currentQuestion.pick).map((c) => c.id))
    onTimeout(hs)
    expect(hs.phase).toBe('voting')
    expect(hs.submissions).toHaveLength(3)
  })
})

describe('publicState', () => {
  it('does not share references with the engine state', () => {
    const hs = setup(3)
    startGame(hs)
    const pub = publicState(hs)
    exchangeHand(hs, 'p1')
    expect(pub.players[0].hand[0].id).not.toBe(hs.players[0].hand[0].id)
  })
})

describe('exchange', () => {
  it('swaps the whole hand and respects the per-round limit', () => {
    const hs = setup(3, { maxExchanges: 1 })
    startGame(hs)
    const p = hs.players[0]
    const old = p.hand.map((c) => c.id)
    expect(exchangeHand(hs, p.id)).toBe(true)
    expect(p.hand).toHaveLength(HAND_SIZE)
    expect(p.hand.some((c) => old.includes(c.id))).toBe(false)
    expect(old.every((id) => hs.answerDeck.some((c) => c.id === id))).toBe(true)
    expect(exchangeHand(hs, p.id)).toBe(false)
  })

  it('never deals the old cards back when the deck runs out', () => {
    const hs = setup(2, { maxExchanges: -1 })
    startGame(hs)
    hs.answerDeck = hs.answerDeck.slice(0, 2)
    const p = hs.players[0]
    const old = p.hand.map((c) => c.id)
    exchangeHand(hs, p.id)
    expect(p.hand).toHaveLength(HAND_SIZE)
    expect(p.hand.some((c) => old.includes(c.id))).toBe(false)
    const held = hs.players.flatMap((q) => q.hand.map((c) => c.id))
    expect(new Set(held).size).toBe(held.length)
  })

  it('is unlimited with -1', () => {
    const hs = setup(3, { maxExchanges: -1 })
    startGame(hs)
    const p = hs.players[0]
    for (let i = 0; i < 10; i++) expect(exchangeHand(hs, p.id)).toBe(true)
  })
})

describe('kick and leave', () => {
  it('needs a majority of the other players', () => {
    const hs = setup(3)
    startGame(hs)
    voteKick(hs, 'p1', 'p3')
    expect(hs.players).toHaveLength(3)
    voteKick(hs, 'p2', 'p3')
    expect(hs.players.map((p) => p.id)).toEqual(['p1', 'p2'])
  })

  it('does not stall picking when a player leaves', () => {
    const hs = setup(4, { timerSec: 0 })
    startGame(hs)
    const pick = hs.currentQuestion.pick
    for (const p of hs.players.slice(0, 3)) submitCards(hs, p.id, p.hand.slice(0, pick).map((c) => c.id))
    removePlayer(hs, 'p4')
    progress(hs)
    expect(hs.phase).toBe('voting')
  })
})

describe('handleAction', () => {
  it('dispatches player actions to the engine', () => {
    const hs = setup(3)
    startGame(hs)
    expect(handleAction(hs, { type: 'vote_kick', playerId: 'p1', targetId: 'p2' })).toBe(true)
    expect(hs.kickVotes.p2).toEqual(['p1'])
  })

  it('rejects host-only and unknown actions', () => {
    expect(PLAYER_ACTIONS.has('start')).toBe(false)
    const hs = setup(3)
    expect(handleAction(hs, { type: 'start', playerId: 'p2' })).toBe(false)
    expect(hs.phase).toBe('lobby')
  })

  it('tags the broadcast with the game', () => {
    expect(publicState(setup(2)).game).toBe('cah')
  })
})
