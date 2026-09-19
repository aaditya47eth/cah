# Game hub + Dirty Minds

Date: 2026-09-20 · Status: approved in chat

## Goals

1. Turn the home screen into a game picker: **Terrible hooman** (existing) and **Dirty Minds** (new).
2. Dirty Minds: cards with 5 innuendo clues and a clean answer. Two modes — online room (reader mode) and pass & play on one device. No scoring.
3. Cards live in `src/data/dirty-minds.json` in the format the user supplied, so more cards can be appended.

No Supabase changes: still Realtime Broadcast + Presence on `room:CODE`, no tables.

## Home

- Avatar + name (unchanged, remembered in `localStorage`).
- Two game tiles. Tapping one opens a sheet:
  - Terrible hooman → Create room.
  - Dirty Minds → Create room / Pass & play.
- One global **Join room** button (code sheet, unchanged). The room code decides the game; joiners never pick one.
- `?room=` links open the join sheet as before.

## Room layer

`useGame` becomes game-agnostic. The host picks an engine when creating a room; the host state carries `game: 'cah' | 'dirty'` and `publicState` broadcasts it. Players only apply broadcasts, so a joiner needs no engine — App routes on `state.game`.

Engine interface (both `hostEngine.js` and `dirtyEngine.js`):

- `createHostState(host)`, `publicState(hs)`, `addPlayer`, `removePlayer`, `startGame`, `progress(hs)`
- `PLAYER_ACTIONS` (set of allowed action types) and `handleAction(hs, action) → changed`
- `onTimeout(hs)`, `advance(hs)` (no-ops for Dirty Minds)
- `MIN_PLAYERS`, `MAX_PLAYERS`

Session restore reads `game` from the saved host state to pick the engine. Saved host state without `game` is treated as `cah`.

## Dirty Minds — online (reader mode)

Phases: `lobby → reading → finished`.

- **Lobby** — shared `Lobby` component. Terrible hooman settings, tags and custom cards are hidden for Dirty Minds; the Dirty Minds rules are shown. Min 2 players, max 12.
- **reading** — one card at a time. Host state: `deck` (shuffled cards), `card`, `cardNumber`, `totalCards`, `cluesShown` (1–5), `revealed`, `readerId`.
  - Reader = players in join order, rotating by one each card.
  - Reader actions: `next_clue` (up to 5), `reveal`, `next_card` (only after reveal). Actions from anyone else are ignored.
  - Reader screen: answer with "only you see this", clues shown so far, buttons.
  - Others: "🤫 NAME is reading", clues shown so far, answer shown big once revealed. Guesses are shouted out loud.
- **finished** — reached on `next_card` when the deck is empty. "All cards played", host gets Play again (reshuffle), everyone gets Leave.
- If the reader leaves (explicitly or after the 30 s reconnect grace), the next player in order becomes reader; the card state stays.
- Broadcast includes the answer (reader needs it); hiding it from others is UI-only. The card data ships in the bundle anyway.
- No score, no timer, no kick.

## Dirty Minds — pass & play

Local component, no network. Shuffled deck, "Card N / total", clues revealed one by one (Next clue), Reveal answer, Next card, Leave. Deck end → "All cards played" with Play again.

## Cards

- `src/data/dirty-minds.json`: `{ game, how_to_play, cards: [{ id, answer, clues[5] }] }`.
- `src/data/dirtyDeck.js` exports `dirtyCards` and `buildDirtyDeck()` (shuffled).
- `dirtyDeck.test.js` checks unique ids, non-empty answers, exactly 5 non-empty clues.

## Code layout

- `src/lib/dirtyEngine.js` + `dirtyEngine.test.js` — Dirty Minds host rules.
- `src/lib/hostEngine.js` — gains `game: 'cah'`, `PLAYER_ACTIONS`, `handleAction`.
- `src/hooks/useGame.js` — engine registry `{ cah, dirty }`, `createRoom(game, name, avatar)`, generic `sendAction`, Dirty Minds action helpers.
- `src/components/Home.jsx` — game picker.
- `src/components/dirty/` — `DirtyGame.jsx` (online), `PassAndPlay.jsx`, `ClueCard.jsx` (shared clue list + answer).
- `src/App.jsx` — routes home / pass & play / lobby / game by `state.game`.
