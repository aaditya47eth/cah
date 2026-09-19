const TINTS = ['#4a3a1c', '#4a2c27', '#3a4220', '#3b3630', '#37304d', '#4d3530', '#2f3f3a', '#4d3a26']

function tintFor(text) {
  let h = 0
  for (const ch of text) h = (h * 31 + ch.codePointAt(0)) >>> 0
  return TINTS[h % TINTS.length]
}

// Emoji on a tinted circle; falls back to the name's initial.
export default function Avatar({ avatar, name, size = 40 }) {
  const isEmoji = typeof avatar === 'string' && avatar !== '' && [...avatar].length <= 3
  const content = isEmoji ? avatar : (name?.trim()?.[0]?.toUpperCase() || '?')
  return (
    <span
      className="avatar"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.55), background: tintFor(content) }}
      aria-hidden="true"
    >
      {content}
    </span>
  )
}
