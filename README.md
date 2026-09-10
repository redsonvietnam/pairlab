# PairLab Task Board

A minimal single-user task board built as the PAIRLAB TASK-001 vertical slice.

## Stack

- Node.js 20+ built-in HTTP server
- Browser HTML/CSS/JavaScript
- JSON file persistence
- Node.js built-in test runner
- GitHub Actions CI

No runtime or test dependencies are required.

## Architecture

```text
Browser
  ↓
Frontend (public/)
  ↓ HTTP /api/tasks
Backend (server.js)
  ↓
Persistent JSON file (data/tasks.json)
```

The frontend calls the real HTTP API. Tasks are written to persistent storage using an atomic temporary-file-and-rename update, so data survives page reloads and server process restarts.

## Requirements

- Node.js 20 or newer

## Install

```bash
npm install
```

There are no third-party dependencies; `npm install` is kept as the standard setup step for CI and local use.

## Run

```bash
npm start
```

Open <http://localhost:3000>.

The default persistent data file is `data/tasks.json`. Set `DATA_FILE` to use another location, for example in tests or a local experiment.

## Test

```bash
npm test
```

The integration tests exercise `GET /api/tasks`, `POST /api/tasks`, validation, and persistence across a server process restart.

## API

### `GET /api/tasks`

Returns the persisted task array.

### `POST /api/tasks`

Request:

```json
{"title":"Example task"}
```

Response:

```json
{
  "id": "uuid",
  "title": "Example task",
  "completed": false,
  "createdAt": "2026-09-10T00:00:00.000Z"
}
```

## Scope

TASK-001 intentionally excludes authentication, multi-user support, realtime updates, advanced UI, deployment infrastructure, AI features, PAIRFLOW/PCM changes, and other non-essential product features.
