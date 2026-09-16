import express from 'express'
import cors from 'cors'
import { getFirestore } from 'firebase-admin/firestore'
import { initializeApp, getApps, cert } from 'firebase-admin/app'

function getDb() {
  if (!getApps().length) {
    const projectId = process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT || 'myapp-a9601'
    if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
      initializeApp({
        credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON)),
        projectId
      })
    } else {
      initializeApp({ projectId })
    }
  }
  return getFirestore()
}

export function createApp() {
  const app = express()
  app.use(cors())
  app.use(express.json())

  app.get('/api/health', (_request, response) => {
    response.json({ ok: true, service: 'field-notes-api' })
  })

  app.get('/api/notes', async (_request, response) => {
    try {
      const snapshot = await getDb().collection('notes').orderBy('createdAt', 'desc').get()
      const notes = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
      response.json(notes)
    } catch (error) {
      console.error(error)
      response.status(500).json({ error: 'Could not load notes.' })
    }
  })

  app.post('/api/notes', async (request, response) => {
    const text = request.body?.text?.trim()
    if (!text) {
      response.status(400).json({ error: 'Text is required.' })
      return
    }

    try {
      const note = { text, createdAt: new Date().toISOString() }
      const document = await getDb().collection('notes').add(note)
      response.status(201).json({ id: document.id, ...note })
    } catch (error) {
      console.error(error)
      response.status(500).json({ error: 'Could not save note.' })
    }
  })

  return app
}