// Host-side game rules. Every function mutates the host state object in place
// and returns whether anything changed. No React, no network — useGame wires
// these to Supabase and timers. Covered by hostEngine.test.js.

import { buildQuestionDeck, buildAnswerDeck } from '../data/decks'
import { shuffle, insertAtRandom, kickVotesNeeded, pickCount, tallyVotes } from './gameLogic'

export const GAME = 'cah'
export const HAND_SIZE = 6
export const WINNING_SCORE = 7
export const MIN_PLAYERS = 2
export const MAX_PLAYERS = 12
export const VOTE_SECONDS = 30
export const RESULTS_SECONDS = 15

export const TIMER_OPTIONS = [0, 30, 45, 60]
export const EXCHANGE_OPTIONS = [0, 1, 2, 3, 5, -1] // -1 = unlimited
export const DEFAULT_SETTINGS = { hardcore: false, timerSec: 45, maxExchanges: 2 }

// Actions a non-host may send. Host-only actions (start, settings, continue)
// never travel over the channel.
export const PLAYER_ACTIONS = new Set([
  'submit_cards', 'vote', 'exchange_hand', 'vote_kick', 'skip_question',
  'add_custom_question', 'add_custom_answer', 'leave',
])

const MAX_CUSTOM_QUESTION = 200
const MAX_CUSTOM_ANSWER = 100

function randomId() {
  return Math.random().toString(36).slice(2, 10)
}

function newPlayer({ id, name, avatar }) {
  return { id, name, avatar: avatar || '', score: 0, hand: [], exchangesUsed: 0 }
}

export function createHostState(host, settings = DEFAULT_SETTINGS) {
  return {
    game: GAME,
    phase: 'lobby',
    settings: { ...DEFAULT_SETTINGS, ...settings },
    players: [newPlayer(host)],
    judgeId: host.id, // rotates each round; picks/skips the question, plays as normal
    questionDeck: [],
    answerDeck: [],
    currentQuestion: null,
    round: 0,
    submissions: [], // [{ id, ownerId, ownerName, cards }]
    votes: {}, // { voterId: submissionId }
    result: null,
    kickVotes: {}, // { targetId: [voterId] }
    history: [],
    customQuestions: [],
    customAnswers: [],
    customCount: 0,
    deadline: null, // host-clock epoch ms, or null when the timer is off
  }
}

// ─── Decks ──────────────────────────────────────────────────────────────

function freshQuestions(hs) {
  return shuffle([...buildQuestionDeck(hs.settings.hardcore), ...hs.customQuestions])
}

function freshAnswers(hs) {
  const inHands = new Set(hs.players.flatMap((p) => p.hand.map((c) => c.id)))
  return shuffle([...buildAnswerDeck(hs.settings.hardcore), ...hs.customAnswers])
    .filter((c) => !inHands.has(c.id))
}

function drawAnswer(hs) {
  if (hs.answerDeck.length === 0) hs.answerDeck = freshAnswers(hs)
  return hs.answerDeck.pop()
}

function topUp(hs, player) {
  while (player.hand.length < HAND_SIZE) player.hand.push(drawAnswer(hs))
}

function drawQuestion(hs) {
  if (hs.questionDeck.length === 0) hs.questionDeck = freshQuestions(hs)
  hs.currentQuestion = hs.questionDeck.pop()
}

// ─── Judge ──────────────────────────────────────────────────────────────

// The judge of the round. Falls back to the first player when the stored id
// is gone (they left, or the state predates judges).
export function currentJudgeId(hs) {
  if (hs.players.some((p) => p.id === hs.judgeId)) return hs.judgeId
  return hs.players[0]?.id ?? null
}

// Next player in seating order, so the role goes round the table.
function rotateJudge(hs) {
  const ids = hs.players.map((p) => p.id)
  if (ids.length === 0) return
  const i = ids.indexOf(hs.judgeId)
  hs.judgeId = i === -1 ? ids[0] : ids[(i + 1) % ids.length]
}

// ─── Phases ─────────────────────────────────────────────────────────────

function phaseSeconds(hs) {
  if (!hs.settings.timerSec) return 0
  if (hs.phase === 'picking') return hs.settings.timerSec
  if (hs.phase === 'voting') return VOTE_SECONDS
  if (hs.phase === 'results') return RESULTS_SECONDS
  return 0
}

function enter(hs, phase) {
  hs.phase = phase
  const secs = phaseSeconds(hs)
  hs.deadline = secs ? Date.now() + secs * 1000 : null
}

function startRound(hs) {
  if (hs.round > 0) rotateJudge(hs)
  hs.round += 1
  hs.submissions = []
  hs.votes = {}
  hs.result = null
  hs.kickVotes = {}
  for (const p of hs.players) {
    p.exchangesUsed = 0
    topUp(hs, p)
  }
  drawQuestion(hs)
  enter(hs, 'picking')
}

export function startGame(hs) {
  if (hs.players.length < MIN_PLAYERS) return false
  hs.questionDeck = freshQuestions(hs)
  for (const p of hs.players) {
    p.score = 0
    p.hand = []
  }
  hs.answerDeck = freshAnswers(hs)
  hs.history = []
  hs.round = 0
  hs.judgeId = hs.players[0].id
  startRound(hs)
  return true
}

