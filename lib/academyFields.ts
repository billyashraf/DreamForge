export const MAX_ACADEMY_LEVEL = 700;
export const UNLOCK_COST = 50;
export const upgradeCost = (level: number) =>
  Math.floor(100 * Math.pow(level, 1.2));

export type AcademyStat = "intelligence" | "agility";

export interface AcademyField {
  id: string;
  parent: string | null;
  label: string;
  stat: AcademyStat;
}

export const ACADEMY_FIELDS: AcademyField[] = [
  // Root
  { id: "philosophy",          parent: null,               label: "Philosophy",         stat: "intelligence" },
  // Depth 1
  { id: "logic",               parent: "philosophy",       label: "Logic",              stat: "intelligence" },
  { id: "natural-phil",        parent: "philosophy",       label: "Natural Philosophy", stat: "intelligence" },
  { id: "epistemology",        parent: "philosophy",       label: "Epistemology",       stat: "intelligence" },
  { id: "social-phil",         parent: "philosophy",       label: "Social Philosophy",  stat: "agility"      },
  { id: "humanities",          parent: "philosophy",       label: "Humanities",         stat: "intelligence" },
  // Logic children
  { id: "mathematics",         parent: "logic",            label: "Mathematics",        stat: "intelligence" },
  { id: "computer-science",    parent: "logic",            label: "Computer Science",   stat: "intelligence" },
  // Natural Philosophy children
  { id: "physics",             parent: "natural-phil",     label: "Physics",            stat: "intelligence" },
  { id: "chemistry",           parent: "natural-phil",     label: "Chemistry",          stat: "intelligence" },
  { id: "biology",             parent: "natural-phil",     label: "Biology",            stat: "intelligence" },
  { id: "astronomy",           parent: "natural-phil",     label: "Astronomy",          stat: "intelligence" },
  // Epistemology children
  { id: "metaphysics",         parent: "epistemology",     label: "Metaphysics",        stat: "intelligence" },
  { id: "ethics",              parent: "epistemology",     label: "Ethics",             stat: "agility"      },
  { id: "psychology",          parent: "epistemology",     label: "Psychology",         stat: "intelligence" },
  // Social Philosophy children
  { id: "political-science",   parent: "social-phil",      label: "Political Science",  stat: "agility"      },
  { id: "economics",           parent: "social-phil",      label: "Economics",          stat: "intelligence" },
  { id: "sociology",           parent: "social-phil",      label: "Sociology",          stat: "agility"      },
  // Humanities children
  { id: "history",             parent: "humanities",       label: "History",            stat: "intelligence" },
  { id: "linguistics",         parent: "humanities",       label: "Linguistics",        stat: "intelligence" },
  { id: "arts",                parent: "humanities",       label: "Arts & Aesthetics",  stat: "agility"      },
  // Mathematics children
  { id: "algebra",             parent: "mathematics",      label: "Algebra",            stat: "intelligence" },
  { id: "geometry",            parent: "mathematics",      label: "Geometry",           stat: "intelligence" },
  { id: "calculus",            parent: "mathematics",      label: "Calculus",           stat: "intelligence" },
  { id: "statistics",          parent: "mathematics",      label: "Statistics",         stat: "intelligence" },
  // Computer Science children
  { id: "algorithms",          parent: "computer-science", label: "Algorithms",         stat: "intelligence" },
  { id: "machine-learning",    parent: "computer-science", label: "Machine Learning",   stat: "intelligence" },
  // Physics children
  { id: "classic-mechanics",   parent: "physics",          label: "Classical Mechanics",stat: "intelligence" },
  { id: "thermodynamics",      parent: "physics",          label: "Thermodynamics",     stat: "intelligence" },
  { id: "electromagnetism",    parent: "physics",          label: "Electromagnetism",   stat: "intelligence" },
  { id: "quantum-mechanics",   parent: "physics",          label: "Quantum Mechanics",  stat: "intelligence" },
  // Chemistry children
  { id: "organic-chem",        parent: "chemistry",        label: "Organic Chemistry",  stat: "intelligence" },
  { id: "biochemistry",        parent: "chemistry",        label: "Biochemistry",       stat: "intelligence" },
  { id: "materials-science",   parent: "chemistry",        label: "Materials Science",  stat: "intelligence" },
  // Biology children
  { id: "genetics",            parent: "biology",          label: "Genetics",           stat: "intelligence" },
  { id: "neuroscience",        parent: "biology",          label: "Neuroscience",       stat: "intelligence" },
  { id: "ecology",             parent: "biology",          label: "Ecology",            stat: "agility"      },
  // Astronomy children
  { id: "astrophysics",        parent: "astronomy",        label: "Astrophysics",       stat: "intelligence" },
  { id: "cosmology",           parent: "astronomy",        label: "Cosmology",          stat: "intelligence" },
  // Psychology children
  { id: "cognitive-science",   parent: "psychology",       label: "Cognitive Science",  stat: "intelligence" },
  { id: "behavioral-science",  parent: "psychology",       label: "Behavioral Science", stat: "agility"      },
  // Political Science children
  { id: "jurisprudence",       parent: "political-science",label: "Jurisprudence",      stat: "agility"      },
  // Economics children
  { id: "game-theory",         parent: "economics",        label: "Game Theory",        stat: "intelligence" },
  // Sociology children
  { id: "anthropology",        parent: "sociology",        label: "Anthropology",       stat: "agility"      },
  // History children
  { id: "archaeology",         parent: "history",          label: "Archaeology",        stat: "agility"      },
  // Linguistics children
  { id: "semiotics",           parent: "linguistics",      label: "Semiotics",          stat: "intelligence" },
  // Arts children
  { id: "music-theory",        parent: "arts",             label: "Music Theory",       stat: "agility"      },
  { id: "literature",          parent: "arts",             label: "Literature",         stat: "intelligence" },
  // Algebra children
  { id: "linear-algebra",         parent: "algebra",           label: "Linear Algebra",          stat: "intelligence" },
  { id: "abstract-algebra",       parent: "algebra",           label: "Abstract Algebra",         stat: "intelligence" },
  // Calculus children
  { id: "differential-equations", parent: "calculus",          label: "Differential Equations",  stat: "intelligence" },
  { id: "complex-analysis",       parent: "calculus",          label: "Complex Analysis",         stat: "intelligence" },
  // Statistics children
  { id: "probability-theory",     parent: "statistics",        label: "Probability Theory",       stat: "intelligence" },
  { id: "data-science",           parent: "statistics",        label: "Data Science",             stat: "intelligence" },
  // Algorithms children
  { id: "graph-theory",           parent: "algorithms",        label: "Graph Theory",             stat: "intelligence" },
  { id: "complexity-theory",      parent: "algorithms",        label: "Complexity Theory",        stat: "intelligence" },
  // Machine Learning children
  { id: "neural-networks",        parent: "machine-learning",  label: "Neural Networks",          stat: "intelligence" },
  { id: "reinforcement-learning", parent: "machine-learning",  label: "Reinforcement Learning",   stat: "intelligence" },
  { id: "computer-vision",        parent: "machine-learning",  label: "Computer Vision",          stat: "intelligence" },
  // Quantum Mechanics children
  { id: "quantum-computing",      parent: "quantum-mechanics", label: "Quantum Computing",        stat: "intelligence" },
  { id: "quantum-field-theory",   parent: "quantum-mechanics", label: "Quantum Field Theory",     stat: "intelligence" },
  // Materials Science children
  { id: "nanotechnology",         parent: "materials-science", label: "Nanotechnology",           stat: "intelligence" },
  { id: "metamaterials",          parent: "materials-science", label: "Metamaterials",            stat: "intelligence" },
  // Genetics children
  { id: "genomics",               parent: "genetics",          label: "Genomics",                 stat: "intelligence" },
  { id: "epigenetics",            parent: "genetics",          label: "Epigenetics",              stat: "intelligence" },
  // Neuroscience children
  { id: "neuromorphic-computing", parent: "neuroscience",      label: "Neuromorphic Computing",   stat: "intelligence" },
  { id: "brain-mapping",          parent: "neuroscience",      label: "Brain Mapping",            stat: "intelligence" },
  // Astrophysics children
  { id: "planetary-science",      parent: "astrophysics",      label: "Planetary Science",        stat: "intelligence" },
  { id: "dark-matter",            parent: "astrophysics",      label: "Dark Matter",              stat: "intelligence" },
  // Cognitive Science children
  { id: "consciousness-studies",  parent: "cognitive-science", label: "Consciousness Studies",    stat: "intelligence" },
  { id: "cognitive-linguistics",  parent: "cognitive-science", label: "Cognitive Linguistics",    stat: "intelligence" },
  // Game Theory children
  { id: "mechanism-design",       parent: "game-theory",       label: "Mechanism Design",         stat: "intelligence" },
  // Metaphysics children
  { id: "ontology",               parent: "metaphysics",       label: "Ontology",                 stat: "intelligence" },
  { id: "philosophy-of-mind",     parent: "metaphysics",       label: "Philosophy of Mind",       stat: "intelligence" },
];

