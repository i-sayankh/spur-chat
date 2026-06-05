# Spur — AI Live Chat Agent

A customer-support **live chat widget** where an AI agent ("Aurora") answers
questions about a fictional e-commerce store, **Aurora Goods**, using the OpenAI
API. Every message is persisted to PostgreSQL.

The emphasis is on **clean separation of concerns** and clear extensibility
seams (more channels, more LLM providers) over feature count.

**Live demo:** <https://spur-chat-sable.vercel.app/>

---

## Stack

| Concern   | Choice                                          |
| --------- | ----------------------------------------------- |
| Backend   | Node.js + TypeScript + Express                  |
| Frontend  | React + Vite + TypeScript                       |
| Database  | PostgreSQL (Neon in prod) via Prisma            |
| LLM       | OpenAI (`openai` SDK), `gpt-4o-mini` by default |
| Repo      | Monorepo, npm workspaces                        |
| Validation| zod (request + environment)                     |

---

## Local development

### Prerequisites

- Node.js 20+ (`.nvmrc` pins 20)
- A PostgreSQL database (local, or a free [Neon](https://neon.tech) project)
- An OpenAI API key

### 1. Install

```bash
git clone git@github.com:i-sayankh/spur-chat.git
cd spur-chat
npm install            # installs all workspaces
npm run build:shared   # build the shared types package once
```

### 2. Configure environment

```bash
cp server/.env.example server/.env
cp web/.env.example web/.env
```

Fill in `server/.env` (see [Environment variables](#environment-variables)):

```env
DATABASE_URL=postgresql://user:password@localhost:5432/spur_chat
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini
PORT=8080
CORS_ORIGIN=http://localhost:5173
```

`web/.env`:

```env
VITE_API_URL=http://localhost:8080
```

### 3. Set up the database

```bash
npm run prisma:migrate        # creates tables (prisma migrate dev)
npm run prisma:seed           # optional: seeds one sample conversation
```

### 4. Run

In two terminals:

```bash
npm run dev:server            # http://localhost:8080
npm run dev:web               # http://localhost:5173
```

Open <http://localhost:5173> and chat.

> **Tip:** to run the backend without an OpenAI key (handy for offline dev),
> set `LLM_PROVIDER=stub` in `server/.env`. The stub echoes replies through the
> exact same persistence + request path.

---

## Database setup

This project uses Prisma against PostgreSQL.

- **Local:** create a database and point `DATABASE_URL` at it, e.g.
  `postgresql://postgres:postgres@localhost:5432/spur_chat`.
- **Neon (prod):** create a project, copy the **pooled** connection string, and
  ensure it ends with `?sslmode=require`.

Commands:

```bash
npm run prisma:migrate   # dev: create + apply a migration locally
npm run prisma:deploy    # prod: apply existing migrations (no prompts)
npm run prisma:seed      # optional sample data
```

Schema ([`server/prisma/schema.prisma`](server/prisma/schema.prisma)):

- `Conversation` — `id` (uuid, **this is the `sessionId`**), `createdAt`,
  `metadata` (Json, reserved for multi-channel info).
- `Message` — `id`, `conversationId`, `sender` (`USER | AI`), `text`,
  `createdAt`. Composite index on `[conversationId, createdAt]` for fast,
  ordered history. `onDelete: Cascade` from `Conversation`.

---

## Environment variables

### `server/.env`

| Variable         | Required | Default       | Description                                                       |
| ---------------- | -------- | ------------- | ----------------------------------------------------------------- |
| `DATABASE_URL`   | ✅       | —             | PostgreSQL connection string (add `?sslmode=require` for Neon).   |
| `OPENAI_API_KEY` | ✅       | —             | OpenAI API key. Validated at boot.                                |
| `OPENAI_MODEL`   | —        | `gpt-4o-mini` | OpenAI model to use.                                              |
| `PORT`           | —        | `8080`        | Port the server listens on (host-provided in prod).               |
| `CORS_ORIGIN`    | —        | `*`           | Allowed frontend origin. Set to the Vercel URL in prod.           |
| `LLM_PROVIDER`   | —        | `openai`      | `openai` or `stub` (offline echo provider).                       |

`config/env.ts` validates these with zod at boot and exits with a readable
message if `DATABASE_URL` or `OPENAI_API_KEY` is missing.

### `web/.env`

| Variable       | Required | Default                 | Description           |
| -------------- | -------- | ----------------------- | --------------------- |
| `VITE_API_URL` | —        | `http://localhost:8080` | Base URL of the API.  |

---

## Architecture overview

A monorepo with three workspaces and a strictly layered backend.

```
shared/   → DTO types imported by BOTH server and web (the contract)
server/   → Express API, layered:
            routes → controllers → services → repositories
web/      → React + Vite chat widget
```

### Backend layering

`routes → controllers → services → repositories`

- **routes** ([`chat.routes.ts`](server/src/routes/chat.routes.ts)) — wire HTTP
  paths to controllers; attach validation + async error forwarding.
- **controllers** ([`chat.controller.ts`](server/src/controllers/chat.controller.ts))
  — the **only** layer that speaks HTTP. Extracts/validates input, shapes the
  response. No business logic.
- **services** ([`chat.service.ts`](server/src/services/chat.service.ts)) — the
  **channel-agnostic core**. Orchestrates a chat turn; knows nothing about HTTP
  or which channel the message came from.
- **repositories** ([`conversation.repo.ts`](server/src/repositories/conversation.repo.ts))
  — the **only** place that touches Prisma. Also maps Prisma's `USER | AI` enum
  to the wire form `user | ai`.

### The `shared/` contract

The frontend imports the **same** DTO types (`ChatRequest`, `ChatResponse`,
`ChatMessage`, …) that the backend validates, so the two sides cannot drift.

### Two extensibility seams

1. **LLM provider interface** — every LLM call sits behind
   [`LLMProvider`](server/src/services/llm/llm.types.ts)
   (`generateReply(history, userMessage)`). A
   [factory](server/src/services/llm/index.ts) picks the implementation from
   env. Adding Claude later = one new file + one `case`. (A `stub` provider
   already ships alongside the real `openai` one.)
2. **Channel-agnostic service** — the live-chat channel only touches the
   route/controller layer. Adding WhatsApp/Instagram later = a new route reusing
   the same `chat.service` unchanged. `metadata` on `Conversation` is reserved
   for per-channel info.

---

## LLM notes

- **Provider:** OpenAI via the official `openai` SDK, encapsulated in
  [`openai.provider.ts`](server/src/services/llm/openai.provider.ts).
- **Model:** `gpt-4o-mini` (cheap, fast, sufficient for FAQ support).
  Override with `OPENAI_MODEL`.
- **Prompt assembly:** the system prompt
  ([`system-prompt.ts`](server/src/prompt/system-prompt.ts)) composes Aurora's
  persona with the store FAQ ([`store-faq.ts`](server/src/knowledge/store-faq.ts))
  injected verbatim. The request to OpenAI is
  `[system, ...recentHistory, userMessage]`, with history `sender` mapped to
  roles (`ai → assistant`, `user → user`).
- **Assumptions / bounds:**
  - `max_tokens = 500` on the response (cost + keeps replies support-sized).
  - Only the **last 10 messages** are sent as context (`HISTORY_LIMIT`).
  - Messages over **4000 chars** (`MAX_MESSAGE_CHARS`) are truncated, not rejected.
  - The call is aborted after **20s** so a hung request can't hang the user.
- **Error handling:** failures are classified into a typed `LLMError`
  (`auth | rate_limit | timeout | network`); the controller maps any of them to
  a single friendly bubble. The real error is logged server-side only — the
  client never sees a stack trace or the key.

---

## Robustness

- **Input validation (zod):** empty/whitespace `message` → `400`.
- **Length cap:** over-long messages truncated, never a 500.
- **Malformed JSON / oversized body:** mapped to `400` / `413`, not `500`.
- **Stale `sessionId`:** an unknown id silently starts a fresh conversation.
- **Central error handler:** catches everything, returns structured `{ error }`,
  keeps the process alive; async handler errors are forwarded.
- **CORS:** restricted to `CORS_ORIGIN` (the frontend origin) in prod.
- **Secrets:** `.env` is gitignored; `.env.example` committed; env validated at boot.

---

## Deployment

The repo ships a [`render.yaml`](render.yaml) (backend) and
[`vercel.json`](vercel.json) (frontend). Both deploy **from the repo root** so
npm workspaces resolve `@spur-chat/shared`.

### 1. Database — Neon

Create a Postgres project and copy the **pooled** `DATABASE_URL`
(`...?sslmode=require`).

### 2. Backend — Render (or Railway)

- Root directory: repo root (`.`).
- Build: `npm ci && npm run build:server && npm run prisma:deploy`
- Start: `npm run start --workspace @spur-chat/server`
- Env: `DATABASE_URL`, `OPENAI_API_KEY`, `OPENAI_MODEL`, `CORS_ORIGIN`
  (= the Vercel URL). `PORT` is host-provided.
- Health check: `/health`.
- Note: Render's free tier cold-starts (~50s after idle); Railway avoids this.

### 3. Frontend — Vercel

- Root directory: repo root (`.`).
- Build: `npm run build:web`; output `web/dist` (encoded in `vercel.json`).
- Env: `VITE_API_URL` = the backend URL.

### 4. Final wiring

Set `CORS_ORIGIN` on the backend to the real Vercel domain and redeploy.

---

## Trade-offs & if I had more time

- **No auth (by design).** This is an anonymous support widget. The `sessionId`
  **is** the `Conversation.id` — a v4 UUID (~122 bits of entropy) held in the
  browser's `localStorage`, acting as an unguessable capability token. There is
  no per-user ownership check on `GET /chat/:sessionId/messages`, and a
  `sessionId` isn't bound to an authenticated principal. For a real product I'd
  add auth (or a signed, httpOnly session cookie + an `ownerId` on
  `Conversation` filtered in the repository) so conversations can't be read by
  anyone who obtains the id. `CORS_ORIGIN` defaults to `*` for local-dev
  ergonomics and is set to the exact frontend origin in prod.
- **FAQ is hardcoded.** It lives in a versioned TS module injected into the
  prompt — simple and reviewable. Next step: store knowledge in the DB and
  retrieve relevant chunks via **RAG** instead of injecting the whole block.
- **No streaming.** Replies arrive whole. **SSE/streaming** would make Aurora
  feel snappier.
- **No automated tests.** The layering (pure service, isolated repository,
  provider interface) is built to be testable; I'd add unit tests for the
  service + provider and an integration test for the route.
- **No rate limiting / caching.** Redis-backed rate limiting and response
  caching would harden it for real traffic.
- **No admin view.** A simple dashboard to browse stored conversations would help support.

---

## API reference

| Method | Path                          | Body / Params                          | Success                         |
| ------ | ----------------------------- | -------------------------------------- | ------------------------------- |
| `POST` | `/chat/message`               | `{ message: string, sessionId?: string }` | `200 { reply, sessionId }`   |
| `GET`  | `/chat/:sessionId/messages`   | —                                      | `200 { messages: ChatMessage[] }` |
| `GET`  | `/health`                     | —                                      | `200 { status: "ok" }`          |

Errors are always `{ error: "<user-safe message>" }` with a 4xx/5xx status.
