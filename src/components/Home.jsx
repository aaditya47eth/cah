import { useState, useEffect, useMemo } from 'react'
import multiavatar from '@multiavatar/multiavatar/esm'

function randomSeed() {
  return Math.random().toString(36).substring(2, 10)
}

function svgToDataUri(svgString) {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svgString)}`
}

function AvatarPreview({ seed, size = 80 }) {
  const svg = multiavatar(seed)
  return <div style={{ width: size, height: size }} dangerouslySetInnerHTML={{ __html: svg }} />
}

function getAvatarString(seed) {
  const svg = multiavatar(seed)
  return svgToDataUri(svg)
}

export { AvatarPreview }

export default function Home({ onCreateRoom, onJoinRoom }) {
  const [name, setName] = useState('')
  const [roomCode, setRoomCode] = useState('')
  const [mode, setMode] = useState(null)
  const [seed, setSeed] = useState(randomSeed)

  // Check URL for ?room=XXXX
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const room = params.get('room')
    if (room) {
      setRoomCode(room.toUpperCase().slice(0, 4))
      setMode('join')
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [])

  const reroll = () => {
    setSeed(randomSeed())
  }

  const avatar = useMemo(() => getAvatarString(seed), [seed])

  const handleCreate = (e) => {
    e.preventDefault()
    if (name.trim()) onCreateRoom(name.trim(), avatar)
  }

  const handleJoin = (e) => {
    e.preventDefault()
    if (name.trim() && roomCode.trim()) onJoinRoom(roomCode.trim(), name.trim(), avatar)
  }

  return (
    <div className="home">
      <div className="home-card">
        <h1>Cards Against Humanity</h1>
        <p className="subtitle">The party game for horrible people</p>

        {!mode && (
          <>
            <div className="avatar-picker-v2">
              <div className="avatar-img-wrap" onClick={reroll}>
                <AvatarPreview seed={seed} size={96} />
              </div>
              <div className="avatar-controls">
                <button type="button" className="btn btn-sm btn-secondary" onClick={reroll}>
                  &#8635; Reroll
                </button>
              </div>
            </div>
            <input
              type="text"
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={20}
              autoFocus
              className="input"
            />
            <div className="home-buttons">
              <button
                className="btn btn-primary"
                onClick={() => name.trim() && setMode('create')}
                disabled={!name.trim()}
              >
                Create Room
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => name.trim() && setMode('join')}
                disabled={!name.trim()}
              >
                Join Room
              </button>
            </div>
          </>
        )}

        {mode === 'create' && (
          <form onSubmit={handleCreate}>
            <div className="avatar-preview-wrap">
              <AvatarPreview seed={seed} size={64} />
            </div>
            <p className="info">
              Playing as <strong>{name}</strong>
            </p>
            <button className="btn btn-primary btn-large" type="submit">
              Create Room
            </button>
            <button className="btn btn-ghost" type="button" onClick={() => setMode(null)}>
              Back
            </button>
          </form>
        )}

        {mode === 'join' && (
          <form onSubmit={handleJoin}>
            <div className="avatar-preview-wrap">
              <AvatarPreview seed={seed} size={64} />
            </div>
            <p className="info">
              Playing as <strong>{name}</strong>
            </p>
            <input
              type="text"
              placeholder="Room code"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              maxLength={4}
              autoFocus
              className="input input-code"
            />
            <button
              className="btn btn-primary btn-large"
              type="submit"
              disabled={roomCode.trim().length < 4}
            >
              Join
            </button>
            <button className="btn btn-ghost" type="button" onClick={() => setMode(null)}>
              Back
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
