import { useEffect, useState } from 'react'
import { createUserWithEmailAndPassword, GoogleAuthProvider, onAuthStateChanged, signInWithEmailAndPassword, signInWithPopup, signOut } from 'firebase/auth'
import { addDoc, collection, deleteDoc, doc, getDocs, query, where } from 'firebase/firestore'
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
          .map((note) => ({ id: note.id, ...note.data() }))
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
      const document = await addDoc(collection(db, 'notes'), { text: text.trim(), ownerId: user.uid, createdAt })
      const savedNote = { id: document.id, text: text.trim(), createdAt }
      setNotes((currentNotes) => [savedNote, ...currentNotes])
      setText('')
      setError('')
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setSaving(false)
    }
  }

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
    <main className="shell">
      <section className="intro">
        <p className="eyebrow">FIELD NOTES / FIRESTORE</p>
        <h1>Keep the useful<br /><em>bits.</em></h1>
        <p className="lede">A tiny full-stack notebook. React in the browser, Node at the edge, Firestore underneath.</p>
        <div className="account"><div className="signal"><span /> Private notebook</div><button className="text-button" onClick={() => signOut(auth)}>Sign out</button></div>
      </section>

      <section className="workspace">
        <form className="composer" onSubmit={addNote}>
          <label htmlFor="note">New note</label>
          <textarea id="note" value={text} onChange={(event) => setText(event.target.value)} placeholder="Something worth remembering..." rows="4" />
          <button type="submit" disabled={saving || !text.trim()}>{saving ? 'Saving...' : 'Add to the field'}</button>
        </form>

        <div className="notes-header">
          <h2>Recent notes</h2>
          <span>{notes.length.toString().padStart(2, '0')}</span>
        </div>
        {error && <p className="error">{error}</p>}
        <div className="notes-list">
          {loading ? <p className="empty">Reading the field...</p> : notes.length === 0 ? <p className="empty">No notes yet. Start with the first one.</p> : notes.map((note) => (
            <article className="note" key={note.id}>
              <div className="note-content"><p>{note.text}</p><time>{new Date(note.createdAt).toLocaleString()}</time></div>
              <button className="delete-button" type="button" onClick={() => deleteNote(note.id)} disabled={deletingId === note.id} aria-label={`Delete note: ${note.text}`}>
                {deletingId === note.id ? 'Deleting...' : 'Delete'}
              </button>
            </article>
          ))}
        </div>
      </section>
    </main>
  )
}

export default App
