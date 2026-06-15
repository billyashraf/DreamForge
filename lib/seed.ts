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
    rewards: { experience: 50, credits: 75 },
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
    rewards: { experience: 80, credits: 50 },
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
    rewards: { experience: 60, credits: 100 },
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
    rewards: { experience: 100, credits: 150 },
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
    rewards: { experience: 200, credits: 250 },
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
    rewards: { experience: 500, credits: 600 },
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
    rewards: { experience: 300, credits: 400 },
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
    rewards: { experience: 600, credits: 700 },
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
    rewards: { experience: 1000, credits: 1500 },
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
    rewards: { experience: 3000, credits: 5000 },
    requirements: { level: 20 },
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
    demoCharacter.guildId = demoGuild._id as never;
    await demoCharacter.save();
    console.log("Created demo guild: Iron Vanguard");
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

  console.log("Seed complete.");
  return {
    demoCreds: DEMO_CREDENTIALS,
    guild: { name: demoGuild?.name, tag: demoGuild?.tag },
  };
}
