import { useEffect, useState } from 'react'
import { collection, getDocs, orderBy, query } from 'firebase/firestore'
import { db } from '../firebase'

/* Event records are managed in Firestore; this component only renders them. */
const typeLabels = { festival: 'Festival', public: 'Public holiday', community: 'Community' }

/*
  { date: '2026-01-01', title: 'New Year\'s Day', type: 'public', region: 'All India', details: 'The first day of the Gregorian calendar year.' },
  { date: '2026-01-14', title: 'Makar Sankranti', type: 'festival', region: 'All India', details: 'Harvest festival observed as Pongal, Lohri, Magh Bihu, and Uttarayan across India.' },
  { date: '2026-01-15', title: 'Pongal', type: 'festival', region: 'Tamil Nadu', details: 'Four-day Tamil harvest festival celebrating the Sun, cattle, and the new harvest.' },
  { date: '2026-01-26', title: 'Republic Day', type: 'public', region: 'All India', details: 'National holiday marking the adoption of the Constitution of India.' },
  { date: '2026-02-15', title: 'Maha Shivaratri', type: 'festival', region: 'All India', details: 'Night dedicated to Lord Shiva, observed with prayers and temple visits.' },
  { date: '2026-03-04', title: 'Holi', type: 'festival', region: 'All India', details: 'Festival of colors welcoming spring and celebrating joy, community, and renewal.' },
  { date: '2026-03-19', title: 'Ugadi / Gudi Padwa', type: 'festival', region: 'Karnataka, Andhra Pradesh, Telangana, Maharashtra', details: 'Regional New Year celebrations with traditional food, rituals, and new beginnings.' },
  { date: '2026-03-20', title: 'Cheti Chand', type: 'festival', region: 'Sindhi communities', details: 'Sindhi New Year and celebration of Jhulelal.' },
  { date: '2026-03-26', title: 'Ram Navami', type: 'festival', region: 'All India', details: 'Celebration of the birth of Lord Rama.' },
  { date: '2026-04-02', title: 'Mahavir Jayanti', type: 'festival', region: 'Jain communities', details: 'Birth anniversary of Lord Mahavira.' },
  { date: '2026-04-14', title: 'Ambedkar Jayanti', type: 'public', region: 'All India', details: 'Birth anniversary of Dr. B. R. Ambedkar.' },
  { date: '2026-04-14', title: 'Vaisakhi', type: 'festival', region: 'Punjab and North India', details: 'Punjabi harvest festival and Sikh New Year.' },
  { date: '2026-05-01', title: 'Labour Day', type: 'public', region: 'Many Indian states', details: 'Day recognizing workers and the labor movement.' },
  { date: '2026-06-21', title: 'International Yoga Day', type: 'community', region: 'All India', details: 'Annual celebration of yoga, health, and wellbeing.' },
  { date: '2026-08-15', title: 'Independence Day', type: 'public', region: 'All India', details: 'National holiday commemorating India\'s independence.' },
  { date: '2026-08-26', title: 'Janmashtami', type: 'festival', region: 'All India', details: 'Celebration of the birth of Lord Krishna.' },
  { date: '2026-09-05', title: 'Onam', type: 'festival', region: 'Kerala', details: 'Kerala harvest festival known for the flower carpet, feast, and boat races.' },
  { date: '2026-09-14', title: 'Vinayagar Chaturthi', type: 'festival', region: 'Maharashtra, Tamil Nadu, Karnataka, Andhra Pradesh', details: 'Festival welcoming Lord Ganesha with prayers, public celebrations, and immersion ceremonies.' },
  { date: '2026-10-02', title: 'Gandhi Jayanti', type: 'public', region: 'All India', details: 'National holiday commemorating the birth of Mahatma Gandhi.' },
  { date: '2026-10-20', title: 'Dussehra', type: 'festival', region: 'All India', details: 'Celebration of the victory of good over evil.' },
  { date: '2026-11-08', title: 'Diwali', type: 'festival', region: 'All India', details: 'Festival of lights, celebrated with lamps, prayers, sweets, and family gatherings.' },
  { date: '2026-11-24', title: 'Guru Nanak Jayanti', type: 'festival', region: 'Sikh communities', details: 'Birth anniversary of Guru Nanak Dev Ji.' },
  { date: '2026-12-25', title: 'Christmas Day', type: 'public', region: 'All India', details: 'Christian holiday celebrating the birth of Jesus Christ.' }
]
*/

function toDateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function CalendarView() {
  const [month, setMonth] = useState(() => new Date(2026, 8, 1))
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [selectedDay, setSelectedDay] = useState(null)
  const [events, setEvents] = useState([])
  const [eventsLoading, setEventsLoading] = useState(true)
  const [eventsError, setEventsError] = useState('')
  const year = month.getFullYear()
  const monthIndex = month.getMonth()
  const firstDay = new Date(year, monthIndex, 1)
  const leadingDays = (firstDay.getDay() + 6) % 7
  const monthLabel = new Intl.DateTimeFormat('en', { month: 'long', year: 'numeric' }).format(month)
  const todayKey = toDateKey(new Date())
  const cells = Array.from({ length: 42 }, (_, index) => {
    const day = new Date(year, monthIndex, index - leadingDays + 1)
    return { date: day, key: toDateKey(day), inMonth: day.getMonth() === monthIndex }
  })

  useEffect(() => {
    getDocs(query(collection(db, 'events'), orderBy('date')))
      .then((snapshot) => setEvents(snapshot.docs.map((event) => ({ id: event.id, ...event.data() }))))
      .catch(() => setEventsError('Calendar events could not be loaded.'))
      .finally(() => setEventsLoading(false))
  }, [])

  const eventsForDay = (dateKey) => events.filter((event) => event.date === dateKey)

  function moveMonth(offset) {
    setSelectedDay(null)
    setMonth(new Date(year, monthIndex + offset, 1))
  }

  function openDay(date, dayEvents) {
    if (dayEvents.length) setSelectedDay({ date, events: dayEvents })
  }

  return (
    <section className="calendar-page">
      <div className="calendar-heading"><div><p className="section-kicker">YOUR CALENDAR</p><h1>Dates worth remembering.</h1><p>Festivals, milestones, and important moments, all in their place.</p></div><button className="today-button" type="button" onClick={() => setMonth(new Date(new Date().getFullYear(), new Date().getMonth(), 1))}>Today</button></div>
      <div className="calendar-card">
        <div className="calendar-toolbar"><button className="month-arrow" type="button" onClick={() => moveMonth(-1)} aria-label="Previous month">‹</button><h2>{monthLabel}</h2><button className="month-arrow" type="button" onClick={() => moveMonth(1)} aria-label="Next month">›</button></div>
        <div className="calendar-weekdays">{['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => <span key={day}>{day}</span>)}</div>
        {eventsLoading ? <p className="calendar-loading">Loading events...</p> : eventsError ? <p className="error">{eventsError}</p> : <div className="calendar-grid">{cells.map(({ date, key, inMonth }) => { const dayEvents = eventsForDay(key); const visibleEvents = dayEvents.slice(0, 3); const moreCount = dayEvents.length - visibleEvents.length; return <div className={`calendar-cell ${inMonth ? '' : 'outside-month'} ${key === todayKey ? 'today' : ''}`} key={key}><span className="day-number">{date.getDate()}</span><div className="cell-events">{visibleEvents.map((event) => <button className={`calendar-event ${event.type}`} type="button" key={event.id} onClick={() => setSelectedEvent(event)} title={event.title}><i />{event.title}</button>)}{moreCount > 0 && <button className="more-events" type="button" onClick={() => openDay(date, dayEvents)}>+{moreCount} more</button>}</div>{dayEvents.length > 0 && dayEvents.length <= 3 && <button className="day-details" type="button" onClick={() => openDay(date, dayEvents)} aria-label={`View events for ${key}`}>+</button>}</div> })}</div>}
        <div className="calendar-legend"><span><i className="legend-dot festival" /> Festival</span><span><i className="legend-dot public" /> Public holiday</span><span><i className="legend-dot community" /> Community</span></div>
      </div>
      {selectedEvent && <div className="event-modal-backdrop" role="presentation" onClick={() => setSelectedEvent(null)}><div className="event-modal" role="dialog" aria-modal="true" aria-label="Event details" onClick={(event) => event.stopPropagation()}><button className="modal-close" type="button" onClick={() => setSelectedEvent(null)} aria-label="Close event details">×</button><span className={`event-pill ${selectedEvent.type}`}>{typeLabels[selectedEvent.type]}</span><h2>{selectedEvent.title}</h2><p className="event-date">{new Date(`${selectedEvent.date}T00:00:00`).toLocaleDateString('en', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</p><p className="event-region">{selectedEvent.region}</p><p className="event-description">{selectedEvent.details}</p><button className="modal-action" type="button" onClick={() => setSelectedEvent(null)}>Done</button></div></div>}
      {selectedDay && <div className="event-modal-backdrop" role="presentation" onClick={() => setSelectedDay(null)}><div className="event-modal day-modal" role="dialog" aria-modal="true" aria-label="Events for selected day" onClick={(event) => event.stopPropagation()}><button className="modal-close" type="button" onClick={() => setSelectedDay(null)} aria-label="Close day events">×</button><p className="section-kicker">DAY VIEW</p><h2>{selectedDay.date.toLocaleDateString('en', { weekday: 'long', month: 'long', day: 'numeric' })}</h2>{selectedDay.events.map((event) => <button className="modal-event-row" type="button" key={event.title} onClick={() => { setSelectedDay(null); setSelectedEvent(event) }}><i className={`legend-dot ${event.type}`} /><span>{event.title}</span><small>{typeLabels[event.type]}</small></button>)}</div></div>}
    </section>
  )
}

export default CalendarView