function hasSubmitted(hs, playerId) {
  return hs.submissions.some((s) => s.ownerId === playerId)
}

function canVote(hs, playerId) {
  return hs.submissions.some((s) => s.ownerId !== playerId)
}

function startVoting(hs) {
  hs.submissions = shuffle(hs.submissions)
  hs.votes = {}
  enter(hs, 'voting')
}

function finishVoting(hs) {
  const tally = tallyVotes(hs.submissions, hs.votes)
  const prevScores = Object.fromEntries(hs.players.map((p) => [p.id, p.score]))
  const winnerOwners = [...new Set(
    hs.submissions.filter((s) => tally.winnerIds.includes(s.id)).map((s) => s.ownerId)
  )]

  for (const p of hs.players) {
    if (winnerOwners.includes(p.id)) p.score += 1
  }

  const subs = hs.submissions
    .map((s) => ({
      id: s.id,
      ownerId: s.ownerId,
      ownerName: s.ownerName,
      cards: s.cards,
      voters: tally.voters[s.id],
      votes: tally.counts[s.id],
      winner: tally.winnerIds.includes(s.id),
    }))
    .sort((a, b) => b.votes - a.votes)

  hs.result = { subs, winnerIds: winnerOwners, prevScores }
  hs.history.push({
    question: hs.currentQuestion,
    winners: subs.filter((s) => s.winner).map((s) => ({ name: s.ownerName, cards: s.cards })),
  })
  enter(hs, 'results')
}

// Moves the round forward when everyone is done. Call after any change.
export function progress(hs) {
  if (hs.phase === 'picking' && hs.players.every((p) => hasSubmitted(hs, p.id))) {
    startVoting(hs)
  }
  if (hs.phase === 'voting' && hs.players.every((p) => hs.votes[p.id] || !canVote(hs, p.id))) {
    finishVoting(hs)
  }
}

// Host "continue" from the results screen.
export function advance(hs) {
  if (hs.phase !== 'results') return false
  if (hs.players.some((p) => p.score >= WINNING_SCORE)) {
    enter(hs, 'gameOver')
  } else {
    startRound(hs)
  }
  return true
}

export function onTimeout(hs) {
  if (hs.phase === 'picking') {
    const pick = hs.currentQuestion.pick
    for (const p of hs.players) {
      if (hasSubmitted(hs, p.id)) continue
      topUp(hs, p)
      const cards = shuffle(p.hand).slice(0, pick)
      submitCards(hs, p.id, cards.map((c) => c.id))
    }
    progress(hs)
  } else if (hs.phase === 'voting') {
    finishVoting(hs)
  } else if (hs.phase === 'results') {
    advance(hs)
  }
}

// ─── Players ────────────────────────────────────────────────────────────

export function addPlayer(hs, info) {
  if (hs.players.some((p) => p.id === info.id)) return false
  if (hs.players.length >= MAX_PLAYERS) return false
  const player = newPlayer(info)
  if (hs.phase !== 'lobby') topUp(hs, player)
  hs.players.push(player)
  return true
}

export function removePlayer(hs, playerId) {
  const seat = hs.players.findIndex((p) => p.id === playerId)
  if (seat === -1) return false
  hs.players = hs.players.filter((p) => p.id !== playerId)
  // A judge who leaves hands the role to the next player in seating order.
  if (playerId === hs.judgeId && hs.players.length > 0) {
    hs.judgeId = hs.players[seat % hs.players.length].id
  }
  delete hs.kickVotes[playerId]
  for (const t of Object.keys(hs.kickVotes)) {
    hs.kickVotes[t] = hs.kickVotes[t].filter((v) => v !== playerId)
  }
  if (hs.phase === 'picking') {
    hs.submissions = hs.submissions.filter((s) => s.ownerId !== playerId)
  }
  delete hs.votes[playerId]
  return true
}

export function voteKick(hs, voterId, targetId) {
  if (voterId === targetId) return false
  if (!hs.players.some((p) => p.id === voterId)) return false
  if (!hs.players.some((p) => p.id === targetId)) return false
  const votes = hs.kickVotes[targetId] || []
  if (votes.includes(voterId)) return false
  hs.kickVotes[targetId] = [...votes, voterId]
  if (hs.kickVotes[targetId].length >= kickVotesNeeded(hs.players.length)) {
    removePlayer(hs, targetId)
  }
  return true
}

// ─── Player actions ─────────────────────────────────────────────────────

export function submitCards(hs, playerId, cardIds) {
  if (hs.phase !== 'picking') return false
  const player = hs.players.find((p) => p.id === playerId)
  if (!player || hasSubmitted(hs, playerId)) return false
  if (!Array.isArray(cardIds) || cardIds.length !== hs.currentQuestion.pick) return false
  if (new Set(cardIds).size !== cardIds.length) return false
  const cards = cardIds.map((id) => player.hand.find((c) => c.id === id))
  if (cards.some((c) => !c)) return false

  player.hand = player.hand.filter((c) => !cardIds.includes(c.id))
  hs.submissions.push({ id: randomId(), ownerId: playerId, ownerName: player.name, cards })
  return true
}

