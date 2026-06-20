import bcrypt from "bcryptjs";
import { connectDB } from "./db";
import Mission from "@/models/Mission";
import Item from "@/models/Item";
import User from "@/models/User";
import Character from "@/models/Character";
import Guild from "@/models/Guild";
import Team from "@/models/Team";

const INITIAL_MISSIONS = [
  {
    title: "Dome Patrol",
    location: "metapolis",
    description: "Patrol the inner dome walls and report any structural weaknesses.",
    narrative: "You walk the perimeter of Metapolis, checking for cracks in the iron dome. The city hums with life around you. Your report earns you trust with the city guard.",
    difficulty: "easy",
    type: "solo",
    rewards: { experience: 50, credits: 75, merits: 20 },
    requirements: { level: 1 },
    durationMinutes: 5,
  },
  {
    title: "Training Grounds Trial",
    location: "metapolis",
    description: "Complete a sparring session at the Training Center.",
    narrative: "You enter the ring and face a training drone. Sweat and sparks fly — but you come out standing. The trainer nods in approval.",
    difficulty: "easy",
    type: "solo",
    rewards: { experience: 80, credits: 50, merits: 20 },
    requirements: { level: 1 },
    durationMinutes: 5,
  },
  {
    title: "Supply Run",
    location: "metapolis",
    description: "Deliver medical supplies from the docks to the Medical Center.",
    narrative: "You navigate Metapolis's packed streets with a hover-cart of supplies. Three districts, two checkpoints, one near-collision with a delivery drone. Success.",
    difficulty: "easy",
    type: "solo",
    rewards: { experience: 60, credits: 100, merits: 15 },
    requirements: { level: 1 },
    durationMinutes: 5,
  },
  {
    title: "Scrapyard Scouting",
    location: "moon_junkyard",
    description: "Scout the outer junkyard for usable materials without engaging robotic beasts.",
    narrative: "You creep through towers of rusted machinery. A rogue drone hovers nearby — you freeze, wait, then continue. You return with a bag full of rare circuits.",
    difficulty: "easy",
    type: "solo",
    rewards: { experience: 100, credits: 150, merits: 25 },
    requirements: { level: 2 },
    durationMinutes: 10,
  },
  {
    title: "Drone Hunt",
    location: "moon_junkyard",
    description: "Take down three rogue drones terrorizing the outer sectors.",
    narrative: "The drones swarm your position. Your reflexes kick in — one down, two down, three. The silence that follows feels earned.",
    difficulty: "medium",
    type: "solo",
    rewards: { experience: 200, credits: 250, merits: 50 },
    requirements: { level: 4 },
    durationMinutes: 15,
  },
  {
    title: "Junkyard Expedition",
    location: "moon_junkyard",
    description: "Lead a team expedition deep into the junkyard's core sector.",
    narrative: "You and your team press into the heart of the junkyard. Ancient machines stir. You fight, scavenge, and emerge victorious with legendary salvage.",
    difficulty: "hard",
    type: "team",
    rewards: { experience: 500, credits: 600, merits: 120 },
    requirements: { level: 8, teamSize: 3 },
    durationMinutes: 30,
  },
  {
    title: "Quarantine Zone Sweep",
    location: "earth",
    description: "Clear out mutated beasts from an abandoned quarantine zone.",
    narrative: "Earth's ruins are haunting. Mutated wolves pace the broken streets. You clear them out methodically — the survivors you find in the basement call you a hero.",
    difficulty: "medium",
    type: "solo",
    rewards: { experience: 300, credits: 400, merits: 55 },
    requirements: { level: 5 },
    durationMinutes: 20,
  },
  {
    title: "Survivor Rescue",
    location: "earth",
    description: "Locate and extract a group of survivors from a hostile zone.",
    narrative: "The signal leads you to an overgrown hospital. Inside, a dozen survivors have held out for weeks. You escort them to the gate under heavy beast pressure.",
    difficulty: "hard",
    type: "team",
    rewards: { experience: 600, credits: 700, merits: 125 },
    requirements: { level: 8, teamSize: 2 },
    durationMinutes: 30,
  },
  {
    title: "Mars Territory Claim",
    location: "mars",
    description: "Compete in the Mars Battle Royale to claim territory for your guild.",
    narrative: "The red dust rises as the tournament begins. Strategy, strength, and timing — you outmaneuver your opponents and plant your guild's flag on contested ground.",
    difficulty: "hard",
    type: "guild",
    rewards: { experience: 1000, credits: 1500, merits: 150 },
    requirements: { level: 10 },
    durationMinutes: 45,
  },
  {
    title: "Mars Grand Tournament",
    location: "mars",
    description: "Enter the legendary Mars Grand Tournament — only the strongest survive.",
    narrative: "Every guild sends their best. The arena erupts. Rounds pass in a blur of tactics and chaos. When the dust settles, you stand at the top.",
    difficulty: "legendary",
    type: "guild",
    rewards: { experience: 3000, credits: 5000, merits: 500 },
    requirements: { level: 20 },
    durationMinutes: 60,
  },
  // --- Metapolis ---
  {
    title: "Encrypted Delivery",
    location: "metapolis",
    description: "Courier a data chip through four surveillance-heavy districts without being scanned.",
    narrative: "You weave through checkpoints, using back alleys and timed distractions. The chip reaches its destination intact. The contact slips you extra credits for your discretion.",
    difficulty: "easy",
    type: "solo",
    rewards: { experience: 45, credits: 90, merits: 20 },
    requirements: { level: 1 },
    durationMinutes: 5,
  },
  {
    title: "Generator Repair",
    location: "metapolis",
    description: "Restore backup power to the Medical Sector before the life-support systems fail.",
    narrative: "Sparks fly as you rewire the ancient generator. The lights flicker — then hold. The ward supervisor grips your arm. 'You just saved forty lives,' she says.",
    difficulty: "easy",
    type: "solo",
    rewards: { experience: 70, credits: 85, merits: 15 },
    requirements: { level: 1 },
    durationMinutes: 5,
  },
  {
    title: "Block Nine Cleanup",
    location: "metapolis",
    description: "A gang has taken over Block 9's water distribution. Clear them out.",
    narrative: "The gang doesn't go quietly. Three fights, two concussions, and one broken door later, Block 9 is free. Water flows again. The residents cheer.",
    difficulty: "medium",
    type: "solo",
    rewards: { experience: 160, credits: 200, merits: 50 },
    requirements: { level: 3 },
    durationMinutes: 10,
  },
  {
    title: "Corporate Infiltration",
    location: "metapolis",
    description: "Infiltrate a megacorp server room and extract classified research files.",
    narrative: "You bypass two layers of biometric locks. The files copy slowly — 98%... 99%... 100%. Alarms trigger as you sprint for the exit. You make it with two seconds to spare.",
    difficulty: "medium",
    type: "solo",
    rewards: { experience: 220, credits: 320, merits: 60 },
    requirements: { level: 5 },
    durationMinutes: 15,
  },
  // --- Moon Junkyard ---
  {
    title: "Beacon Repair",
    location: "moon_junkyard",
    description: "Reactivate a downed communications relay in Sector 7 before scavengers strip it.",
    narrative: "The relay is buried under three tons of scrap. You dig, rewire, and boost the signal manually. A crackle of static — then a clean broadcast. The relay lives again.",
    difficulty: "easy",
    type: "solo",
    rewards: { experience: 90, credits: 110, merits: 20 },
    requirements: { level: 2 },
    durationMinutes: 5,
  },
  {
    title: "Raider Intercept",
    location: "moon_junkyard",
    description: "Intercept a raider convoy stealing salvage from independent scavengers.",
    narrative: "The convoy stops when they see you. You don't give them a chance to regroup. Short, brutal, decisive. The scavengers recover their haul and split a cut with you.",
    difficulty: "medium",
    type: "solo",
    rewards: { experience: 190, credits: 240, merits: 45 },
    requirements: { level: 4 },
    durationMinutes: 10,
  },
  {
    title: "Titan Takedown",
    location: "moon_junkyard",
    description: "Destroy the rogue construction titan blocking the southern salvage lanes.",
    narrative: "The machine is the size of a building. You target its power core — three passes, two near-misses, and one perfectly placed charge. The titan collapses. The lanes are clear.",
    difficulty: "hard",
    type: "solo",
    rewards: { experience: 380, credits: 450, merits: 110 },
    requirements: { level: 6 },
    durationMinutes: 20,
  },
  {
    title: "Reactor Core Retrieval",
    location: "moon_junkyard",
    description: "Extract a live reactor core from a downed cargo ship before it goes critical.",
    narrative: "The ship's hull groans around you. Your team moves fast — containment unit on, core extracted, evacuation sequence initiated. You clear the blast radius with forty seconds to spare.",
    difficulty: "hard",
    type: "team",
    rewards: { experience: 480, credits: 580, merits: 130 },
    requirements: { level: 8, teamSize: 2 },
    durationMinutes: 25,
  },
  // --- Earth ---
  {
    title: "Settlement Defense",
    location: "earth",
    description: "Defend a survivor settlement from a mutant pack moving in from the east.",
    narrative: "The mutants hit the wall at dusk. You hold the eastern gate alone for twelve minutes while the others evacuate the children. When it's over, you count thirty-two carcasses.",
    difficulty: "medium",
    type: "solo",
    rewards: { experience: 280, credits: 360, merits: 50 },
    requirements: { level: 5 },
    durationMinutes: 15,
  },
  {
    title: "Vault Breach",
    location: "earth",
    description: "Break into a pre-war bank vault beneath the ruins of Old Chicago.",
    narrative: "Six layers of pre-war security — all cracked. The vault door grinds open on ancient hinges. Inside: crates of old-world currency worth nothing, and one military-grade weapons cache worth everything.",
    difficulty: "medium",
    type: "solo",
    rewards: { experience: 310, credits: 420, merits: 60 },
    requirements: { level: 6 },
    durationMinutes: 20,
  },
  {
    title: "Warlord Parley",
    location: "earth",
    description: "Broker a ceasefire between two warring Earth factions before they destroy each other.",
    narrative: "You walk into the no-man's land between both camps with no weapons and both flags. Four hours of brutal negotiation. A handshake. Silence where there was gunfire. It holds — for now.",
    difficulty: "hard",
    type: "solo",
    rewards: { experience: 450, credits: 520, merits: 100 },
    requirements: { level: 7 },
    durationMinutes: 25,
  },
  {
    title: "Biolab Lockdown",
    location: "earth",
    description: "Seal a leaking research lab before the experimental pathogen reaches the surface.",
    narrative: "The lab is already compromised. Your team splits — one group seals the vents, the other purges the culture tanks. You hit the emergency lockdown with moments to spare. The surface never knew.",
    difficulty: "hard",
    type: "team",
    rewards: { experience: 560, credits: 650, merits: 140 },
    requirements: { level: 8, teamSize: 2 },
    durationMinutes: 30,
  },
  // --- Mars ---
  {
    title: "Dust Runner",
    location: "mars",
    description: "Complete a high-speed courier run across open Mars terrain dodging guild patrols.",
    narrative: "The dunes blur past at 200 kph. Three patrol intercepts, two near-misses, and a ravine jump that will haunt your dreams. You deliver on time. The client doesn't ask how.",
    difficulty: "hard",
    type: "solo",
    rewards: { experience: 650, credits: 800, merits: 100 },
    requirements: { level: 10 },
    durationMinutes: 20,
  },
  {
    title: "Forward Base Assault",
    location: "mars",
    description: "Destroy a rival guild's forward operating base in Sector 12.",
    narrative: "The base has twelve defenders. You have surprise and high ground. Twelve minutes of controlled chaos — charges placed, comms tower down, base evacuated and detonated. Mission complete.",
    difficulty: "hard",
    type: "solo",
    rewards: { experience: 820, credits: 1000, merits: 150 },
    requirements: { level: 12 },
    durationMinutes: 30,
  },
  {
    title: "Storm Walker",
    location: "mars",
    description: "Navigate through a class-5 dust storm to retrieve a downed ship's black box.",
    narrative: "Visibility drops to zero. Your instruments fail. You navigate by compass and instinct through the howling red dark. When the storm clears, you're standing over the wreck. The black box is in your hand.",
    difficulty: "legendary",
    type: "solo",
    rewards: { experience: 1800, credits: 2500, merits: 350 },
    requirements: { level: 15 },
    durationMinutes: 45,
  },
  {
    title: "The Red Warlord",
    location: "mars",
    description: "Hunt and defeat the Red Warlord of Sector 9 — the most feared commander on Mars.",
    narrative: "He's been building his empire for seven years. Your guild dismantles it in one night. The Warlord falls in single combat — and the entire sector watches. Mars will remember this.",
    difficulty: "legendary",
    type: "guild",
    rewards: { experience: 4000, credits: 7000, merits: 500 },
    requirements: { level: 18 },
    durationMinutes: 60,
  },
];

