# DreameForge

A browser-based text MMORPG spanning three worlds: **Moon**, **Earth**, and **Mars**.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16 (App Router) |
| Styling | Tailwind CSS v4 |
| Database | MongoDB via Mongoose |
| Auth | JWT + HTTP-only cookies |
| Validation | Zod v4 |
| State | Zustand |
| Deployment | Vercel + MongoDB Atlas |

## Getting Started

### 1. Clone and install

```bash
git clone <your-repo>
cd dreameforge
npm install
```

### 2. Configure environment

Copy `.env.local` and fill in your values:

```env
MONGODB_URI=mongodb+srv://<user>:<pass>@<cluster>.mongodb.net/dreameforge
JWT_SECRET=<random-32+-char-string>
```

### 3. Seed the database

Start the dev server, then POST to `/api/seed` to populate initial missions and items:

```bash
npm run dev
# In another terminal:
curl -X POST http://localhost:3000/api/seed
```

### 4. Run

```bash
npm run dev   # Development
npm run build # Production build
npm start     # Production server
```

## World Overview

### Moon - Home Base
- **Metapolis**: The iron-dome megacity. Training, trading, missions.
- **Moon Junkyard**: Dangerous scrapyard outside the dome. Scavenging & expeditions.

### Earth - Exploration
- Post-apocalyptic wasteland. Story missions, survivor rescues, resource runs.
- Requires Level 5 + 200 credits travel cost.

### Mars - PvP
- Persistent open-world battle royale. Guild raids, territory control.
- Requires Level 10 + 350 credits travel cost.

## Core Gameplay Loop

1. Register -> Login -> Create character
2. Spawn in Metapolis
3. Accept missions from the Mission Board
4. Complete missions -> earn XP + Credits
5. Level up -> unlock new locations
6. Travel to Earth or Mars
7. Join or create a Guild/Team
8. Repeat

## API Reference

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/logout` | Logout |
| GET | `/api/auth/me` | Current session |

### Game
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/character` | Get character |
| POST | `/api/character` | Create character |
| POST | `/api/travel` | Travel to location |
| GET | `/api/missions` | List available missions |
| POST | `/api/missions/accept` | Complete a mission |
| GET | `/api/guilds` | List guilds |
| POST | `/api/guilds` | Create guild |
| POST | `/api/guilds/join` | Join guild |
| GET | `/api/teams` | List teams |
| POST | `/api/teams` | Create team |

### Admin
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/stats` | Dashboard stats |
| GET/PATCH | `/api/admin/users` | Manage users |
| GET/POST/PUT/DELETE | `/api/admin/missions` | Manage missions |

## Roles

| Role | Access |
|------|--------|
| player | Game features |
| moderator | Admin panel (limited) |
| admin | Full admin panel |

## Deployment

### Vercel
1. Push to GitHub
2. Import project on Vercel
3. Add environment variables (`MONGODB_URI`, `JWT_SECRET`)
4. Deploy

### MongoDB Atlas
1. Create a free cluster at mongodb.com/atlas
2. Add your Vercel IP to the allowlist (or use 0.0.0.0/0)
3. Copy the connection string to `MONGODB_URI`

## Development Roadmap

- [x] Phase 1 - Project Setup
- [x] Phase 2 - Authentication
- [x] Phase 3 - Core Gameplay (Metapolis, Travel, Characters)
- [x] Phase 4 - Activities (Missions, Moon/Earth/Mars)
- [x] Phase 5 - Social Systems (Guilds, Teams)
- [x] Phase 6 - Admin Panel
- [ ] Phase 7 - Polish, balancing, testing
- [ ] Chat system
- [ ] Inventory and marketplace
- [ ] Mars Chess Battle Royale mechanics
- [ ] Email verification

## Branch Strategy

```
main            - production-ready
develop         - integration branch
feature/*       - individual features
fix/*           - bug fixes
```
