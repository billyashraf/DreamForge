# DreameForge

A full-stack text MMORPG built with Next.js 15, MongoDB, and Zustand. Players choose a Shadow Form, explore a sci-fi world across four locations, complete missions, join guilds, upgrade a Curse Tree, and advance through the Academy.

---

## Quick Start

```bash
npm install
cp .env.local.example .env.local   # set MONGODB_URI and JWT_SECRET
npm run dev
```

Then seed the database (creates all accounts, guilds, teams, missions):

```
POST http://localhost:3000/api/seed
```

Or just click **PLAY AS NOVA** / **ADMIN VIEW** on the login page — those buttons auto-seed on first use.

---

## Test Accounts

> Password requirements: 8+ characters, at least 1 uppercase, at least 1 number.

### Demo Accounts (auto-created on first demo login)

| Account | Email | Password | Role | Character | Location | Shadow Form |
|---------|-------|----------|------|-----------|----------|-------------|
| Demo Player | demo@dreamforge.com | DemoPlay3r! | player | Nova L8 | Moon Junkyard | Lancer |
| Demo Admin | admin@dreamforge.com | AdminF0rge! | admin | Overseer L20 | Mars | Assassin |

### Test Accounts (created via POST /api/seed)

| Username | Email | Password | Role | Character | Level | Location | Shadow Form | Access |
|----------|-------|----------|------|-----------|-------|----------|-------------|--------|
| Rookie_Rex | rookie@dreamforge.com | TestR00kie! | player | Rex | 3 | Metapolis | Saber | Missions |
| Scout_Lyra | scout@dreamforge.com | TestSc0ut! | player | Lyra | 6 | Moon Junkyard | Archer | Moon + Earth travel |
| Ranger_Kade | ranger@dreamforge.com | TestR4nger! | player | Kade | 8 | Earth | Rider | Academy |
| Veteran_Zara | veteran@dreamforge.com | TestVet3ran! | player | Zara | 14 | Mars | Caster | Mars + Guilds |
| Mod_Cassius | mod@dreamforge.com | TestM0d123! | moderator | Cassius | 20 | Metapolis | Assassin | All content + all locations |

---

## Shadow Form Access Map

Each form unlocks specific content. Choose your form at /shadow-form.

| Form | Unlocks |
|------|---------|
| Saber | Missions |
| Lancer | Commit Log |
| Rider | Academy |
| Caster | Mars travel + Guild Hall |
| Berserker | Mars travel |
| Archer | Moon Junkyard + Earth travel |
| Assassin | Everything (all content + all locations) |

---

## Dummy Data (seeded via POST /api/seed)

### Guilds

| Name | Tag | Mars Rating | Description |
|------|-----|------------|-------------|
| Iron Vanguard | IV | 850 | Elite scavengers and warriors |
| Void Walkers | VW | 620 | Arcane scholars of the cosmos |
| Steel Brotherhood | SB | 1100 | The strongest blades on Mars |
| Shadow Compact | SC | 740 | Precision, silence, results |
| Red Horizon | RH | 1450 | Masters of Mars territory warfare |

### Teams

| Name | Activity | Leader |
|------|----------|--------|
| Dome Patrol Unit | metapolis patrol | Rex |
| Junkyard Wolves | junkyard scavenging | Lyra |
| Earth Reclamation | earth exploration | Kade |
| Mars Vanguard | mars territory | Zara |

---

## API Routes

| Method | Route | Description |
|--------|-------|-------------|
| POST | /api/seed | Seed everything (idempotent) |
| POST | /api/auth/register | Register new account |
| POST | /api/auth/login | Login |
| POST | /api/auth/demo | One-click demo login |
| POST | /api/auth/logout | Logout |
| GET | /api/auth/me | Current session |
| GET/POST | /api/character | Get or create character |
| GET | /api/missions | List missions at current location |
| POST | /api/missions/accept | Accept and run a mission |
| GET/POST | /api/guilds | List guilds / create guild |
| POST | /api/guilds/join | Join a guild |
| GET/POST | /api/teams | List teams / create team |
| GET | /api/curse-tree | Get curse tree data |
| POST | /api/curse-tree | Upgrade/boost curse skill |
| GET | /api/academy | Get academy tree data |
| POST | /api/academy | Unlock/upgrade academy field |
| GET/POST | /api/shadow-form | Get or set shadow form |
| POST | /api/travel | Travel to a location |
| GET | /api/commits | Live GitHub commit feed |
| GET | /api/admin/stats | Admin stats (admin/mod only) |
| GET/PATCH | /api/admin/users | Manage users (admin/mod only) |
| GET/POST/DELETE | /api/admin/missions | Manage missions (admin/mod only) |

---

## Stack

- Frontend: Next.js 15 App Router, Tailwind CSS, Zustand
- Backend: Next.js Route Handlers, Mongoose/MongoDB
- Auth: JWT httpOnly cookies, 7-day expiry
- Canvas: Curse Tree + Academy with zoom/pan and Reingold-Tilford layout
