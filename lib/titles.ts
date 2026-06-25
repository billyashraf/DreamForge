export interface TitleDef {
  id: string;
  label: string;
  min: number;
  max: number;
  color: string;
  icon: string;
}

export const TITLES: TitleDef[] = [
  { id: "scavenger",       label: "Scavenger",       min: 1,   max: 50,  color: "#6b7280", icon: "⚙" },
  { id: "monster-hunter",  label: "Monster Hunter",  min: 51,  max: 100, color: "#22c55e", icon: "⚔" },
  { id: "beast-tamer",     label: "Beast Tamer",     min: 101, max: 150, color: "#06b6d4", icon: "◉" },
  { id: "hacker",          label: "Hacker",          min: 151, max: 200, color: "#7c3aed", icon: "◈" },
  { id: "beast-hunter",    label: "Beast Hunter",    min: 201, max: 250, color: "#d97706", icon: "◆" },
  { id: "architect",       label: "Architect",       min: 251, max: 300, color: "#0284c7", icon: "◧" },
  { id: "system-engineer", label: "System Engineer", min: 301, max: 350, color: "#3b82f6", icon: "◎" },
  { id: "beast-slayer",    label: "Beast Slayer",    min: 351, max: 400, color: "#dc2626", icon: "◤" },
  { id: "scientist",       label: "Scientist",       min: 401, max: 450, color: "#a855f7", icon: "◫" },
  { id: "sage",            label: "Sage",            min: 451, max: 500, color: "#f59e0b", icon: "✦" },
];

export function getTitle(level: number): TitleDef {
  return TITLES.find((t) => level >= t.min && level <= t.max) ?? TITLES[TITLES.length - 1];
}

export function getNextTitle(current: TitleDef): TitleDef | null {
  const idx = TITLES.indexOf(current);
  return idx < TITLES.length - 1 ? TITLES[idx + 1] : null;
}
