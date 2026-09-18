import { useEffect, useState } from 'react'
import { createUserWithEmailAndPassword, GoogleAuthProvider, onAuthStateChanged, signInWithEmailAndPassword, signInWithPopup, signOut } from 'firebase/auth'
import { addDoc, collection, deleteDoc, doc, getDocs, query, updateDoc, where } from 'firebase/firestore'
import { auth, db, firebaseConfigured } from './firebase'

const authErrorMessages = {
  'auth/email-already-in-use': 'That email is already registered. Try signing in.',
  'auth/invalid-credential': 'The email or password is incorrect.',
  'auth/invalid-email': 'Enter a valid email address.',
  'auth/configuration-not-found': 'Firebase Authentication is not configured for this project yet. Enable Email/Password or Google in Firebase Console > Authentication > Sign-in method.',
  'auth/operation-not-allowed': 'This sign-in method is disabled. Enable it in Firebase Console > Authentication > Sign-in method.',
  'auth/popup-closed-by-user': 'The Google sign-in window was closed before it finished.',
  'auth/weak-password': 'Use a password with at least six characters.'
}

function App() {
  const [user, setUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [authMode, setAuthMode] = useState('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [authError, setAuthError] = useState('')
  const [authSubmitting, setAuthSubmitting] = useState(false)
  const [notes, setNotes] = useState([])
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState('')
  const [editingId, setEditingId] = useState('')
  const [editingText, setEditingText] = useState('')
  const [search, setSearch] = useState('')
  const [view, setView] = useState('all')
  const [dateRange, setDateRange] = useState('all')
  const [sortOrder, setSortOrder] = useState('newest')
  const [updatingId, setUpdatingId] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!auth) {
      setAuthLoading(false)
      return undefined
    }
    return onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser)
      setAuthLoading(false)
    })
  }, [])

  useEffect(() => {
    let cancelled = false
    setNotes([])
    setError('')

    if (!user) {
      setLoading(false)
      return () => { cancelled = true }
    }

    setLoading(true)
    getDocs(query(collection(db, 'notes'), where('ownerId', '==', user.uid)))
      .then((snapshot) => {
        const nextNotes = snapshot.docs
          .map((note) => ({ id: note.id, pinned: false, ...note.data() }))
          .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
        if (!cancelled) setNotes(nextNotes)
      })
      .catch((requestError) => {
        if (!cancelled) setError(requestError.message)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [user])

  async function submitAuth(event) {
    event.preventDefault()
    setAuthSubmitting(true)
    setAuthError('')
    try {
      if (authMode === 'signin') await signInWithEmailAndPassword(auth, email, password)
      else await createUserWithEmailAndPassword(auth, email, password)
      setPassword('')
    } catch (error) {
      setAuthError(authErrorMessages[error.code] || 'Could not authenticate. Try again.')
    } finally {
      setAuthSubmitting(false)
    }
  }

  async function signInWithGoogle() {
    setAuthSubmitting(true)
    setAuthError('')
    try {
      await signInWithPopup(auth, new GoogleAuthProvider())
    } catch (error) {
      setAuthError(authErrorMessages[error.code] || 'Google sign-in could not be completed.')
    } finally {
      setAuthSubmitting(false)
    }
  }

  async function addNote(event) {
    event.preventDefault()
    if (!text.trim()) return
    setSaving(true)
    try {
      const createdAt = new Date().toISOString()
      const document = await addDoc(collection(db, 'notes'), { text: text.trim(), ownerId: user.uid, createdAt, pinned: false })
      const savedNote = { id: document.id, text: text.trim(), createdAt, pinned: false }
      setNotes((currentNotes) => [savedNote, ...currentNotes])
      setText('')
      setError('')
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setSaving(false)
    }
  }

  function beginEdit(note) {
    setEditingId(note.id)
    setEditingText(note.text)
    setError('')
  }

  function cancelEdit() {
    setEditingId('')
    setEditingText('')
  }

  async function saveEdit(noteId) {
    if (!editingText.trim()) return
    setUpdatingId(noteId)
    try {
      const updatedAt = new Date().toISOString()
      await updateDoc(doc(db, 'notes', noteId), { text: editingText.trim(), updatedAt })
      setNotes((currentNotes) => currentNotes.map((note) => note.id === noteId ? { ...note, text: editingText.trim(), updatedAt } : note))
      cancelEdit()
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setUpdatingId('')
    }
  }

  async function togglePin(note) {
    setUpdatingId(note.id)
    try {
      await updateDoc(doc(db, 'notes', note.id), { pinned: !note.pinned })
      setNotes((currentNotes) => currentNotes.map((item) => item.id === note.id ? { ...item, pinned: !note.pinned } : item))
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setUpdatingId('')
    }
  }

  const pinnedCount = notes.filter((note) => note.pinned).length
  const rangeStart = new Date()
  rangeStart.setHours(0, 0, 0, 0)
  if (dateRange === 'week') {
    const day = rangeStart.getDay()
    rangeStart.setDate(rangeStart.getDate() - (day === 0 ? 6 : day - 1))
  }
  if (dateRange === 'month') rangeStart.setDate(1)
  if (dateRange === 'year') {
    rangeStart.setMonth(0, 1)
  }

  const visibleNotes = notes.filter((note) => {
    const matchesView = view === 'all' || (view === 'pinned' && note.pinned)
    const matchesSearch = note.text.toLowerCase().includes(search.toLowerCase().trim())
    const matchesDate = dateRange === 'all' || new Date(note.createdAt) >= rangeStart
    return matchesView && matchesSearch && matchesDate
  }).sort((left, right) => {
    const difference = new Date(left.updatedAt || left.createdAt) - new Date(right.updatedAt || right.createdAt)
    return sortOrder === 'newest' ? -difference : difference
  })

  async function deleteNote(noteId) {
    setDeletingId(noteId)
    setError('')
    try {
      await deleteDoc(doc(db, 'notes', noteId))
      setNotes((currentNotes) => currentNotes.filter((note) => note.id !== noteId))
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setDeletingId('')
    }
  }

  if (authLoading) return <main className="auth-shell"><p className="empty">Opening your notebook...</p></main>

  if (!firebaseConfigured) return <main className="auth-shell"><section className="auth-card"><p className="eyebrow">FIELD NOTES / SETUP</p><h1>Connect<br /><em>Firebase.</em></h1><p className="lede">Add the Firebase web app values to the client environment before signing in.</p><code>client/.env.local</code></section></main>

  if (!user) return (
    <main className="auth-shell">
      <section className="auth-card">
        <p className="eyebrow">FIELD NOTES / PRIVATE</p>
        <h1>Your<br /><em>field.</em></h1>
        <p className="lede">A quiet place for the useful bits. Sign in to keep your notes tied to your account.</p>
        <form className="auth-form" onSubmit={submitAuth}>
          <label htmlFor="email">Email</label>
          <input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="email" />
          <label htmlFor="password">Password</label>
          <input id="password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength="6" autoComplete={authMode === 'signin' ? 'current-password' : 'new-password'} />
          {authError && <p className="error">{authError}</p>}
          <button type="submit" disabled={authSubmitting}>{authSubmitting ? 'Opening...' : authMode === 'signin' ? 'Sign in' : 'Create account'}</button>
        </form>
        <div className="auth-divider"><span>or</span></div>
        <button className="google-button" type="button" onClick={signInWithGoogle} disabled={authSubmitting}>Continue with Google</button>
        <button className="text-button" type="button" onClick={() => { setAuthMode(authMode === 'signin' ? 'signup' : 'signin'); setAuthError('') }}>
          {authMode === 'signin' ? 'New here? Create an account' : 'Already have an account? Sign in'}
        </button>
      </section>
    </main>
  )

  return (
    <main className="compact-shell">
      <header className="compact-topbar"><div className="brand"><span className="brand-mark">F</span><span>Field Notes</span></div><nav className="compact-nav"><button className={view === 'all' ? 'selected' : ''} type="button" onClick={() => setView('all')}>All notes <b>{notes.length}</b></button><button className={view === 'pinned' ? 'selected' : ''} type="button" onClick={() => setView('pinned')}>Pinned <b>{pinnedCount}</b></button></nav><div className="compact-account"><span className="avatar">{(user.displayName || user.email || 'U').charAt(0).toUpperCase()}</span><span className="account-email">{user.email}</span><button className="logout-button" onClick={() => signOut(auth)}>Sign out</button></div></header>
      <section className="compact-content">
        <div className="compact-heading"><div><p className="section-kicker">{view === 'pinned' ? 'PINNED NOTES' : 'YOUR NOTES'}</p><h1>{view === 'pinned' ? 'Saved for later.' : 'Your notes.'}</h1></div><div className="compact-date">{new Intl.DateTimeFormat('en', { weekday: 'short', month: 'short', day: 'numeric' }).format(new Date())}<br /><span>{notes.length} notes in your archive</span></div></div>
        <div className="compact-layout">
          <section className="notes-stage">
            <div className="notes-toolbar"><label className="search-field" htmlFor="search"><span>⌕</span><input id="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search notes" /></label><div className="view-tabs"><button className={view === 'all' ? 'active' : ''} type="button" onClick={() => setView('all')}>All <span>{notes.length}</span></button><button className={view === 'pinned' ? 'active' : ''} type="button" onClick={() => setView('pinned')}>Pinned <span>{pinnedCount}</span></button></div></div>
            <div className="date-toolbar"><label>Period <select value={dateRange} onChange={(event) => setDateRange(event.target.value)}><option value="all">All time</option><option value="week">This week</option><option value="month">This month</option><option value="year">This year</option></select></label><label>Sort <select value={sortOrder} onChange={(event) => setSortOrder(event.target.value)}><option value="newest">Newest first</option><option value="oldest">Oldest first</option></select></label><span className="result-count">{visibleNotes.length} shown</span></div>
            {error && <p className="error">{error}</p>}<div className="notes-list">{loading ? <p className="empty">Gathering your notes...</p> : visibleNotes.length === 0 ? <p className="empty">{search ? 'No notes match that search.' : view === 'pinned' ? 'Nothing pinned yet.' : 'Your archive is waiting for its first note.'}</p> : visibleNotes.map((note, index) => <article className="note" key={note.id}><div className="note-index">{String(index + 1).padStart(2, '0')}</div><div className="note-content">{editingId === note.id ? <textarea className="edit-input" value={editingText} onChange={(event) => setEditingText(event.target.value)} autoFocus rows="3" /> : <p>{note.text}</p>}<time>{note.updatedAt ? 'Edited ' : ''}{new Date(note.updatedAt || note.createdAt).toLocaleString()}</time></div><div className="note-actions">{editingId === note.id ? <><button className="action-button save-action" type="button" onClick={() => saveEdit(note.id)} disabled={updatingId === note.id}>{updatingId === note.id ? 'Saving...' : 'Save'}</button><button className="action-button" type="button" onClick={cancelEdit}>Cancel</button></> : <><button className={`pin-button ${note.pinned ? 'pinned' : ''}`} type="button" onClick={() => togglePin(note)} disabled={updatingId === note.id} aria-label={note.pinned ? 'Unpin note' : 'Pin note'}>{note.pinned ? '★' : '☆'}</button><button className="action-button" type="button" onClick={() => beginEdit(note)}>Edit</button><button className="action-button delete-button" type="button" onClick={() => deleteNote(note.id)} disabled={deletingId === note.id}>{deletingId === note.id ? 'Deleting...' : 'Delete'}</button></>}</div></article>)}</div>
          </section>
          <aside className="quick-capture"><div className="quick-title"><span>✦</span><strong>Quick capture</strong></div><p>Get it out of your head and into your archive.</p><form onSubmit={addNote}><textarea id="note" value={text} onChange={(event) => setText(event.target.value)} placeholder="Write a note..." rows="6" maxLength="5000" /><div className="composer-footer"><span>{text.length}/5000</span><button type="submit" disabled={saving || !text.trim()}>{saving ? 'Saving...' : 'Save note'} <span>↗</span></button></div></form><div className="quick-tip"><span>⌘</span><p>Tip<br /><strong>Pin anything</strong> you want close at hand.</p></div></aside>
        </div>
      </section>
    </main>
  )
}

export default App
