function SettingsPage({ theme, density, notesCount, pinnedCount, onThemeChange, onDensityChange, onBack }) {
  return (
    <section className="settings-page">
      <div className="settings-heading"><p className="section-kicker">PREFERENCES</p><h1>Make it yours.</h1><p>Small choices for a calmer notes workspace. These settings are saved on this device.</p></div>
      <div className="settings-list">
        <div className="setting-row"><div><strong>Appearance</strong><p>Choose how Field Notes looks.</p></div><div className="setting-options"><button className={theme === 'light' ? 'active' : ''} type="button" onClick={() => onThemeChange('light')}>☼ Light</button><button className={theme === 'dark' ? 'active' : ''} type="button" onClick={() => onThemeChange('dark')}>☾ Dark</button></div></div>
        <div className="setting-row"><div><strong>Note spacing</strong><p>Control how much room each note uses.</p></div><div className="setting-options"><button className={density === 'comfortable' ? 'active' : ''} type="button" onClick={() => onDensityChange('comfortable')}>Comfortable</button><button className={density === 'compact' ? 'active' : ''} type="button" onClick={() => onDensityChange('compact')}>Compact</button></div></div>
        <div className="setting-row"><div><strong>Workspace</strong><p>Your private archive and account.</p></div><span className="setting-note">{notesCount} notes · {pinnedCount} pinned</span></div>
      </div>
      <button className="back-button" type="button" onClick={onBack}>← Back to notes</button>
    </section>
  )
}

export default SettingsPage
