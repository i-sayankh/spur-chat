# Spur — AI Live Chat Agent — Build Spec

> **Purpose of this document.** This is a complete, self-contained build specification for a take-home assignment. It is meant to be fed to a fresh Claude Code session pointed at an **empty git repository**. That session should build the entire project from scratch by following this spec top to bottom. Everything needed — decisions, rationale, structure, schema, API contract, prompt content, guardrails, deployment, and a definition-of-done — is here.

---

## 0. TL;DR for the building session

Build a small full-stack app: a customer-support **live chat widget** where an AI agent answers questions about a fictional e-commerce store using the **OpenAI API**. Persist every message to **Postgres**. Clean separation of concerns is the primary thing being evaluated — *how* it's built matters more than feature count.

**Stack (locked):**

| Concern | Choice |
| --- | --- |
| Backend | Node.js + TypeScript + Express |
| Frontend | React + Vite + TypeScript |
| Database | PostgreSQL (Neon in prod) via Prisma |
| LLM | OpenAI (`openai` SDK) |
| Repo | Monorepo, npm workspaces |
| Validation | zod |
| Backend host | Render or Railway |
| Frontend host | Vercel |

**Do NOT** integrate Shopify / WhatsApp / Instagram / Facebook. Only the LLM integration is real.

---

## 1. What "good" looks like (evaluation criteria — build toward these)

The reviewer will judge:

1. **Correctness** — chat works end-to-end, answers are sane, conversations persist, basic errors handled.
2. **Code quality** — clean, idiomatic TypeScript; clear separation (routes / controllers / services / repositories / UI); sensible naming; no foot-guns.
3. **Architecture & extensibility** — easy to see where to plug *more channels* (WhatsApp, IG) or *more tools*; LLM integration nicely encapsulated; schema makes sense.
4. **Robustness** — doesn't break on weird input or bad network; errors handled and surfaced cleanly; no "one tiny change explodes everything."
5. **Product & UX sense** — chat feels intuitive; answers phrased like a helpful support agent; feels like a real slice of a product.

Every design decision below traces back to one of these. When in doubt, optimize for **clarity and clean boundaries** over cleverness or extra features.

---

## 2. Architecture decisions & rationale

These were deliberated and chosen. Do not second-guess them; implement them.

- **Monorepo (npm workspaces).** One repo, one submission link, side-by-side review. A small `shared/` package holds the request/response TypeScript types so the frontend and backend cannot drift — the frontend imports the *same* DTO types the backend validates. Signals "thinks about contracts." If workspace wiring causes deploy friction, the fallback is a single duplicated `types.ts` — but start with the workspace.
- **LLM behind a provider interface.** The OpenAI call sits behind an `LLMProvider` interface (`generateReply(history, userMessage)`). Swapping providers = one new file. This directly answers the "is the LLM integration nicely encapsulated?" criterion.
- **Channel-agnostic core.** The live-chat channel only touches the route/controller layer. `chat.service` knows nothing about HTTP or channels. Adding WhatsApp/IG later = a new route reusing the same service. This answers "easy to plug more channels?"
- **Repository layer isolates Prisma.** All DB access lives in `repositories/`. Services never call Prisma directly. Swappable persistence, testable services.
- **FAQ as a versioned TS module, not DB rows.** The store's domain knowledge lives in `knowledge/store-faq.ts` and is injected into the system prompt. The brief explicitly allows hardcoding; this is simpler and version-controlled. Note the DB-backed/RAG alternative in the README "if I had more time" section.
- **zod everywhere at boundaries.** Request validation and environment validation. Fail fast on bad env at boot; never trust request input.

---

## 3. Final repo structure

