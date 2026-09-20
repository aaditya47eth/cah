import { useState, useRef, useCallback, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import * as cahEngine from '../lib/hostEngine'
import * as dirtyEngine from '../lib/dirtyEngine'

// Only the host runs an engine; players just apply its broadcasts.
const ENGINES = { cah: cahEngine, dirty: dirtyEngine }
const engineOf = (hs) => ENGINES[hs?.game] || cahEngine

const RECONNECT_GRACE_MS = 30000
const ERROR_TOAST_MS = 5000

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
  try { sessionStorage.setItem(HOST_KEY, JSON.stringify(hs)) } catch { /* ignore */ }
}
function getHostState() {
  try { return JSON.parse(sessionStorage.getItem(HOST_KEY)) } catch { return null }
}
function clearSession() {
  sessionStorage.removeItem(SESSION_KEY)
  sessionStorage.removeItem(HOST_KEY)
}

function generateId() { return Math.random().toString(36).substring(2, 12) }

function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)]
  return code
}

const initialState = {
  game: null, // 'cah' | 'dirty', set by the host's broadcast
  phase: 'home',
  roomCode: null,
  playerId: null,
  playerName: '',
  avatar: '',
  isHost: false,
  settings: cahEngine.DEFAULT_SETTINGS,
  round: 0,
  players: [],
  currentQuestion: null,
  hand: [],
  submissions: [],
  result: null,
  kickVotes: {},
  history: [],
  judgeId: null,
  customCounts: { questions: 0, answers: 0 },
  deadline: null, // local-clock epoch ms
  // Dirty Minds
  readerId: null,
  card: null,
  cardNumber: 0,
  totalCards: 0,
  cluesShown: 0,
  revealed: false,
  error: null,
}

