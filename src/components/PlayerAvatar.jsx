export default function PlayerAvatar({ avatar, name, size = 32 }) {
  if (!avatar) {
    return <span className="player-avatar">{name?.charAt(0).toUpperCase() || '?'}</span>
  }

  if (avatar.startsWith('data:')) {
    return <img src={avatar} alt="" className="player-avatar-img" width={size} height={size} />
  }

  return <span className="player-avatar">{name?.charAt(0).toUpperCase() || '?'}</span>
}