```
spur-chat/
├── package.json                 # npm workspaces root; convenience scripts
├── README.md
├── .gitignore
├── .nvmrc                        # pin Node version (e.g. 20)
├── shared/
│   ├── package.json
│   └── src/
│       └── types.ts             # ChatMessage, ChatRequest, ChatResponse, Sender
├── server/
│   ├── package.json
│   ├── tsconfig.json
│   ├── .env.example
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── seed.ts
│   └── src/
│       ├── index.ts             # boot: load env, start listening
│       ├── app.ts               # express app assembly (no listen) — testable
│       ├── config/
│       │   └── env.ts           # zod-validated env; throws if missing keys
│       ├── routes/
│       │   └── chat.routes.ts
│       ├── controllers/
│       │   └── chat.controller.ts
│       ├── services/
│       │   ├── chat.service.ts
│       │   └── llm/
│       │       ├── llm.types.ts        # LLMProvider interface + types
│       │       ├── openai.provider.ts  # OpenAI implementation
│       │       └── index.ts            # factory: pick provider from env
│       ├── repositories/
│       │   └── conversation.repo.ts    # all Prisma access
│       ├── knowledge/
│       │   └── store-faq.ts             # fictional store knowledge
│       ├── prompt/
│       │   └── system-prompt.ts         # builds system prompt from FAQ
│       └── middleware/
│           ├── validate.ts              # zod request validation middleware
│           └── error.ts                 # central error handler
└── web/
    ├── package.json
    ├── tsconfig.json
    ├── vite.config.ts
    ├── index.html
    ├── .env.example
    └── src/
        ├── main.tsx
        ├── App.tsx
        ├── components/
        │   ├── ChatPanel.tsx
        │   ├── MessageList.tsx
        │   ├── MessageBubble.tsx
        │   └── ChatInput.tsx
        ├── hooks/
        │   └── useChat.ts
        ├── lib/
        │   └── api.ts                   # typed fetch wrapper
        └── styles.css
```

---

## 4. Build order (keep it demoable at every step)

Implement in this sequence. After each step the app should be in a runnable/verifiable state.

1. **Scaffold monorepo.** Root `package.json` with workspaces `["shared", "server", "web"]`. Create `shared/` with the DTO types first — both sides depend on it. Add `.gitignore` (node_modules, dist, `.env`, `*.db`).
2. **Prisma + DB.** `schema.prisma` (§6), local Postgres or Neon `DATABASE_URL`, run `prisma migrate dev`, write `seed.ts` (creates nothing required — seed is optional for this schema; if used, seed a sample conversation). Generate client.
3. **Backend skeleton with a STUB LLM.** Wire `app.ts`, env validation, routes → controller → service → repository. `LLMProvider` returns a canned echo reply. Prove `POST /chat/message` persists user + AI messages and returns `{ reply, sessionId }`. Verify with curl.
4. **Real OpenAI provider.** Implement `openai.provider.ts` behind the interface. Inject system prompt + FAQ + last-N history. Confirm real answers.
5. **Frontend chat UI.** Build the React widget against the live API. localStorage `sessionId`, history rehydration on load, auto-scroll, typing indicator, disabled-while-sending.
6. **Guardrails pass.** Input validation, length cap/truncation, LLM error mapping, central error middleware, CORS. Try to break it.
7. **Deploy.** Neon → Render/Railway (server) → Vercel (web). Wire env + CORS.
8. **README + polish.** All required README sections (§12).

---

## 5. Shared types (`shared/src/types.ts`)

The contract both sides import. Keep it minimal and authoritative.

```ts
export type Sender = "user" | "ai";

export interface ChatMessage {
  id: string;
  sender: Sender;
  text: string;
  createdAt: string; // ISO string over the wire
}

export interface ChatRequest {
  message: string;
  sessionId?: string;
}

export interface ChatResponse {
  reply: string;
  sessionId: string;
}

export interface MessagesResponse {
  messages: ChatMessage[];
}

export interface ApiError {
  error: string; // user-safe message
}
```

> Note: Prisma's `Sender` enum is `USER | AI` in the DB; map to the lowercase wire form `"user" | "ai"` at the repository/controller boundary.

