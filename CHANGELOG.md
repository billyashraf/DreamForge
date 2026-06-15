# Changelog

All notable changes to DreameForge are documented here.

## [0.1.0] - 2026-06-15

### Added

#### Phase 1 - Project Setup
- Initialized Next.js 16 project with TypeScript and Tailwind CSS v4
- Configured MongoDB connection with Mongoose (singleton pattern for serverless)
- Set up JWT authentication library with HTTP-only cookie management
- Configured project folder structure: app, components, models, lib, store, hooks, types

#### Phase 2 - Authentication
- `POST /api/auth/register` - User registration with bcrypt password hashing
- `POST /api/auth/login` - Login with JWT token issuance
- `POST /api/auth/logout` - Logout (clears HTTP-only cookie)
- `GET /api/auth/me` - Session validation endpoint
- Rate limiting on auth endpoints (5 reg/15min, 10 login/15min per IP)
- Login page with error handling
- Register page with validation feedback

#### Phase 3 - Core Gameplay
- Character creation system (one character per account)
- Characters spawn in Metapolis with starter stats (Level 1, 500 credits)
- `POST /api/travel` - Travel between Moon, Earth, and Mars with level/credit requirements
- Dashboard page showing location lore, character panel, travel panel
- Zustand store for global game state (user, character, logs)
- Character panel with HP/Energy/XP progress bars

#### Phase 4 - Activities (Missions)
- `GET /api/missions` - Location-filtered mission list based on character level
- `POST /api/missions/accept` - Mission completion with XP/credit rewards
- Level-up system with stat bonuses on level up
- 10 pre-built missions across all 4 locations (easy to legendary)
- Game log component showing narrative text and reward summaries
- Mission panel with difficulty color-coding and reward display
- `POST /api/seed` - Development-only database seeder (10 missions + 10 items)

#### Phase 5 - Social Systems
- Guild creation (requires Level 5, unique name + 2-5 char tag)
- Guild listing with Mars rating leaderboard
- Guild joining
- Team creation (2-6 players, custom activity)
- Team listing with open/full status
- `GET /api/guilds`, `POST /api/guilds`, `POST /api/guilds/join`
- `GET /api/teams`, `POST /api/teams`

#### Phase 6 - Admin Panel
- `/admin` - Dashboard with game-wide stats (users, characters, missions, guilds, teams)
- `/admin/users` - User management: search, ban/unban, role promotion
- `/admin/missions` - Mission management: create, view all, deactivate
- `GET /api/admin/stats` - Analytics endpoint
- `GET/PATCH /api/admin/users` - User moderation
- `GET/POST/PUT/DELETE /api/admin/missions` - Mission CRUD

#### Database Models
- `User` - Authentication, roles, ban status
- `Character` - Stats, location, guild/team membership, mission tracking
- `Mission` - Content, difficulty, rewards, requirements
- `Item` - Equipment with rarity and stat bonuses
- `Guild` - Organization with Mars rating
- `Team` - Small group for cooperative activities

### Security
- Passwords hashed with bcrypt (cost factor 12)
- JWT stored in HTTP-only, SameSite=Strict cookies (Secure in production)
- Rate limiting on all auth endpoints
- Admin routes protected by role check on every request
- Security headers on all API routes (X-Content-Type-Options, X-Frame-Options)

### Technical
- TypeScript strict mode throughout
- Zod v4 validation on all user inputs
- Mongoose singleton connection pattern for Next.js serverless
- Zero client-side password exposure

---

## Upcoming

- [ ] Real-time chat (WebSocket or polling)
- [ ] Inventory management and item equipping
- [ ] Marketplace for buying/selling items
- [ ] Mars Chess Battle Royale game mechanics
- [ ] Email verification
- [ ] Password reset flow
- [ ] Character skill training mini-games
- [ ] Moon Junkyard expedition system with random encounters
- [ ] Guild bank and treasury
- [ ] Seasonal Mars leaderboards