const INITIAL_ITEMS = [
  { name: "Iron Scrap Blade", itemKey: "", type: "weapon", rarity: "common", description: "A crude blade forged from junkyard scrap.", stats: { strength: 3 }, price: 150 },
  { name: "Moon Dome Helmet", itemKey: "", type: "armor", rarity: "common", description: "Standard-issue dome worker helmet. Dented but functional.", stats: { agility: 1, healthBonus: 15 }, price: 100 },
  { name: "Energy Cell", itemKey: "", type: "consumable", rarity: "common", description: "Restores 25 energy points.", stats: { energyBonus: 25 }, price: 50 },
  { name: "MedKit", itemKey: "", type: "consumable", rarity: "common", description: "Basic first aid kit. Restores 50 health.", stats: { healthBonus: 50 }, price: 80 },
  { name: "Scavenger's Gloves", itemKey: "", type: "armor", rarity: "uncommon", description: "Worn by veteran junkyard scavengers.", stats: { agility: 3, strength: 1 }, price: 300 },
  { name: "Tactical Scanner", itemKey: "", type: "tool", rarity: "uncommon", description: "Reveals hidden loot in the junkyard.", stats: { intelligence: 5 }, price: 400 },
  { name: "Earth Steel Sword", itemKey: "", type: "weapon", rarity: "rare", description: "Forged from pre-apocalypse Earth steel — extremely durable.", stats: { strength: 8 }, price: 800 },
  { name: "Void Armor Chestplate", itemKey: "", type: "armor", rarity: "rare", description: "Lightweight alloy armor from Mars raiders.", stats: { agility: 4, healthBonus: 50 }, price: 1200 },
  { name: "Neural Amplifier", itemKey: "", type: "tool", rarity: "epic", description: "Boosts cognitive response for strategic combat.", stats: { intelligence: 10 }, price: 3000 },
  { name: "Legendary Dome Breaker", itemKey: "", type: "weapon", rarity: "legendary", description: "A weapon so powerful it could crack the Moon's dome.", stats: { strength: 20, agility: 8 }, price: 10000 },
];

