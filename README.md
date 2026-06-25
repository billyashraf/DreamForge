# ⚒️ DreamForge

### 🌙 A dark sci-fi text MMORPG — forge your shadow, conquer the cosmos!

> 🎮 **[▶ JOIN THE GAME — Play Now!](https://dream-forge-gamma.vercel.app/)** 🎮

A full-stack text MMORPG built with Next.js, MongoDB, and Zustand. Choose a Shadow Form, explore a sci-fi world across four locations, complete missions, join guilds & teams, upgrade a Curse Tree, and advance through the Academy. ⚔️🌑🚀

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
| GET | /api/guilds/mine | Owned and joined guilds (two sections) |
| GET | /api/guilds/[id] | Guild profile with members and positions |
| DELETE | /api/guilds/[id] | Disband guild (leader only) |
| POST | /api/guilds/[id]/apply | Apply to join |
| POST | /api/guilds/[id]/leave | Leave a guild |
| POST | /api/guilds/[id]/kick | Kick a member (leader only) |
| PATCH | /api/guilds/[id]/position | Set member positions array (max 3) |
| GET/PATCH | /api/guilds/[id]/applications | Review applications |
| GET/PATCH | /api/admin/guilds | Admin: list / suspend / delete guilds |
| GET | /api/characters | Search characters by name (for owl compose) |
| GET | /api/profile/[characterId] | Public character profile + viewer owl status |
| POST | /api/owl/send | Dispatch shadow owl (10-min delivery, one owl at a time) |
| GET | /api/owl/inbox | Inbox of delivered messages + sent messages |
| GET/POST | /api/chat/team | Team telepathy live chat |
| GET/POST | /api/chat/guild | Guild echo live chat |
| GET/POST | /api/teams | List open teams / create team |
| GET | /api/teams/mine | My teams (owned and joined) |
| GET | /api/teams/[id] | Team profile with members |
| DELETE | /api/teams/[id] | Disband team (leader only) |
| POST | /api/teams/[id]/apply | Apply to join a team |
| POST | /api/teams/[id]/leave | Leave a team |
| POST | /api/teams/[id]/kick | Kick a member (leader only) |
| GET/PATCH | /api/teams/[id]/applications | List / accept or reject applications |
| GET | /api/people | Browse all players (search, paginated) |
| POST | /api/people/invite | Send guild or team invite notification to a player |
| GET | /api/notifications | List all notifications for current player |
| GET | /api/notifications/unread | Unread notification count (used for badge) |
| POST | /api/notifications/[id]/accept | Accept a guild or team invite |
| POST | /api/notifications/[id]/decline | Decline a guild or team invite |
| GET | /api/logs | Activity log for current player (paginated) |
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

## Social Systems

### Character Profiles

Every character has a public profile page at `/profile/[characterId]` showing their **title banner**, level, shadow form, location, stats (STR/INT/AGI), guild memberships, and teams. Character names in the CharacterPanel and chat windows are clickable links to this page.

#### Title System (Academy-Based)

Titles are earned by leveling up Academy fields. Each field awards a title based on its current level, using these tiers:

| Title | Field Level Range | Color |
|-------|-------------------|-------|
| ⚙ Scavenger | 1 – 50 | Gray |
| ⚔ Monster Hunter | 51 – 100 | Green |
| ◉ Beast Tamer | 101 – 150 | Cyan |
| ◈ Hacker | 151 – 200 | Violet |
| ◆ Beast Hunter | 201 – 250 | Amber |
| ◧ Architect | 251 – 300 | Sky |
| ◎ System Engineer | 301 – 350 | Blue |
| ◤ Beast Slayer | 351 – 400 | Red |
| ◫ Scientist | 401 – 450 | Purple |
| ✦ Sage | 451 – 500 | Gold |

The profile banner shows the **highest-tier title** earned across all fields. Below it, the **Academy Titles** card lists every unlocked field with its current level and title tier. Titles are earned independently per field — you can be a Sage in Algorithms while still a Scavenger in Quantum Computing.

#### Own Profile Sections

When viewing your own profile, the following full communication panels appear (same as the dashboard):
- **Shadow Owl** — full inbox, sent messages, and compose (with character search)
- **Team Telepathy** — live team chat (only shown if in a team)
- **Guild Echo** — live guild chat with multi-guild tab support (only shown if in a guild)
- **My Guilds** — all your guilds as clickable links to each guild's page
- **My Teams** — all your teams as clickable links to each team's page

A **◎ profile icon** in the top navbar links directly to your own character profile.

### Shadow Owl (Async Messaging)

Players communicate via the **Shadow Owl** — a bird courier that delivers messages after a **10-minute flight time**. Each player owns exactly one owl, so only one message can be in flight at a time.

- Compose and send from the **OwlInbox** panel on the dashboard or from a **Character Profile** page
- Recipient search: type 2+ characters of a name to get a live dropdown
- Inbox shows delivered messages; Sent shows in-flight status with live countdown
- Owl availability shown with real-time countdown in both the OwlInbox and the profile page

API: `POST /api/owl/send { toCharacterId, content }` · `GET /api/owl/inbox`

### Team Telepathy (Live Chat)

Characters in a team can send **live telepathic messages** visible to all team members.

- Rate limited: **1 message per minute** per character
- Auto-scrolls to newest messages
- Polls every **5 seconds** for new messages
- Messages expire automatically after **24 hours**
- Dead characters cannot send messages
- Shown in the dashboard right column (only visible if in a team)

API: `GET /api/chat/team` · `POST /api/chat/team { content }`

### Guild Echo (Live Chat)

Same as Team Telepathy but scoped to a guild. If a character belongs to **multiple guilds**, a tab row appears to switch between guild echo channels.

- Rate limited: **1 message per minute** across all guilds
- 24-hour message TTL
- Shown in the dashboard right column (only visible if in at least one guild)

API: `GET /api/chat/guild?guildId=xxx` · `POST /api/chat/guild { content, guildId }`

### Guild System

DreameForge features a full guild system with an **application flow**, **chess + shadow ranking**, and **multi-guild membership**.

#### Joining Guilds

Players **apply** to guilds rather than joining directly. Each application can include an optional message. The guild leader (or any member with the **Queen** position) reviews applications and accepts or rejects them.

Limits:
- Create up to **10 guilds** (as leader)
- Join up to **49 guilds** (as member)

#### Guild Hall & My Guilds

The `/guilds` page has a sub-navbar:
- **Guild Hall** — browse all active guilds, apply to join
- **My Guilds** — two sections: *Owned (led guilds)* and *Joined (member guilds)*

#### Position System

Guild leaders can assign up to **3 simultaneous positions** per member. Positions are cosmetic titles shown as Unicode symbols next to member names. There are three groups:

| Group | Positions |
|-------|-----------|
| Chess | ♛ Queen · ♜ Rook · ♝ Bishop · ♞ Knight · ♟ Pawn |
| Shadow Form | Saber · Lancer · Rider · Caster · Berserker · Archer · Assassin |
| Demon | Demon (shown in red) |

The leader is always **♔ King**. Members without a position are **Recruit**.

Position changes apply instantly (optimistic UI, no page reload). The Queen position grants permission to review and accept/reject applications.

#### Leader Controls

- **Promote** — open the position picker per member (multi-select, up to 3)
- **Kick** — remove a member from the guild immediately
- **Disband** — delete the guild (removes all members)

### Team System

DreameForge features a full team system that mirrors the guild system with an **application flow** and **multi-team membership**.

#### Joining Teams

Players **apply** to teams (with an optional message) or can be **directly invited** by a team leader via the People page. The team leader reviews applications and accepts or rejects them.

Limits:
- Create up to **5 teams** (as leader)
- Join up to **19 teams** (as member)
- Each team capacity: 2–6 players (set by the leader at creation)

#### Team Hall & My Teams

The `/teams` page has a sub-navbar:
- **Team Hall** — browse all open teams, apply to join
- **My Teams** — two sections: *Leading (owned teams)* and *Joined (member teams)*

Clicking a team name opens its **profile page** (`/teams/[id]`) showing members, and (for the leader) pending applications with accept/reject buttons.

#### Leader Controls

- **Accept / Reject** — review applications from the team profile page
- **Kick** — remove a member
- **Disband** — delete the team (removes all members)

#### Team API Routes

| Method | Route | Description |
|--------|-------|-------------|
| GET/POST | /api/teams | List open teams / create team |
| GET | /api/teams/mine | My teams (owned and joined) |
| GET | /api/teams/[id] | Team profile + members |
| DELETE | /api/teams/[id] | Disband team (leader only) |
| POST | /api/teams/[id]/apply | Apply to join |
| POST | /api/teams/[id]/leave | Leave a team |
| POST | /api/teams/[id]/kick | Kick a member (leader only) |
| GET/PATCH | /api/teams/[id]/applications | List / accept or reject applications |

### People

The `/people` page lets any logged-in player browse all characters in the game.

- Search by name
- See each player's level, shadow form, current location, guilds, and teams
- **Invite** — if you lead a guild or team, an **Invite** button appears per player; clicking sends a notification invite (the target must Accept or Decline — they are not added immediately)

API: `GET /api/people?search=&page=` · `POST /api/people/invite { targetCharacterId, entityId, type: "guild"|"team" }`

### Notifications

A real-time notification system alerts players to events that affect them.

**Notification bell (◉)** in the top-right navbar:
- Shows a red badge with the unread count (polls every 15 seconds)
- **First click** — opens a popup with the 5 most recent notifications
- **Second click** — navigates to `/notifications` (full page)

**Notification types:**

| Type | Description | Action required |
|------|-------------|-----------------|
| Guild Invite | Another player invited you to their guild | Accept / Decline |
| Team Invite | Another player invited you to their team | Accept / Decline |
| Application Accepted | Your guild or team application was accepted | Informational |
| Application Rejected | Your guild or team application was rejected | Informational |
| Removed from Guild | You were kicked from a guild | Informational |
| Removed from Team | You were kicked from a team | Informational |

Informational notifications are automatically marked read when the notification list is fetched.

API: `GET /api/notifications` · `GET /api/notifications/unread` · `POST /api/notifications/[id]/accept` · `POST /api/notifications/[id]/decline`

### Activity Log

Every significant action a player takes (or that happens to them) is recorded in a persistent activity log.

**Log icon (▤)** in the top-right navbar:
- **First click** — opens a popup with the 5 most recent entries
- **Second click** — navigates to `/logs` (full paginated page, 20 entries per page)

**Logged events:** guild/team apply, join, leave, kick (both sides), invite sent/accepted/declined, application accepted/rejected.

API: `GET /api/logs?page=N`

#### Admin Guild Management

Admins and moderators can manage all guilds at `/admin/guilds`:
- Search by name or tag
- **Suspend** a guild (hides it from the Guild Hall)
- **Unsuspend** a guild
- **Delete** a guild (admin only — removes all members permanently)

API: `GET /api/admin/guilds` · `PATCH /api/admin/guilds { guildId, action: "suspend"|"unsuspend"|"delete" }`

#### Admin Team Management

Admins and moderators can manage all teams at `/admin/teams`:
- Search by name
- See each team's leader, member count / max size, activity, and open/closed status
- **Suspend** a team (hides it from the Team Hall while preserving membership)
- **Unsuspend** a team
- **Delete** a team (admin only — removes all members permanently and cleans up character references)

Suspended teams are hidden from the public Team Hall but members can still access them directly.

API: `GET /api/admin/teams` · `PATCH /api/admin/teams { teamId, action: "suspend"|"unsuspend"|"delete" }`

#### Guild API Routes

| Method | Route | Description |
|--------|-------|-------------|
| GET/POST | /api/guilds | List guilds / create guild |
| GET | /api/guilds/mine | Owned and joined guilds |
| GET | /api/guilds/[id] | Guild profile + members with positions |
| DELETE | /api/guilds/[id] | Disband guild (leader only) |
| POST | /api/guilds/[id]/apply | Apply to join a guild |
| POST | /api/guilds/[id]/leave | Leave a guild |
| POST | /api/guilds/[id]/kick | Kick a member (leader only) |
| PATCH | /api/guilds/[id]/position | Set member positions (array, max 3) |
| GET/PATCH | /api/guilds/[id]/applications | List / accept or reject applications |
| GET/PATCH | /api/admin/guilds | Admin: list all guilds / suspend/delete |
| GET/PATCH | /api/admin/teams | Admin: list all teams / suspend/delete |

---

## Academy

The Academy is an interactive knowledge tree at `/academy` where characters study fields of science, philosophy, mathematics, and the humanities to raise their **Intelligence** and **Agility** stats. Requires the **Rider** shadow form or higher.

### Tree Structure

The tree is rooted at **Philosophy** and branches across eight depth levels, covering 75+ fields:

| Branch | Fields |
|--------|--------|
| Logic → Mathematics | Algebra → Linear Algebra, Abstract Algebra · Calculus → Differential Equations, Complex Analysis · Statistics → Probability Theory, Data Science · Geometry |
| Logic → Computer Science | Algorithms → Graph Theory, Complexity Theory · Machine Learning → Neural Networks, Reinforcement Learning, Computer Vision |
| Natural Philosophy → Physics | Classical Mechanics · Thermodynamics · Electromagnetism · Quantum Mechanics → Quantum Computing, Quantum Field Theory |
| Natural Philosophy → Chemistry | Organic Chemistry · Biochemistry · Materials Science → Nanotechnology, Metamaterials |
| Natural Philosophy → Biology | Genetics → Genomics, Epigenetics · Neuroscience → Neuromorphic Computing, Brain Mapping · Ecology |
| Natural Philosophy → Astronomy | Astrophysics → Planetary Science, Dark Matter · Cosmology |
| Epistemology | Metaphysics → Ontology, Philosophy of Mind · Ethics · Psychology → Cognitive Science → Consciousness Studies, Cognitive Linguistics · Behavioral Science |
| Social Philosophy | Political Science → Jurisprudence · Economics → Game Theory → Mechanism Design · Sociology → Anthropology |
| Humanities | History → Archaeology · Linguistics → Semiotics · Arts → Music Theory, Literature |

Fields deeper in the tree must be unlocked before their children become available.

### Unlock & Upgrade

- **Unlock** a field: costs **50 merits** (parent field must be unlocked first)
- **Upgrade** a field: cost scales as `floor(100 × level^1.2)` merits
- Each level grants **+1 to the field's stat** (INT or AGI)
- Maximum field level: **700**

### Level Color Grades

Field nodes on the canvas change color as they level up:

| Level Range | Color |
|-------------|-------|
| 1 – 50 | Cyan `#00e5ff` |
| 51 – 100 | Teal `#00ccee` |
| 101 – 150 | Aqua `#00ffcc` |
| 151 – 200 | Green `#00ff88` |
| 201 – 250 | Lime `#55ff44` |
| 251 – 300 | Yellow-green `#aaff00` |
| 301 – 350 | Yellow `#ffee00` |
| 351 – 400 | Amber `#ffaa00` |
| 401 – 450 | Orange `#ff5500` |
| 451 – 500 | Gold `#ffd700` |
| 501 – 600 | Fuchsia `#e879f9` |
| 601 – 700 | White `#ffffff` |

### Title System

Each field awards a title based on its current level (see [Title System](#title-system-academy-based)). Titles are earned independently per field — you can be a **Sage** in Algorithms while still a **Scavenger** in Quantum Computing.

### Canvas UI

The academy tree is rendered on an interactive canvas:
- **Pan** — drag (mouse) or swipe (touch)
- **Zoom** — scroll wheel or pinch-to-zoom
- **Select** — click or tap a node to open the upgrade panel
- Node radius scales with level (L1 = 7 px → L700 = ~42 px)
- Edge colors match the child node's level color

### Academy API

| Method | Route | Description |
|--------|-------|-------------|
| GET | /api/academy | Get character's academy tree |
| POST | /api/academy | Unlock or upgrade a field |

`POST /api/academy` body: `{ fieldId, action: "unlock" | "upgrade" }`

---

## 🗺️ Roadmap

> DreameForge is built across three epochs — from browser game to mobile to full AAA title.

---

### 🌐 Epoch I — WEB

The founding epoch: a complete, full-featured browser MMORPG.

#### ✅ Completed Phases

- ✅ **Phase 1** — Auth, character creation, dashboard
- ✅ **Phase 2** — Missions, combat, inventory & market
- ✅ **Phase 3** — Shadow Form system, locations & travel
- ✅ **Phase 4** — Curse Tree, Academy (75+ fields across 8 depth levels), shadow owl messaging
- ✅ **Phase 5** — Guild system (apply, rank, positions, chat)
- ✅ **Phase 6** — Admin panel (users, missions, guilds)
- ✅ **Phase 7** — Live chat (team telepathy & guild echo)
- ✅ **Phase 8** — Character profiles, commit log, People browser
- ✅ **Phase 9** — Team system (multi-team, applications, invite)
- ✅ **Phase 10** — Notifications & activity log
- ✅ **Phase 11** — Admin team management

#### 🔲 Upcoming

##### ⚔️ Phase 12 — Mars Chess: Battle Royale Mechanics

A competitive PvP layer set on Mars where guilds and players clash in a chess-inspired battle royale format.

- [ ] Turn-based Mars territory map — guilds claim and contest zones
- [ ] Chess piece roles mapped to Shadow Forms (King/Queen/Rook/Bishop/Knight/Pawn)
- [ ] Battle resolution engine — strength, agility & strategy stats influence outcomes
- [ ] Season system — weekly resets, leaderboard, Mars Rating rewards
- [ ] Spectator mode — watch live battles from the dashboard
- [ ] Guild war declarations — challenge rival guilds for territory control
- [ ] Battle royale events — last guild standing wins seasonal rewards

##### 🌐 Phase 13 — Web3 Integration

Bringing true ownership and decentralized economy to the DreameForge universe.

- [ ] Wallet connect — MetaMask / WalletConnect sign-in alongside existing auth
- [ ] Shadow Form NFTs — mint your unlocked form as an on-chain asset
- [ ] On-chain credits — wrap in-game currency as ERC-20 tokens
- [ ] NFT marketplace — trade Shadow Forms, rare items, and guild emblems
- [ ] Smart contract guilds — guild treasury held on-chain, votes for spending
- [ ] Play-to-earn rewards — Mars Rating converted to token drops at season end
- [ ] Chain: TBD (Ethereum L2 / Polygon / Base)

---

### 📱 Epoch II — MOBILE

Port and evolve DreameForge into a first-class mobile experience — from responsive PWA to native app.

##### Phase 14 — Progressive Web App (PWA)

- [ ] Installable on iOS & Android home screens
- [ ] Service worker offline caching — play core features without internet
- [ ] App manifest, splash screens, and native-feel navigation
- [ ] Optimized touch targets throughout the UI

##### Phase 15 — Push Notifications & Background Sync

- [ ] Web Push notifications — mission timers, owl delivery alerts, battle pings
- [ ] Background sync for owl inbox and notification badge
- [ ] Configurable notification preferences per player

##### Phase 16 — Mobile-Native Combat & Canvas UI

- [ ] Swipe gestures for mission selection and inventory management
- [ ] Haptic feedback on key actions (mission complete, death, level-up)
- ✅ Pinch-to-zoom Curse Tree and Academy fully touch-optimized
- [ ] Mobile HUD redesign — thumb-zone-friendly layout

##### Phase 17 — React Native Companion App

- [ ] iOS & Android native app via React Native / Expo
- [ ] Shared auth session with the web game (JWT handoff)
- [ ] Native camera integration — scan QR codes to join guilds or teams
- [ ] Offline character sheet with last-synced stats

---

### 🎮 Epoch III — AAA

Elevate DreameForge from a browser game into a full-scale gaming product.

##### Phase 18 — 3D Galaxy Map & World Engine

- [ ] Three.js / WebGPU 3D world map replacing the text location list
- [ ] Real-time particle systems for space travel between locations
- [ ] Procedurally generated terrain for Earth, Mars, Moon Junkyard biomes
- [ ] Cinematic camera transitions on travel

##### Phase 19 — Real-time PvP Combat Engine

- [ ] WebSocket-based server-authoritative combat — no more turn-based dice
- [ ] Animated skill activations tied to the Curse Tree
- [ ] 1v1 dueling system with spectator feed
- [ ] Guild war real-time battles on Mars territory map

##### Phase 20 — Voice, Avatar & Cosmetics System

- [ ] Spatial audio in guild halls and team telepathy channels
- [ ] 3D avatar customization — armor, weapons, shadow form visual skins
- [ ] Emote system and animated reactions
- [ ] Seasonal cosmetic drops tied to Mars Rating

##### Phase 21 — Console & Desktop Client

- [ ] Electron / Tauri desktop client for Windows, macOS, Linux
- [ ] Controller support — full gamepad mapping
- [ ] Console submission (PlayStation, Xbox) via web runtime
- [ ] Cross-platform progress — same account, any device

---

## Stack

- Frontend: Next.js App Router, Tailwind CSS, Zustand
- Backend: Next.js Route Handlers, Mongoose/MongoDB
- Auth: JWT httpOnly cookies, 7-day expiry
- Canvas: Curse Tree + Academy with zoom/pan and Reingold-Tilford layout
- Deployment: Vercel + MongoDB Atlas
