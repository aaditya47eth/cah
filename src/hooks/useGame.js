import { useState, useRef, useCallback, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { questions as allQuestions } from '../data/questions'
import { answers as allAnswers } from '../data/answers'

const HAND_SIZE = 6
const WINNING_SCORE = 7
const RECONNECT_GRACE_MS = 30000

// ─── Session persistence ────────────────────────────────────────────────

const SESSION_KEY = 'cah_session'
const HOST_KEY = 'cah_host_state'

function saveSession(data) {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(data))
}
function getSession() {
  try { return JSON.parse(sessionStorage.getItem(SESSION_KEY)) } catch { return null }
}
function saveHostState(hs) {
  try {
    sessionStorage.setItem(HOST_KEY, JSON.stringify({
      phase: hs.phase, answerDeck: hs.answerDeck, questionDeck: hs.questionDeck,
      players: hs.players, currentQuestion: hs.currentQuestion,
      submissions: hs.submissions, displaySubmissions: hs.displaySubmissions,
      czarIndex: hs.czarIndex, roundWinnerId: hs.roundWinnerId,
      roundWinnerName: hs.roundWinnerName, winningSubmission: hs.winningSubmission,
      usedQuestionIds: hs.usedQuestionIds, kickVotes: hs.kickVotes,
      history: hs.history, customQCount: hs.customQCount, customACount: hs.customACount,
      maxRefreshes: hs.maxRefreshes,
    }))
  } catch { /* ignore */ }
}
function getHostState() {
  try { return JSON.parse(sessionStorage.getItem(HOST_KEY)) } catch { return null }
}
function clearSession() {
  sessionStorage.removeItem(SESSION_KEY)
  sessionStorage.removeItem(HOST_KEY)
}

// ─── Pure helpers ───────────────────────────────────────────────────────

function generateId() { return Math.random().toString(36).substring(2, 12) }

function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)]
  return code
}

