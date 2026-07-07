# PairSpace

Disposable real-time collaborative coding rooms for interviews and pair programming.

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Online-blue)](https://pairspace.up.railway.app/)
[![Made with Next.js](https://img.shields.io/badge/Made%20with-Next.js-black)](https://nextjs.org)

## Demo



## Overview

PairSpace is a zero-signup collaborative code editor for technical interviews, pair programming, and mentorship sessions. Create an ephemeral room, share the link, and both people are inside the same editor in seconds without accounts or setup. When a session ends, PairSpace can generate a shareable replay link so the session can be reviewed later.

## Features

- Real-time collaborative editing via Yjs CRDT
- Multi-language support: Python, JavaScript, TypeScript, Java, C++, Go
- Code execution via OnlineCompiler API
- Session replay: full event log accessible via shareable link after session ends
- Ephemeral rooms: auto-expire after inactivity
- Role-based access: Host, Editor, Viewer
- Live chat with unread message badges
- Shared notes tab (`notes.md`)
- Session timer with host pause/resume control
- Participant presence with typing and away status
- No signup required on either side

## Tech Stack

| Layer | Technology |
| --- | --- |
| Framework | Next.js 14 + TypeScript |
| Real-time | Socket.IO + Yjs (CRDT) |
| Editor | Monaco Editor |
| Database | PostgreSQL (Neon) via Prisma 7 |
| Code Execution | OnlineCompiler API |
| Styling | Tailwind CSS + shadcn/ui |
| WS Deployment | Railway |
| App Deployment | Vercel |

## Architecture

PairSpace uses a two-service architecture: a Next.js app deployed separately from a standalone WebSocket server. The Next.js app handles pages, API routes, room creation, persistence, code execution, and replay viewing, while the WebSocket server handles Socket.IO events, Yjs document sync, participant presence, timers, chat, and session logging. They are separate because Next.js is commonly deployed in a serverless environment, while WebSockets need persistent long-lived connections.

Yjs powers collaborative editing with a CRDT. Every keystroke becomes a delta operation that can be merged conflict-free across clients, so PairSpace does not need last-write-wins behavior or editor locks.

Session replay is event-based. The WebSocket server maintains an append-only event log during the session. When a room ends, that log is serialized as JSON and written to Postgres. The replay page reads this log and plays it back client-side. It is not a video recording; it is a structured event replay.

Room identity does not use user accounts. The room creator receives a `nanoid` creator token stored in `localStorage`. The WebSocket server validates this token against Postgres on privileged actions such as locking a room, changing roles, kicking users, pausing the timer, or ending the session.

## Getting Started

Prerequisites:

- Node.js 18+
- Docker for local Postgres, or a Neon account
- Git

```bash
# 1. Clone the repo
git clone https://github.com/your-username/pairspace # replace with your GitHub username
cd pairspace

# 2. Install dependencies
npm install
cd ws-server && npm install && cd ..

# 3. Set up environment variables
cp .env.example .env
# add your DATABASE_URL

# 4. Set up .env.local
# add NEXT_PUBLIC_WS_URL and ONLINE_COMPILER_API_KEY

# 5. Run database migrations
npx prisma migrate dev

# 6. Start both servers
# Terminal 1 - Next.js
npm run dev

# Terminal 2 - WebSocket server
cd ws-server && npm run dev

# 7. Open http://localhost:3000
```

## Environment Variables

```bash
# .env - read by Prisma
DATABASE_URL=postgresql://...

# .env.local - read by Next.js
NEXT_PUBLIC_WS_URL=ws://localhost:3001
ONLINE_COMPILER_API_KEY=your_key_here
```

## Project Structure

```txt
pairspace/
├── app/                    # Next.js App Router pages and API routes
│   ├── room/[roomId]/      # Collaborative editor room
│   ├── replay/[id]/        # Session replay viewer
│   ├── join/[roomId]/      # Join page for shared links
│   └── api/                # REST API routes
├── components/
│   ├── editor/             # Monaco editor component
│   └── room/               # Topbar, RightPanel, ShareModal etc.
├── hooks/                  # useSocket, useYjs
├── lib/                    # Prisma client, editor config, utilities
├── types/                  # Shared TypeScript types
├── ws-server/              # Standalone WebSocket + Yjs server
│   ├── index.ts            # Server entry point
│   ├── sessionLogger.ts    # Append-only event log
│   └── handlers/           # Modular socket event handlers
└── prisma/                 # Schema and migrations
```

## Deployment

Deploy PairSpace as two separate services.

### WebSocket Server - Railway

- Set the root directory to `ws-server/`.
- Railway auto-detects Node.js and runs `npm run build` then `npm start`.
- Add this environment variable:

```bash
NEXT_PUBLIC_APP_URL=https://your-vercel-url.vercel.app
```

### Next.js App - Vercel

- Connect the GitHub repo.
- Vercel auto-detects Next.js.
- Add these environment variables:

```bash
NEXT_PUBLIC_WS_URL=wss://your-railway-url.up.railway.app
DATABASE_URL=your-neon-connection-string
ONLINE_COMPILER_API_KEY=your-key
```