---

## 6. Data model (`server/prisma/schema.prisma`)

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Conversation {
  id        String    @id @default(uuid())
  createdAt DateTime  @default(now())
  metadata  Json?     // channel, userAgent, etc. — future-proofing for multi-channel
  messages  Message[]
}

model Message {
  id             String       @id @default(uuid())
  conversationId String
  conversation   Conversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)
  sender         Sender
  text           String
  createdAt      DateTime     @default(now())

  @@index([conversationId, createdAt])
}

enum Sender {
  USER
  AI
}
```

- The `sessionId` returned to the client **is** `Conversation.id`.
- The composite index keeps history fetch ordered and fast.
- `onDelete: Cascade` keeps cleanup simple.
- `metadata` is unused now but signals multi-channel awareness.

---

## 7. API contract

| Method | Path | Body / Params | Success response |
| --- | --- | --- | --- |
| `POST` | `/chat/message` | `{ message: string, sessionId?: string }` | `200 { reply, sessionId }` |
| `GET` | `/chat/:sessionId/messages` | — | `200 { messages: ChatMessage[] }` |
| `GET` | `/health` | — | `200 { status: "ok" }` |

**`POST /chat/message` orchestration (in `chat.service`):**

1. Validate input (zod) — reject empty/whitespace; truncate over-long (see §9).
2. If no `sessionId`, create a `Conversation`; else verify it exists (if not, create fresh and proceed — never 500 on a stale id).
3. Persist the user message.
4. Load recent history (last N=10 messages, chronological).
5. `provider.generateReply(history, userMessage)` with timeout.
6. Persist the AI reply.
7. Return `{ reply, sessionId }`.

**Error responses** are always `{ error: "<user-safe message>" }` with an appropriate 4xx/5xx code. The real error is logged server-side; the client never sees a stack trace.

---

## 8. LLM integration

### 8.1 Provider interface (`services/llm/llm.types.ts`)

```ts
import type { ChatMessage } from "@spur-chat/shared";

export interface LLMProvider {
  generateReply(history: ChatMessage[], userMessage: string): Promise<string>;
}
```

A factory (`services/llm/index.ts`) returns the configured provider based on env (defaults to OpenAI). This is the seam for adding Claude later.

### 8.2 OpenAI provider (`services/llm/openai.provider.ts`)

- Use the official `openai` SDK.
- Model: `gpt-4o-mini` (cheap, fast, good enough for support FAQ). Make it env-overridable (`OPENAI_MODEL`).
- Build messages: `[{ role: "system", content: systemPrompt }, ...historyMappedToRoles, { role: "user", content: userMessage }]`.
- Map history `sender`: `"user" → "user"`, `"ai" → "assistant"`.
- `max_tokens` cap (e.g. 500). Document the assumption.
- Wrap the call in a **timeout** (e.g. 20s via `AbortController` or `Promise.race`) and **try/catch**. Throw a typed `LLMError` that the controller maps to a friendly message. Distinguish at least: invalid/missing key, rate limit (429), timeout, generic network/5xx.

### 8.3 System prompt (`prompt/system-prompt.ts`)

Compose persona + injected FAQ. Keep it tight:

```
You are "Aurora", a friendly and concise customer-support agent for Aurora Goods,
a small online store selling home and lifestyle products.

Guidelines:
- Be warm, clear, and concise. Short paragraphs. No walls of text.
- Answer ONLY using the store information below. If you don't know, say you're
  not sure and offer to connect the customer to a human at support@auroragoods.example.
- Never invent prices, order statuses, or policies that aren't stated.
- Stay on topic: you help with shopping, orders, shipping, returns, and store info.

=== STORE INFORMATION ===
{FAQ block injected here}
```

### 8.4 Store knowledge (`knowledge/store-faq.ts`)

Concrete content so the agent answers reliably. Use this verbatim (or lightly adapt):

```
Store name: Aurora Goods
What we sell: Home goods, kitchenware, candles, stationery, and small gifts.

