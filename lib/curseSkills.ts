export const MAX_CURSE_LEVEL = 55;

export const SKILL_NAMES: string[] = [
  // Physical (0-19)
  "Strength","Agility","Speed","Endurance","Power",
  "Resilience","Constitution","Dexterity","Fortitude","Stamina",
  "Vigor","Toughness","Might","Brawn","Hardiness",
  "Swiftness","Precision","Balance","Reflex","Coordination",
  // Mental (20-34)
  "Intelligence","Wisdom","Perception","Focus","Clarity",
  "Intuition","Cunning","Strategy","Foresight","Memory",
  "Analysis","Awareness","Acuity","Insight","Deduction",
  // Combat (35-54)
  "Lethality","Brutality","Ferocity","Fury","Berserker",
  "Duelist","Marksmanship","Bladework","Parry","Counter",
  "Feint","Assault","Warmonger","Slayer","Hunter",
  "Predator","Conqueror","Vanguard","Warlord","Reaper",
  // Survival (55-69)
  "Stealth","Camouflage","Tracking","Foraging","Tenacity",
  "Perseverance","Willpower","Grit","Resolve","Adaptability",
  "Outlast","Scavenge","Wanderer","Endure","Fortify",
  // Social (70-79)
  "Charisma","Intimidation","Persuasion","Leadership","Command",
  "Authority","Influence","Presence","Dominance","Sovereign",
  // Curse/Dark (80-99)
  "Curse","Hex","Blight","Shadow","Void",
  "Phantom","Wraith","Specter","Omen","Augury",
  "Prophecy","Entropy","Decay","Wither","Plague",
  "Corruption","Oblivion","Abyss","Nightmare","Dread",
  // Elemental (100-112)
  "Firestarter","Frostbite","Thunderstrike","Earthshaker","Galeforce",
  "Torrent","Radiance","Eclipse","Arcane","Mystic",
  "Sorcery","Conduit","Channeling",
  // Special (113-132)
  "Overdrive","Surge","Burst","Chain","Echo",
  "Resonance","Synergy","Cascade","Avalanche","Tempest",
  "Vortex","Nexus","Transcend","Ascend","Apex",
  "Pinnacle","Zenith","Convergence","Singularity","Revelation",
];

export type StatKey = "strength" | "intelligence" | "agility";

// One stat per skill — index matches SKILL_NAMES
export const SKILL_STATS: StatKey[] = [
  // Physical (0-19): strength
  "strength","strength","strength","strength","strength",
  "strength","strength","strength","strength","strength",
  "strength","strength","strength","strength","strength",
  "strength","strength","strength","strength","strength",
  // Mental (20-34): intelligence
  "intelligence","intelligence","intelligence","intelligence","intelligence",
  "intelligence","intelligence","intelligence","intelligence","intelligence",
  "intelligence","intelligence","intelligence","intelligence","intelligence",
  // Combat (35-54): alternating str / agi
  "strength","agility","strength","agility","strength",
  "agility","strength","agility","strength","agility",
  "strength","agility","strength","agility","strength",
  "agility","strength","agility","strength","agility",
  // Survival (55-69): agility
  "agility","agility","agility","agility","agility",
  "agility","agility","agility","agility","agility",
  "agility","agility","agility","agility","agility",
  // Social (70-79): Charisma/int, Intimidation/str, Persuasion/int, Leadership/str,
  //   Command/str, Authority/str, Influence/int, Presence/agi, Dominance/str, Sovereign/str
  "intelligence","strength","intelligence","strength","strength",
  "strength","intelligence","agility","strength","strength",
  // Curse/Dark (80-99): alternating int / agi
  "intelligence","agility","intelligence","agility","intelligence",
  "agility","intelligence","agility","intelligence","agility",
  "intelligence","agility","intelligence","agility","intelligence",
  "agility","intelligence","agility","intelligence","agility",
  // Elemental (100-112): intelligence
  "intelligence","intelligence","intelligence","intelligence","intelligence",
  "intelligence","intelligence","intelligence","intelligence","intelligence",
  "intelligence","intelligence","intelligence",
  // Special (113-132): rotating str / int / agi
  "strength","intelligence","agility","strength","intelligence",
  "agility","strength","intelligence","agility","strength",
  "intelligence","agility","strength","intelligence","agility",
  "strength","intelligence","agility","strength","intelligence",
];

export const STAT_LABEL: Record<StatKey, string> = {
  strength:     "STR",
  intelligence: "INT",
  agility:      "AGI",
};

// Glow colour per stat (used on canvas for activated particles)
export const STAT_GLOW: Record<StatKey, string> = {
  strength:     "#ff6633",
  intelligence: "#33bbff",
  agility:      "#33ff88",
};
