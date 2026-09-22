import { cert, getApps, initializeApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { readFileSync } from 'node:fs'
import { calendarEvents } from './calendar-events.js'

const projectId = process.env.FIREBASE_PROJECT_ID || 'myapp-a9601'
const credentialPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || new URL('../server/myapp-a9601-firebase-adminsdk-fbsvc-e66cf0f7ef.json', import.meta.url)
const credential = JSON.parse(readFileSync(credentialPath, 'utf8'))

if (!getApps().length) initializeApp({ projectId, credential: cert(credential) })

const db = getFirestore()
const batch = db.batch()
calendarEvents.forEach((event, index) => {
  const reference = db.collection('events').doc(`${event.date}-${String(index).padStart(2, '0')}`)
  batch.set(reference, { ...event, year: Number(event.date.slice(0, 4)), updatedAt: new Date().toISOString() })
})
await batch.commit()
console.log(`Seeded ${calendarEvents.length} calendar events into ${projectId}.`)