SHIPPING
- We ship within the USA, Canada, UK, EU, India, and Australia.
- Standard shipping: 3–5 business days (USA), 7–12 business days (international).
- Free standard shipping on orders over $50 (USA) / $80 (international).
- Express shipping (1–2 business days, USA only) available at checkout for $12.
- Orders placed before 2pm ET ship the same business day.

RETURNS & REFUNDS
- 30-day return window from the delivery date.
- Items must be unused and in original packaging.
- Refunds are issued to the original payment method within 5–7 business days of us
  receiving the return.
- Return shipping is free for damaged or incorrect items; otherwise a $5 return
  label fee applies.
- Final-sale items (clearance, personalized goods) are not returnable.

SUPPORT
- Support hours: Monday–Friday, 9am–6pm ET. Closed weekends and US public holidays.
- Email: support@auroragoods.example
- Typical email response time: within 1 business day.

PAYMENTS
- We accept Visa, Mastercard, Amex, Apple Pay, Google Pay, and PayPal.
- Prices are in USD.

ORDERS
- Order changes/cancellations are possible within 1 hour of placing the order.
- A tracking link is emailed once an order ships.
```

Export this as a string (or structured object stringified) and inject into the system prompt.

---

## 9. Robustness & guardrails (the "we'll try to break it" section)

Build all of these:

- **Input validation (zod):** reject empty / whitespace-only `message` → `400 { error: "Message cannot be empty." }`. Validate `sessionId` is a string if present.
- **Length handling:** define `MAX_MESSAGE_CHARS` (e.g. 4000). If exceeded, **truncate** and still respond (don't 500). Optionally surface a soft note. Document the cap.
- **History bound:** only send last N=10 messages to the LLM — token + cost control.
- **LLM failure mapping:** every failure path returns a friendly bubble, e.g. "Sorry, I'm having trouble responding right now. Please try again in a moment." Real error logged server-side. Never leak keys or stack traces.
- **Timeout:** abort LLM calls after ~20s so a hung request can't hang the user.
- **Central error middleware (`middleware/error.ts`):** catches everything, returns structured JSON, keeps the process alive. Express async errors must be forwarded (wrap async handlers or use a helper).
- **CORS:** restrict to the frontend origin via `CORS_ORIGIN` env (allow `*` only in local dev).
- **Secrets:** never committed. `.env` gitignored; `.env.example` committed with placeholder keys. `config/env.ts` validates presence at boot and exits with a clear message if missing.
- **Stale sessionId:** if a client sends a `sessionId` that no longer exists, create a new conversation rather than erroring.

---

## 10. Frontend (React + Vite)

- **`ChatPanel`** — owns chat state via `useChat`; renders `MessageList` + `ChatInput`.
- **`useChat` hook** — `messages`, `isSending`, `error`, `sendMessage()`. On mount, read `sessionId` from `localStorage`; if present, `GET /chat/:sessionId/messages` and rehydrate. On send: optimistically append the user message, POST, append the reply (or an error bubble), persist returned `sessionId`.
- **`MessageList`** — scrollable; auto-scroll to bottom on new message (`useEffect` + ref).
- **`MessageBubble`** — clear visual distinction between `user` (right, accent) and `ai` (left, neutral). Optional avatar/label "Aurora".
- **`ChatInput`** — textarea + send button. **Enter sends**, **Shift+Enter = newline**. Send disabled while `isSending` or input empty.
- **Typing indicator** — show "Aurora is typing…" while `isSending`.
- **`lib/api.ts`** — typed fetch wrapper using `shared` types; base URL from `VITE_API_URL`; throws on non-2xx with the server's `error` message so the UI can show a clean error bubble.
- Keep styling simple and clean (plain CSS or a tiny bit of CSS — no heavy design system required). It should look tidy and intentional, not raw.

---

## 11. Environment variables

**`server/.env.example`:**

```
DATABASE_URL=postgresql://user:password@host/db?sslmode=require
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini
PORT=8080
CORS_ORIGIN=http://localhost:5173
```

**`web/.env.example`:**

```
VITE_API_URL=http://localhost:8080
```

`config/env.ts` must validate `DATABASE_URL` and `OPENAI_API_KEY` with zod and throw a readable error if absent.

---

## 12. README requirements (graded)

The README must include, with exact copy-pasteable commands:

1. **Local run, step by step** — install, set env, run DB migrations, seed, start server, start web.
2. **DB setup** — how to get a Neon/local Postgres URL; `prisma migrate dev` / `prisma migrate deploy`; seed command.
3. **Env config** — every variable from §11 explained.
4. **Architecture overview** — the layering (routes → controllers → services → repositories), the `shared/` types package, and the two extensibility seams (LLM provider interface; channel-agnostic service).
5. **LLM notes** — provider (OpenAI), model, how the system prompt + FAQ + history are assembled, the `max_tokens` / history-window assumptions.
6. **Trade-offs & "If I had more time…"** — e.g. streaming/SSE responses, FAQ in DB + RAG retrieval, automated tests, Redis caching/rate limiting, auth, admin view of conversations.
7. **Deployed URL** — the live Vercel link.

Keep it skimmable: headings, short steps, code blocks.

---

## 13. Deployment

1. **Neon** — create a Postgres project, copy the pooled `DATABASE_URL` (include `sslmode=require`).
2. **Backend → Render or Railway**
   - Root directory: `server/`.
   - Build: install deps, `prisma generate`, `prisma migrate deploy`, compile TS (`tsc`). Optionally `prisma db seed`.
   - Start: `node dist/index.js`.
   - Env: `DATABASE_URL`, `OPENAI_API_KEY`, `OPENAI_MODEL`, `CORS_ORIGIN` (= the Vercel URL), `PORT` (host-provided).
   - Note Render free-tier cold start (~50s) in the README; Railway avoids it.
3. **Frontend → Vercel**
   - Root directory: `web/`.
   - Build: `npm run build`; output `dist`.
   - Env: `VITE_API_URL` = the backend URL.
4. Update `CORS_ORIGIN` to the real Vercel domain and redeploy the backend.

---

## 14. Definition of Done (verify each before submitting)

- [ ] `POST /chat/message` works with and without a `sessionId`; returns `{ reply, sessionId }`.
- [ ] Every user and AI message is persisted; `GET /chat/:sessionId/messages` returns full history in order.
- [ ] Reloading the page rehydrates the conversation from the backend.
- [ ] The agent correctly answers shipping / returns / support-hours questions from the FAQ.
- [ ] Empty message rejected; very long message handled without crashing.
- [ ] Killing/invalidating the OpenAI key produces a friendly error bubble, not a crash or stack trace.
- [ ] No secrets committed; `.env.example` present for both packages.
- [ ] Backend never crashes on bad input (central error handler verified).
- [ ] Frontend: Enter sends, Shift+Enter newlines, send disabled in flight, auto-scroll works, typing indicator shows.
- [ ] CORS restricted to the frontend origin in prod.
- [ ] Deployed: live Vercel URL chats successfully against the live backend + Neon.
- [ ] README complete with all §12 sections and a working deployed link.

---

## 15. Explicit non-goals (do not build)

- No Shopify / WhatsApp / Instagram / Facebook integrations.
- No auth/login.
- No Docker/Kubernetes.
- No design system.
- No streaming, RAG, Redis, or tests unless all of the above is done and time remains — and if added, mention in README rather than letting scope creep hurt clarity.

---

*End of spec. Build in the order of §4. Optimize for clean boundaries and clear code over extra features — that is what is being evaluated.*
