# Aleph Agent

Open-source platform to build, test, and deploy AI agents and pipelines — visually. No code required.

Build each agent individually with a visual canvas, test it in real time with built-in debug tools, then compose agents into pipelines to handle complex multi-step workflows.

## Why Aleph Agent?

### Visual canvas — build agents as graphs

Each agent is a **directed graph**: tasks, tools, and routing conditions connected visually on a canvas. No config files, no code — drag, connect, done. The graph is the source of truth at runtime.

### Prompt layers — full control over context

Every LLM call stacks prompts in a fixed, predictable order:

```
1. Pipeline prompt    → shared identity, tone, global rules
2. Agent prompt       → the agent's personality and role
3. Task prompt        → current objective (added/removed dynamically)
4. Tools              → recomputed on each task transition
5. Memory             → summary of compacted history
6. History            → recent conversation messages
```

Each layer adds context without overwriting the others. When a task ends, its prompt and tools are cleanly removed — the agent doesn't carry stale instructions.

### Test in real time — built-in debug chat

Every agent and pipeline ships with a **chat simulator + debug panel**. On each exchange you see in real time:

- **Exact context** sent to the LLM (every prompt layer, token by token)
- **Real-time token tracking** — input tokens (prompt + context + history) and output tokens (response + tool calls), cumulative across the session + message count. Know exactly what you're spending at every moment, before it hits your bill
- **Debug timeline**: task activations, tool calls with arguments and results, condition evaluations (variable, operator, expected value, TRUE/FALSE), context compaction, handoffs
- **Live streaming** — watch the agent think and act as it happens

No guesswork. You see exactly what the LLM receives, how it decides, and what it costs.

### Reuse agents in pipelines

A **pipeline** orchestrates multiple agents with no LLM of its own — it's a pure router. Any agent can transfer to any other via **handoff tools**. The pipeline adds:

- A **shared prompt** (brand identity, tone, compliance rules) injected into every agent
- **Shared tools** accessible to all agents (search, FAQ, CRM lookup...)
- **Routing safety**: max 5 agent switches per request to prevent infinite loops

Example: `Reception Agent → Support Agent → Billing Agent` — each specialized, all sharing the same voice.

### Maximum context control

You decide exactly what each agent knows at every moment:

- **Sliding window**: keep only the last N turns, with automatic summarization of older messages
- **Handoff transfer modes**: choose per connection what the next agent receives
  - `full` — entire history + all variables + memory
  - `extracted` — only structured data from extraction tools
  - `none` — clean slate, the next agent knows nothing
- **Orphaned tool call cleanup**: after interruptions, the engine automatically removes incomplete tool calls to keep the context valid

### Context cleanup

The engine handles interruptions gracefully:

- User sends a new message mid-response → the stream is cut, partial text saved, incomplete tool calls discarded
- On restart, `cleanOrphanedToolCalls()` sanitizes the history
- The previous request always saves state before releasing control — no corruption, no lost data

### Tasks — break workflows into focused steps

Instead of one giant prompt, split the work into **tasks**. Each task has its own prompt and its own tools, active only while the task runs. When a task completes (via its `exit_condition` tool), the engine evaluates canvas conditions and routes to the next step — or returns control to the base system prompt.

The LLM only sees what it needs for the current objective. Less noise, better focus.

### Conditional routing

Route between tasks based on runtime variables:

```
extraction.validator.valid == "true"  → next_task
extraction.validator.valid != "true"  → fallback_task
```

Supports `==`, `!=`, `>`, `<`, `>=`, `<=`, `contains`. Routes without conditions serve as fallbacks.

### Deploy via API

Expose any agent or pipeline as a REST API with **SSE streaming**:

```
POST /api/v1/chat
Authorization: Bearer ak-...
```

Rate limiting, usage tracking (requests, sessions, last used), version pinning — all built in. A copy-paste ready JS client class is included in the docs.

---

## Quick Start

**Prerequisites:** [Docker](https://docs.docker.com/get-docker/) and [Docker Compose](https://docs.docker.com/compose/install/).

```bash
# 1. Clone
git clone https://github.com/aleph-software-com/Aleph-Agent.git
cd Aleph-Agent

# 2. Configure
cp backend/.env.example backend/.env
# Set ENCRYPTION_KEY (used to encrypt provider API keys):
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Paste the output as ENCRYPTION_KEY in backend/.env

# 3. Launch
docker compose up
```

Three services start automatically:

| Service      | URL                   | Description              |
| ------------ | --------------------- | ------------------------ |
| **Frontend** | http://localhost:5173 | React UI (Vite dev)      |
| **Backend**  | http://localhost:3001 | Node/Express API         |
| **Postgres** | localhost:5432        | PostgreSQL 16 + pgvector |

The database schema is created automatically on first launch.

Open http://localhost:5173 and start building.

## Project Structure

```
alephAgent/
├── docker-compose.yml       # Orchestrates all 3 services
├── init-db/                 # SQL run on first DB boot
│   ├── 01-schema.sql
│   └── 02-seed.sql
├── backend/                 # Node.js + Express + TypeScript
│   └── src/
│       ├── server.ts        # Entry point
│       ├── engine/          # Agent execution engine (LLM loop, tools, pipeline, canvas)
│       ├── api/             # Route handlers
│       ├── queries/         # SQL modules
│       └── types/           # TypeScript interfaces
└── frontend/                # React + Vite + Tailwind
    └── src/
        ├── pages/           # Agents, Pipelines, Chat, API Keys
        ├── components/      # UI + built-in documentation
        └── contexts/        # React contexts
```

## License

MIT
