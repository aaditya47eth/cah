// Name + avatar remembered per browser so returning players skip setup.

const PROFILE_KEY = 'cah_profile'

export const AVATARS = [
  '😆', '🍟', '🙈', '🐺', '🤪', '🦊', '🐸', '👽', '🤠', '🦄', '🐙', '🍕',
  '👻', '🐵', '🐼', '🦖', '🌶️', '🥑', '😎', '🤡', '🐷', '🦉', '🍩', '🎃',
]

export function randomAvatar(except) {
  const options = AVATARS.filter((a) => a !== except)
  return options[Math.floor(Math.random() * options.length)]
}

export function loadProfile() {
  try {
    const p = JSON.parse(localStorage.getItem(PROFILE_KEY))
    if (p && typeof p.name === 'string' && AVATARS.includes(p.avatar)) return p
  } catch { /* storage blocked or corrupt */ }
  return null
}

export function saveProfile(profile) {
  try { localStorage.setItem(PROFILE_KEY, JSON.stringify(profile)) } catch { /* ignore */ }
}
