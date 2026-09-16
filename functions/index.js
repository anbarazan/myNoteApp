import { onRequest } from 'firebase-functions/v2/https'
import { createApp } from './app.js'

export const api = onRequest({ region: 'us-central1' }, createApp())
