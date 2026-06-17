"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useGameStore } from "@/store/useGameStore";

// ── 133 skill names ───────────────────────────────────────────────────────
const SKILL_NAMES: string[] = [
  "Strength","Agility","Speed","Endurance","Power",
  "Resilience","Constitution","Dexterity","Fortitude","Stamina",
  "Vigor","Toughness","Might","Brawn","Hardiness",
  "Swiftness","Precision","Balance","Reflex","Coordination",
  "Intelligence","Wisdom","Perception","Focus","Clarity",
  "Intuition","Cunning","Strategy","Foresight","Memory",
  "Analysis","Awareness","Acuity","Insight","Deduction",
  "Lethality","Brutality","Ferocity","Fury","Berserker",
  "Duelist","Marksmanship","Bladework","Parry","Counter",
  "Feint","Assault","Warmonger","Slayer","Hunter",
  "Predator","Conqueror","Vanguard","Warlord","Reaper",
  "Stealth","Camouflage","Tracking","Foraging","Tenacity",
  "Perseverance","Willpower","Grit","Resolve","Adaptability",
  "Outlast","Scavenge","Wanderer","Endure","Fortify",
  "Charisma","Intimidation","Persuasion","Leadership","Command",
  "Authority","Influence","Presence","Dominance","Sovereign",
  "Curse","Hex","Blight","Shadow","Void",
  "Phantom","Wraith","Specter","Omen","Augury",
  "Prophecy","Entropy","Decay","Wither","Plague",
  "Corruption","Oblivion","Abyss","Nightmare","Dread",
  "Firestarter","Frostbite","Thunderstrike","Earthshaker","Galeforce",
  "Torrent","Radiance","Eclipse","Arcane","Mystic",
  "Sorcery","Conduit","Channeling",
  "Overdrive","Surge","Burst","Chain","Echo",
  "Resonance","Synergy","Cascade","Avalanche","Tempest",
  "Vortex","Nexus","Transcend","Ascend","Apex",
  "Pinnacle","Zenith","Convergence","Singularity","Revelation",
];

const ACTIVATE_COST = 50;
const upgradeCost = (level: number) => 50 * Math.pow(2, level);
const linkUpgradeCost = (weight: number) => 75 * Math.pow(2, weight - 1);

// ── Types ─────────────────────────────────────────────────────────────────
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
}

interface Link {
  id: number;
  fromId: number;
  toId: number;
  weight: number;
}

// ── Pure helpers ──────────────────────────────────────────────────────────
// 5× tighter than original spiral
function networkTarget(order: number, cx: number, cy: number) {
  if (order === 0) return { x: cx, y: cy };
  const angle = order * 2.399963229;
  const radius = (75 + 65 * Math.sqrt(order)) / 5;
  return { x: cx + Math.cos(angle) * radius, y: cy + Math.sin(angle) * radius };
}

function initParticles(W: number, H: number): Particle[] {
  const m = 30;
  return SKILL_NAMES.map((name, i) => ({
    id: i, name,
    x: m + Math.random() * (W - m * 2),
    y: m + Math.random() * (H - m * 2),
    vx: (Math.random() - 0.5) * 0.6,
    vy: (Math.random() - 0.5) * 0.6,
    activated: false, level: 1,
    targetX: W / 2, targetY: H / 2,
  }));
}

function levelColor(level: number) {
  return ["#00e5ff","#00ff88","#ffaa00","#ff6600","#ff2255"][Math.min(level - 1, 4)];
}

function linkColor(weight: number) {
  return `rgba(255,200,55,${Math.min(0.25 + weight * 0.12, 0.9)})`;
}

function distToSeg(px: number, py: number, ax: number, ay: number, bx: number, by: number) {
  const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy;
  if (l2 === 0) return Math.hypot(px - ax, py - ay);
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / l2));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

