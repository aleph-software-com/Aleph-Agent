# Aleph Agent

Open-source platform to build, configure, and deploy AI agents and pipelines with a visual interface.

## Quick Start

**Prerequisites:** [Docker](https://docs.docker.com/get-docker/) and [Docker Compose](https://docs.docker.com/compose/install/) installed.

### 1. Clone the repository

```bash
git clone <repo-url>
cd alephAgent
```

### 2. Configure environment

```bash
cp backend/.env.example backend/.env
```

Open `backend/.env` and set your `ENCRYPTION_KEY` (used to encrypt provider API keys stored in the database):

```bash
# Generate a random key:
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Paste the output as the value of `ENCRYPTION_KEY` in `backend/.env`.

### 3. Launch

```bash
docker compose up
```

That's it. Three services start automatically:

| Service      | URL                      | Description              |
| ------------ | ------------------------ | ------------------------ |
| **Frontend** | http://localhost:5173    | React UI (Vite dev)      |
| **Backend**  | http://localhost:3001    | Node/Express API         |
| **Postgres** | localhost:5432           | PostgreSQL 16 + pgvector |

The database schema is created automatically on first launch — no manual migration needed.

### 4. Start building

Open http://localhost:5173 in your browser. From there you can:

- Create and configure **AI agents** (LLM model, system prompt, tools, knowledge base)
- Build **pipelines** to chain multiple agents together
- Test agents in the built-in **chat playground**
- Manage **API keys** to integrate agents into your apps

## Project Structure

```
alephAgent/
├── docker-compose.yml       # Orchestrates all 3 services
├── init-db/                 # SQL run automatically on first DB boot
│   ├── 01-schema.sql        # Tables: agents, agent_versions, pipelines, pipeline_versions
│   └── 02-seed.sql          # Seed data (empty for now)
├── backend/                 # Node.js + Express + TypeScript API
│   ├── .env.example         # Environment template
│   ├── Dockerfile
│   ├── package.json
│   └── src/
│       ├── server.ts        # Express entry point
│       ├── router.ts        # API routes
│       ├── db.ts            # PostgreSQL connection pool
│       ├── engine/          # Agent execution engine (LLM, tools, pipeline)
│       ├── api/             # Route handlers
│       ├── queries/         # SQL query modules
│       └── types/           # TypeScript interfaces
└── frontend/                # React + Vite + Tailwind
    ├── Dockerfile
    ├── package.json
    └── src/
        ├── App.tsx          # Router and layout
        ├── pages/           # Main pages (Agents, Pipelines, Chat, API Keys)
        ├── components/      # UI components
        ├── lib/             # API client and utilities
        └── contexts/        # React contexts
```

## Environment Variables

| Variable         | Required | Description                                      |
| ---------------- | -------- | ------------------------------------------------ |
| `ENCRYPTION_KEY` | Yes      | 32-byte hex key for AES-256-GCM encryption       |

API keys (OpenAI, etc.) are configured directly per-agent in the UI.

## License

MIT
