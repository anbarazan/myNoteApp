# Field Notes: React + Node + Firestore

A small full-stack notes app:

- `client/`: React + Vite web UI
- `server/`: Express API for local development
- `functions/`: Firebase Functions wrapper around the same Express API
- Firestore is accessed only by the Node server with the Firebase Admin SDK

## 1. Prerequisites

Install:

- Node.js 20 or newer: <https://nodejs.org/>
- A Google account
- Firebase CLI is included in this project and can be run with `npx firebase`.

Verify Node and npm:

```bash
node --version
npm --version
```

## 2. Install the project

From this directory:

```bash
npm install
```

Because the root package uses npm workspaces, this installs dependencies for the client, server, and functions packages.

## 3. Create a Firebase project and Firestore database

1. Open <https://console.firebase.google.com/>.
2. Select **Create a project** and finish the wizard.
3. Open **Build > Firestore Database**.
4. Click **Create database**.
5. Choose a region close to your users. Keep the database in production mode; the API uses the Admin SDK and the included rules intentionally deny direct browser access.
6. Copy the Firebase project ID from **Project settings > General**.

## 4. Authenticate local development

The Admin SDK needs Google credentials for Firestore. The easiest local option is Application Default Credentials:

```bash
npx firebase login
npx firebase projects:list
npx firebase use YOUR_FIREBASE_PROJECT_ID
```

For local Admin SDK access, create a service account key in Firebase Console under **Project settings > Service accounts > Generate new private key**. Store the downloaded JSON outside the repository, then set:

```bash
export GOOGLE_APPLICATION_CREDENTIALS="/absolute/path/to/service-account.json"
```

The server uses `myapp-a9601` by default for this project. You can override it with `FIREBASE_PROJECT_ID`. Firebase CLI login selects a CLI account, but it does not automatically create Application Default Credentials for the Firebase Admin SDK. The service-account setup above is therefore required when the server reads or writes Firestore locally.

Do not commit that JSON file. The `.gitignore` already excludes `.env`, but the service account file should live outside this project as well.

Alternatively, you can use the Firebase Emulator Suite for local Firestore. Install the Java runtime required by the emulator, then run:

```bash
npx firebase init emulators
npx firebase emulators:start
```

If using the emulator, set `FIRESTORE_EMULATOR_HOST=127.0.0.1:8080` in the terminal where the server runs.

## 5. Run locally

Start both the Vite UI and the Express API:

```bash
npm run dev
```

Before opening the app, create `client/.env.local` with the web app configuration from Firebase Console > Project settings > Your apps:

```bash
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id
```

Then enable **Authentication > Sign-in method > Email/Password** in Firebase Console and open <http://localhost:5173>.

- Vite serves the React app on port `5173`.
- Vite proxies `/api` requests to Express on port `3000`.
- Express serves `/api/health`, `GET /api/notes`, and `POST /api/notes`. Note endpoints require a Firebase ID token and return only notes owned by the signed-in account.

You can check the API directly:

```bash
curl http://localhost:3000/api/health
```

To run only the API:

```bash
npm run start
```

To create a production client build:

```bash
npm run build
```

## 6. Deploy the UI and API on one Firebase domain

The included `firebase.json` does two important things:

1. Publishes `client/dist` through Firebase Hosting.
2. Rewrites `/api/**` to the `api` Cloud Function.

That means the browser uses one origin in production:

- Web UI: `https://YOUR_PROJECT_ID.web.app`
- API: `https://YOUR_PROJECT_ID.web.app/api/notes`

Deploy with:

```bash
npx firebase use YOUR_FIREBASE_PROJECT_ID
npm run deploy
```

The deploy command builds React first, then deploys Hosting, Firestore rules/indexes, and the Function. The first Functions deployment can take a few minutes.

After deployment, test:

```bash
curl https://YOUR_PROJECT_ID.web.app/api/health
```

Open `https://YOUR_PROJECT_ID.web.app` in a browser and add a note. It should appear after the API writes it to Firestore.

## 7. Add a custom domain

1. In Firebase Console, open **Hosting**.
2. Click **Add custom domain**.
3. Enter your domain.
4. Add the DNS records Firebase gives you at your domain provider.
5. Wait for DNS verification and SSL provisioning.

Once complete, both the React app and API are available from the same custom domain, for example:

- `https://notes.example.com`
- `https://notes.example.com/api/health`

## API shape

### `GET /api/health`

Returns:

```json
{ "ok": true, "service": "field-notes-api" }
```

### `GET /api/notes`

Requires `Authorization: Bearer FIREBASE_ID_TOKEN`. Returns the latest notes belonging to the authenticated account.

### `POST /api/notes`

Requires `Authorization: Bearer FIREBASE_ID_TOKEN`. Request body:

```json
{ "text": "Remember this." }
```

The server verifies the token, adds the authenticated user's ID and an ISO timestamp, and creates the document in Firestore.

## Project notes

- Firestore credentials never ship to the browser.
- The browser calls relative `/api` URLs, so local and production code use the same API paths.
- `firebase.json` uses Node 20 for Cloud Functions.
- For real production use, add authentication and validate/rate-limit writes before exposing the endpoint publicly.
# myNoteApp