function shuffle(array) {
  const a = [...array]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

const initialState = {
  phase: 'home',
  roomCode: null,
  playerId: null,
  playerName: '',
  avatar: '',
  isHost: false,
  players: [],
  currentQuestion: null,
  hand: [],
  submissions: [],
  selectedCards: [],
  czarId: null,
  roundWinnerId: null,
  roundWinnerName: null,
  winningSubmission: null,
  kickVotes: {},
  history: [],
  refreshesLeft: undefined,
  error: null,
}

export function useGame() {
  const [state, setState] = useState(initialState)
  const channelRef = useRef(null)
  const hostRef = useRef(null)
  const myIdRef = useRef(null)
  const disconnectTimers = useRef(new Map())

  useEffect(() => {
    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current)
      for (const t of disconnectTimers.current.values()) clearTimeout(t)
    }
  }, [])

  // ─── Host helpers ───────────────────────────────────────────────

  const broadcastState = useCallback(() => {
    const hs = hostRef.current
    if (!hs) return

    const czarId = hs.players[hs.czarIndex]?.id

    const payload = {
      phase: hs.phase,
      players: hs.players.map((p) => ({
        id: p.id, name: p.name, avatar: p.avatar || '', score: p.score,
        hand: p.hand.map((c) => ({ id: c.id, text: c.text })),
        submitted: hs.submissions.some((s) => s.playerId === p.id),
        refreshesUsed: p.refreshesUsed || 0,
      })),
      currentQuestion: hs.currentQuestion,
      czarId,
      submissions: hs.phase === 'judging' || hs.phase === 'reveal' ? hs.displaySubmissions : [],
      roundWinnerId: hs.roundWinnerId,
      roundWinnerName: hs.roundWinnerName,
      winningSubmission: hs.winningSubmission,
      kickVotes: hs.kickVotes || {},
      history: hs.history || [],
      maxRefreshes: hs.maxRefreshes,
    }

    channelRef.current?.send({ type: 'broadcast', event: 'game_state', payload })

    const me = payload.players.find((p) => p.id === myIdRef.current)
    const myRefreshesLeft = hs.maxRefreshes !== undefined && me
      ? hs.maxRefreshes - (me.refreshesUsed || 0)
      : undefined
    setState((prev) => ({
      ...prev,
      phase: payload.phase,
      players: payload.players,
      currentQuestion: payload.currentQuestion,
      hand: me?.hand || prev.hand,
      czarId: payload.czarId,
      submissions: payload.submissions,
      roundWinnerId: payload.roundWinnerId,
      roundWinnerName: payload.roundWinnerName,
      winningSubmission: payload.winningSubmission,
      kickVotes: payload.kickVotes,
      history: payload.history,
      refreshesLeft: myRefreshesLeft,
      selectedCards: payload.phase !== prev.phase ? [] : prev.selectedCards,
    }))

    saveHostState(hs)
  }, [])

  const dealCards = useCallback((player, count) => {
    const hs = hostRef.current
    if (hs.answerDeck.length < count) {
      hs.answerDeck.push(...shuffle(allAnswers))
    }
    const cards = hs.answerDeck.splice(0, count)
    player.hand.push(...cards)
  }, [])

  const drawQuestion = useCallback(() => {
    const hs = hostRef.current
    if (hs.questionDeck.length === 0) {
      hs.usedQuestionIds = []
      hs.questionDeck = shuffle(allQuestions)
    }
    const q = hs.questionDeck.pop()
    hs.usedQuestionIds.push(q.id)
    hs.currentQuestion = q
  }, [])

  // ─── Host action processor ─────────────────────────────────────

  const processAction = useCallback(
    (action) => {
      const hs = hostRef.current
      if (!hs) return

      switch (action.type) {
        case 'submit_cards': {
          if (hs.submissions.some((s) => s.playerId === action.playerId)) return
          if (action.playerId === hs.players[hs.czarIndex]?.id) return
          const player = hs.players.find((p) => p.id === action.playerId)
          if (!player) return

          const playedIds = new Set(action.cards.map((c) => c.id))
          player.hand = player.hand.filter((c) => !playedIds.has(c.id))
          dealCards(player, action.cards.length)

          hs.submissions.push({
            playerId: action.playerId,
            playerName: player.name,
            cards: action.cards,
          })

          const czarId = hs.players[hs.czarIndex]?.id
          const activePlayers = hs.players.filter((p) => p.id !== czarId)
          if (hs.submissions.length >= activePlayers.length) {
            hs.phase = 'judging'
            hs.displaySubmissions = shuffle(
              hs.submissions.map((s, i) => ({ cards: s.cards, originalIndex: i }))
            )
          }
          broadcastState()
          break
        }

        case 'pick_winner': {
          const displaySub = hs.displaySubmissions[action.index]
          if (!displaySub) return
          const originalSub = hs.submissions[displaySub.originalIndex]
          if (!originalSub) return

          const winner = hs.players.find((p) => p.id === originalSub.playerId)
          if (winner) winner.score += 1

          hs.roundWinnerId = originalSub.playerId
          hs.roundWinnerName = originalSub.playerName
          hs.winningSubmission = originalSub.cards

          hs.displaySubmissions = hs.displaySubmissions.map((ds) => {
            const orig = hs.submissions[ds.originalIndex]
            return { ...ds, playerId: orig.playerId, playerName: orig.playerName }
          })

          // Add to game history
          if (!hs.history) hs.history = []
          hs.history.push({
            question: hs.currentQuestion,
            answer: originalSub.cards,
            winnerName: originalSub.playerName,
          })

          if (winner && winner.score >= WINNING_SCORE) {
            hs.phase = 'gameOver'
          } else {
            hs.phase = 'reveal'
          }
          broadcastState()
          break
        }

        case 'confirm_question': {
          if (action.playerId !== hs.players[hs.czarIndex]?.id) return
          hs.phase = 'picking'
          broadcastState()
          break
        }

        case 'refresh_hand': {
          const rPlayer = hs.players.find((p) => p.id === action.playerId)
          if (!rPlayer) return
          if (hs.maxRefreshes !== undefined) {
            if ((rPlayer.refreshesUsed || 0) >= hs.maxRefreshes) return
            rPlayer.refreshesUsed = (rPlayer.refreshesUsed || 0) + 1
          }
          rPlayer.hand = []
          dealCards(rPlayer, HAND_SIZE)
          broadcastState()
          break
        }

        case 'refresh_question': {
          if (action.playerId !== hs.players[hs.czarIndex]?.id) return
          const czarPlayer = hs.players[hs.czarIndex]
          if (hs.maxRefreshes !== undefined) {
            if ((czarPlayer.refreshesUsed || 0) >= hs.maxRefreshes) return
            czarPlayer.refreshesUsed = (czarPlayer.refreshesUsed || 0) + 1
          }
          drawQuestion()
          hs.submissions = []
          hs.displaySubmissions = []
          broadcastState()
          break
        }

        case 'vote_kick': {
          if (!action.targetId || action.playerId === action.targetId) return
          const target = hs.players.find((p) => p.id === action.targetId)
          if (!target) return

          if (!hs.kickVotes) hs.kickVotes = {}
          if (!hs.kickVotes[action.targetId]) hs.kickVotes[action.targetId] = []
          if (hs.kickVotes[action.targetId].includes(action.playerId)) return

          hs.kickVotes[action.targetId].push(action.playerId)

          const needed = Math.ceil((hs.players.length - 1) / 2)
          if (hs.kickVotes[action.targetId].length >= needed) {
            // Kick the player
            hs.players = hs.players.filter((p) => p.id !== action.targetId)
            delete hs.kickVotes[action.targetId]
            // Remove kicked player's votes
            for (const tid of Object.keys(hs.kickVotes)) {
              hs.kickVotes[tid] = hs.kickVotes[tid].filter((v) => v !== action.targetId)
            }
            if (hs.czarIndex >= hs.players.length && hs.players.length > 0) {
              hs.czarIndex = hs.czarIndex % hs.players.length
            }
            hs.submissions = hs.submissions.filter((s) => s.playerId !== action.targetId)
          }
          broadcastState()
          break
        }

        case 'add_custom_question': {
          if (!action.text) return
          const qId = 10000 + (hs.customQCount || 0)
          hs.customQCount = (hs.customQCount || 0) + 1
          const blanks = (action.text.match(/_____/g) || []).length
          const pick = blanks >= 2 ? 2 : 1
          hs.questionDeck.push({ id: qId, text: action.text, pick })
          broadcastState()
          break
        }

        case 'add_custom_answer': {
          if (!action.text) return
          const aId = 10000 + (hs.customACount || 0)
          hs.customACount = (hs.customACount || 0) + 1
          hs.answerDeck.push({ id: aId, text: action.text })
          broadcastState()
          break
        }

        case 'next_round': {
          hs.czarIndex = (hs.czarIndex + 1) % hs.players.length
          hs.submissions = []
          hs.displaySubmissions = []
          hs.roundWinnerId = null
          hs.roundWinnerName = null
          hs.winningSubmission = null
          hs.kickVotes = {}
          drawQuestion()
          for (const player of hs.players) {
            player.refreshesUsed = 0
            if (player.hand.length < HAND_SIZE) {
              dealCards(player, HAND_SIZE - player.hand.length)
            }
          }
          hs.phase = 'confirmQuestion'
          broadcastState()
          break
        }

        default:
          break
      }
    },
    [broadcastState, dealCards, drawQuestion]
  )

  // ─── Channel setup ─────────────────────────────────────────────

  const attachHostListeners = useCallback(
    (channel, hostPlayerId) => {
      channel.on('broadcast', { event: 'player_action' }, ({ payload }) => {
        processAction(payload)
      })

      channel.on('presence', { event: 'join' }, ({ newPresences }) => {
        const hs = hostRef.current
        if (!hs) return
        for (const p of newPresences) {
          if (p.id === hostPlayerId) continue
          if (disconnectTimers.current.has(p.id)) {
            clearTimeout(disconnectTimers.current.get(p.id))
            disconnectTimers.current.delete(p.id)
            continue
          }
          if (hs.players.some((pl) => pl.id === p.id)) continue
          if (hs.players.length >= 12) continue
          const newPlayer = { id: p.id, name: p.name, avatar: p.avatar || '', score: 0, hand: [] }
          if (hs.phase !== 'lobby') dealCards(newPlayer, HAND_SIZE)
          hs.players.push(newPlayer)
        }
        broadcastState()
      })

      channel.on('presence', { event: 'leave' }, ({ leftPresences }) => {
        const hs = hostRef.current
        if (!hs) return
        for (const p of leftPresences) {
          if (p.id === hostPlayerId) continue
          const timer = setTimeout(() => {
            if (!hostRef.current) return
            hostRef.current.players = hostRef.current.players.filter((pl) => pl.id !== p.id)
            if (hostRef.current.czarIndex >= hostRef.current.players.length && hostRef.current.players.length > 0) {
              hostRef.current.czarIndex = hostRef.current.czarIndex % hostRef.current.players.length
            }
            disconnectTimers.current.delete(p.id)
            broadcastState()
          }, RECONNECT_GRACE_MS)
          disconnectTimers.current.set(p.id, timer)
        }
      })
    },
    [processAction, broadcastState, dealCards]
  )

  const attachPlayerListeners = useCallback((channel, playerId) => {
    channel.on('broadcast', { event: 'game_state' }, ({ payload }) => {
      const me = payload.players.find((p) => p.id === playerId)
      if (!me && payload.phase !== 'lobby') {
        // Kicked
        setState((prev) => ({ ...prev, phase: 'kicked' }))
        return
      }
      const myRefreshesLeft = payload.maxRefreshes !== undefined && me
        ? payload.maxRefreshes - (me.refreshesUsed || 0)
        : undefined
      setState((prev) => ({
        ...prev,
        phase: payload.phase,
        players: payload.players,
        currentQuestion: payload.currentQuestion,
        hand: me?.hand || prev.hand,
        czarId: payload.czarId,
        submissions: payload.submissions || [],
        roundWinnerId: payload.roundWinnerId,
        roundWinnerName: payload.roundWinnerName,
        winningSubmission: payload.winningSubmission,
        kickVotes: payload.kickVotes || {},
        history: payload.history || [],
        refreshesLeft: myRefreshesLeft,
        selectedCards: payload.phase !== prev.phase ? [] : prev.selectedCards,
      }))
    })
  }, [])

  // ─── Restore session ──────────────────────────────────────────

  const attachHostListenersRef = useRef(attachHostListeners)
  const attachPlayerListenersRef = useRef(attachPlayerListeners)
  const broadcastStateRef = useRef(broadcastState)
  useEffect(() => {
    attachHostListenersRef.current = attachHostListeners
    attachPlayerListenersRef.current = attachPlayerListeners
    broadcastStateRef.current = broadcastState
  })

  useEffect(() => {
    const session = getSession()
    if (!session) return
    myIdRef.current = session.playerId

    const channel = supabase.channel(`room:${session.roomCode}`, {
      config: { broadcast: { self: false } },
    })

    if (session.isHost) {
      const saved = getHostState()
      if (!saved) { clearSession(); return }
      hostRef.current = saved
      attachHostListenersRef.current(channel, session.playerId)
      channel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ id: session.playerId, name: session.playerName, avatar: session.avatar || '', isHost: true })
          setTimeout(() => broadcastStateRef.current(), 500)
        }
      })
      channelRef.current = channel
      const me = saved.players.find((p) => p.id === session.playerId)
      const czarId = saved.players[saved.czarIndex]?.id
      setState({
        phase: saved.phase, roomCode: session.roomCode, playerId: session.playerId,
        playerName: session.playerName, avatar: session.avatar || '', isHost: true,
        players: saved.players.map((p) => ({
          id: p.id, name: p.name, avatar: p.avatar || '', score: p.score, hand: p.hand,
          submitted: saved.submissions?.some((s) => s.playerId === p.id) || false,
        })),
        currentQuestion: saved.currentQuestion, hand: me?.hand || [], czarId,
        submissions: saved.phase === 'judging' || saved.phase === 'reveal' ? saved.displaySubmissions || [] : [],
        selectedCards: [], roundWinnerId: saved.roundWinnerId,
        roundWinnerName: saved.roundWinnerName, winningSubmission: saved.winningSubmission,
        kickVotes: saved.kickVotes || {}, history: saved.history || [], error: null,
      })
    } else {
      attachPlayerListenersRef.current(channel, session.playerId)
      channel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ id: session.playerId, name: session.playerName, avatar: session.avatar || '', isHost: false })
        }
      })
      channelRef.current = channel
      setState({
        ...initialState, phase: 'lobby', roomCode: session.roomCode,
        playerId: session.playerId, playerName: session.playerName,
        avatar: session.avatar || '', isHost: false,
      })
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Public methods ─────────────────────────────────────────────

  const createRoom = useCallback(
    (playerName, avatar = '') => {
      const roomCode = generateRoomCode()
      const playerId = generateId()
      myIdRef.current = playerId

      hostRef.current = {
        phase: 'lobby',
        answerDeck: shuffle(allAnswers),
        questionDeck: shuffle(allQuestions),
        players: [{ id: playerId, name: playerName, avatar, score: 0, hand: [] }],
        currentQuestion: null, submissions: [], displaySubmissions: [],
        czarIndex: 0, roundWinnerId: null, roundWinnerName: null,
        winningSubmission: null, usedQuestionIds: [], kickVotes: {},
        history: [], customQCount: 0, customACount: 0,
      }

      const channel = supabase.channel(`room:${roomCode}`, { config: { broadcast: { self: false } } })
      attachHostListeners(channel, playerId)
      channel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ id: playerId, name: playerName, avatar, isHost: true })
        }
      })
      channelRef.current = channel
      saveSession({ playerId, playerName, avatar, roomCode, isHost: true })

      setState((prev) => ({
        ...prev, phase: 'lobby', roomCode, playerId, playerName, avatar,
        isHost: true, players: [{ id: playerId, name: playerName, avatar, score: 0, hand: [] }],
      }))
    },
    [attachHostListeners]
  )

  const joinRoom = useCallback(
    (roomCode, playerName, avatar = '') => {
      const code = roomCode.toUpperCase().trim()
      const playerId = generateId()
      myIdRef.current = playerId

      const channel = supabase.channel(`room:${code}`, { config: { broadcast: { self: false } } })
      attachPlayerListeners(channel, playerId)
      channel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ id: playerId, name: playerName, avatar, isHost: false })
        }
      })
      channelRef.current = channel
      saveSession({ playerId, playerName, avatar, roomCode: code, isHost: false })

      setState((prev) => ({
        ...prev, phase: 'lobby', roomCode: code, playerId, playerName, avatar,
        isHost: false, players: [],
      }))
    },
    [attachPlayerListeners]
  )

  const startGame = useCallback((maxRefreshes = 2) => {
    const hs = hostRef.current
    if (!hs || hs.players.length < 2) return
    hs.maxRefreshes = maxRefreshes === -1 ? undefined : maxRefreshes
    for (const player of hs.players) {
      dealCards(player, HAND_SIZE)
      player.refreshesUsed = 0
    }
    drawQuestion()
    hs.phase = 'confirmQuestion'
    hs.czarIndex = 0
    broadcastState()
  }, [broadcastState, dealCards, drawQuestion])

  const selectCard = useCallback((cardIndex) => {
    setState((prev) => {
      const pick = prev.currentQuestion?.pick || 1
      const selected = [...prev.selectedCards]
      const idx = selected.indexOf(cardIndex)
      if (idx !== -1) {
        selected.splice(idx, 1)
      } else if (pick === 1) {
        return { ...prev, selectedCards: [cardIndex] }
      } else if (selected.length < pick) {
        selected.push(cardIndex)
      }
      return { ...prev, selectedCards: selected }
    })
  }, [])

  const sendAction = useCallback((action) => {
    if (state.isHost) {
      processAction(action)
    } else {
      channelRef.current?.send({ type: 'broadcast', event: 'player_action', payload: action })
    }
  }, [state.isHost, processAction])

  const refreshHand = useCallback(() => {
    sendAction({ type: 'refresh_hand', playerId: state.playerId })
    setState((prev) => ({ ...prev, selectedCards: [] }))
  }, [state.playerId, sendAction])

  const refreshQuestion = useCallback(() => {
    sendAction({ type: 'refresh_question', playerId: state.playerId })
  }, [state.playerId, sendAction])

  const confirmQuestion = useCallback(() => {
    sendAction({ type: 'confirm_question', playerId: state.playerId })
  }, [state.playerId, sendAction])

  const submitCards = useCallback(() => {
    const cards = state.selectedCards.map((idx) => state.hand[idx])
    if (cards.length === 0) return
    sendAction({ type: 'submit_cards', playerId: state.playerId, cards })
    setState((prev) => ({ ...prev, selectedCards: [] }))
  }, [state.selectedCards, state.hand, state.playerId, sendAction])

  const pickWinner = useCallback((index) => {
    sendAction({ type: 'pick_winner', playerId: state.playerId, index })
  }, [state.playerId, sendAction])

  const nextRound = useCallback(() => {
    sendAction({ type: 'next_round', playerId: state.playerId })
  }, [state.playerId, sendAction])

  const voteKick = useCallback((targetId) => {
    sendAction({ type: 'vote_kick', playerId: state.playerId, targetId })
  }, [state.playerId, sendAction])

  const addCustomQuestion = useCallback((text) => {
    sendAction({ type: 'add_custom_question', playerId: state.playerId, text })
  }, [state.playerId, sendAction])

  const addCustomAnswer = useCallback((text) => {
    sendAction({ type: 'add_custom_answer', playerId: state.playerId, text })
  }, [state.playerId, sendAction])

  const playAgain = useCallback(() => {
    const hs = hostRef.current
    if (!hs) return
    hs.answerDeck = shuffle(allAnswers)
    hs.questionDeck = shuffle(allQuestions)
    hs.usedQuestionIds = []
    hs.submissions = []
    hs.displaySubmissions = []
    hs.roundWinnerId = null
    hs.roundWinnerName = null
    hs.winningSubmission = null
    hs.czarIndex = 0
    hs.kickVotes = {}
    hs.history = []
    for (const player of hs.players) {
      player.score = 0
      player.hand = []
      player.refreshesUsed = 0
      dealCards(player, HAND_SIZE)
    }
    drawQuestion()
    hs.phase = 'confirmQuestion'
    broadcastState()
  }, [broadcastState, dealCards, drawQuestion])

  const leaveGame = useCallback(() => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
      channelRef.current = null
    }
    for (const t of disconnectTimers.current.values()) clearTimeout(t)
    disconnectTimers.current.clear()
    hostRef.current = null
    myIdRef.current = null
    clearSession()
    setState(initialState)
  }, [])

  return {
    state, createRoom, joinRoom, startGame, selectCard, submitCards,
    pickWinner, nextRound, playAgain, leaveGame,
    refreshHand, refreshQuestion, confirmQuestion, voteKick,
    addCustomQuestion, addCustomAnswer,
  }
}
