# Game Hub + Dirty Minds Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Home becomes a game picker (Terrible hooman, Dirty Minds); Dirty Minds plays online (reader mode, no score) or pass & play.

**Architecture:** `useGame` becomes engine-agnostic: the host state carries `game`, and an engine registry `{ cah, dirty }` supplies the rules. Players only apply broadcasts and App routes screens on `state.game`. Dirty Minds rules live in `src/lib/dirtyEngine.js` (pure, unit-tested); pass & play is a local component with no network.

**Tech Stack:** React 18, Vite, Supabase Realtime (Broadcast + Presence), Vitest.

Spec: `docs/superpowers/specs/2026-09-20-game-hub-dirty-minds-design.md`

---

## File map

| File | Change |
|---|---|
| `src/data/dirty-minds.json` | Create — user's card JSON verbatim |
| `src/data/dirtyDeck.js` / `.test.js` | Create — `dirtyCards`, `buildDirtyDeck()`; shape test |
| `src/lib/dirtyEngine.js` / `.test.js` | Create — host rules for Dirty Minds |
| `src/lib/hostEngine.js` / `.test.js` | Modify — `game: 'cah'`, `PLAYER_ACTIONS`, `handleAction` |
| `src/hooks/useGame.js` | Modify — engine registry, `createRoom(game, …)`, Dirty Minds actions |
| `src/components/dirty/ClueCard.jsx` | Create — clue list + answer reveal |
| `src/components/dirty/DirtyHowToPlay.jsx` | Create — rules list |
| `src/components/dirty/DirtyGame.jsx` | Create — online reader-mode screens |
| `src/components/dirty/PassAndPlay.jsx` | Create — local mode |
| `src/components/Home.jsx` | Modify — game tiles + sheets + global Join |
| `src/components/Lobby.jsx` | Modify — hide CAH-only parts for Dirty Minds |
| `src/App.jsx` | Modify — routing |
| `src/index.css` | Modify — tile + clue styles |
| `README.md` | Modify — games list, adding cards |

## Engine interface (both engines export)

`MIN_PLAYERS`, `MAX_PLAYERS`, `PLAYER_ACTIONS: Set`, `createHostState(host)`, `publicState(hs)`, `addPlayer(hs, info)`, `removePlayer(hs, id)`, `startGame(hs)`, `handleAction(hs, action) → bool`, `progress(hs)`, `onTimeout(hs)`, `advance(hs) → bool`, `updateSettings(hs, patch) → bool`.

---

### Task 1: Card data + deck

**Files:** Create `src/data/dirty-minds.json`, `src/data/dirtyDeck.js`, `src/data/dirtyDeck.test.js`

- [ ] **Step 1: Save JSON** exactly as supplied by the user (30 cards, `{ game, how_to_play, cards: [{ id, answer, clues }] }`).
- [ ] **Step 2: Failing test**

```js
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
  it('buildDirtyDeck returns every card, shuffled copy', () => {
    const deck = buildDirtyDeck()
    expect(deck).toHaveLength(dirtyCards.length)
    expect(new Set(deck.map((c) => c.id))).toEqual(new Set(dirtyCards.map((c) => c.id)))
    expect(deck).not.toBe(dirtyCards)
  })
})
```

- [ ] **Step 3:** `npx vitest run src/data/dirtyDeck.test.js` → FAIL (module missing).
- [ ] **Step 4: Implement**

```js
import data from './dirty-minds.json'
import { shuffle } from '../lib/gameLogic'

// Add cards by appending to `cards` in dirty-minds.json: unique id, answer, 5 clues.
export const dirtyCards = data.cards.map((c) => ({ id: `d${c.id}`, answer: c.answer, clues: c.clues }))

export function buildDirtyDeck() {
  return shuffle(dirtyCards)
}
```

- [ ] **Step 5:** rerun → PASS.

### Task 2: Dirty Minds engine

**Files:** Create `src/lib/dirtyEngine.js`, `src/lib/dirtyEngine.test.js`

- [ ] **Step 1: Failing tests** — cover: start needs 2 players; start deals card 1 with 1 clue, reader = first player; only reader can act; `next_clue` caps at clue count; `reveal` shows all clues; `next_card` needs reveal, rotates reader, deals new card; last card → `finished`; startGame again from `finished` resets; removing reader hands role to next player; publicState only exposes shown clues and includes `game: 'dirty'`; unknown action types are not in `PLAYER_ACTIONS`.
- [ ] **Step 2:** run → FAIL.
- [ ] **Step 3: Implement**

