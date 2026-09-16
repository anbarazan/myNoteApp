import { createApp } from './app.js'
import dotenv from 'dotenv'

dotenv.config({ path: new URL('./.env', import.meta.url) })

const port = process.env.PORT || 3000
createApp().listen(port, () => {
  console.log(`API listening at http://localhost:${port}`)
})
