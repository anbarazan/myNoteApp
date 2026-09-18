function QuickCapture({ text, saving, onTextChange, onSubmit }) {
  return (
    <aside className="quick-capture"><div className="quick-title"><span>✦</span><strong>Quick capture</strong></div><p>Get it out of your head and into your archive.</p><form onSubmit={onSubmit}><textarea id="note" value={text} onChange={(event) => onTextChange(event.target.value)} placeholder="Write a note..." rows="6" maxLength="5000" /><div className="composer-footer"><span>{text.length}/5000</span><button type="submit" disabled={saving || !text.trim()}>{saving ? 'Saving...' : 'Save note'} <span>↗</span></button></div></form><div className="quick-tip"><span>⌘</span><p>Tip<br /><strong>Pin anything</strong> you want close at hand.</p></div></aside>
  )
}

export default QuickCapture