```js
export const GAME = 'dirty'
export const MIN_PLAYERS = 2
export const MAX_PLAYERS = 12
export const PLAYER_ACTIONS = new Set(['next_clue', 'reveal', 'next_card', 'leave'])

createHostState(host) → { game, phase: 'lobby', players: [{id,name,avatar}], deck: [], card: null,
  cardNumber: 0, totalCards: 0, cluesShown: 0, revealed: false, readerId: null }
startGame: players ≥ 2 → deck = buildDirtyDeck(), reader = players[0], deal, phase 'reading'
deal: card = deck.pop(), cardNumber += 1, cluesShown = 1, revealed = false
handleAction: 'leave' → removePlayer; others need phase 'reading' and playerId === readerId
  next_clue: !revealed && cluesShown < clues.length → +1
  reveal: !revealed → revealed = true, cluesShown = clues.length
  next_card: revealed → deck empty ? phase 'finished' : rotate reader, deal
removePlayer: reader leaving → next player in order (wraps)
publicState: structuredClone({ game, phase, players, readerId, cardNumber, totalCards, cluesShown, revealed,
  card: { id, answer, clues: shown slice, clueCount } })
progress/onTimeout: no-op; advance/updateSettings: return false
```

- [ ] **Step 4:** run → PASS.

### Task 3: CAH engine gets the shared interface

**Files:** Modify `src/lib/hostEngine.js`, `src/lib/hostEngine.test.js`

- [ ] **Step 1: Failing test** — `handleAction(hs, { type: 'vote_kick', playerId: 'p1', targetId: 'p2' })` returns true and records the vote; `PLAYER_ACTIONS.has('start')` is false; `publicState(hs).game === 'cah'`.
- [ ] **Step 2:** Move the `PLAYER_ACTIONS` set and the action `switch` from `useGame.js` into `hostEngine.js` as `handleAction`; add `game: 'cah'` to `createHostState` and `publicState`.
- [ ] **Step 3:** `npm test` → all PASS.

### Task 4: useGame goes engine-agnostic

**Files:** Modify `src/hooks/useGame.js`

- [ ] `ENGINES = { cah, dirty }`, `engineOf(hs) = ENGINES[hs?.game] || cah`.
- [ ] `handleAction`, `commit`, the phase timer, presence join/leave, and `hostDo` all go through `engineOf(hostRef.current)`. `hostDo(fn)` calls `fn(hs, engine)`.
- [ ] `createRoom(game, name, avatar)`.
- [ ] Restore: accept saved host state when `saved.game === 'dirty' || saved.settings`.
- [ ] `initialState` gains `game: null, readerId: null, card: null, cardNumber: 0, totalCards: 0, cluesShown: 0, revealed: false`.
- [ ] New methods: `nextClue`, `revealAnswer`, `nextCard` (via `sendAction`).

### Task 5: UI

- [ ] `ClueCard` — numbered clues, locked placeholders for the ones not yet shown, answer panel when `revealed` or `showAnswer`. Background uses `questionColor(cardNumber)`.
- [ ] `DirtyHowToPlay` — 4 rules.
- [ ] `DirtyGame` — `kicked` / `finished` / `reading` screens. Top bar: ✕ leave, "Card N / T", ? rules. Reader: private answer, Next clue + Reveal answer, then Next card. Others: "🤫 NAME is reading", waiting text.
- [ ] `PassAndPlay` — local deck, same `ClueCard`, Next clue / Reveal / Next card, end screen with Play again.
- [ ] `Home` — two game tiles → sheet (name input if missing; Create room; Pass & play for Dirty Minds); global Join room.
- [ ] `Lobby` — CAH tags, custom cards, settings only when `game === 'cah'`; rules component by game.
- [ ] `App` — pass & play local view; `state.game === 'dirty'` → `DirtyGame`.
- [ ] CSS for `.game-tile`, `.clue-card`, `.clue`, `.clue-locked`, `.answer-reveal`, `.reader-banner`.

### Task 6: Verify

- [ ] `npm test` all pass; `npm run build` succeeds.
- [ ] Run the dev server and click through in the browser: home tiles, Dirty Minds pass & play, create a Dirty Minds room.
- [ ] README: games list + how to add Dirty Minds cards.
