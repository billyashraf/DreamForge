import bcrypt from "bcryptjs";
import { connectDB } from "./db";
import Mission from "@/models/Mission";
import Item from "@/models/Item";
import User from "@/models/User";
import Character from "@/models/Character";
import Guild from "@/models/Guild";

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
  { name: "Iron Scrap Blade", type: "weapon", rarity: "common", description: "A crude blade forged from junkyard scrap.", stats: { strength: 3 }, price: 150 },
  { name: "Moon Dome Helmet", type: "armor", rarity: "common", description: "Standard-issue dome worker helmet. Dented but functional.", stats: { agility: 1, healthBonus: 15 }, price: 100 },
  { name: "Energy Cell", type: "consumable", rarity: "common", description: "Restores 25 energy points.", stats: { energyBonus: 25 }, price: 50 },
  { name: "MedKit", type: "consumable", rarity: "common", description: "Basic first aid kit. Restores 50 health.", stats: { healthBonus: 50 }, price: 80 },
  { name: "Scavenger's Gloves", type: "armor", rarity: "uncommon", description: "Worn by veteran junkyard scavengers.", stats: { agility: 3, strength: 1 }, price: 300 },
  { name: "Tactical Scanner", type: "tool", rarity: "uncommon", description: "Reveals hidden loot in the junkyard.", stats: { intelligence: 5 }, price: 400 },
  { name: "Earth Steel Sword", type: "weapon", rarity: "rare", description: "Forged from pre-apocalypse Earth steel — extremely durable.", stats: { strength: 8 }, price: 800 },
  { name: "Void Armor Chestplate", type: "armor", rarity: "rare", description: "Lightweight alloy armor from Mars raiders.", stats: { agility: 4, healthBonus: 50 }, price: 1200 },
  { name: "Neural Amplifier", type: "tool", rarity: "epic", description: "Boosts cognitive response for strategic combat.", stats: { intelligence: 10 }, price: 3000 },
  { name: "Legendary Dome Breaker", type: "weapon", rarity: "legendary", description: "A weapon so powerful it could crack the Moon's dome.", stats: { strength: 20, agility: 8 }, price: 10000 },
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
      strength: 7,
      intelligence: 6,
      agility: 6,
      skills: { combat: 2, scavenging: 1, survival: 1, strategy: 1, crafting: 1 },
      currentLocation: "metapolis",
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
      strength: 10,
      intelligence: 9,
      agility: 11,
      skills: { combat: 3, scavenging: 4, survival: 2, strategy: 2, crafting: 1 },
      currentLocation: "moon_junkyard",
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
      strength: 13,
      intelligence: 10,
      agility: 14,
      skills: { combat: 4, scavenging: 3, survival: 5, strategy: 3, crafting: 2 },
      currentLocation: "earth",
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
      strength: 18,
      intelligence: 16,
      agility: 17,
      skills: { combat: 7, scavenging: 6, survival: 8, strategy: 6, crafting: 4 },
      currentLocation: "mars",
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
      strength: 20,
      intelligence: 25,
      agility: 18,
      skills: { combat: 9, scavenging: 7, survival: 8, strategy: 11, crafting: 6 },
      currentLocation: "metapolis",
    },
  },
];

export async function seed() {
  await connectDB();
  console.log("Seeding database...");

  // Missions
  const missionCount = await Mission.countDocuments();
  if (missionCount === 0) {
    await Mission.insertMany(INITIAL_MISSIONS);
    console.log(`Seeded ${INITIAL_MISSIONS.length} missions`);
  }

  // Items
  const itemCount = await Item.countDocuments();
  if (itemCount === 0) {
    await Item.insertMany(INITIAL_ITEMS);
    console.log(`Seeded ${INITIAL_ITEMS.length} items`);
  }

  // Demo guild (Iron Vanguard)
  let demoGuild = await Guild.findOne({ name: "Iron Vanguard" });

  // Demo player account
  const { email: pEmail, password: pPass, username: pUser } = DEMO_CREDENTIALS.player;
  let demoUser = await User.findOne({ email: pEmail });
  if (!demoUser) {
    const hash = await bcrypt.hash(pPass, 12);
    demoUser = await User.create({
      username: pUser,
      email: pEmail,
      passwordHash: hash,
      role: "player",
      isVerified: true,
    });
    console.log("Created demo player account");
  }

  let demoCharacter = await Character.findOne({ userId: demoUser._id });
  if (!demoCharacter) {
    demoCharacter = await Character.create({
      userId: demoUser._id,
      name: "Nova",
      level: 8,
      experience: 3200,
      health: 180,
      maxHealth: 180,
      energy: 125,
      maxEnergy: 125,
      credits: 2750,
      strength: 14,
      intelligence: 11,
      agility: 12,
      skills: { combat: 4, scavenging: 5, survival: 3, strategy: 2, crafting: 2 },
      currentLocation: "moon_junkyard",
    });
    console.log("Created demo player character: Nova");
  }

  // Demo guild — needs character ID for leader
  if (!demoGuild) {
    demoGuild = await Guild.create({
      name: "Iron Vanguard",
      tag: "IV",
      leaderId: demoCharacter._id,
      members: [demoCharacter._id],
      description: "Elite scavengers and warriors. First to arrive, last to fall.",
      level: 3,
      credits: 4000,
      marsRating: 850,
    });
    console.log("Created demo guild: Iron Vanguard");
  }
  // Always ensure the character is linked to the guild (handles re-seed edge cases)
  if (!demoCharacter.guildId || demoCharacter.guildId.toString() !== demoGuild._id.toString()) {
    demoCharacter.guildId = demoGuild._id as never;
    await demoCharacter.save();
  }

  // Demo admin account
  const { email: aEmail, password: aPass, username: aUser } = DEMO_CREDENTIALS.admin;
  let adminUser = await User.findOne({ email: aEmail });
  if (!adminUser) {
    const hash = await bcrypt.hash(aPass, 12);
    adminUser = await User.create({
      username: aUser,
      email: aEmail,
      passwordHash: hash,
      role: "admin",
      isVerified: true,
    });
    console.log("Created demo admin account");
  }

  let adminCharacter = await Character.findOne({ userId: adminUser._id });
  if (!adminCharacter) {
    adminCharacter = await Character.create({
      userId: adminUser._id,
      name: "Overseer",
      level: 20,
      experience: 48000,
      health: 300,
      maxHealth: 300,
      energy: 200,
      maxEnergy: 200,
      credits: 25000,
      strength: 22,
      intelligence: 28,
      agility: 20,
      skills: { combat: 10, scavenging: 8, survival: 9, strategy: 12, crafting: 7 },
      currentLocation: "mars",
      guildId: demoGuild._id as never,
    });
    console.log("Created demo admin character: Overseer");
  }

  // Test accounts
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
    const testChar = await Character.findOne({ userId: testUser._id });
    if (!testChar) {
      await Character.create({ userId: testUser._id, ...account.character });
      console.log(`Created test character: ${account.character.name}`);
    }
  }

  console.log("Seed complete.");
  return {
    demoCreds: DEMO_CREDENTIALS,
    testAccounts: TEST_ACCOUNTS.map((a) => ({ username: a.username, email: a.email, password: a.password, role: a.role })),
    guild: { name: demoGuild?.name, tag: demoGuild?.tag },
  };
}
