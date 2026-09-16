import { useEffect, useState } from 'react'

function App() {
  const [notes, setNotes] = useState([])
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function loadNotes() {
    setLoading(true)
    try {
      const response = await fetch('/api/notes')
      if (!response.ok) throw new Error('Could not load notes.')
      setNotes(await response.json())
      setError('')
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadNotes()
  }, [])

  async function addNote(event) {
    event.preventDefault()
    if (!text.trim()) return
    setSaving(true)
    try {
      const response = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      })
      if (!response.ok) {
        const body = await response.json()
        throw new Error(body.error || 'Could not save note.')
      }
      setNotes([await response.json(), ...notes])
      setText('')
      setError('')
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="shell">
      <section className="intro">
        <p className="eyebrow">FIELD NOTES / FIRESTORE</p>
        <h1>Keep the useful<br /><em>bits.</em></h1>
        <p className="lede">A tiny full-stack notebook. React in the browser, Node at the edge, Firestore underneath.</p>
        <div className="signal"><span /> API connected</div>
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
              <p>{note.text}</p>
              <time>{new Date(note.createdAt).toLocaleString()}</time>
            </article>
          ))}
        </div>
      </section>
    </main>
  )
}

export default App
