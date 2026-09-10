# PairLab Task Board

A minimal single-user task board built as the PAIRLAB vertical slice.

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

The integration tests exercise the real HTTP API for task creation, listing, updates, deletion, validation, and persistence across a server process restart.

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

The title must be a non-empty string after trimming whitespace.

### `PATCH /api/tasks/:id`

Updates one or both supported fields: `title` and `completed`.

Examples:

```json
{"completed":true}
```

```json
{"title":"Updated task","completed":false}
```

If `title` is supplied, it must be a non-empty string after trimming whitespace. If `completed` is supplied, it must be a boolean. An empty patch is rejected with HTTP 400. A missing task returns HTTP 404.

### `DELETE /api/tasks/:id`

Deletes the task and returns the deleted task. A missing task returns HTTP 404.

## Persistence

The JSON file remains the persistence layer for TASK-002. POST, PATCH, and DELETE all rewrite the file using a temporary file followed by rename. Integration tests stop the server, restart it with the same `DATA_FILE`, and verify the resulting task list is preserved.

## Scope

TASK-002 intentionally excludes authentication, multi-user support, database migration, SQLite, realtime updates, search/filtering, pagination, Docker, deployment infrastructure, framework migration, UI redesign, AI features, and PAIRFLOW/PCM changes.
