# Voting gameplay, card merge, and reference-style UI

Date: 2026-09-19 · Status: approved in chat

## Goals

1. Replace the rotating judge with player voting.
2. Merge the card ideas in `src/data/new-questions.md` / `new-answers.md` into the decks.
3. Add a host-controlled Hardcore mode (normal vs. normal + extreme questions and answers).
4. Add an optional round timer.
5. Restyle every screen after the reference screenshots in `public/reference/` (own branding, not the reference app's logo).
6. Fix the bugs found in the headed run (share link, custom-card deck position, kick threshold, XSS, clipped game-over screen) and the broken `answers` import.

## Game flow

`lobby → picking → voting → results → picking … → gameOver`, still host-authoritative over one Supabase Realtime channel.

- **No judge.** The `confirmQuestion` phase and "Different Question" are removed.
- **picking** — everyone sees the question and plays `pick` cards (pick = number of `_____` blanks, min 1, max 3). Ends when every player has submitted, or on timeout; on timeout the host plays random cards from each missing player's hand.
- **voting** — submissions are shuffled and shown without names. A player cannot vote for their own submission. Ends when every player who has something to vote for has voted, or on timeout (missing votes are skipped).
- **results** — the owner(s) of the submission(s) with the most votes get +1; ties all score; zero votes means nobody scores. Every submission is shown with its owner and voter chips, followed by the leaderboard with +1 deltas and rank-change arrows. The host continues; with the timer on it auto-continues after 15 s.
- **gameOver** — reached on continue when any score is ≥ 7. Ties share the win. Recap and Play Again stay.
- **Minimum 2 players** to start. With exactly 2, each player can only vote for the other, so every voted round is a tie.
- **Exchange hand** swaps all 6 cards for new ones; the old cards are shuffled back into the deck (never dealt straight back). Per-round budget is the lobby setting (None / 1 / 2 / 3 / 5 / ∞).
- **Kick** needs a strict majority of the other players: `floor((n − 1) / 2) + 1`.

## Timer

- Lobby setting: Off / 30 / 45 / 60 s for picking (default 45). Voting 30 s, results 15 s. Off disables all three.
- The host stores an absolute deadline on its own clock and broadcasts `remainingMs`; each client computes a local deadline on receipt, so clock skew between devices does not matter.
- The host enforces deadlines with `setTimeout`, re-armed after a host page reload.

## Cards

- `questions.js` exports `normalQuestions` and `extremeQuestions` (ids unique across both) and gains the new questions: blanks normalized to `_____`, `pick` from the blank count, duplicates (case/punctuation-insensitive) dropped. Questions with no blank get the answer appended when rendered.
- `answers.js` keeps the `[id, text]` normal/extreme split. Extreme = explicit sex acts, genitals/breasts/anus, sexual fluids, porn and sex toys, sexual violence or anything sexual involving children, incest, bestiality, "fuck", slurs; dark humour, mild swearing, bodily functions and innuendo stay normal. The same rule splits the questions. Hardcore adds both extreme lists. New answers not already present go into `normalAnswers`; trailing periods are stripped to match the existing style.
- `src/data/decks.js` builds decks and prefixes ids (`n12`, `e12`, custom `ca3` / `cq3`) so normal and extreme ids no longer collide.
- Custom cards added in the lobby are merged when the game starts; custom cards are inserted at a random deck position.
- The `.md` source files are left in place.

## UI

App name "Terrible hooman". Warm dark theme (amber primary, maroon, olive, taupe, pink, lavender), DM Sans, question cards rotating amber / pink / lavender / olive / beige per round, cream answer cards, amber pill buttons, emoji avatars on tinted circles (replacing multiavatar; the `@multiavatar/multiavatar` dependency is removed).

- **Home** — avatar (tap to change), "Welcome back, NAME 👋" (name and avatar remembered in `localStorage`), title card, Create room / Join room. Join opens a bottom sheet for the code. A `?room=` link opens that sheet with the code filled and still asks for a name.
- **Lobby** — room code with copy and share-link, tags (Hardcore / timer / exchanges), player list with "Waiting" placeholders up to the minimum, "How do we play?" box, custom cards with an added-count, host settings sheet (Hardcore toggle, timer, exchanges), Start.
- **Game** — top bar (✕ leave, ? rules sheet, timer pill, ★ leaderboard sheet). Kick lives in leaderboard rows.
  - Picking: question card previews the card in view in the blank (salmon highlight); "🤔 Select a card" + pink "N Exchange hand" pill; swipeable scroll-snap carousel with a tilted peeking next card and "N remaining"; SEND. For pick > 1 cards are tapped to select in order. After sending: waiting list with ✓.
  - Voting: "🗳️ Vote for a card", same carousel over other players' submissions, SEND.
  - Results and leaderboard as above; CONTINUE PLAYING for the host.
  - Game over: winner(s), leaderboard, recap, Play Again; scroll-safe layout.
- Question text is rendered as React text nodes, never HTML.

## Code layout

- `src/lib/gameLogic.js` — pure helpers: `shuffle`, `insertAtRandom`, `kickVotesNeeded`, `countBlanks`, `questionParts`, `tallyVotes`.
- `src/data/decks.js` — deck builders.
- `src/lib/hostEngine.js` — host-side rules as plain functions over the host state (phases, submit, vote, tally, exchange, kick, timeouts, broadcast payload); unit-tested.
- `src/hooks/useGame.js` — wires the engine to Supabase broadcast/presence, the phase timer, and session restore.
- `src/components/` — `Home`, `Lobby`, `Avatar`, `Sheet`, and `game/` (`TopBar`, `QuestionCard`, `CardCarousel`, `PickPhase`, `VotePhase`, `ResultsPhase`, `Leaderboard`, `GameOver`, `WaitingList`).

## Testing

- Add `vitest`; unit tests for `gameLogic.js`, `hostEngine.js` and `decks.js`.
- Headed three-tab playthrough: create, share-link join, settings, pick, exchange, vote, tie, results, timer expiry, kick, reload, game over, play again.

## Known limitations (not addressed)

All hands and votes travel over the shared broadcast channel, so a player can read them in DevTools, and any client can send actions on behalf of another. Fixing that needs a server-side authority.