const CONSUMABLE_ITEMS = [
  {
    name: "Sedative", itemKey: "sedative", type: "consumable", rarity: "uncommon",
    description: "A synthetic sedative compound. Suppresses pain receptors immediately.",
    stats: {}, effect: "pain_reduce", effectValue: 50, cooldownMinutes: 60, consumeTimeMinutes: 0, price: 200,
  },
  {
    name: "Meat", itemKey: "meat", type: "consumable", rarity: "common",
    description: "Raw protein rations. Slow to eat but restores significant energy.",
    stats: {}, effect: "energy_add", effectValue: 300, cooldownMinutes: 0, consumeTimeMinutes: 3, price: 40,
  },
  {
    name: "Red Potion I", itemKey: "red_potion_1", type: "consumable", rarity: "common",
    description: "A small vial of crimson liquid. Restores 50 HP.",
    stats: {}, effect: "health_add", effectValue: 50, cooldownMinutes: 0, consumeTimeMinutes: 0, price: 100,
  },
  {
    name: "Red Potion II", itemKey: "red_potion_2", type: "consumable", rarity: "uncommon",
    description: "A medium vial of concentrated crimson liquid. Restores 150 HP.",
    stats: {}, effect: "health_add", effectValue: 150, cooldownMinutes: 0, consumeTimeMinutes: 0, price: 300,
  },
  {
    name: "Red Potion III", itemKey: "red_potion_3", type: "consumable", rarity: "rare",
    description: "A large flask of potent crimson liquid. Restores 300 HP.",
    stats: {}, effect: "health_add", effectValue: 300, cooldownMinutes: 0, consumeTimeMinutes: 0, price: 700,
  },
];

