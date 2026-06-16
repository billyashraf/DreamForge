"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useGameStore } from "@/store/useGameStore";

// ── 133 skill names ────────────────────────────────────────────────────────
const SKILL_NAMES: string[] = [
  // Physical (20)
  "Strength", "Agility", "Speed", "Endurance", "Power",
  "Resilience", "Constitution", "Dexterity", "Fortitude", "Stamina",
  "Vigor", "Toughness", "Might", "Brawn", "Hardiness",
  "Swiftness", "Precision", "Balance", "Reflex", "Coordination",
  // Mental (15)
  "Intelligence", "Wisdom", "Perception", "Focus", "Clarity",
  "Intuition", "Cunning", "Strategy", "Foresight", "Memory",
  "Analysis", "Awareness", "Acuity", "Insight", "Deduction",
  // Combat (20)
  "Lethality", "Brutality", "Ferocity", "Fury", "Berserker",
  "Duelist", "Marksmanship", "Bladework", "Parry", "Counter",
  "Feint", "Assault", "Warmonger", "Slayer", "Hunter",
  "Predator", "Conqueror", "Vanguard", "Warlord", "Reaper",
  // Survival (15)
  "Stealth", "Camouflage", "Tracking", "Foraging", "Tenacity",
  "Perseverance", "Willpower", "Grit", "Resolve", "Adaptability",
  "Outlast", "Scavenge", "Wanderer", "Endure", "Fortify",
  // Social (10)
  "Charisma", "Intimidation", "Persuasion", "Leadership", "Command",
  "Authority", "Influence", "Presence", "Dominance", "Sovereign",
  // Curse / Dark (20)
  "Curse", "Hex", "Blight", "Shadow", "Void",
  "Phantom", "Wraith", "Specter", "Omen", "Augury",
  "Prophecy", "Entropy", "Decay", "Wither", "Plague",
  "Corruption", "Oblivion", "Abyss", "Nightmare", "Dread",
  // Elemental (13)
  "Firestarter", "Frostbite", "Thunderstrike", "Earthshaker", "Galeforce",
  "Torrent", "Radiance", "Eclipse", "Arcane", "Mystic",
  "Sorcery", "Conduit", "Channeling",
  // Special (20)
  "Overdrive", "Surge", "Burst", "Chain", "Echo",
  "Resonance", "Synergy", "Cascade", "Avalanche", "Tempest",
  "Vortex", "Nexus", "Transcend", "Ascend", "Apex",
  "Pinnacle", "Zenith", "Convergence", "Singularity", "Revelation",
];

const ACTIVATE_COST = 50;

function upgradeCost(level: number): number {
  return 50 * Math.pow(2, level); // L1→L2: 100, L2→L3: 200, L3→L4: 400
}

// ── Particle types ──────────────────────────────────────────────────────────
interface Particle {
  id: number;
  name: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  activated: boolean;
  level: number;
  targetX: number;
  targetY: number;
  parentId: number | null;
  activateOrder: number; // -1 = not activated
}

// Golden-angle spiral layout for activated particles
function networkTarget(order: number, cx: number, cy: number): { x: number; y: number } {
  if (order === 0) return { x: cx, y: cy };
  const angle = order * 2.399963229; // golden angle in radians
  const radius = 75 + 65 * Math.sqrt(order);
  return { x: cx + Math.cos(angle) * radius, y: cy + Math.sin(angle) * radius };
}

function initParticles(W: number, H: number): Particle[] {
  const margin = 30;
  return SKILL_NAMES.map((name, i) => ({
    id: i,
    name,
    x: margin + Math.random() * (W - margin * 2),
    y: margin + Math.random() * (H - margin * 2),
    vx: (Math.random() - 0.5) * 0.6,
    vy: (Math.random() - 0.5) * 0.6,
    activated: false,
    level: 1,
    targetX: W / 2,
    targetY: H / 2,
    parentId: null,
    activateOrder: -1,
  }));
}

function levelColor(level: number): string {
  const c = ["#00e5ff", "#00ff88", "#ffaa00", "#ff6600", "#ff2255"];
  return c[Math.min(level - 1, c.length - 1)];
}