export function useGame() {
  const [state, setState] = useState(initialState)
  const channelRef = useRef(null)
  const hostRef = useRef(null)
  const myIdRef = useRef(null)
  const disconnectTimers = useRef(new Map())
  const phaseTimer = useRef(null)
  const errorTimer = useRef(null)

  useEffect(() => {
    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current)
      for (const t of disconnectTimers.current.values()) clearTimeout(t)
      clearTimeout(phaseTimer.current)
      clearTimeout(errorTimer.current)
    }
  }, [])

  // Errors are transient: realtime retries on its own, so a toast auto-hides
  // and any successful (re)subscribe clears it immediately.
  const clearError = useCallback(() => {
    clearTimeout(errorTimer.current)
    setState((prev) => (prev.error ? { ...prev, error: null } : prev))
  }, [])

  const showError = useCallback((message) => {
    setState((prev) => ({ ...prev, error: message }))
    clearTimeout(errorTimer.current)
    errorTimer.current = setTimeout(() => {
      setState((prev) => (prev.error === message ? { ...prev, error: null } : prev))
    }, ERROR_TOAST_MS)
  }, [])

  // Applies a broadcast payload to local state (used by host and players).
  const applyPublic = useCallback((pub) => {
    const myId = myIdRef.current
    setState((prev) => {
      const me = pub.players.find((p) => p.id === myId)
      if (!me && pub.phase !== 'lobby' && !prev.isHost) return { ...prev, phase: 'kicked' }
      const { remainingMs, ...rest } = pub
      return {
        ...prev,
        ...rest,
        hand: me?.hand || [],
        deadline: remainingMs != null ? Date.now() + remainingMs : null,
      }
    })
  }, [])

  // ─── Host: broadcast + phase timer ─────────────────────────────

  const commitRef = useRef(null)
  const commit = useCallback(() => {
    const hs = hostRef.current
    if (!hs) return
    const pub = engineOf(hs).publicState(hs)
    channelRef.current?.send({ type: 'broadcast', event: 'game_state', payload: pub })
    applyPublic(pub)
    saveHostState(hs)

    clearTimeout(phaseTimer.current)
    if (hs.deadline) {
      const deadline = hs.deadline
      phaseTimer.current = setTimeout(() => {
        const h = hostRef.current
        if (!h || h.deadline !== deadline) return
        engineOf(h).onTimeout(h)
        commitRef.current()
      }, Math.max(0, deadline - Date.now()))
    }
  }, [applyPublic])
  commitRef.current = commit

  const handleAction = useCallback((action) => {
    const hs = hostRef.current
    if (!hs) return
    const engine = engineOf(hs)
    if (!engine.PLAYER_ACTIONS.has(action?.type)) return
    if (engine.handleAction(hs, action)) {
      engine.progress(hs)
      commit()
    }
  }, [commit])

  // Runs a host-only engine call and broadcasts if it changed anything.
  const hostDo = useCallback((fn) => {
    const hs = hostRef.current
    if (!hs) return
    const engine = engineOf(hs)
    if (fn(hs, engine)) {
      engine.progress(hs)
      commit()
    }
  }, [commit])

  // ─── Channel setup ─────────────────────────────────────────────

  const attachHostListeners = useCallback((channel, hostPlayerId) => {
    channel.on('broadcast', { event: 'player_action' }, ({ payload }) => handleAction(payload))

    channel.on('presence', { event: 'join' }, ({ newPresences }) => {
      const hs = hostRef.current
      if (!hs) return
      for (const p of newPresences) {
        if (p.id === hostPlayerId) continue
        if (disconnectTimers.current.has(p.id)) {
          clearTimeout(disconnectTimers.current.get(p.id))
          disconnectTimers.current.delete(p.id)
        }
        engineOf(hs).addPlayer(hs, { id: p.id, name: p.name, avatar: p.avatar })
      }
      commit()
    })

    channel.on('presence', { event: 'leave' }, ({ leftPresences }) => {
      for (const p of leftPresences) {
        if (p.id === hostPlayerId) continue
        const timer = setTimeout(() => {
          disconnectTimers.current.delete(p.id)
          const hs = hostRef.current
          if (hs && engineOf(hs).removePlayer(hs, p.id)) {
            engineOf(hs).progress(hs)
            commit()
          }
        }, RECONNECT_GRACE_MS)
        disconnectTimers.current.set(p.id, timer)
      }
    })
  }, [handleAction, commit])

  const attachPlayerListeners = useCallback((channel) => {
    channel.on('broadcast', { event: 'game_state' }, ({ payload }) => applyPublic(payload))
  }, [applyPublic])

  const subscribe = useCallback((channel, presence, onReady) => {
    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        clearError()
        await channel.track(presence)
        onReady?.()
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        showError('Connection problem — check your internet.')
      }
    })
    channelRef.current = channel
  }, [clearError, showError])

  // ─── Restore session after a reload ────────────────────────────

  const restoreRef = useRef(null)
  restoreRef.current = { attachHostListeners, attachPlayerListeners, subscribe, commit, applyPublic }

  useEffect(() => {
    const session = getSession()
    if (!session) return
    const { attachHostListeners, attachPlayerListeners, subscribe, applyPublic } = restoreRef.current
    myIdRef.current = session.playerId

    const channel = supabase.channel(`room:${session.roomCode}`, {
      config: { broadcast: { self: false } },
    })
    const presence = { id: session.playerId, name: session.playerName, avatar: session.avatar || '', isHost: session.isHost }
    const base = {
      ...initialState, roomCode: session.roomCode, playerId: session.playerId,
      playerName: session.playerName, avatar: session.avatar || '', isHost: session.isHost,
    }

    if (session.isHost) {
      const saved = getHostState()
      // Missing, or a Terrible hooman state from before settings existed.
      if (!saved || (saved.game !== 'dirty' && !saved.settings)) { clearSession(); return }
      hostRef.current = saved
      attachHostListeners(channel, session.playerId)
      setState({ ...base, phase: saved.phase })
      applyPublic(engineOf(saved).publicState(saved))
      subscribe(channel, presence, () => setTimeout(() => restoreRef.current.commit(), 500))
    } else {
      attachPlayerListeners(channel)
      setState({ ...base, phase: 'lobby' })
      subscribe(channel, presence)
    }
  }, [])

  // ─── Public methods ─────────────────────────────────────────────

  const sendAction = useCallback((action) => {
    const full = { ...action, playerId: myIdRef.current }
    if (hostRef.current) handleAction(full)
    else channelRef.current?.send({ type: 'broadcast', event: 'player_action', payload: full })
  }, [handleAction])

  const createRoom = useCallback((game, playerName, avatar = '') => {
    const roomCode = generateRoomCode()
    const playerId = generateId()
    myIdRef.current = playerId
    hostRef.current = (ENGINES[game] || cahEngine).createHostState({ id: playerId, name: playerName, avatar })

    const channel = supabase.channel(`room:${roomCode}`, { config: { broadcast: { self: false } } })
    attachHostListeners(channel, playerId)
    subscribe(channel, { id: playerId, name: playerName, avatar, isHost: true }, () => commitRef.current())
    saveSession({ playerId, playerName, avatar, roomCode, isHost: true })

    setState({ ...initialState, phase: 'lobby', roomCode, playerId, playerName, avatar, isHost: true })
    applyPublic(engineOf(hostRef.current).publicState(hostRef.current))
  }, [attachHostListeners, subscribe, applyPublic])

  const joinRoom = useCallback((roomCode, playerName, avatar = '') => {
    const code = roomCode.toUpperCase().trim()
    const playerId = generateId()
    myIdRef.current = playerId

    const channel = supabase.channel(`room:${code}`, { config: { broadcast: { self: false } } })
    attachPlayerListeners(channel)
    subscribe(channel, { id: playerId, name: playerName, avatar, isHost: false })
    saveSession({ playerId, playerName, avatar, roomCode: code, isHost: false })

    setState({ ...initialState, phase: 'lobby', roomCode: code, playerId, playerName, avatar, isHost: false })
  }, [attachPlayerListeners, subscribe])

  const updateSettings = useCallback((patch) => hostDo((hs, e) => e.updateSettings(hs, patch)), [hostDo])
  const startGame = useCallback(() => hostDo((hs, e) => e.startGame(hs)), [hostDo])
  const continueGame = useCallback(() => hostDo((hs, e) => e.advance(hs)), [hostDo])
  const playAgain = startGame

  const submitCards = useCallback((cardIds) => sendAction({ type: 'submit_cards', cardIds }), [sendAction])
  const vote = useCallback((submissionId) => sendAction({ type: 'vote', submissionId }), [sendAction])
  const exchangeHand = useCallback(() => sendAction({ type: 'exchange_hand' }), [sendAction])
  const voteKick = useCallback((targetId) => sendAction({ type: 'vote_kick', targetId }), [sendAction])
  const skipQuestion = useCallback(() => sendAction({ type: 'skip_question' }), [sendAction])
  const addCustomQuestion = useCallback((text) => sendAction({ type: 'add_custom_question', text }), [sendAction])
  const addCustomAnswer = useCallback((text) => sendAction({ type: 'add_custom_answer', text }), [sendAction])

  // Dirty Minds (only the current reader's actions are accepted by the host)
  const nextClue = useCallback(() => sendAction({ type: 'next_clue' }), [sendAction])
  const revealAnswer = useCallback(() => sendAction({ type: 'reveal' }), [sendAction])
  const nextCard = useCallback(() => sendAction({ type: 'next_card' }), [sendAction])

  const leaveGame = useCallback(() => {
    if (!hostRef.current) sendAction({ type: 'leave' })
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
      channelRef.current = null
    }
    for (const t of disconnectTimers.current.values()) clearTimeout(t)
    disconnectTimers.current.clear()
    clearTimeout(phaseTimer.current)
    clearTimeout(errorTimer.current)
    hostRef.current = null
    myIdRef.current = null
    clearSession()
    setState(initialState)
  }, [sendAction])

  return {
    state, createRoom, joinRoom, updateSettings, startGame, continueGame, playAgain,
    submitCards, vote, exchangeHand, voteKick, skipQuestion, addCustomQuestion, addCustomAnswer,
    leaveGame, nextClue, revealAnswer, nextCard,
  }
}
