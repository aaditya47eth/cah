import { useState } from 'react'
import Avatar from './Avatar'
import Sheet from './Sheet'
import HowToPlay from './HowToPlay'
import DirtyHowToPlay from './dirty/DirtyHowToPlay'
import { CheckIcon, CopyIcon, InfoIcon, ShareIcon } from './icons'
import { MIN_PLAYERS, MAX_PLAYERS, TIMER_OPTIONS, EXCHANGE_OPTIONS } from '../lib/hostEngine'

const timerLabel = (s) => (s ? `${s}s` : 'Off')
const exchangeLabel = (n) => (n === -1 ? '∞' : n === 0 ? 'None' : String(n))

export default function Lobby({
  state, onStartGame, onUpdateSettings, onLeave, onAddCustomQuestion, onAddCustomAnswer,
}) {
  const { game, roomCode, players, isHost, playerId, settings, customCounts } = state
  const isCah = game === 'cah' // settings and custom cards are Terrible hooman only
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [showCustom, setShowCustom] = useState(false)
  const [customQ, setCustomQ] = useState('')
  const [customA, setCustomA] = useState('')
  const [notice, setNotice] = useState('')

  const missing = Math.max(0, MIN_PLAYERS - players.length)
  const flash = (text) => {
    setNotice(text)
    setTimeout(() => setNotice(''), 2000)
  }

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(roomCode)
      flash('Code copied')
    } catch { flash('Copy failed') }
  }

  const shareLink = async () => {
    const url = `${window.location.origin}${window.location.pathname}?room=${roomCode}`
    try {
      if (navigator.share) await navigator.share({ title: 'Join my game', url })
      else {
        await navigator.clipboard.writeText(url)
        flash('Invite link copied')
      }
    } catch { /* share sheet dismissed */ }
  }

  const addQ = (e) => {
    e.preventDefault()
    if (!customQ.trim()) return
    onAddCustomQuestion(customQ.trim())
    setCustomQ('')
  }

  const addA = (e) => {
    e.preventDefault()
    if (!customA.trim()) return
    onAddCustomAnswer(customA.trim())
    setCustomA('')
  }

  return (
    <div className="screen">
      <div className="screen-body">
        <div className="lobby-head">
          <div>
            <p className="eyebrow">Room code</p>
            <h1 className="room-code">{roomCode}</h1>
          </div>
          <div className="lobby-head-actions">
            <button className="icon-btn" onClick={copyCode} aria-label="Copy room code"><CopyIcon /></button>
            <button className="icon-btn" onClick={shareLink} aria-label="Share invite link"><ShareIcon /></button>
          </div>
        </div>
        {notice && <p className="notice" role="status">{notice}</p>}

        {game && (
          <div className="tags">
            <span className="tag tag-pink">{isCah ? 'Terrible hooman' : 'Dirty Minds'}</span>
            {isCah && (
              <>
                <span className={`tag ${settings.hardcore ? 'tag-orange' : 'tag-olive'}`}>
                  {settings.hardcore ? 'Hardcore' : 'Normal'}
                </span>
                <span className="tag tag-amber">{settings.timerSec ? `${settings.timerSec}s timer` : 'No timer'}</span>
                <span className="tag tag-lavender">{exchangeLabel(settings.maxExchanges)} exchanges</span>
              </>
            )}
          </div>
        )}

        <h2 className="section-title">Players {players.length}/{MAX_PLAYERS}</h2>
        <div className="panel">
          {players.map((p, i) => (
            <div key={p.id} className="row">
              <Avatar avatar={p.avatar} name={p.name} size={40} />
              <span className="row-name">
                {p.name}
                {p.id === playerId && <span className="muted"> (you)</span>}
              </span>
              {i === 0 ? <span className="badge">Host</span> : <span className="check-dot"><CheckIcon /></span>}
            </div>
          ))}
          {Array.from({ length: missing }, (_, i) => (
            <div key={`wait-${i}`} className="row row-waiting">
              <span className="avatar avatar-empty" style={{ width: 40, height: 40 }} />
              <span className="row-name">Waiting</span>
              <span className="spinner" aria-hidden="true" />
            </div>
          ))}
        </div>
        {!isHost && players.length === 0 && (
          <p className="muted small">Looking for room {roomCode}… If nobody shows up, check the code.</p>
        )}

        {game && (
          <div className="panel info-panel">
            <InfoIcon />
            <div>
              <p className="info-title">How do we play? 🧐</p>
              {isCah ? <HowToPlay /> : <DirtyHowToPlay />}
            </div>
          </div>
        )}

        {isCah && (
          <div className="panel custom-panel">
            <button className="link-btn" onClick={() => setShowCustom(!showCustom)} aria-expanded={showCustom}>
              {showCustom ? 'Hide custom cards' : '+ Add your own cards'}
            </button>
            {showCustom && (
              <div className="stack">
                <form className="inline-form" onSubmit={addQ}>
                  <input
                    className="input input-small"
                    placeholder="Question — use _____ for blanks"
                    aria-label="Custom question"
                    value={customQ}
                    maxLength={200}
                    onChange={(e) => setCustomQ(e.target.value)}
                  />
                  <button className="btn btn-small" type="submit" disabled={!customQ.trim()}>Add</button>
                </form>
                <form className="inline-form" onSubmit={addA}>
                  <input
                    className="input input-small"
                    placeholder="Answer card"
                    aria-label="Custom answer"
                    value={customA}
                    maxLength={100}
                    onChange={(e) => setCustomA(e.target.value)}
                  />
                  <button className="btn btn-small" type="submit" disabled={!customA.trim()}>Add</button>
                </form>
              </div>
            )}
            {(customCounts.questions > 0 || customCounts.answers > 0) && (
              <p className="muted small">
                Added {customCounts.questions} question{customCounts.questions === 1 ? '' : 's'} ·{' '}
                {customCounts.answers} answer{customCounts.answers === 1 ? '' : 's'}
              </p>
            )}
          </div>
        )}
      </div>

      <div className="screen-footer">
        {isHost ? (
          <>
            {isCah && <button className="btn btn-secondary" onClick={() => setSettingsOpen(true)}>Game settings</button>}
            <button className="btn btn-primary" onClick={onStartGame} disabled={missing > 0}>
              {missing > 0 ? `Need ${missing} more player${missing === 1 ? '' : 's'}` : 'Start game'}
            </button>
          </>
        ) : (
          <p className="muted center">Waiting for the host to start…</p>
        )}
        <button className="link-btn" onClick={onLeave}>Leave room</button>
      </div>

      <Sheet open={settingsOpen} onClose={() => setSettingsOpen(false)} title="Game settings">
        <div className="setting">
          <span className="setting-icon setting-icon-orange" aria-hidden="true">🔥</span>
          <span className="setting-label">Hardcore mode <span aria-hidden="true">🔞</span></span>
          <button
            role="switch"
            aria-checked={settings.hardcore}
            aria-label="Hardcore mode"
            className={`switch ${settings.hardcore ? 'on' : ''}`}
            onClick={() => onUpdateSettings({ hardcore: !settings.hardcore })}
          >
            <span className="switch-knob" />
          </button>
        </div>
        <div className="setting setting-col">
          <span className="setting-label">Round timer</span>
          <div className="segmented">
            {TIMER_OPTIONS.map((s) => (
              <button
                key={s}
                className={settings.timerSec === s ? 'active' : ''}
                onClick={() => onUpdateSettings({ timerSec: s })}
              >
                {timerLabel(s)}
              </button>
            ))}
          </div>
        </div>
        <div className="setting setting-col">
          <span className="setting-label">Hand exchanges per round</span>
          <div className="segmented">
            {EXCHANGE_OPTIONS.map((n) => (
              <button
                key={n}
                className={settings.maxExchanges === n ? 'active' : ''}
                onClick={() => onUpdateSettings({ maxExchanges: n })}
              >
                {exchangeLabel(n)}
              </button>
            ))}
          </div>
        </div>
        <button className="btn btn-primary" onClick={() => setSettingsOpen(false)}>Done</button>
      </Sheet>
    </div>
  )
}