// ── Component ───────────────────────────────────────────────────────────────
export default function CurseTreePage() {
  const router = useRouter();
  const { user, setUser, setCharacter } = useGameStore();

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const frameRef = useRef<number>(0);
  const selectedRef = useRef<number | null>(null);
  const dimRef = useRef({ W: 800, H: 500 });

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [merits, setMerits] = useState(1000);
  const [activatedCount, setActivatedCount] = useState(0);
  const [pageReady, setPageReady] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  // ── Auth + load saved tree ──────────────────────────────────────────────
  useEffect(() => {
    async function init() {
      if (!user) {
        const r = await fetch("/api/auth/me");
        if (!r.ok) { router.push("/login"); return; }
        const d = await r.json();
        setUser(d.data.user);
        setCharacter(d.data.character);
        if (!d.data.character) { router.push("/character/create"); return; }
      }

      const r2 = await fetch("/api/curse-tree");
      if (r2.ok) {
        const d2 = await r2.json();
        const savedMerits: number = d2.data.merits ?? 1000;
        const saved: { skillId: string; level: number }[] = d2.data.curseTree ?? [];

        setMerits(savedMerits);

        const { W, H } = dimRef.current;
        const cx = W / 2, cy = H / 2;
        const particles = particlesRef.current;
        const activatedIds: number[] = [];

        saved.forEach((node, order) => {
          const p = particles.find((q) => q.name === node.skillId);
          if (!p) return;
          const t = networkTarget(order, cx, cy);
          p.activated = true;
          p.level = node.level;
          p.activateOrder = order;
          p.targetX = t.x;
          p.targetY = t.y;
          p.x = t.x;
          p.y = t.y;
          p.vx = 0;
          p.vy = 0;
          activatedIds.push(p.id);
        });

        // Wire parent connections
        for (let i = 1; i < activatedIds.length; i++) {
          const p = particles.find((q) => q.id === activatedIds[i])!;
          let nearestId = activatedIds[0];
          let minD = Infinity;
          for (let j = 0; j < i; j++) {
            const other = particles.find((q) => q.id === activatedIds[j])!;
            const d = Math.hypot(p.x - other.x, p.y - other.y);
            if (d < minD) { minD = d; nearestId = activatedIds[j]; }
          }
          p.parentId = nearestId;
        }

        setActivatedCount(activatedIds.length);
      }
      setPageReady(true);
    }
    init();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Canvas setup + animation loop ────────────────────────────────────────
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const W = container.clientWidth;
    const H = container.clientHeight;
    dimRef.current = { W, H };

    const dpr = window.devicePixelRatio || 1;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = `${W}px`;
    canvas.style.height = `${H}px`;
    const ctx = canvas.getContext("2d")!;
    ctx.scale(dpr, dpr);

    particlesRef.current = initParticles(W, H);

    const MAX_SPEED = 0.65;
    const EDGE = 14;
    const GRID = 72;

    function draw() {
      ctx.clearRect(0, 0, W, H);

      // Subtle grid
      ctx.save();
      ctx.strokeStyle = "rgba(28, 28, 55, 0.5)";
      ctx.lineWidth = 0.5;
      for (let x = 0; x <= W; x += GRID) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
      }
      for (let y = 0; y <= H; y += GRID) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
      }
      ctx.restore();

      const particles = particlesRef.current;
      const sel = selectedRef.current;

      // ── Draw connection lines ──
      for (const p of particles) {
        if (!p.activated || p.parentId === null) continue;
        const par = particles[p.parentId];
        if (!par) continue;
        const arriving = Math.hypot(p.targetX - p.x, p.targetY - p.y) > 3;
        ctx.save();
        ctx.globalAlpha = arriving ? 0.15 : 0.5;
        ctx.strokeStyle = levelColor(p.level);
        ctx.lineWidth = 1;
        ctx.shadowBlur = 8;
        ctx.shadowColor = levelColor(p.level);
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(par.x, par.y);
        ctx.stroke();
        ctx.restore();
      }

      // ── Update + draw particles ──
      for (const p of particles) {
        if (p.activated) {
          // Lerp to target
          const dx = p.targetX - p.x, dy = p.targetY - p.y;
          if (Math.hypot(dx, dy) > 0.5) {
            p.x += dx * 0.05;
            p.y += dy * 0.05;
          } else {
            p.x = p.targetX;
            p.y = p.targetY;
          }
        } else {
          // Brownian motion
          p.vx += (Math.random() - 0.5) * 0.18;
          p.vy += (Math.random() - 0.5) * 0.18;
          const sp = Math.hypot(p.vx, p.vy);
          if (sp > MAX_SPEED) { p.vx *= MAX_SPEED / sp; p.vy *= MAX_SPEED / sp; }
          p.x += p.vx; p.y += p.vy;
          if (p.x < EDGE)     { p.x = EDGE;     p.vx =  Math.abs(p.vx); }
          if (p.x > W - EDGE) { p.x = W - EDGE; p.vx = -Math.abs(p.vx); }
          if (p.y < EDGE)     { p.y = EDGE;     p.vy =  Math.abs(p.vy); }
          if (p.y > H - EDGE) { p.y = H - EDGE; p.vy = -Math.abs(p.vy); }
        }

        const isSelected = sel === p.id;
        const r = p.activated ? 5 + (p.level - 1) * 1.5 : isSelected ? 5 : 3;
        const color = p.activated
          ? levelColor(p.level)
          : isSelected ? "#00ffff" : "rgba(90, 90, 130, 0.5)";

        ctx.save();
        if (p.activated || isSelected) {
          ctx.shadowBlur = isSelected ? 20 : 10 + (p.level - 1) * 4;
          ctx.shadowColor = isSelected ? "#00ffff" : levelColor(p.level);
        }
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.shadowBlur = 0;

        // Label
        ctx.font = `${p.activated ? 9 : isSelected ? 8 : 7}px monospace`;
        ctx.textAlign = "center";
        ctx.fillStyle = p.activated
          ? "#ffffff"
          : isSelected ? "#00ffff" : "rgba(120, 120, 155, 0.45)";
        ctx.fillText(p.name, p.x, p.y + r + 10);

        // Level badge
        if (p.activated && p.level > 1) {
          ctx.font = "7px monospace";
          ctx.fillStyle = "#ffaa00";
          ctx.fillText(`L${p.level}`, p.x, p.y - r - 2);
        }

        ctx.restore();
      }

      frameRef.current = requestAnimationFrame(draw);
    }

    frameRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frameRef.current);
  }, []);

  // ── Click handler ─────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const onClick = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;

      let closest: Particle | null = null;
      let minD = 18;
      for (const p of particlesRef.current) {
        const d = Math.hypot(p.x - mx, p.y - my);
        if (d < minD) { minD = d; closest = p; }
      }

      if (closest) {
        if (selectedRef.current === closest.id) {
          selectedRef.current = null;
          setSelectedId(null);
        } else {
          selectedRef.current = closest.id;
          setSelectedId(closest.id);
        }
      } else {
        selectedRef.current = null;
        setSelectedId(null);
      }
    };

    canvas.addEventListener("click", onClick);
    return () => canvas.removeEventListener("click", onClick);
  }, []);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const flash = useCallback((msg: string) => {
    setStatusMsg(msg);
    setTimeout(() => setStatusMsg(null), 2500);
  }, []);

  const activateSelected = useCallback(async () => {
    if (selectedId === null || actionLoading) return;
    const p = particlesRef.current.find((q) => q.id === selectedId);
    if (!p || p.activated) return;
    if (merits < ACTIVATE_COST) { flash("Not enough merits!"); return; }

    setActionLoading(true);
    try {
      const res = await fetch("/api/curse-tree", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "activate", skillId: p.name }),
      });
      const json = await res.json();
      if (!res.ok) { flash(json.error ?? "Failed."); return; }

      setMerits(json.data.merits);

      const { W, H } = dimRef.current;
      const order = activatedCount;
      const t = networkTarget(order, W / 2, H / 2);

      // Connect to nearest already-activated particle
      const active = particlesRef.current.filter((q) => q.activated);
      let parentId: number | null = null;
      let minD = Infinity;
      for (const ap of active) {
        const d = Math.hypot(p.x - ap.x, p.y - ap.y);
        if (d < minD) { minD = d; parentId = ap.id; }
      }

      p.activated = true;
      p.level = 1;
      p.activateOrder = order;
      p.targetX = t.x;
      p.targetY = t.y;
      p.parentId = parentId;
      p.vx = 0;
      p.vy = 0;

      setActivatedCount((c) => c + 1);
      flash(`${p.name} activated!`);
    } finally {
      setActionLoading(false);
    }
  }, [selectedId, merits, activatedCount, actionLoading, flash]);

  const upgradeSelected = useCallback(async () => {
    if (selectedId === null || actionLoading) return;
    const p = particlesRef.current.find((q) => q.id === selectedId);
    if (!p || !p.activated) return;
    const cost = upgradeCost(p.level);
    if (merits < cost) { flash("Not enough merits!"); return; }

    setActionLoading(true);
    try {
      const res = await fetch("/api/curse-tree", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "upgrade", skillId: p.name }),
      });
      const json = await res.json();
      if (!res.ok) { flash(json.error ?? "Failed."); return; }

      setMerits(json.data.merits);
      p.level = json.data.newLevel;
      flash(`${p.name} → Level ${p.level}!`);
    } finally {
      setActionLoading(false);
    }
  }, [selectedId, merits, actionLoading, flash]);

  const selectedParticle =
    selectedId !== null ? particlesRef.current.find((p) => p.id === selectedId) ?? null : null;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div
      className="-mx-4 -mt-4 -mb-4 flex flex-col bg-black"
      style={{ height: "calc(100vh - 56px)", overflow: "hidden" }}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-800 bg-[#05050f] shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-sm font-mono font-bold text-purple-400 tracking-widest uppercase">
            Curse Tree
          </span>
          <span className="text-xs font-mono text-gray-600">
            {activatedCount} / {SKILL_NAMES.length} skills unlocked
          </span>
        </div>
        <div className="flex items-center gap-3">
          {statusMsg && (
            <span className="text-xs font-mono text-cyan-400 animate-pulse">{statusMsg}</span>
          )}
          <div className="border border-purple-900/60 bg-purple-950/20 px-3 py-1 text-xs font-mono">
            <span className="text-gray-500">MERITS</span>{" "}
            <span className="text-purple-300 font-bold">{merits.toLocaleString()}</span>
          </div>
          <div className="text-xs font-mono text-gray-700 hidden sm:block">
            Click particle → Activate / Upgrade
          </div>
        </div>
      </div>

      {/* Canvas */}
      <div ref={containerRef} className="relative flex-1 overflow-hidden cursor-crosshair">
        <canvas ref={canvasRef} className="block" />

        {!pageReady && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-xs font-mono text-gray-600 animate-pulse tracking-widest">
              INITIALIZING CURSE TREE...
            </span>
          </div>
        )}

        {/* Selected skill panel */}
        {selectedParticle && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 border border-gray-700 bg-[#05050f]/95 backdrop-blur px-5 py-3 flex items-center gap-5 font-mono text-xs pointer-events-auto shadow-2xl">
            <div className="min-w-[100px]">
              <div className="text-gray-500 text-[10px] uppercase tracking-widest">Selected</div>
              <div
                className="text-base font-bold mt-0.5"
                style={{
                  color: selectedParticle.activated
                    ? levelColor(selectedParticle.level)
                    : "#00e5ff",
                }}
              >
                {selectedParticle.name}
              </div>
              {selectedParticle.activated && (
                <div className="text-gray-600 mt-0.5">
                  Level {selectedParticle.level}
                  {selectedParticle.level > 1 && (
                    <span className="text-yellow-600 ml-1">★</span>
                  )}
                </div>
              )}
            </div>

            <div className="w-px h-10 bg-gray-800" />

            {!selectedParticle.activated ? (
              <div className="flex flex-col items-center gap-1">
                <button
                  onClick={activateSelected}
                  disabled={actionLoading || merits < ACTIVATE_COST}
                  className="px-4 py-1.5 border border-cyan-800 text-cyan-400 hover:bg-cyan-950/40 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-xs font-mono tracking-wider"
                >
                  {actionLoading ? "PROCESSING..." : "ACTIVATE"}
                </button>
                <span className="text-[10px] text-gray-600">{ACTIVATE_COST} merits</span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-1">
                <button
                  onClick={upgradeSelected}
                  disabled={actionLoading || merits < upgradeCost(selectedParticle.level)}
                  className="px-4 py-1.5 border border-purple-800 text-purple-400 hover:bg-purple-950/40 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-xs font-mono tracking-wider"
                >
                  {actionLoading ? "PROCESSING..." : `UPGRADE L${selectedParticle.level} → L${selectedParticle.level + 1}`}
                </button>
                <span className="text-[10px] text-gray-600">
                  {upgradeCost(selectedParticle.level).toLocaleString()} merits
                </span>
              </div>
            )}

            <button
              onClick={() => {
                selectedRef.current = null;
                setSelectedId(null);
              }}
              className="text-gray-600 hover:text-gray-400 px-1 text-base"
            >
              ✕
            </button>
          </div>
        )}

        {/* Legend */}
        <div className="absolute top-3 right-3 border border-gray-800 bg-[#05050f]/80 px-3 py-2 text-[10px] font-mono text-gray-600 space-y-1 pointer-events-none">
          <div className="text-gray-500 uppercase tracking-widest mb-1">Level Colors</div>
          {[
            { l: 1, label: "L1 — Active" },
            { l: 2, label: "L2 — Enhanced" },
            { l: 3, label: "L3 — Empowered" },
            { l: 4, label: "L4 — Dominant" },
            { l: 5, label: "L5 — Cursed" },
          ].map(({ l, label }) => (
            <div key={l} className="flex items-center gap-2">
              <span
                className="inline-block w-2 h-2 rounded-full"
                style={{ background: levelColor(l), boxShadow: `0 0 4px ${levelColor(l)}` }}
              />
              <span>{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
