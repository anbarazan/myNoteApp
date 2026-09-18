import { useEffect, useState } from 'react'
import { createUserWithEmailAndPassword, GoogleAuthProvider, onAuthStateChanged, signInWithEmailAndPassword, signInWithPopup, signOut } from 'firebase/auth'
import { addDoc, collection, deleteDoc, doc, getDocs, query, updateDoc, where } from 'firebase/firestore'
import { auth, db, firebaseConfigured } from './firebase'
import NoteList from './components/NoteList'
import ProfileMenu from './components/ProfileMenu'
import QuickCapture from './components/QuickCapture'
import SettingsPage from './components/SettingsPage'

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
  const [page, setPage] = useState('notes')
  const [profileOpen, setProfileOpen] = useState(false)
  const [theme, setTheme] = useState(() => localStorage.getItem('field-notes-theme') || 'light')
  const [density, setDensity] = useState(() => localStorage.getItem('field-notes-density') || 'comfortable')
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

  useEffect(() => {
    localStorage.setItem('field-notes-theme', theme)
    localStorage.setItem('field-notes-density', density)
  }, [theme, density])

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
    <main className={`compact-shell ${theme} ${density}`}>
      <header className="compact-topbar"><div className="brand"><span className="brand-mark">F</span><span>Field Notes</span></div><nav className="compact-nav"><button className={page === 'notes' && view === 'all' ? 'selected' : ''} type="button" onClick={() => { setPage('notes'); setView('all') }}>All notes <b>{notes.length}</b></button><button className={page === 'notes' && view === 'pinned' ? 'selected' : ''} type="button" onClick={() => { setPage('notes'); setView('pinned') }}>Pinned <b>{pinnedCount}</b></button></nav><ProfileMenu user={user} open={profileOpen} onToggle={setProfileOpen} onSettings={() => { setPage('settings'); setProfileOpen(false) }} onSignOut={() => signOut(auth)} /></header>
      {page === 'settings' ? <SettingsPage theme={theme} density={density} notesCount={notes.length} pinnedCount={pinnedCount} onThemeChange={setTheme} onDensityChange={setDensity} onBack={() => setPage('notes')} /> : <section className="compact-content">
        <div className="compact-heading"><div><p className="section-kicker">{view === 'pinned' ? 'PINNED NOTES' : 'YOUR NOTES'}</p><h1>{view === 'pinned' ? 'Saved for later.' : 'Your notes.'}</h1></div><div className="compact-date">{new Intl.DateTimeFormat('en', { weekday: 'short', month: 'short', day: 'numeric' }).format(new Date())}<br /><span>{notes.length} notes in your archive</span></div></div>
        <div className="compact-layout">
          <section className="notes-stage">
            <NoteList loading={loading} error={error} visibleNotes={visibleNotes} notes={notes} pinnedCount={pinnedCount} view={view} search={search} dateRange={dateRange} sortOrder={sortOrder} onViewChange={setView} onSearchChange={setSearch} onDateChange={setDateRange} onSortChange={setSortOrder} editingId={editingId} editingText={editingText} updatingId={updatingId} deletingId={deletingId} onEditTextChange={setEditingText} onBeginEdit={beginEdit} onCancelEdit={cancelEdit} onSaveEdit={saveEdit} onTogglePin={togglePin} onDelete={deleteNote} />
          </section>
          <QuickCapture text={text} saving={saving} onTextChange={setText} onSubmit={addNote} />
        </div>
      </section>}
    </main>
  )
}

export default App
