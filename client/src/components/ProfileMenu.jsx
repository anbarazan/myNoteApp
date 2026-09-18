import { useEffect, useRef } from 'react'

function ProfileMenu({ user, open, onToggle, onSettings, onSignOut }) {
  const menuRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined

    function closeOnOutsideClick(event) {
      if (!menuRef.current?.contains(event.target)) onToggle(false)
    }

    document.addEventListener('mousedown', closeOnOutsideClick)
    return () => document.removeEventListener('mousedown', closeOnOutsideClick)
  }, [open, onToggle])

  const initial = (user.displayName || user.email || 'U').charAt(0).toUpperCase()
  const provider = user.providerData[0]?.providerId === 'google.com' ? 'Google' : 'Email and password'
  const memberSince = user.metadata.creationTime ? new Date(user.metadata.creationTime).toLocaleDateString() : 'Today'

  return (
    <div className="compact-account" ref={menuRef}>
      <button className={`profile-trigger ${open ? 'open' : ''}`} type="button" onClick={() => onToggle(!open)} aria-label="Open profile menu" aria-expanded={open}>
        <span className="avatar">{initial}</span><span className="account-email">{user.email}</span><span className="profile-chevron">⌄</span>
      </button>
      <button className="settings-icon" type="button" onClick={onSettings} aria-label="Open settings" title="Settings">⚙</button>
      {open && <div className="profile-popover">
        <div className="popover-heading"><span className="avatar large">{initial}</span><div><strong>{user.displayName || 'Field Notes member'}</strong><small>{user.email}</small></div></div>
        <div className="profile-details"><span>Signed in with</span><strong>{provider}</strong><span>Member since</span><strong>{memberSince}</strong></div>
        <button className="popover-logout" onClick={onSignOut}>Sign out <span>↗</span></button>
      </div>}
    </div>
  )
}

export default ProfileMenu