export function castVote(hs, voterId, submissionId) {
  if (hs.phase !== 'voting') return false
  if (!hs.players.some((p) => p.id === voterId) || hs.votes[voterId]) return false
  const sub = hs.submissions.find((s) => s.id === submissionId)
  if (!sub || sub.ownerId === voterId) return false
  hs.votes[voterId] = submissionId
  return true
}

// Swaps the player's whole hand for fresh cards; the old ones go back into the deck.
export function exchangeHand(hs, playerId) {
  if (hs.phase !== 'picking') return false
  const player = hs.players.find((p) => p.id === playerId)
  if (!player || hasSubmitted(hs, playerId)) return false
  const max = hs.settings.maxExchanges
  if (max !== -1 && player.exchangesUsed >= max) return false

  // Draw while the old cards are still held, so a deck refill can't deal them back.
  const oldCount = player.hand.length
  for (let i = 0; i < HAND_SIZE; i++) player.hand.push(drawAnswer(hs))
  const old = player.hand.splice(0, oldCount)
  for (const card of old) insertAtRandom(hs.answerDeck, card)
  player.exchangesUsed += 1
  return true
}

// The judge swaps the round's question. Cards already sent go back to their
// owners' hands, so nobody loses a card to a skip.
export function skipQuestion(hs, playerId) {
  if (hs.phase !== 'picking') return false
  if (playerId !== currentJudgeId(hs)) return false

  for (const sub of hs.submissions) {
    const owner = hs.players.find((p) => p.id === sub.ownerId)
    if (owner) owner.hand.push(...sub.cards)
  }
  hs.submissions = []
  drawQuestion(hs)
  enter(hs, 'picking') // restarts the pick timer on the new question
  return true
}

export function updateSettings(hs, patch) {
  if (hs.phase !== 'lobby') return false
  const s = hs.settings
  if (typeof patch.hardcore === 'boolean') s.hardcore = patch.hardcore
  if (TIMER_OPTIONS.includes(patch.timerSec)) s.timerSec = patch.timerSec
  if (EXCHANGE_OPTIONS.includes(patch.maxExchanges)) s.maxExchanges = patch.maxExchanges
  return true
}

export function addCustomQuestion(hs, rawText) {
  const text = String(rawText || '').trim().slice(0, MAX_CUSTOM_QUESTION).replace(/_{3,}/g, '_____')
  if (!text) return false
  hs.customCount += 1
  const card = { id: `cq${hs.customCount}`, text, pick: pickCount(text) }
  hs.customQuestions.push(card)
  if (hs.phase !== 'lobby') insertAtRandom(hs.questionDeck, card)
  return true
}

export function addCustomAnswer(hs, rawText) {
  const text = String(rawText || '').trim().slice(0, MAX_CUSTOM_ANSWER)
  if (!text) return false
  hs.customCount += 1
  const card = { id: `ca${hs.customCount}`, text }
  hs.customAnswers.push(card)
  if (hs.phase !== 'lobby') insertAtRandom(hs.answerDeck, card)
  return true
}

export function handleAction(hs, action) {
  switch (action?.type) {
    case 'submit_cards': return submitCards(hs, action.playerId, action.cardIds)
    case 'vote': return castVote(hs, action.playerId, action.submissionId)
    case 'exchange_hand': return exchangeHand(hs, action.playerId)
    case 'vote_kick': return voteKick(hs, action.playerId, action.targetId)
    case 'skip_question': return skipQuestion(hs, action.playerId)
    case 'add_custom_question': return addCustomQuestion(hs, action.text)
    case 'add_custom_answer': return addCustomAnswer(hs, action.text)
    case 'leave': return removePlayer(hs, action.playerId)
    default: return false
  }
}

// ─── Broadcast payload ──────────────────────────────────────────────────

// Deep copy, so the host's React state never aliases the mutable engine state
// (players get a copy over the network anyway).
export function publicState(hs) {
  const showResult = hs.phase === 'results' || hs.phase === 'gameOver'
  return structuredClone({
    game: GAME,
    phase: hs.phase,
    settings: hs.settings,
    round: hs.round,
    judgeId: currentJudgeId(hs),
    players: hs.players.map((p) => ({
      id: p.id,
      name: p.name,
      avatar: p.avatar,
      score: p.score,
      hand: p.hand,
      submitted: hasSubmitted(hs, p.id),
      voted: Boolean(hs.votes[p.id]),
      exchangesUsed: p.exchangesUsed,
    })),
    currentQuestion: hs.currentQuestion,
    submissions: hs.phase === 'voting'
      ? hs.submissions.map(({ id, ownerId, cards }) => ({ id, ownerId, cards }))
      : [],
    result: showResult ? hs.result : null,
    kickVotes: hs.kickVotes,
    history: hs.history,
    customCounts: { questions: hs.customQuestions.length, answers: hs.customAnswers.length },
    remainingMs: hs.deadline ? Math.max(0, hs.deadline - Date.now()) : null,
  })
}
