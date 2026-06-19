export type ShadowFormId =
  | "saber" | "assassin" | "archer" | "rider"
  | "berserker" | "lancer" | "caster";

export interface ShadowForm {
  id: ShadowFormId;
  label: string;
  description: string;
  lore: string;
  color: string;
  glow: string;
  statBonus: string;
  unlocks: string;
  // Position in SVG (pre-computed). Center node has isCenter=true.
  isCenter?: boolean;
}

// Hexagon: pointy-top, R=175, center=(250,250)
// Angles: Assassin=top, going clockwise → Archer, Rider, Berserker, Lancer, Caster
const R  = 175;
const cx = 250;
const cy = 250;

function hex(angleDeg: number): { x: number; y: number } {
  const a = (angleDeg * Math.PI) / 180;
  return { x: cx + R * Math.cos(a), y: cy + R * Math.sin(a) };
}

export const FORM_POSITIONS: Record<ShadowFormId, { x: number; y: number }> = {
  saber:     { x: cx, y: cy },
  assassin:  hex(-90),   // top
  archer:    hex(-30),   // top-right
  rider:     hex(30),    // bottom-right
  berserker: hex(90),    // bottom
  lancer:    hex(150),   // bottom-left
  caster:    hex(210),   // top-left
};

export const SHADOW_FORMS: ShadowForm[] = [
  {
    id: "saber",
    label: "Saber",
    description: "Sovereign of the blade",
    lore: "The balanced warrior who stands at the convergence of all paths. Those who embody Saber walk between worlds, executing missions and writing history.",
    color: "#ffd700",
    glow: "#ffd70099",
    statBonus: "STR + INT + AGI",
    unlocks: "Missions · Commit Log",
    isCenter: true,
  },
  {
    id: "assassin",
    label: "Assassin",
    description: "Ghost of the shadows",
    lore: "Speed and silence are your weapons. You exist between heartbeats, striking before your enemy draws breath.",
    color: "#a855f7",
    glow: "#a855f799",
    statBonus: "AGI ×2",
    unlocks: "–",
  },
  {
    id: "archer",
    label: "Archer",
    description: "Eye of infinite distance",
    lore: "Your gaze pierces fog and distance alike. Every calculation is a shot already fired.",
    color: "#22c55e",
    glow: "#22c55e99",
    statBonus: "AGI + INT",
    unlocks: "–",
  },
  {
    id: "rider",
    label: "Rider",
    description: "Master of the boundless road",
    lore: "Swift and adaptable, Rider transcends terrain. Scholars say the greatest minds first learned to ride — and so Academia opens only to the Rider.",
    color: "#06b6d4",
    glow: "#06b6d499",
    statBonus: "AGI + STR",
    unlocks: "Academy",
  },
  {
    id: "berserker",
    label: "Berserker",
    description: "Fury made manifest",
    lore: "You do not fight. You become the storm itself. Rage strips away doubt, leaving only overwhelming force.",
    color: "#ef4444",
    glow: "#ef444499",
    statBonus: "STR ×2",
    unlocks: "–",
  },
  {
    id: "lancer",
    label: "Lancer",
    description: "The piercing resolve",
    lore: "Your lance is an extension of your will. Straight, true, and unstoppable — you break through every barrier.",
    color: "#3b82f6",
    glow: "#3b82f699",
    statBonus: "STR + AGI",
    unlocks: "–",
  },
  {
    id: "caster",
    label: "Caster",
    description: "Architect of the arcane",
    lore: "Reality bends to your formulae. Where others see limits, you see variables — and variables can always be changed.",
    color: "#8b5cf6",
    glow: "#8b5cf699",
    statBonus: "INT ×2",
    unlocks: "–",
  },
];

export const FORM_MAP = new Map(SHADOW_FORMS.map(f => [f.id, f]));
