# Spending Tracker

A Firebase web app for tracking spending across separate budgets. Use one tracker for personal expenses, another for a coffee trailer, another for a project, and so on.

## Features

- Google sign-in with Firebase Authentication
- Multiple spending trackers per user
- User-created spending categories shown in the expense category dropdown
- Realtime Firestore updates with `onSnapshot`
- Pie chart showing category totals with distinct colors
- Firebase emulator config for local Auth, Firestore, and Hosting testing

## Database schema

See [docs/database-schema.md](docs/database-schema.md).

## Local development

Install dependencies:

```bash
npm install
```

Start Firebase emulators:

```bash
npm run emulators
```

In another terminal, start the Vite dev server:

```bash
npm run dev
```

Open the Vite URL shown in the terminal. In development, the app connects to:

- Auth emulator: `127.0.0.1:9099`
- Firestore emulator: `127.0.0.1:8080`
- Emulator UI: `127.0.0.1:4000`

## Firebase deployment

Create a Firebase web app in the Firebase console, enable Google sign-in, and create a Firestore database. Copy `.env.example` to `.env.local` and fill in the `VITE_FIREBASE_*` values.

Then set the real Firebase project:

```bash
firebase use --add
```

Deploy:

```bash
npm run deploy
```
