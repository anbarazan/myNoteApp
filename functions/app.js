import express from 'express'
import cors from 'cors'
import { getFirestore } from 'firebase-admin/firestore'
import { initializeApp, getApps, cert, getApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'

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

  async function requireUser(request, response, next) {
    const token = request.headers.authorization?.startsWith('Bearer ')
      ? request.headers.authorization.slice(7)
      : ''

    if (!token) {
      response.status(401).json({ error: 'Sign in to continue.' })
      return
    }

    try {
      getDb()
      request.user = await getAuth(getApp()).verifyIdToken(token)
      next()
    } catch (error) {
      console.error(error)
      response.status(401).json({ error: 'Your session has expired. Sign in again.' })
    }
  }

  app.get('/api/health', (_request, response) => {
    response.json({ ok: true, service: 'field-notes-api' })
  })

  app.get('/api/notes', requireUser, async (request, response) => {
    try {
      const snapshot = await getDb().collection('notes')
        .where('ownerId', '==', request.user.uid)
        .get()
      const notes = snapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
      response.json(notes)
    } catch (error) {
      console.error(error)
      response.status(500).json({ error: 'Could not load notes.' })
    }
  })

  app.post('/api/notes', requireUser, async (request, response) => {
    const text = request.body?.text?.trim()
    if (!text) {
      response.status(400).json({ error: 'Text is required.' })
      return
    }

    try {
      const note = { text, ownerId: request.user.uid, createdAt: new Date().toISOString() }
      const document = await getDb().collection('notes').add(note)
      response.status(201).json({ id: document.id, text: note.text, createdAt: note.createdAt })
    } catch (error) {
      console.error(error)
      response.status(500).json({ error: 'Could not save note.' })
    }
  })

  app.delete('/api/notes/:noteId', requireUser, async (request, response) => {
    try {
      const reference = getDb().collection('notes').doc(request.params.noteId)
      const document = await reference.get()
      if (!document.exists || document.data().ownerId !== request.user.uid) {
        response.status(404).json({ error: 'Note not found.' })
        return
      }
      await reference.delete()
      response.status(204).send()
    } catch (error) {
      console.error(error)
      response.status(500).json({ error: 'Could not delete note.' })
    }
  })

  return app
}