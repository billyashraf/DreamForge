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

## Google Authentication Setup

Google sign-in is built in but requires credentials from Google Cloud Console.

### 1. Create OAuth credentials

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Select or create a project
3. Navigate to **APIs & Services → Credentials**
4. Click **Create Credentials → OAuth 2.0 Client ID**
5. Application type: **Web application**
6. Add Authorized redirect URIs:
   - `http://localhost:3000/api/auth/google/callback` (local dev)
   - `https://your-domain.com/api/auth/google/callback` (production)
7. Click **Create** — copy the **Client ID** and **Client Secret**

### 2. Add to .env.local

```env
GOOGLE_CLIENT_ID=xxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxx
```

### 3. How it works

- The **Sign in with Google** button on the login page navigates to `GET /api/auth/google`
- Google redirects back to `GET /api/auth/google/callback` with an auth code
- The server exchanges the code for an access token, fetches the Google user profile, then:
  - **Existing account with same email** — links the Google ID and logs in
  - **Returning Google user** — logs in directly
  - **New user** — creates an account (username derived from Google display name) and redirects to character creation
- A standard JWT session cookie is issued — same auth system as email/password login

> If `GOOGLE_CLIENT_ID` is not set, the button still appears but shows a "not configured" error on click — no crash.

---

## Combat & Survival Systems

### Mission Failure

When a mission fails, the character takes random HP damage scaled to difficulty:

| Difficulty | HP Loss | Fail Chance |
|------------|---------|-------------|
| Easy | 5–15 HP | 10% |
| Medium | 15–35 HP | 25% |
| Hard | 30–60 HP | 40% |
| Legendary | 50–90 HP | 60% |

Failed missions also add Pain (which accumulates into Madness) and cost energy.

### Death System

When HP reaches 0, the character dies (`isDead = true`). The dashboard switches to a death screen — all gameplay is locked until the character respawns.

**Respawn** (`POST /api/respawn`):
- Teleported to Metapolis
- Wakes at 30% max HP
- Pain cleared
- −10% current XP
- −10% current credits

HP can be restored mid-mission by using Red Potions (inventory). Pain can be suppressed with the Sedative.

### Inventory & Consumables

Every account starts with 50 of each consumable. Items are shown as icons on the dashboard.

| Item | Effect | Cooldown | Notes |
|------|--------|----------|-------|
| 💊 Sedative | −50 Pain | 60 min | Instant |
| 🥩 Meat | +300 Energy | None | 3 min eat time |
| 🧪 Red Potion I | +50 HP | None | Instant |
| 🧪 Red Potion II | +150 HP | None | Instant |
| 🧪 Red Potion III | +300 HP | None | Instant |
| 🤍 Revive Potion | Full revive from death | 10 min | Only usable while dead; clears poison; no XP/credit penalty |
| 🖤 Black Potion | Random (see below) | None | Disabled while dead; no cooldown |

**Black Potion outcomes (mutually exclusive roll):**

| Chance | Outcome |
|--------|---------|
| 13% | **Poisoned** — −15 HP/sec for 4 hours. Visible in Character Panel with countdown. |
| 19% | **Sudden death** — instant kill. |
| 38% | **−50% HP** — current HP halved (min 1). |
| 30% | **Double HP** — current HP doubled, capped at max HP. |

### HP Regeneration

Characters naturally regenerate **+2 HP per minute** when not poisoned and not dead, up to `maxHealth`. The rate is tracked via `lastHealthRegen` (same lazy-evaluation pattern as energy regen — damage is accumulated and applied on the next server request).

HP regen is **suspended while poisoned** — poison and regen cancel each other out naturally; poison wins completely at 15 HP/sec.

The Character Panel shows:
- `+2 HP/min` sub-label below the HP bar when regenerating
- `full in Xm` estimated time to full health
- `full` when at max HP
- The sub-label is hidden while poisoned (HP is draining, not regenerating)

### Real-Time Updates

The dashboard polls `/api/auth/me` every **10 seconds** so HP, energy, and character state stay in sync with the server (which applies lazy poison damage and energy regen on each request).

**HP** updates every second client-side by simulating pending poison ticks (`pendingDamage = floor(elapsedSeconds) × 15`) so the bar drains visually without waiting for the next server poll.

**Poison flash** — when a character is poisoned, the HP bar overlays a pulsing green tint (0.5 s cycle) to make the effect immediately visible. The poison countdown label shows hours / minutes / seconds in real time.

**Inventory** re-fetches from the server every **30 seconds** so item counts stay accurate even if items were added externally (e.g. via `/api/seed`).

### Market

A shop panel is available on the dashboard (left column, below Inventory). All consumable items can be purchased for credits. Credits are deducted immediately and the item is added to the character's inventory.

Items are sorted by price. The buy button is greyed out when the character cannot afford the item. Credit balance updates live after each purchase.

Poison accumulates damage based on real elapsed seconds whenever the server handles a request for that character (`/api/auth/me`, mission runs). A poisoned character can survive by using Red Potions or a Revive Potion. Respawning (Wake Up) also clears poison; the Revive Potion clears it too without the respawn penalty.

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
| POST | /api/respawn | Respawn a dead character |
| GET | /api/inventory | Get character inventory |
| POST | /api/inventory/use | Use a consumable item (handles revive + black potion specially) |
| GET | /api/market | List consumable items for sale with prices |
| POST | /api/market/buy | Buy an item — deducts credits, adds to inventory |
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
| GET/POST/PUT/DELETE | /api/admin/missions | Manage missions (admin/mod only) |

---

## Stack

- Frontend: Next.js 15 App Router, Tailwind CSS, Zustand
- Backend: Next.js Route Handlers, Mongoose/MongoDB
- Auth: JWT httpOnly cookies, 7-day expiry
- Canvas: Curse Tree + Academy with zoom/pan and Reingold-Tilford layout