const LEAF_SPACING = 72;
const LEVEL_HEIGHT = 130;
const TOP_PADDING  = 70;

export function computeAcademyLayout(): Map<string, { x: number; y: number }> {
  const childrenMap = new Map<string | null, string[]>();
  const depthMap    = new Map<string, number>();

  childrenMap.set(null, []);
  for (const f of ACADEMY_FIELDS) {
    if (!childrenMap.has(f.parent)) childrenMap.set(f.parent, []);
    childrenMap.get(f.parent)!.push(f.id);
    if (!childrenMap.has(f.id)) childrenMap.set(f.id, []);
  }

  function setDepth(id: string, d: number) {
    depthMap.set(id, d);
    for (const c of childrenMap.get(id) ?? []) setDepth(c, d + 1);
  }
  for (const r of childrenMap.get(null) ?? []) setDepth(r, 0);

  let leafIdx = 0;
  const leafPosMap = new Map<string, number>();
  function assignLeaves(id: string) {
    const children = childrenMap.get(id) ?? [];
    if (children.length === 0) { leafPosMap.set(id, leafIdx++); return; }
    for (const c of children) assignLeaves(c);
  }
  for (const r of childrenMap.get(null) ?? []) assignLeaves(r);

  function leafRange(id: string): [number, number] {
    const children = childrenMap.get(id) ?? [];
    if (children.length === 0) { const v = leafPosMap.get(id)!; return [v, v]; }
    const ranges = children.map(leafRange);
    return [ranges[0][0], ranges[ranges.length - 1][1]];
  }

  const positions = new Map<string, { x: number; y: number }>();
  function assignPositions(id: string) {
    const [l, r] = leafRange(id);
    positions.set(id, {
      x: ((l + r) / 2) * LEAF_SPACING,
      y: depthMap.get(id)! * LEVEL_HEIGHT + TOP_PADDING,
    });
    for (const c of childrenMap.get(id) ?? []) assignPositions(c);
  }
  for (const r of childrenMap.get(null) ?? []) assignPositions(r);

  return positions;
}

// 12 color grades across MAX_ACADEMY_LEVEL (700)
export function academyLevelColor(level: number): string {
  if (level <= 50)  return "#00e5ff";
  if (level <= 100) return "#00ccee";
  if (level <= 150) return "#00ffcc";
  if (level <= 200) return "#00ff88";
  if (level <= 250) return "#55ff44";
  if (level <= 300) return "#aaff00";
  if (level <= 350) return "#ffee00";
  if (level <= 400) return "#ffaa00";
  if (level <= 450) return "#ff5500";
  if (level <= 500) return "#ffd700";
  if (level <= 600) return "#e879f9";
  return "#ffffff";
}

export const ACADEMY_STAT_GLOW: Record<AcademyStat, string> = {
  intelligence: "#33bbff",
  agility:      "#33ff88",
};

export const ACADEMY_STAT_LABEL: Record<AcademyStat, string> = {
  intelligence: "INT",
  agility:      "AGI",
};

export function buildAcademyChildrenMap(): Map<string | null, string[]> {
  const m = new Map<string | null, string[]>();
  m.set(null, []);
  for (const f of ACADEMY_FIELDS) {
    if (!m.has(f.parent)) m.set(f.parent, []);
    m.get(f.parent)!.push(f.id);
  }
  return m;
}
