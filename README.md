# Tic-Tac-Toe Game

A full-stack Tic-Tac-Toe game with AI opponent, user authentication, and a leaderboard.

## Modules

### 1. Backend (`server/`)

Express.js REST API with SQLite database, JWT authentication, and game/leaderboard endpoints.

#### Tech Stack
- **Runtime:** Node.js with TypeScript
- **Framework:** Express.js
- **Database:** SQLite (via `better-sqlite3`)
- **Auth:** JWT (via `jsonwebtoken`) + bcryptjs password hashing

#### API Endpoints

| Method | Endpoint              | Description              | Auth Required |
|--------|-----------------------|--------------------------|---------------|
| POST   | `/api/auth/register`  | Register a new user      | No            |
| POST   | `/api/auth/login`     | Login and get JWT token  | No            |
| GET    | `/api/auth/me`        | Get current user info    | Yes           |
| POST   | `/api/games`          | Save a game result       | Yes           |
| GET    | `/api/games/history`  | Get user game history    | Yes           |
| GET    | `/api/leaderboard`    | Get leaderboard rankings | No            |
| GET    | `/api/health`         | Health check             | No            |

#### Running the Backend

```bash
cd server
npm install
npm run dev        # Development with hot-reload
# or
npm run build && npm start   # Production
```

The server runs on `http://localhost:3001` by default (configurable via `PORT` env).

---

### 2. Frontend (`client/`)

React single-page application with Vite, including game board, AI opponent, and leaderboard pages.

#### Tech Stack
- **Framework:** React 18 with TypeScript
- **Build Tool:** Vite
- **Routing:** react-router-dom v6
- **AI:** Custom minimax algorithm for computer opponent

#### Pages
- **Login / Register** — Authentication forms
- **Game** — Play Tic-Tac-Toe against AI (protected route)
- **Leaderboard** — View player rankings with win rates

#### Running the Frontend

```bash
cd client
npm install
npm run dev        # Development server (default: http://localhost:5173)
# or
npm run build && npm run preview   # Production preview
```

In development, the Vite dev server proxies `/api` requests to the backend (configurable in `vite.config.ts`).

---

### How Frontend and Backend Connect

1. The frontend sends API requests to `/api/*` endpoints.
2. The Vite dev server proxies `/api` calls to `http://localhost:3001` (the backend).
3. Authentication is handled via JWT tokens stored in `localStorage`.
4. Each API request includes a `Bearer <token>` header for protected endpoints.
5. Game results are saved to the backend after each match, and the leaderboard is fetched from the backend.

---

## Project Structure

```
.
├── .gitignore
├── .gitkeep
├── README.md
├── client/                          # Frontend (React + Vite)
│   ├── index.html                   # HTML entry point
│   ├── package.json                 # Frontend dependencies
│   ├── tsconfig.json                # TypeScript config
│   ├── vite.config.ts               # Vite config with API proxy
│   └── src/
│       ├── main.tsx                 # React entry point
│       ├── App.tsx                  # Root component with routing
│       ├── App.css                  # Application styles
│       ├── types.ts                 # Shared TypeScript types
│       ├── vite-env.d.ts            # Vite type declarations
│       ├── ai/
│       │   └── minimax.ts           # AI opponent (minimax algorithm)
│       ├── api/
│       │   └── client.ts            # API client (fetch wrapper)
│       ├── components/
│       │   ├── Board.tsx            # Game board component
│       │   └── Cell.tsx             # Individual cell component
│       ├── context/
│       │   └── AuthContext.tsx       # Authentication context
│       └── pages/
│           ├── LoginPage.tsx        # Login page
│           ├── RegisterPage.tsx     # Registration page
│           ├── GamePage.tsx         # Game play page
│           └── LeaderboardPage.tsx  # Leaderboard page
└── server/                          # Backend (Express + SQLite)
    ├── package.json                 # Backend dependencies
    ├── tsconfig.json                # TypeScript config
    └── src/
        ├── index.ts                 # Express server entry point
        ├── db.ts                    # SQLite database setup
        ├── types.ts                 # Shared TypeScript types
        ├── middleware/
        │   └── auth.ts              # JWT authentication middleware
        └── routes/
            ├── auth.ts              # Auth routes (register/login/me)
            ├── games.ts             # Game routes (save/history)
            └── leaderboard.ts       # Leaderboard route
```

## Testing

### Backend Tests
```bash
cd server
npm test          # (if test script is configured)
```

### Frontend Tests
```bash
cd client
npm test          # (if test script is configured)
```

## Environment Variables

Create a `.env` file in the `server/` directory:

```
PORT=3001
JWT_SECRET=your-secret-key
DATABASE_PATH=./data/game.db
```
