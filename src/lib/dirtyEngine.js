// Host-side rules for Dirty Minds (reader mode, no scoring). Same shape as
// hostEngine.js: functions mutate the host state in place and return whether
// anything changed. Covered by dirtyEngine.test.js.

import { buildDirtyDeck } from '../data/dirtyDeck'

export const GAME = 'dirty'
export const MIN_PLAYERS = 2
export const MAX_PLAYERS = 12

// Actions a non-host may send over the channel.
export const PLAYER_ACTIONS = new Set(['next_clue', 'reveal', 'next_card', 'leave'])

export function createHostState(host) {
  return {
    game: GAME,
    phase: 'lobby',
    players: [newPlayer(host)],
    deck: [],
    card: null, // { id, answer, clues }
    cardNumber: 0,
    totalCards: 0,
    cluesShown: 0,
    revealed: false,
    readerId: null,
  }
}

function newPlayer({ id, name, avatar }) {
  return { id, name, avatar: avatar || '' }
}

function dealCard(hs) {
  hs.card = hs.deck.pop()
  hs.cardNumber += 1
  hs.cluesShown = 1
  hs.revealed = false
}

// The reader after `id` in join order; wraps around.
function readerAfter(hs, id) {
  const i = hs.players.findIndex((p) => p.id === id)
  return hs.players[(i + 1) % hs.players.length]?.id ?? null
}

export function startGame(hs) {
  if (hs.players.length < MIN_PLAYERS) return false
  hs.deck = buildDirtyDeck()
  hs.totalCards = hs.deck.length
  hs.cardNumber = 0
  hs.readerId = hs.players[0].id
  dealCard(hs)
  hs.phase = 'reading'
  return true
}

export function addPlayer(hs, info) {
  if (hs.players.some((p) => p.id === info.id)) return false
  if (hs.players.length >= MAX_PLAYERS) return false
  hs.players.push(newPlayer(info))
  return true
}

export function removePlayer(hs, playerId) {
  const index = hs.players.findIndex((p) => p.id === playerId)
  if (index === -1) return false
  hs.players.splice(index, 1)
  if (hs.readerId === playerId) {
    // The player who was after the leaver now sits at the same index.
    hs.readerId = hs.players.length ? hs.players[index % hs.players.length].id : null
  }
  return true
}

function readerAction(hs, type) {
  const clueCount = hs.card.clues.length
  switch (type) {
    case 'next_clue':
      if (hs.revealed || hs.cluesShown >= clueCount) return false
      hs.cluesShown += 1
      return true
    case 'reveal':
      if (hs.revealed) return false
      hs.revealed = true
      hs.cluesShown = clueCount
      return true
    case 'next_card':
      if (!hs.revealed) return false
      if (hs.deck.length === 0) {
        hs.phase = 'finished'
      } else {
        hs.readerId = readerAfter(hs, hs.readerId)
        dealCard(hs)
      }
      return true
    default:
      return false
  }
}

export function handleAction(hs, action) {
  if (!PLAYER_ACTIONS.has(action?.type)) return false
  if (action.type === 'leave') return removePlayer(hs, action.playerId)
  if (hs.phase !== 'reading' || action.playerId !== hs.readerId) return false
  return readerAction(hs, action.type)
}

// No timers, rounds or settings in Dirty Minds.
export function progress() {}
export function onTimeout() {}
export function advance() { return false }
export function updateSettings() { return false }

// The answer is included because the reader needs it; other players' screens
// hide it until it is revealed.
export function publicState(hs) {
  return structuredClone({
    game: GAME,
    phase: hs.phase,
    players: hs.players,
    readerId: hs.readerId,
    cardNumber: hs.cardNumber,
    totalCards: hs.totalCards,
    cluesShown: hs.cluesShown,
    revealed: hs.revealed,
    card: hs.card
      ? {
          id: hs.card.id,
          answer: hs.card.answer,
          clues: hs.card.clues.slice(0, hs.cluesShown),
          clueCount: hs.card.clues.length,
        }
      : null,
  })
}