export const DEMO_CREDENTIALS = {
  player: { email: "demo@dreamforge.com", password: "DemoPlay3r!", username: "DemoPlayer" },
  admin: { email: "admin@dreamforge.com", password: "AdminF0rge!", username: "GameAdmin" },
};

export const TEST_ACCOUNTS = [
  {
    username: "Rookie_Rex",
    email: "rookie@dreamforge.com",
    password: "TestR00kie!",
    role: "player" as const,
    character: {
      name: "Rex",
      level: 3,
      experience: 220,
      health: 120,
      maxHealth: 120,
      energy: 105,
      maxEnergy: 105,
      credits: 650,
      merits: 200,
      strength: 7,
      intelligence: 6,
      agility: 6,
      skills: { combat: 2, scavenging: 1, survival: 1, strategy: 1, crafting: 1 },
      currentLocation: "metapolis" as const,
      shadowForm: "saber",
    },
  },
  {
    username: "Scout_Lyra",
    email: "scout@dreamforge.com",
    password: "TestSc0ut!",
    role: "player" as const,
    character: {
      name: "Lyra",
      level: 6,
      experience: 1400,
      health: 155,
      maxHealth: 155,
      energy: 115,
      maxEnergy: 115,
      credits: 1800,
      merits: 500,
      strength: 10,
      intelligence: 9,
      agility: 11,
      skills: { combat: 3, scavenging: 4, survival: 2, strategy: 2, crafting: 1 },
      currentLocation: "moon_junkyard" as const,
      shadowForm: "archer",
    },
  },
  {
    username: "Ranger_Kade",
    email: "ranger@dreamforge.com",
    password: "TestR4nger!",
    role: "player" as const,
    character: {
      name: "Kade",
      level: 8,
      experience: 3500,
      health: 175,
      maxHealth: 175,
      energy: 125,
      maxEnergy: 125,
      credits: 3200,
      merits: 900,
      strength: 13,
      intelligence: 10,
      agility: 14,
      skills: { combat: 4, scavenging: 3, survival: 5, strategy: 3, crafting: 2 },
      currentLocation: "earth" as const,
      shadowForm: "rider",
    },
  },
  {
    username: "Veteran_Zara",
    email: "veteran@dreamforge.com",
    password: "TestVet3ran!",
    role: "player" as const,
    character: {
      name: "Zara",
      level: 14,
      experience: 18000,
      health: 240,
      maxHealth: 240,
      energy: 165,
      maxEnergy: 165,
      credits: 9500,
      merits: 3200,
      strength: 18,
      intelligence: 16,
      agility: 17,
      skills: { combat: 7, scavenging: 6, survival: 8, strategy: 6, crafting: 4 },
      currentLocation: "mars" as const,
      shadowForm: "caster",
    },
  },
  {
    username: "Mod_Cassius",
    email: "mod@dreamforge.com",
    password: "TestM0d123!",
    role: "moderator" as const,
    character: {
      name: "Cassius",
      level: 20,
      experience: 48000,
      health: 300,
      maxHealth: 300,
      energy: 200,
      maxEnergy: 200,
      credits: 20000,
      merits: 8000,
      strength: 20,
      intelligence: 25,
      agility: 18,
      skills: { combat: 9, scavenging: 7, survival: 8, strategy: 11, crafting: 6 },
      currentLocation: "metapolis" as const,
      shadowForm: "assassin",
    },
  },
];

