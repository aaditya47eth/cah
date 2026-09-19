import { useState, useEffect } from 'react'
import Avatar from './Avatar'
import Sheet from './Sheet'
import { loadProfile, saveProfile, randomAvatar } from '../lib/profile'

const NAME_MAX = 20

const GAMES = {
  cah: {
    title: 'Terrible hooman',
    blurb: 'Fill in the blank with the worst card you’ve got, then everyone votes.',
  },
  dirty: {
    title: 'Dirty Minds',
    blurb: 'Five filthy-sounding clues, one totally innocent answer. No points, just shame.',
  },
}

export default function Home({ onCreateRoom, onJoinRoom, onPassAndPlay }) {
  const [profile] = useState(() => loadProfile())
  const [name, setName] = useState(profile?.name || '')
  const [avatar, setAvatar] = useState(profile?.avatar || randomAvatar())
  const [editingName, setEditingName] = useState(!profile?.name)
  const [joinOpen, setJoinOpen] = useState(false)
  const [gameSheet, setGameSheet] = useState(null) // 'cah' | 'dirty' | null
  const [sheetAsksName, setSheetAsksName] = useState(false)
  const [roomCode, setRoomCode] = useState('')

  const trimmed = name.trim()

  const openJoin = () => {
    setSheetAsksName(!trimmed)
    setJoinOpen(true)
  }

  const openGame = (game) => {
    setSheetAsksName(!trimmed)
    setGameSheet(game)
  }

  // A shared ?room=XXXX link opens the join sheet with the code filled in.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const room = params.get('room')
    if (room) {
      setRoomCode(room.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4))
      setSheetAsksName(!profile?.name)
      setJoinOpen(true)
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [profile])

  const remember = () => saveProfile({ name: trimmed, avatar })

  const rerollAvatar = () => {
    const next = randomAvatar(avatar)
    setAvatar(next)
    if (trimmed) saveProfile({ name: trimmed, avatar: next })
  }

  const handleCreate = (e) => {
    e.preventDefault()
    if (!trimmed || !gameSheet) return
    remember()
    onCreateRoom(gameSheet, trimmed, avatar)
  }

  const handleJoin = (e) => {
    e.preventDefault()
    if (!trimmed || roomCode.length < 4) return
    remember()
    onJoinRoom(roomCode, trimmed, avatar)
  }

  const nameInput = (autoFocus) => (
    <input
      type="text"
      className="input"
      placeholder="Your name"
      aria-label="Your name"
      value={name}
      maxLength={NAME_MAX}
      autoFocus={autoFocus}
      onChange={(e) => setName(e.target.value)}
      onKeyDown={(e) => { if (e.key === 'Enter' && trimmed) setEditingName(false) }}
    />
  )

  return (
    <div className="screen">
      <div className="screen-body home">
        <button type="button" className="avatar-button" onClick={rerollAvatar} aria-label="Change avatar">
          <Avatar avatar={avatar} name={name} size={84} />
          <span className="avatar-button-hint">tap to change</span>
        </button>

        {editingName ? (
          <div className="welcome">
            <h1>Hey there 👋</h1>
            {nameInput(true)}
          </div>
        ) : (
          <div className="welcome">
            <h1>Welcome back,</h1>
            <button type="button" className="welcome-name" onClick={() => setEditingName(true)}>
              {trimmed} <span aria-hidden="true">👋</span>
            </button>
          </div>
        )}

        <h2 className="section-title">Pick a game</h2>
        <div className="stack">
          <button type="button" className="game-tile game-tile-cah" onClick={() => openGame('cah')}>
            <span className="title-card-art" aria-hidden="true">
              <span className="mini-card mini-card-back" />
              <span className="mini-card mini-card-mid" />
              <span className="mini-card mini-card-front">?!</span>
            </span>
            <span className="game-tile-text">
              <span className="title-card-text">{GAMES.cah.title}</span>
              <span className="game-tile-sub">Fill in the blank · vote</span>
            </span>
          </button>
          <button type="button" className="game-tile game-tile-dirty" onClick={() => openGame('dirty')}>
            <span className="title-card-art" aria-hidden="true">
              <span className="mini-card mini-card-back" />
              <span className="mini-card mini-card-mid" />
              <span className="mini-card mini-card-front">😏</span>
            </span>
            <span className="game-tile-text">
              <span className="title-card-text">{GAMES.dirty.title}</span>
              <span className="game-tile-sub">Dirty clues · clean answers</span>
            </span>
          </button>
        </div>

        <button className="btn btn-secondary" onClick={openJoin}>
          Join room with code
        </button>
      </div>

      <Sheet open={gameSheet !== null} onClose={() => setGameSheet(null)} title={GAMES[gameSheet]?.title}>
        <p className="muted">{GAMES[gameSheet]?.blurb}</p>
        <form className="stack" onSubmit={handleCreate}>
          {sheetAsksName && nameInput(true)}
          <button className="btn btn-primary" type="submit" disabled={!trimmed}>
            Create room
          </button>
          {gameSheet === 'dirty' && (
            <button className="btn btn-secondary" type="button" onClick={() => onPassAndPlay('dirty')}>
              Pass &amp; play on this phone
            </button>
          )}
        </form>
      </Sheet>

      <Sheet open={joinOpen} onClose={() => setJoinOpen(false)} title="Join a room">
        <form className="stack" onSubmit={handleJoin}>
          {sheetAsksName && nameInput(true)}
          <input
            type="text"
            className="input input-code"
            placeholder="CODE"
            aria-label="Room code"
            value={roomCode}
            maxLength={4}
            autoFocus={!sheetAsksName}
            autoCapitalize="characters"
            onChange={(e) => setRoomCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
          />
          <button className="btn btn-primary" type="submit" disabled={!trimmed || roomCode.length < 4}>
            Join
          </button>
        </form>
      </Sheet>
    </div>
  )
}