// ── Component ─────────────────────────────────────────────────────────────
export default function CurseTreePage() {
  const router = useRouter();
  const { user, setUser, setCharacter } = useGameStore();

  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const linksRef     = useRef<Link[]>([]);
  const frameRef     = useRef<number>(0);
  const dimRef       = useRef({ W: 800, H: 500 });
  const linkCtr      = useRef(0);

  // Selection / interaction refs — kept in sync with state each render
  const selParticleRef  = useRef<number | null>(null);
  const selLinkRef      = useRef<number | null>(null);
  const linkingFromRef  = useRef<number | null>(null);
  const actionLoadingRef = useRef(false);

  // ── React state (drives UI re-renders) ───────────────────────────────────
  // activatedMap: particle id → level  (source of truth for the panel)
  const [activatedMap, setActivatedMap] = useState<Map<number, number>>(new Map());
  const [linksState,   setLinksState]   = useState<Link[]>([]);
  const [selParticleId, setSelParticleId] = useState<number | null>(null);
  const [selLinkId,     setSelLinkId]     = useState<number | null>(null);
  const [linkingFromId, setLinkingFromId] = useState<number | null>(null);
  const [merits,        setMerits]        = useState(1000);
  const [pageReady,     setPageReady]     = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [statusMsg,     setStatusMsg]     = useState<string | null>(null);

  // Keep refs in sync (runs during render — safe)
  selParticleRef.current  = selParticleId;
  selLinkRef.current      = selLinkId;
  linkingFromRef.current  = linkingFromId;
  actionLoadingRef.current = actionLoading;

  // ── Stable helpers ────────────────────────────────────────────────────────
  const flash = useCallback((msg: string) => {
    setStatusMsg(msg);
    setTimeout(() => setStatusMsg(null), 2500);
  }, []);

  // create link — stable (reads only from refs + stable setters)
  const createLink = useCallback((fromId: number, toId: number) => {
    const fromP = particlesRef.current.find(p => p.id === fromId);
    const toP   = particlesRef.current.find(p => p.id === toId);
    if (!fromP || !toP) return;

    const exists = linksRef.current.some(
      l => (l.fromId === fromId && l.toId === toId) ||
           (l.fromId === toId   && l.toId === fromId)
    );
    if (exists) { setStatusMsg("Link already exists"); setTimeout(() => setStatusMsg(null), 2000); return; }

    const newLink: Link = { id: ++linkCtr.current, fromId, toId, weight: 1 };
    linksRef.current.push(newLink);
    setLinksState([...linksRef.current]);

    fetch("/api/curse-tree", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "addLink", from: fromP.name, to: toP.name }),
    })
      .then(r => r.json())
      .then(json => {
        if (!json.success) {
          linksRef.current = linksRef.current.filter(l => l.id !== newLink.id);
          setLinksState([...linksRef.current]);
          setStatusMsg(json.error ?? "Failed");
          setTimeout(() => setStatusMsg(null), 2000);
        } else {
          setStatusMsg(`${fromP.name} ↔ ${toP.name} linked!`);
          setTimeout(() => setStatusMsg(null), 2000);
        }
      })
      .catch(() => {
        linksRef.current = linksRef.current.filter(l => l.id !== newLink.id);
        setLinksState([...linksRef.current]);
      });
  }, []); // stable

  // ── Auth + load saved tree ────────────────────────────────────────────────
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
        setMerits(d2.data.merits ?? 1000);

        const saved: { skillId: string; level: number }[]          = d2.data.curseTree  ?? [];
        const savedLinks: { from: string; to: string; weight: number }[] = d2.data.curseLinks ?? [];

        const { W, H } = dimRef.current;
        const cx = W / 2, cy = H / 2;
        const particles = particlesRef.current;
        const newMap = new Map<number, number>();

        saved.forEach((node, order) => {
          const p = particles.find(q => q.name === node.skillId);
          if (!p) return;
          const t = networkTarget(order, cx, cy);
          p.activated = true;
          p.level = node.level;
          p.targetX = t.x; p.targetY = t.y;
          p.x = t.x; p.y = t.y;
          p.vx = 0; p.vy = 0;
          newMap.set(p.id, node.level);
        });
        setActivatedMap(newMap);

        const newLinks: Link[] = savedLinks.flatMap(sl => {
          const fromP = particles.find(p => p.name === sl.from);
          const toP   = particles.find(p => p.name === sl.to);
          if (!fromP || !toP) return [];
          return [{ id: ++linkCtr.current, fromId: fromP.id, toId: toP.id, weight: sl.weight }];
        });
        linksRef.current = newLinks;
        setLinksState(newLinks);
      }
      setPageReady(true);
    }
    init();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Canvas setup + animation loop ────────────────────────────────────────
  useEffect(() => {
    const container = containerRef.current;
    const canvas    = canvasRef.current;
    if (!container || !canvas) return;

    const W = container.clientWidth;
    const H = container.clientHeight;
    dimRef.current = { W, H };

    const dpr = window.devicePixelRatio || 1;
    canvas.width  = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width  = `${W}px`;
    canvas.style.height = `${H}px`;
    const ctx = canvas.getContext("2d")!;
    ctx.scale(dpr, dpr);

    particlesRef.current = initParticles(W, H);

    const MAX_SPEED = 0.65;
    const EDGE = 14, GRID = 72;

    function draw() {
      ctx.clearRect(0, 0, W, H);

      // Grid
      ctx.save();
      ctx.strokeStyle = "rgba(28,28,55,0.5)";
      ctx.lineWidth = 0.5;
      for (let x = 0; x <= W; x += GRID) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke(); }
      for (let y = 0; y <= H; y += GRID) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke(); }
      ctx.restore();

      const particles    = particlesRef.current;
      const links        = linksRef.current;
      const selP         = selParticleRef.current;
      const selL         = selLinkRef.current;
      const linkingFrom  = linkingFromRef.current;

      // ── Links ──
      for (const link of links) {
        const from = particles.find(p => p.id === link.fromId);
        const to   = particles.find(p => p.id === link.toId);
        if (!from || !to) continue;

        const isSel = selL === link.id;
        ctx.save();
        ctx.strokeStyle   = isSel ? "#ffe566" : linkColor(link.weight);
        ctx.lineWidth     = isSel ? link.weight + 2 : Math.max(1, link.weight);
        ctx.shadowBlur    = isSel ? 18 : 6;
        ctx.shadowColor   = isSel ? "#ffe566" : linkColor(link.weight);
        ctx.globalAlpha   = isSel ? 1 : 0.75;
        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.lineTo(to.x,   to.y);
        ctx.stroke();

        // Weight label
        if (link.weight > 1 || isSel) {
          const mx = (from.x + to.x) / 2, my = (from.y + to.y) / 2;
          ctx.shadowBlur = 0;
          ctx.font = "7px monospace";
          ctx.textAlign = "center";
          ctx.fillStyle = isSel ? "#ffe566" : "rgba(255,200,55,0.9)";
          ctx.globalAlpha = 1;
          ctx.fillText(`W${link.weight}`, mx, my - 5);
        }
        ctx.restore();
      }

      // ── Particles ──
      for (const p of particles) {
        // Movement
        if (p.activated) {
          const dx = p.targetX - p.x, dy = p.targetY - p.y;
          if (Math.hypot(dx, dy) > 0.5) { p.x += dx * 0.05; p.y += dy * 0.05; }
          else { p.x = p.targetX; p.y = p.targetY; }
        } else {
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

        const isSel     = selP === p.id;
        const isLinking = linkingFrom === p.id;
        const r = p.activated ? 5 + (p.level - 1) * 1.5 : isSel ? 5 : 3;

        ctx.save();
        if (p.activated || isSel || isLinking) {
          ctx.shadowBlur  = isLinking ? 26 : isSel ? 20 : 10 + (p.level - 1) * 4;
          ctx.shadowColor = isLinking ? "#ffaa00" : isSel ? "#00ffff" : levelColor(p.level);
        }

        // Linking ring
        if (isLinking) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, r + 6, 0, Math.PI * 2);
          ctx.strokeStyle = "#ffaa00";
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        ctx.fillStyle = isLinking ? "#ffaa00" : p.activated ? levelColor(p.level) : isSel ? "#00ffff" : "rgba(90,90,130,0.5)";
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.font = `${p.activated ? 9 : isSel ? 8 : 7}px monospace`;
        ctx.textAlign = "center";
        ctx.fillStyle = p.activated ? "#fff" : isSel ? "#00ffff" : "rgba(120,120,155,0.4)";
        ctx.fillText(p.name, p.x, p.y + r + 10);

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

  // ── Mouse / drag events ──────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // drag state (local to this effect, no stale closure issues)
    let drag: { id: number; startMX: number; startMY: number; startPX: number; startPY: number; moved: boolean } | null = null;

    function pos(e: MouseEvent) {
      const r = canvas!.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    }

    function nearestParticle(mx: number, my: number, threshold = 18) {
      let best: Particle | null = null, minD = threshold;
      for (const p of particlesRef.current) {
        const d = Math.hypot(p.x - mx, p.y - my);
        if (d < minD) { minD = d; best = p; }
      }
      return best;
    }

    function nearestLink(mx: number, my: number, threshold = 8) {
      for (const link of linksRef.current) {
        const from = particlesRef.current.find(p => p.id === link.fromId);
        const to   = particlesRef.current.find(p => p.id === link.toId);
        if (!from || !to) continue;
        if (distToSeg(mx, my, from.x, from.y, to.x, to.y) < threshold) return link;
      }
      return null;
    }

    function handleClick(mx: number, my: number) {
      const particle    = nearestParticle(mx, my);
      const linkingFrom = linkingFromRef.current;
      const curSelP     = selParticleRef.current;

      if (particle) {
        // In linking mode + clicked an activated target
        if (linkingFrom !== null && particle.activated && particle.id !== linkingFrom) {
          createLink(linkingFrom, particle.id);
          linkingFromRef.current = null; setLinkingFromId(null);
          selParticleRef.current = null; setSelParticleId(null);
          selLinkRef.current     = null; setSelLinkId(null);
          return;
        }
        // Normal click
        if (curSelP === particle.id) {
          selParticleRef.current = null; setSelParticleId(null);
        } else {
          selParticleRef.current = particle.id; setSelParticleId(particle.id);
          selLinkRef.current     = null;        setSelLinkId(null);
          linkingFromRef.current = null;        setLinkingFromId(null);
        }
      } else {
        const link = nearestLink(mx, my);
        if (link) {
          selLinkRef.current     = link.id; setSelLinkId(link.id);
          selParticleRef.current = null;    setSelParticleId(null);
          linkingFromRef.current = null;    setLinkingFromId(null);
        } else {
          selParticleRef.current = null; setSelParticleId(null);
          selLinkRef.current     = null; setSelLinkId(null);
          linkingFromRef.current = null; setLinkingFromId(null);
        }
      }
    }

    const onMouseDown = (e: MouseEvent) => {
      const { x, y } = pos(e);
      const p = nearestParticle(x, y);
      if (p?.activated) {
        drag = { id: p.id, startMX: x, startMY: y, startPX: p.x, startPY: p.y, moved: false };
      }
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!drag) return;
      const { x, y } = pos(e);
      const dx = x - drag.startMX, dy = y - drag.startMY;
      if (Math.hypot(dx, dy) > 4) {
        drag.moved = true;
        const p = particlesRef.current.find(q => q.id === drag!.id);
        if (p) { p.x = drag.startPX + dx; p.y = drag.startPY + dy; p.targetX = p.x; p.targetY = p.y; }
      }
    };

    const onMouseUp = (e: MouseEvent) => {
      const wasDrag = drag?.moved ?? false;
      drag = null;
      if (!wasDrag) {
        const { x, y } = pos(e);
        handleClick(x, y);
      }
    };

    canvas.addEventListener("mousedown", onMouseDown);
    canvas.addEventListener("mousemove", onMouseMove);
    canvas.addEventListener("mouseup",   onMouseUp);
    return () => {
      canvas.removeEventListener("mousedown", onMouseDown);
      canvas.removeEventListener("mousemove", onMouseMove);
      canvas.removeEventListener("mouseup",   onMouseUp);
    };
  // createLink is stable ([] deps); state setters are stable
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [createLink]);

  // ESC cancels linking mode
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        linkingFromRef.current = null; setLinkingFromId(null);
        selParticleRef.current = null; setSelParticleId(null);
        selLinkRef.current     = null; setSelLinkId(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // ── Skill activate ────────────────────────────────────────────────────────
  const activateSelected = useCallback(async () => {
    if (selParticleId === null || actionLoading) return;
    const p = particlesRef.current.find(q => q.id === selParticleId);
    if (!p || p.activated) return;
    if (merits < ACTIVATE_COST) { flash("Not enough merits!"); return; }

    setActionLoading(true);
    try {
      const res  = await fetch("/api/curse-tree", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "activate", skillId: p.name }) });
      const json = await res.json();
      if (!res.ok) { flash(json.error ?? "Failed"); return; }

      const order = particlesRef.current.filter(q => q.activated).length;
      const { W, H } = dimRef.current;
      const t = networkTarget(order, W / 2, H / 2);

      p.activated = true; p.level = 1;
      p.targetX = t.x; p.targetY = t.y;
      p.vx = 0; p.vy = 0;

      setMerits(json.data.merits);
      setActivatedMap(prev => new Map(prev).set(p.id, 1));
      flash(`${p.name} activated!`);
    } finally {
      setActionLoading(false);
    }
  }, [selParticleId, merits, actionLoading, flash]);

  // ── Skill upgrade ─────────────────────────────────────────────────────────
  const upgradeSelected = useCallback(async () => {
    if (selParticleId === null || actionLoading) return;
    const p    = particlesRef.current.find(q => q.id === selParticleId);
    const lvl  = activatedMap.get(selParticleId) ?? 1;
    if (!p || !p.activated) return;
    const cost = upgradeCost(lvl);
    if (merits < cost) { flash("Not enough merits!"); return; }

    setActionLoading(true);
    try {
      const res  = await fetch("/api/curse-tree", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "upgrade", skillId: p.name }) });
      const json = await res.json();
      if (!res.ok) { flash(json.error ?? "Failed"); return; }

      p.level = json.data.newLevel;
      setMerits(json.data.merits);
      setActivatedMap(prev => new Map(prev).set(p.id, json.data.newLevel));
      flash(`${p.name} → Level ${p.level}!`);
    } finally {
      setActionLoading(false);
    }
  }, [selParticleId, activatedMap, merits, actionLoading, flash]);

  // ── Link upgrade ──────────────────────────────────────────────────────────
  const upgradeLink = useCallback(async () => {
    if (selLinkId === null || actionLoading) return;
    const link = linksRef.current.find(l => l.id === selLinkId);
    if (!link) return;
    const cost = linkUpgradeCost(link.weight);
    if (merits < cost) { flash("Not enough merits!"); return; }

    const fromP = particlesRef.current.find(p => p.id === link.fromId);
    const toP   = particlesRef.current.find(p => p.id === link.toId);
    if (!fromP || !toP) return;

    setActionLoading(true);
    try {
      const res  = await fetch("/api/curse-tree", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "upgradeLink", from: fromP.name, to: toP.name }) });
      const json = await res.json();
      if (!res.ok) { flash(json.error ?? "Failed"); return; }

      link.weight = json.data.newWeight;
      setMerits(json.data.merits);
      setLinksState([...linksRef.current]);
      flash(`Link W${link.weight}!`);
    } finally {
      setActionLoading(false);
    }
  }, [selLinkId, merits, actionLoading, flash]);

  // ── Link remove ───────────────────────────────────────────────────────────
  const removeLink = useCallback(async () => {
    if (selLinkId === null || actionLoading) return;
    const link  = linksRef.current.find(l => l.id === selLinkId);
    if (!link) return;
    const fromP = particlesRef.current.find(p => p.id === link.fromId);
    const toP   = particlesRef.current.find(p => p.id === link.toId);
    if (!fromP || !toP) return;

    setActionLoading(true);
    try {
      const res  = await fetch("/api/curse-tree", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "removeLink", from: fromP.name, to: toP.name }) });
      const json = await res.json();
      if (!res.ok) { flash(json.error ?? "Failed"); return; }

      linksRef.current = linksRef.current.filter(l => l.id !== selLinkId);
      setLinksState([...linksRef.current]);
      selLinkRef.current = null; setSelLinkId(null);
      flash("Link removed");
    } finally {
      setActionLoading(false);
    }
  }, [selLinkId, actionLoading, flash]);

  // ── Derived UI values (read from React state for correctness) ─────────────
  const selParticle  = selParticleId !== null ? particlesRef.current.find(p => p.id === selParticleId) ?? null : null;
  const isActivated  = selParticleId !== null && activatedMap.has(selParticleId);
  const selLevel     = activatedMap.get(selParticleId ?? -1) ?? 1;
  const selLink      = selLinkId    !== null ? linksState.find(l => l.id === selLinkId) ?? null : null;
  const selLinkFromP = selLink      ? particlesRef.current.find(p => p.id === selLink.fromId) : null;
  const selLinkToP   = selLink      ? particlesRef.current.find(p => p.id === selLink.toId)   : null;
  const linkingFromP = linkingFromId !== null ? particlesRef.current.find(p => p.id === linkingFromId) : null;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="-mx-4 -mt-4 -mb-4 flex flex-col bg-black" style={{ height: "calc(100vh - 56px)", overflow: "hidden" }}>

      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-800 bg-[#05050f] shrink-0 gap-2 flex-wrap">
        <div className="flex items-center gap-3">
          <span className="text-sm font-mono font-bold text-purple-400 tracking-widest uppercase">Curse Tree</span>
          <span className="text-xs font-mono text-gray-600">
            {activatedMap.size}/{SKILL_NAMES.length} skills · {linksState.length} links
          </span>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {linkingFromId !== null && (
            <span className="text-xs font-mono text-yellow-400 animate-pulse">
              ⟶ Click activated skill to link from <strong>{linkingFromP?.name}</strong> · ESC cancel
            </span>
          )}
          {statusMsg && !linkingFromId && (
            <span className="text-xs font-mono text-cyan-400 animate-pulse">{statusMsg}</span>
          )}
          <div className="border border-purple-900/60 bg-purple-950/20 px-3 py-1 text-xs font-mono shrink-0">
            <span className="text-gray-500">MERITS </span>
            <span className="text-purple-300 font-bold">{merits.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Canvas */}
      <div ref={containerRef} className="relative flex-1 overflow-hidden cursor-crosshair">
        <canvas ref={canvasRef} className="block" />

        {!pageReady && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-xs font-mono text-gray-600 animate-pulse tracking-widest">INITIALIZING CURSE TREE...</span>
          </div>
        )}

        {/* Skill panel */}
        {selParticle && !selLink && (
          <div className="absolute bottom-5 left-1/2 -translate-x-1/2 border border-gray-700 bg-[#05050f]/95 backdrop-blur px-5 py-3 flex items-center gap-4 font-mono text-xs pointer-events-auto shadow-2xl">
            <div className="min-w-[110px]">
              <div className="text-gray-500 text-[10px] uppercase tracking-widest">Selected Skill</div>
              <div className="text-base font-bold mt-0.5" style={{ color: isActivated ? levelColor(selLevel) : "#00e5ff" }}>
                {selParticle.name}
              </div>
              {isActivated && <div className="text-gray-600">Level {selLevel}</div>}
            </div>

            <div className="w-px h-10 bg-gray-800" />

            {!isActivated ? (
              <div className="flex flex-col items-center gap-1">
                <button onClick={activateSelected} disabled={actionLoading || merits < ACTIVATE_COST}
                  className="px-4 py-1.5 border border-cyan-800 text-cyan-400 hover:bg-cyan-950/40 disabled:opacity-30 disabled:cursor-not-allowed transition-colors tracking-wider">
                  {actionLoading ? "..." : "ACTIVATE"}
                </button>
                <span className="text-[10px] text-gray-600">{ACTIVATE_COST} merits</span>
              </div>
            ) : (
              <>
                <div className="flex flex-col items-center gap-1">
                  <button onClick={upgradeSelected} disabled={actionLoading || merits < upgradeCost(selLevel)}
                    className="px-4 py-1.5 border border-purple-800 text-purple-400 hover:bg-purple-950/40 disabled:opacity-30 disabled:cursor-not-allowed transition-colors tracking-wider">
                    {actionLoading ? "..." : `UPGRADE L${selLevel}→L${selLevel + 1}`}
                  </button>
                  <span className="text-[10px] text-gray-600">{upgradeCost(selLevel).toLocaleString()} merits</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <button
                    onClick={() => { linkingFromRef.current = selParticleId; setLinkingFromId(selParticleId); }}
                    disabled={actionLoading || linkingFromId !== null}
                    className="px-4 py-1.5 border border-yellow-900 text-yellow-500 hover:bg-yellow-950/40 disabled:opacity-30 disabled:cursor-not-allowed transition-colors tracking-wider">
                    LINK TO...
                  </button>
                  <span className="text-[10px] text-gray-600">free</span>
                </div>
              </>
            )}

            <button onClick={() => { selParticleRef.current = null; setSelParticleId(null); linkingFromRef.current = null; setLinkingFromId(null); }}
              className="text-gray-600 hover:text-gray-400 px-1 text-base">✕</button>
          </div>
        )}

        {/* Link panel */}
        {selLink && !selParticle && (
          <div className="absolute bottom-5 left-1/2 -translate-x-1/2 border border-yellow-900/50 bg-[#05050f]/95 backdrop-blur px-5 py-3 flex items-center gap-4 font-mono text-xs pointer-events-auto shadow-2xl">
            <div className="min-w-[160px]">
              <div className="text-gray-500 text-[10px] uppercase tracking-widest">Selected Link</div>
              <div className="text-yellow-400 font-bold mt-0.5">
                {selLinkFromP?.name} ↔ {selLinkToP?.name}
              </div>
              <div className="text-gray-600">Weight {selLink.weight}</div>
            </div>

            <div className="w-px h-10 bg-gray-800" />

            <div className="flex flex-col items-center gap-1">
              <button onClick={upgradeLink} disabled={actionLoading || merits < linkUpgradeCost(selLink.weight)}
                className="px-4 py-1.5 border border-yellow-800 text-yellow-400 hover:bg-yellow-950/40 disabled:opacity-30 disabled:cursor-not-allowed transition-colors tracking-wider">
                {actionLoading ? "..." : `BOOST W${selLink.weight}→W${selLink.weight + 1}`}
              </button>
              <span className="text-[10px] text-gray-600">{linkUpgradeCost(selLink.weight).toLocaleString()} merits</span>
            </div>

            <div className="flex flex-col items-center gap-1">
              <button onClick={removeLink} disabled={actionLoading}
                className="px-4 py-1.5 border border-red-900/60 text-red-500 hover:bg-red-950/40 disabled:opacity-30 transition-colors tracking-wider">
                {actionLoading ? "..." : "REMOVE"}
              </button>
              <span className="text-[10px] text-gray-600">free</span>
            </div>

            <button onClick={() => { selLinkRef.current = null; setSelLinkId(null); }}
              className="text-gray-600 hover:text-gray-400 px-1 text-base">✕</button>
          </div>
        )}

        {/* Legend */}
        <div className="absolute top-3 right-3 border border-gray-800 bg-[#05050f]/80 px-3 py-2 text-[10px] font-mono space-y-1 pointer-events-none">
          <div className="text-gray-500 uppercase tracking-widest mb-1">Skill levels</div>
          {[1,2,3,4,5].map(l => (
            <div key={l} className="flex items-center gap-2 text-gray-600">
              <span className="w-2 h-2 rounded-full inline-block" style={{ background: levelColor(l), boxShadow: `0 0 4px ${levelColor(l)}` }} />
              L{l}
            </div>
          ))}
          <div className="text-gray-700 mt-2 pt-2 border-t border-gray-800 space-y-0.5">
            <div>Drag activated to move</div>
            <div>Click link to select</div>
          </div>
        </div>
      </div>
    </div>
  );
}