const DUMMY_GUILDS = [
  {
    name: "Iron Vanguard",
    tag: "IV",
    description: "Elite scavengers and warriors. First to arrive, last to fall.",
    level: 3,
    credits: 4000,
    marsRating: 850,
  },
  {
    name: "Void Walkers",
    tag: "VW",
    description: "Arcane scholars who unravel the secrets of the cosmos. Knowledge is their weapon.",
    level: 2,
    credits: 2200,
    marsRating: 620,
  },
  {
    name: "Steel Brotherhood",
    tag: "SB",
    description: "The strongest blades on Mars. We don't negotiate. We dominate.",
    level: 4,
    credits: 6500,
    marsRating: 1100,
  },
  {
    name: "Shadow Compact",
    tag: "SC",
    description: "What you don't see is already behind you. Precision, silence, results.",
    level: 2,
    credits: 3100,
    marsRating: 740,
  },
  {
    name: "Red Horizon",
    tag: "RH",
    description: "Masters of Mars territory warfare. No sector is beyond our reach.",
    level: 5,
    credits: 9800,
    marsRating: 1450,
  },
];

export async function seed() {
  await connectDB();
  console.log("Seeding database...");

  // Missions — upsert by title+location so re-seeding updates existing docs
  await Mission.bulkWrite(
    INITIAL_MISSIONS.map((m) => ({
      updateOne: {
        filter: { title: m.title, location: m.location as never },
        update: { $set: m as never },
        upsert: true,
      },
    }))
  );
  console.log(`Upserted ${INITIAL_MISSIONS.length} missions`);

  // Items — upsert base items by name
  await Item.bulkWrite(
    INITIAL_ITEMS.map((item) => ({
      updateOne: {
        filter: { name: item.name },
        update: { $set: item as never },
        upsert: true,
      },
    }))
  );

  // Consumable items — upsert by itemKey
  await Item.bulkWrite(
    CONSUMABLE_ITEMS.map((item) => ({
      updateOne: {
        filter: { itemKey: item.itemKey },
        update: { $set: item as never },
        upsert: true,
      },
    }))
  );
  console.log(`Upserted ${INITIAL_ITEMS.length + CONSUMABLE_ITEMS.length} items`);

  // ── Demo player account ────────────────────────────────────────────────────
  const { email: pEmail, password: pPass, username: pUser } = DEMO_CREDENTIALS.player;
  let demoUser = await User.findOne({ email: pEmail });
  if (!demoUser) {
    const hash = await bcrypt.hash(pPass, 12);
    demoUser = await User.create({ username: pUser, email: pEmail, passwordHash: hash, role: "player", isVerified: true });
    console.log("Created demo player account");
  }

  let demoCharacter = await Character.findOne({ userId: demoUser._id });
  if (!demoCharacter) {
    demoCharacter = await Character.create({
      userId: demoUser._id,
      name: "Nova",
      level: 8,
      experience: 3200,
      health: 180, maxHealth: 180,
      energy: 125, maxEnergy: 125,
      credits: 2750,
      merits: 1200,
      strength: 14, intelligence: 11, agility: 12,
      skills: { combat: 4, scavenging: 5, survival: 3, strategy: 2, crafting: 2 },
      currentLocation: "moon_junkyard",
      shadowForm: "lancer",
    });
    console.log("Created demo player character: Nova");
  } else if (!demoCharacter.shadowForm) {
    await Character.findByIdAndUpdate(demoCharacter._id, { $set: { shadowForm: "lancer", merits: demoCharacter.merits ?? 1200 } });
  }

  // ── Demo admin account ─────────────────────────────────────────────────────
  const { email: aEmail, password: aPass, username: aUser } = DEMO_CREDENTIALS.admin;
  let adminUser = await User.findOne({ email: aEmail });
  if (!adminUser) {
    const hash = await bcrypt.hash(aPass, 12);
    adminUser = await User.create({ username: aUser, email: aEmail, passwordHash: hash, role: "admin", isVerified: true });
    console.log("Created demo admin account");
  }

  let adminCharacter = await Character.findOne({ userId: adminUser._id });
  if (!adminCharacter) {
    adminCharacter = await Character.create({
      userId: adminUser._id,
      name: "Overseer",
      level: 20,
      experience: 48000,
      health: 300, maxHealth: 300,
      energy: 200, maxEnergy: 200,
      credits: 25000,
      merits: 9999,
      strength: 22, intelligence: 28, agility: 20,
      skills: { combat: 10, scavenging: 8, survival: 9, strategy: 12, crafting: 7 },
      currentLocation: "mars",
      shadowForm: "assassin",
    });
    console.log("Created demo admin character: Overseer");
  } else if (!adminCharacter.shadowForm) {
    await Character.findByIdAndUpdate(adminCharacter._id, { $set: { shadowForm: "assassin", merits: adminCharacter.merits ?? 9999 } });
    adminCharacter = await Character.findOne({ userId: adminUser._id });
  }

  // ── Test accounts ──────────────────────────────────────────────────────────
  const testCharacters: (typeof adminCharacter)[] = [];
  for (const account of TEST_ACCOUNTS) {
    let testUser = await User.findOne({ email: account.email });
    if (!testUser) {
      const hash = await bcrypt.hash(account.password, 12);
      testUser = await User.create({
        username: account.username,
        email: account.email,
        passwordHash: hash,
        role: account.role,
        isVerified: true,
      });
      console.log(`Created test account: ${account.username}`);
    }
    let testChar = await Character.findOne({ userId: testUser._id });
    if (!testChar) {
      testChar = await Character.create({ userId: testUser._id, ...account.character });
      console.log(`Created test character: ${account.character.name}`);
    } else if (!testChar.shadowForm) {
      await Character.findByIdAndUpdate(testChar._id, {
        $set: { shadowForm: account.character.shadowForm, merits: testChar.merits ?? account.character.merits },
      });
      testChar = await Character.findOne({ userId: testUser._id });
    }
    testCharacters.push(testChar);
  }

  // ── Guilds ─────────────────────────────────────────────────────────────────
  // Iron Vanguard — led by demo player
  let demoGuild = await Guild.findOne({ name: "Iron Vanguard" });
  if (!demoGuild) {
    demoGuild = await Guild.create({
      ...DUMMY_GUILDS[0],
      leaderId: demoCharacter!._id,
      members: [demoCharacter!._id],
    });
    console.log("Created guild: Iron Vanguard");
  }
  // Ensure demo character linked to guild
  if (demoCharacter && (!demoCharacter.guildId || demoCharacter.guildId.toString() !== demoGuild._id.toString())) {
    await Character.findByIdAndUpdate(demoCharacter._id, { $set: { guildId: demoGuild._id } });
  }
  // Ensure admin character linked to guild
  if (adminCharacter && !adminCharacter.guildId) {
    await Character.findByIdAndUpdate(adminCharacter._id, { $set: { guildId: demoGuild._id } });
    await Guild.findByIdAndUpdate(demoGuild._id, { $addToSet: { members: adminCharacter._id } });
  }

  // Remaining dummy guilds — led by test characters if available
  const guildLeaders = [
    testCharacters[4], // Cassius (assassin) → Shadow Compact
    testCharacters[3], // Zara (caster)     → Steel Brotherhood
    testCharacters[2], // Kade (rider)       → Void Walkers
    testCharacters[3], // Zara               → Red Horizon
  ];
  for (let i = 1; i < DUMMY_GUILDS.length; i++) {
    const gData = DUMMY_GUILDS[i];
    const existing = await Guild.findOne({ name: gData.name });
    if (!existing) {
      const leader = guildLeaders[i - 1] ?? demoCharacter!;
      await Guild.create({ ...gData, leaderId: leader._id, members: [leader._id] });
      console.log(`Created guild: ${gData.name}`);
    }
  }

  // ── Teams ──────────────────────────────────────────────────────────────────
  const DUMMY_TEAMS = [
    {
      name: "Dome Patrol Unit",
      activity: "metapolis patrol",
      leader: testCharacters[0] ?? demoCharacter!, // Rex (saber)
      members: [testCharacters[0] ?? demoCharacter!],
    },
    {
      name: "Junkyard Wolves",
      activity: "junkyard scavenging",
      leader: testCharacters[1] ?? demoCharacter!, // Lyra (archer)
      members: [testCharacters[1] ?? demoCharacter!, demoCharacter!],
    },
    {
      name: "Earth Reclamation",
      activity: "earth exploration",
      leader: testCharacters[2] ?? demoCharacter!, // Kade (rider)
      members: [testCharacters[2] ?? demoCharacter!],
    },
    {
      name: "Mars Vanguard",
      activity: "mars territory",
      leader: testCharacters[3] ?? adminCharacter!, // Zara (caster)
      members: [testCharacters[3] ?? adminCharacter!, adminCharacter!],
    },
  ];

  for (const t of DUMMY_TEAMS) {
    const existing = await Team.findOne({ name: t.name });
    if (!existing) {
      const team = await Team.create({
        name: t.name,
        leaderId: t.leader._id,
        members: t.members.filter(Boolean).map((c) => c!._id),
        activity: t.activity,
        maxSize: 4,
        isOpen: true,
      });
      // Link team to leader character
      await Character.findByIdAndUpdate(t.leader._id, { $set: { teamId: team._id } });
      console.log(`Created team: ${t.name}`);
    }
  }

  // ── Give consumables to all characters ────────────────────────────────────
  const consumableItemDocs = await Item.find({
    itemKey: { $in: CONSUMABLE_ITEMS.map((c) => c.itemKey) },
  });

  const allCharIds = [
    demoCharacter?._id,
    adminCharacter?._id,
    ...testCharacters.map((c) => c?._id),
  ].filter(Boolean);

  for (const charId of allCharIds) {
    const char = await Character.findById(charId).select("inventory");
    if (!char) continue;
    for (const itemDoc of consumableItemDocs) {
      const existingIdx = char.inventory.findIndex(
        (slot) => slot.itemId.toString() === (itemDoc._id as { toString(): string }).toString()
      );
      if (existingIdx === -1) {
        char.inventory.push({ itemId: itemDoc._id as never, quantity: 50 });
      }
    }
    await char.save();
  }
  console.log(`Gave 50x each consumable to ${allCharIds.length} characters`);

  console.log("Seed complete.");
  return {
    demoCreds: DEMO_CREDENTIALS,
    testAccounts: TEST_ACCOUNTS.map((a) => ({
      username: a.username,
      email: a.email,
      password: a.password,
      role: a.role,
      shadowForm: a.character.shadowForm,
    })),
    guild: { name: demoGuild?.name, tag: demoGuild?.tag },
  };
}
