"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useGameStore } from "@/store/useGameStore";
import { SKILL_NAMES, SKILL_STATS, STAT_LABEL, STAT_GLOW, MAX_CURSE_LEVEL } from "@/lib/curseSkills";

const ACTIVATE_COST   = 50;
const upgradeCost     = (level:  number) => 50 * Math.pow(2, level);
const linkUpgradeCost = (weight: number) => 75 * Math.pow(2, weight - 1);

// ── Types ─────────────────────────────────────────────────────────────────
interface Particle {
  id: number; name: string;
  x: number;  y: number;
  vx: number; vy: number;
  activated: boolean; level: number;
  targetX: number; targetY: number;
}

interface Link {
  id: number; fromId: number; toId: number; weight: number;
}

// ── Pure helpers ──────────────────────────────────────────────────────────
function networkTarget(order: number, cx: number, cy: number) {
  if (order === 0) return { x: cx, y: cy };
  const a = order * 2.399963229;
  const r = (75 + 65 * Math.sqrt(order)) / 5;
  return { x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r };
}

function initParticles(W: number, H: number): Particle[] {
  const m = 30;
  return SKILL_NAMES.map((name, i) => ({
    id: i, name,
    x:  m + Math.random() * (W - m * 2),
    y:  m + Math.random() * (H - m * 2),
    vx: (Math.random() - 0.5) * 0.6,
    vy: (Math.random() - 0.5) * 0.6,
    activated: false, level: 1,
    targetX: W / 2, targetY: H / 2,
  }));
}

// 8 color grades across MAX_CURSE_LEVEL (55)
function levelColor(level: number): string {
  if (level <= 7)  return "#00e5ff";
  if (level <= 14) return "#00ffcc";
  if (level <= 21) return "#00ff88";
  if (level <= 28) return "#aaff00";
  if (level <= 35) return "#ffee00";
  if (level <= 42) return "#ffaa00";
  if (level <= 49) return "#ff6600";
  return "#ff2255";
}

// Link color shifts with weight (6 tiers)
function linkColor(weight: number): string {
  if (weight <= 1) return "rgba(255,200,55,0.50)";
  if (weight <= 2) return "rgba(255,160,40,0.62)";
  if (weight <= 3) return "rgba(255,110,20,0.72)";
  if (weight <= 4) return "rgba(255,60,40,0.78)";
  if (weight <= 5) return "rgba(220,30,100,0.84)";
  return              "rgba(180,0,220,0.88)";
}

function linkSelColor(weight: number): string {
  if (weight >= 5) return "#dd44ff";
  if (weight >= 3) return "#ff8855";
  return "#ffe566";
}

// Particle radius scales meaningfully with level: level 1 → 5px, level 55 → 32px
function particleRadius(level: number): number {
  return 5 + Math.max(0, level - 1) * 0.5;
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
  const xfRef        = useRef({ scale: 1, ox: 0, oy: 0 });

  const selParticleRef  = useRef<number | null>(null);
  const selLinkRef      = useRef<number | null>(null);
  const linkingFromRef  = useRef<number | null>(null);

  // ── React state (UI) ──────────────────────────────────────────────────────
  const [activatedMap, setActivatedMap] = useState<Map<number, number>>(new Map());
  const [linksState,   setLinksState]   = useState<Link[]>([]);
  const [selParticleId, setSelParticleId] = useState<number | null>(null);
  const [selLinkId,     setSelLinkId]     = useState<number | null>(null);
  const [linkingFromId, setLinkingFromId] = useState<number | null>(null);
  const [merits,        setMerits]        = useState(1000);
  const [pageReady,     setPageReady]     = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [statusMsg,     setStatusMsg]     = useState<string | null>(null);

  selParticleRef.current = selParticleId;
  selLinkRef.current     = selLinkId;
  linkingFromRef.current = linkingFromId;

  // ── Stable helpers ────────────────────────────────────────────────────────
  const flash = useCallback((msg: string) => {
    setStatusMsg(msg);
    setTimeout(() => setStatusMsg(null), 2500);
  }, []);

  const createLink = useCallback((fromId: number, toId: number) => {
    const fromP = particlesRef.current.find(p => p.id === fromId);
    const toP   = particlesRef.current.find(p => p.id === toId);
    if (!fromP || !toP) return;
    if (linksRef.current.some(l =>
      (l.fromId === fromId && l.toId === toId) ||
      (l.fromId === toId   && l.toId === fromId)
    )) { setStatusMsg("Link exists"); setTimeout(() => setStatusMsg(null), 1500); return; }

    const nl: Link = { id: ++linkCtr.current, fromId, toId, weight: 1 };
    linksRef.current.push(nl);
    setLinksState([...linksRef.current]);

    fetch("/api/curse-tree", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "addLink", from: fromP.name, to: toP.name }),
    })
      .then(r => r.json())
      .then(j => {
        if (!j.success) {
          linksRef.current = linksRef.current.filter(l => l.id !== nl.id);
          setLinksState([...linksRef.current]);
          setStatusMsg(j.error ?? "Failed"); setTimeout(() => setStatusMsg(null), 2000);
        } else {
          setStatusMsg(`${fromP.name} ↔ ${toP.name}`);
          setTimeout(() => setStatusMsg(null), 1500);
        }
      })
      .catch(() => {
        linksRef.current = linksRef.current.filter(l => l.id !== nl.id);
        setLinksState([...linksRef.current]);
      });
  }, []);

  // ── Auth + load saved tree ─────────────────────────────────────────────────
  useEffect(() => {
    async function init() {
      if (!user) {
        const r = await fetch("/api/auth/me");
        if (!r.ok) { router.push("/login"); return; }
        const d = await r.json();
        setUser(d.data.user); setCharacter(d.data.character);
        if (!d.data.character) { router.push("/character/create"); return; }
      }
      const r2 = await fetch("/api/curse-tree");
      if (r2.ok) {
        const d2 = await r2.json();
        setMerits(d2.data.merits ?? 1000);
        const saved: { skillId: string; level: number }[]               = d2.data.curseTree  ?? [];
        const savedLinks: { from: string; to: string; weight: number }[] = d2.data.curseLinks ?? [];
        const { W, H } = dimRef.current;
        const particles = particlesRef.current;
        const newMap = new Map<number, number>();
        saved.forEach((node, order) => {
          const p = particles.find(q => q.name === node.skillId);
          if (!p) return;
          const t = networkTarget(order, W / 2, H / 2);
          p.activated = true; p.level = node.level;
          p.x = t.x; p.y = t.y; p.targetX = t.x; p.targetY = t.y;
          p.vx = 0; p.vy = 0;
          newMap.set(p.id, node.level);
        });
        setActivatedMap(newMap);
        const newLinks = savedLinks.flatMap(sl => {
          const fp = particles.find(p => p.name === sl.from);
          const tp = particles.find(p => p.name === sl.to);
          if (!fp || !tp) return [];
          return [{ id: ++linkCtr.current, fromId: fp.id, toId: tp.id, weight: sl.weight }];
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

    particlesRef.current = initParticles(W, H);

    const MAX_SPEED = 0.65, EDGE = 14, GRID = 72;

    function draw() {
      const { scale, ox, oy } = xfRef.current;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      ctx.setTransform(dpr * scale, 0, 0, dpr * scale, dpr * ox, dpr * oy);

      // Grid
      ctx.save();
      ctx.strokeStyle = "rgba(28,28,55,0.5)";
      ctx.lineWidth = 0.5 / scale;
      for (let x = 0; x <= W; x += GRID) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
      for (let y = 0; y <= H; y += GRID) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
      ctx.restore();

      const particles   = particlesRef.current;
      const links       = linksRef.current;
      const selP        = selParticleRef.current;
      const selL        = selLinkRef.current;
      const linkingFrom = linkingFromRef.current;

      // ── Links ──
      for (const link of links) {
        const from = particles.find(p => p.id === link.fromId);
        const to   = particles.find(p => p.id === link.toId);
        if (!from || !to) continue;

        const fromR = particleRadius(from.activated ? from.level : 1);
        const toR   = particleRadius(to.activated   ? to.level   : 1);
        // Cap line thickness at the smaller connected particle's radius
        const capW  = Math.min(fromR, toR);
        const baseW = Math.max(0.8, link.weight * 0.7);

        const isSel = selL === link.id;
        const selC  = linkSelColor(link.weight);
        ctx.save();
        ctx.strokeStyle = isSel ? selC : linkColor(link.weight);
        ctx.lineWidth   = Math.min(isSel ? baseW + 1.5 : baseW, capW);
        ctx.shadowBlur  = isSel ? 20 : 5 + link.weight;
        ctx.shadowColor = isSel ? selC : linkColor(link.weight);
        ctx.globalAlpha = isSel ? 1 : 0.85;
        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.lineTo(to.x,   to.y);
        ctx.stroke();

        if (link.weight > 1 || isSel) {
          const mx = (from.x + to.x) / 2, my = (from.y + to.y) / 2;
          ctx.shadowBlur = 0;
          ctx.font = `${8 / scale}px monospace`;
          ctx.textAlign = "center";
          ctx.fillStyle = isSel ? selC : "rgba(255,200,55,0.9)";
          ctx.globalAlpha = 1;
          ctx.fillText(`W${link.weight}`, mx, my - 6 / scale);
        }
        ctx.restore();
      }

      // ── Particles ──
      for (const p of particles) {
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
        const r = p.activated ? particleRadius(p.level) : isSel ? 5 : 3;

        const statGlow = p.activated ? STAT_GLOW[SKILL_STATS[p.id]] : null;

        ctx.save();
        if (p.activated || isSel || isLinking) {
          ctx.shadowBlur  = isLinking ? 28 : isSel ? 22 : 10 + (p.level - 1) * 0.3;
          ctx.shadowColor = isLinking ? "#ffaa00" : p.activated ? (statGlow ?? levelColor(p.level)) : isSel ? "#00ffff" : levelColor(p.level);
        }
        if (isLinking) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, r + 6, 0, Math.PI * 2);
          ctx.strokeStyle = "#ffaa00"; ctx.lineWidth = 1.5; ctx.stroke();
        }
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        ctx.fillStyle = isLinking ? "#ffaa00" : p.activated ? levelColor(p.level) : isSel ? "#00ffff" : "rgba(90,90,130,0.5)";
        ctx.fill();
        ctx.shadowBlur = 0;

        const fs = Math.max(6, Math.min(11, p.activated ? 9 : isSel ? 8 : 7));
        ctx.font = `${fs}px monospace`;
        ctx.textAlign = "center";
        ctx.fillStyle = p.activated ? "#fff" : isSel ? "#00ffff" : "rgba(120,120,155,0.4)";
        ctx.fillText(p.name, p.x, p.y + r + 10);

        if (p.activated) {
          ctx.font = "6px monospace";
          ctx.fillStyle = statGlow ?? "#aaa";
          ctx.fillText(STAT_LABEL[SKILL_STATS[p.id]], p.x, p.y + r + 19);
        }

        if (p.activated && p.level > 1) {
          ctx.font = "7px monospace";
          ctx.fillStyle = levelColor(p.level);
          ctx.fillText(`L${p.level}`, p.x, p.y - r - 2);
        }
        ctx.restore();
      }

      frameRef.current = requestAnimationFrame(draw);
    }

    frameRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frameRef.current);
  }, []);

  // ── Mouse / wheel / touch / drag / pan ────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    type DragState = { id: number; startMX: number; startMY: number; startPX: number; startPY: number; moved: boolean };
    type PanState  = { startMX: number; startMY: number; startOx: number; startOy: number };
    type PinchState = { d0: number; scale0: number; ox0: number; oy0: number; cx0: number; cy0: number };
    let drag: DragState | null = null;
    let panning: PanState | null = null;
    let pinch: PinchState | null = null;

    function screenPt(e: MouseEvent) {
      const r = canvas!.getBoundingClientRect();
      return { sx: e.clientX - r.left, sy: e.clientY - r.top };
    }
    function touchPt(t: Touch) {
      const r = canvas!.getBoundingClientRect();
      return { sx: t.clientX - r.left, sy: t.clientY - r.top };
    }
    function toWorld(sx: number, sy: number) {
      const { scale, ox, oy } = xfRef.current;
      return { wx: (sx - ox) / scale, wy: (sy - oy) / scale };
    }
    function nearParticle(wx: number, wy: number, thr = 18) {
      let best: Particle | null = null, minD = thr;
      for (const p of particlesRef.current) {
        const d = Math.hypot(p.x - wx, p.y - wy);
        if (d < minD) { minD = d; best = p; }
      }
      return best;
    }
    function nearLink(wx: number, wy: number, thr = 14) {
      for (const l of linksRef.current) {
        const f = particlesRef.current.find(p => p.id === l.fromId);
        const t = particlesRef.current.find(p => p.id === l.toId);
        if (!f || !t) continue;
        if (distToSeg(wx, wy, f.x, f.y, t.x, t.y) < thr) return l;
      }
      return null;
    }

    function handleClick(wx: number, wy: number, touchHitR = 18) {
      const particle    = nearParticle(wx, wy, touchHitR);
      const lf          = linkingFromRef.current;
      const curSel      = selParticleRef.current;

      if (particle) {
        if (lf !== null && particle.activated && particle.id !== lf) {
          createLink(lf, particle.id);
          linkingFromRef.current = null; setLinkingFromId(null);
          selParticleRef.current = null; setSelParticleId(null);
          selLinkRef.current     = null; setSelLinkId(null);
          return;
        }
        if (curSel === particle.id) {
          selParticleRef.current = null; setSelParticleId(null);
        } else {
          selParticleRef.current = particle.id; setSelParticleId(particle.id);
          selLinkRef.current     = null;        setSelLinkId(null);
          linkingFromRef.current = null;        setLinkingFromId(null);
        }
      } else {
        const link = nearLink(wx, wy, touchHitR);
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

    // ── Mouse ──
    const onMouseDown = (e: MouseEvent) => {
      const { sx, sy } = screenPt(e);
      const { wx, wy } = toWorld(sx, sy);
      const p = nearParticle(wx, wy);
      if (p?.activated) {
        drag = { id: p.id, startMX: sx, startMY: sy, startPX: p.x, startPY: p.y, moved: false };
      } else {
        const { ox, oy } = xfRef.current;
        panning = { startMX: sx, startMY: sy, startOx: ox, startOy: oy };
      }
    };

    const onMouseMove = (e: MouseEvent) => {
      const { sx, sy } = screenPt(e);
      const { scale } = xfRef.current;
      if (drag) {
        const dxS = sx - drag.startMX, dyS = sy - drag.startMY;
        if (Math.hypot(dxS, dyS) > 4) {
          drag.moved = true;
          const p = particlesRef.current.find(q => q.id === drag!.id);
          if (p) {
            p.x = drag.startPX + dxS / scale;
            p.y = drag.startPY + dyS / scale;
            p.targetX = p.x; p.targetY = p.y;
          }
        }
      } else if (panning) {
        xfRef.current.ox = panning.startOx + (sx - panning.startMX);
        xfRef.current.oy = panning.startOy + (sy - panning.startMY);
        canvas!.style.cursor = "grabbing";
      }
    };

    const onMouseUp = (e: MouseEvent) => {
      const { sx, sy } = screenPt(e);
      const wasDrag = drag?.moved ?? false;
      const wasPan  = panning !== null && Math.hypot(sx - panning.startMX, sy - panning.startMY) > 4;
      drag = null; panning = null;
      canvas!.style.cursor = "crosshair";
      if (!wasDrag && !wasPan) {
        const { wx, wy } = toWorld(sx, sy);
        handleClick(wx, wy, 18);
      }
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const { sx, sy } = screenPt(e);
      const { scale, ox, oy } = xfRef.current;
      const factor   = e.deltaY < 0 ? 1.12 : 1 / 1.12;
      const newScale = Math.max(0.08, Math.min(12, scale * factor));
      xfRef.current = {
        scale: newScale,
        ox: sx - (sx - ox) * (newScale / scale),
        oy: sy - (sy - oy) * (newScale / scale),
      };
    };

    // ── Touch ──
    const onTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      if (e.touches.length === 2) {
        drag = null; panning = null;
        const t0 = touchPt(e.touches[0]);
        const t1 = touchPt(e.touches[1]);
        const d0 = Math.hypot(t0.sx - t1.sx, t0.sy - t1.sy);
        const cx = (t0.sx + t1.sx) / 2;
        const cy = (t0.sy + t1.sy) / 2;
        const { scale, ox, oy } = xfRef.current;
        pinch = { d0, scale0: scale, ox0: ox, oy0: oy, cx0: cx, cy0: cy };
      } else if (e.touches.length === 1) {
        pinch = null;
        const { sx, sy } = touchPt(e.touches[0]);
        const { wx, wy } = toWorld(sx, sy);
        const p = nearParticle(wx, wy, 28);
        if (p?.activated) {
          drag = { id: p.id, startMX: sx, startMY: sy, startPX: p.x, startPY: p.y, moved: false };
        } else {
          const { ox, oy } = xfRef.current;
          panning = { startMX: sx, startMY: sy, startOx: ox, startOy: oy };
        }
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      if (e.touches.length === 2 && pinch) {
        const t0 = touchPt(e.touches[0]);
        const t1 = touchPt(e.touches[1]);
        const d  = Math.hypot(t0.sx - t1.sx, t0.sy - t1.sy);
        const cx = (t0.sx + t1.sx) / 2;
        const cy = (t0.sy + t1.sy) / 2;
        const newScale = Math.max(0.08, Math.min(12, pinch.scale0 * (d / pinch.d0)));
        // Zoom around pinch midpoint while tracking pan
        xfRef.current = {
          scale: newScale,
          ox: cx - newScale * (pinch.cx0 - pinch.ox0) / pinch.scale0,
          oy: cy - newScale * (pinch.cy0 - pinch.oy0) / pinch.scale0,
        };
      } else if (e.touches.length === 1) {
        const { sx, sy } = touchPt(e.touches[0]);
        const { scale } = xfRef.current;
        if (drag) {
          const dxS = sx - drag.startMX, dyS = sy - drag.startMY;
          if (Math.hypot(dxS, dyS) > 6) {
            drag.moved = true;
            const p = particlesRef.current.find(q => q.id === drag!.id);
            if (p) {
              p.x = drag.startPX + dxS / scale;
              p.y = drag.startPY + dyS / scale;
              p.targetX = p.x; p.targetY = p.y;
            }
          }
        } else if (panning) {
          xfRef.current.ox = panning.startOx + (sx - panning.startMX);
          xfRef.current.oy = panning.startOy + (sy - panning.startMY);
        }
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      e.preventDefault();
      if (e.touches.length < 2) pinch = null;
      if (e.touches.length === 0) {
        const wasDrag = drag?.moved ?? false;
        const changedT = e.changedTouches[0];
        const { sx, sy } = touchPt(changedT);
        const wasPan = panning !== null && Math.hypot(sx - panning.startMX, sy - panning.startMY) > 8;
        drag = null; panning = null;
        if (!wasDrag && !wasPan) {
          const { wx, wy } = toWorld(sx, sy);
          handleClick(wx, wy, 28);
        }
      }
    };

    canvas.addEventListener("mousedown", onMouseDown);
    canvas.addEventListener("mousemove", onMouseMove);
    canvas.addEventListener("mouseup",   onMouseUp);
    canvas.addEventListener("wheel",     onWheel, { passive: false });
    canvas.addEventListener("touchstart", onTouchStart, { passive: false });
    canvas.addEventListener("touchmove",  onTouchMove,  { passive: false });
    canvas.addEventListener("touchend",   onTouchEnd,   { passive: false });
    return () => {
      canvas.removeEventListener("mousedown", onMouseDown);
      canvas.removeEventListener("mousemove", onMouseMove);
      canvas.removeEventListener("mouseup",   onMouseUp);
      canvas.removeEventListener("wheel",     onWheel);
      canvas.removeEventListener("touchstart", onTouchStart);
      canvas.removeEventListener("touchmove",  onTouchMove);
      canvas.removeEventListener("touchend",   onTouchEnd);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [createLink]);

  // ESC clears all selection / linking mode
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

  // ── Zoom buttons ──────────────────────────────────────────────────────────
  const zoomBy = useCallback((factor: number) => {
    const { scale, ox, oy } = xfRef.current;
    const { W, H } = dimRef.current;
    const cx = W / 2, cy = H / 2;
    const ns = Math.max(0.08, Math.min(12, scale * factor));
    xfRef.current = { scale: ns, ox: cx - (cx - ox) * (ns / scale), oy: cy - (cy - oy) * (ns / scale) };
  }, []);
  const zoomReset = useCallback(() => { xfRef.current = { scale: 1, ox: 0, oy: 0 }; }, []);

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
      p.targetX = t.x; p.targetY = t.y; p.vx = 0; p.vy = 0;
      setMerits(json.data.merits);
      setActivatedMap(prev => new Map(prev).set(p.id, 1));
      const sl = STAT_LABEL[SKILL_STATS[p.id]];
      flash(`${p.name} activated! +1 ${sl}`);
    } finally { setActionLoading(false); }
  }, [selParticleId, merits, actionLoading, flash]);

  const upgradeSelected = useCallback(async () => {
    if (selParticleId === null || actionLoading) return;
    if (!activatedMap.has(selParticleId)) return;
    const p   = particlesRef.current.find(q => q.id === selParticleId);
    const lvl = activatedMap.get(selParticleId)!;
    if (!p) return;
    if (lvl >= MAX_CURSE_LEVEL) { flash(`Max level (${MAX_CURSE_LEVEL}) reached!`); return; }
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
      const sl = STAT_LABEL[SKILL_STATS[p.id]];
      flash(`${p.name} L${p.level} · +1 ${sl}`);
    } finally { setActionLoading(false); }
  }, [selParticleId, activatedMap, merits, actionLoading, flash]);

  const upgradeLink = useCallback(async () => {
    if (selLinkId === null || actionLoading) return;
    const link  = linksRef.current.find(l => l.id === selLinkId);
    if (!link) return;
    const fromP = particlesRef.current.find(p => p.id === link.fromId);
    const toP   = particlesRef.current.find(p => p.id === link.toId);
    if (!fromP || !toP) return;
    const cost = linkUpgradeCost(link.weight);
    if (merits < cost) { flash("Not enough merits!"); return; }
    setActionLoading(true);
    try {
      const res  = await fetch("/api/curse-tree", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "upgradeLink", from: fromP.name, to: toP.name }) });
      const json = await res.json();
      if (!res.ok) { flash(json.error ?? "Failed"); return; }
      link.weight = json.data.newWeight;
      setMerits(json.data.merits);
      setLinksState([...linksRef.current]);
      flash(`Link W${link.weight}!`);
    } finally { setActionLoading(false); }
  }, [selLinkId, merits, actionLoading, flash]);

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
    } finally { setActionLoading(false); }
  }, [selLinkId, actionLoading, flash]);

  // ── Derived UI values ─────────────────────────────────────────────────────
  const selParticle  = selParticleId !== null ? particlesRef.current.find(p => p.id === selParticleId) ?? null : null;
  const isActivated  = selParticleId !== null && activatedMap.has(selParticleId);
  const selLevel     = activatedMap.get(selParticleId ?? -1) ?? 1;
  const selLink      = selLinkId !== null ? linksState.find(l => l.id === selLinkId) ?? null : null;
  const linkFromP    = selLink ? particlesRef.current.find(p => p.id === selLink.fromId) : null;
  const linkToP      = selLink ? particlesRef.current.find(p => p.id === selLink.toId)   : null;
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
              ⟶ Tap activated skill to link from <strong>{linkingFromP?.name}</strong>
            </span>
          )}
          {statusMsg && linkingFromId === null && (
            <span className="text-xs font-mono text-cyan-400 animate-pulse">{statusMsg}</span>
          )}
          <div className="border border-purple-900/60 bg-purple-950/20 px-3 py-1 text-xs font-mono shrink-0">
            <span className="text-gray-500">MERITS </span>
            <span className="text-purple-300 font-bold">{merits.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Canvas */}
      <div ref={containerRef} className="relative flex-1 overflow-hidden" style={{ cursor: "crosshair", touchAction: "none" }}>
        <canvas ref={canvasRef} className="block" />

        {!pageReady && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-xs font-mono text-gray-600 animate-pulse tracking-widest">INITIALIZING CURSE TREE...</span>
          </div>
        )}

        {/* Zoom controls */}
        <div className="absolute top-3 left-3 flex flex-col gap-1 pointer-events-auto z-10">
          {[
            { label: "+", title: "Zoom in",  fn: () => zoomBy(1.3)  },
            { label: "−", title: "Zoom out", fn: () => zoomBy(1/1.3) },
            { label: "↺", title: "Reset",    fn: zoomReset           },
          ].map(({ label, title, fn }) => (
            <button key={label} onClick={fn} title={title}
              className="w-8 h-8 border border-gray-700 bg-[#05050f]/90 text-gray-400 hover:text-gray-100 hover:border-gray-500 font-mono text-sm transition-colors flex items-center justify-center">
              {label}
            </button>
          ))}
          <div className="text-[9px] font-mono text-gray-700 mt-0.5 text-center leading-tight">
            pinch/<br/>scroll
          </div>
        </div>

        {/* Skill panel — responsive */}
        {selParticle && !selLink && (() => {
          const skillStat  = SKILL_STATS[selParticle.id];
          const statLabel  = STAT_LABEL[skillStat];
          const statColor  = STAT_GLOW[skillStat];
          const atMax      = selLevel >= MAX_CURSE_LEVEL;
          return (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 sm:top-auto sm:translate-y-0 sm:bottom-5 w-[calc(100%-16px)] sm:w-auto max-w-lg border border-gray-700 bg-[#05050f]/95 backdrop-blur px-3 sm:px-5 py-3 flex flex-col sm:flex-row sm:items-center gap-3 font-mono text-xs pointer-events-auto shadow-2xl">
            <div className="min-w-0 sm:min-w-[130px]">
              <div className="text-gray-500 text-[10px] uppercase tracking-widest">Selected Skill</div>
              <div className="text-base font-bold mt-0.5" style={{ color: isActivated ? levelColor(selLevel) : "#00e5ff" }}>
                {selParticle.name}
              </div>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-sm" style={{ color: statColor, border: `1px solid ${statColor}55`, background: `${statColor}11` }}>
                  {statLabel}
                </span>
                {isActivated && (
                  <span className="text-gray-600 text-[10px]">
                    L{selLevel}/{MAX_CURSE_LEVEL} · +{selLevel} {statLabel}
                  </span>
                )}
              </div>
            </div>
            <div className="hidden sm:block w-px h-10 bg-gray-800 shrink-0" />

            <div className="flex flex-row flex-wrap gap-3 items-start sm:items-center">
              {!isActivated ? (
                <div className="flex flex-col items-start gap-1">
                  <button onClick={activateSelected} disabled={actionLoading || merits < ACTIVATE_COST}
                    className="px-4 py-2 border border-cyan-800 text-cyan-400 hover:bg-cyan-950/40 disabled:opacity-30 disabled:cursor-not-allowed transition-colors tracking-wider">
                    {actionLoading ? "..." : "ACTIVATE"}
                  </button>
                  <span className="text-[10px] text-gray-600">{ACTIVATE_COST} merits · +1 {statLabel}</span>
                </div>
              ) : (
                <>
                  <div className="flex flex-col items-start gap-1">
                    {atMax ? (
                      <span className="px-4 py-2 border border-gray-700 text-gray-600 tracking-wider">MAX LEVEL</span>
                    ) : (
                      <button onClick={upgradeSelected} disabled={actionLoading || merits < upgradeCost(selLevel)}
                        className="px-4 py-2 border border-purple-800 text-purple-400 hover:bg-purple-950/40 disabled:opacity-30 disabled:cursor-not-allowed transition-colors tracking-wider">
                        {actionLoading ? "..." : `L${selLevel}→${selLevel + 1} +1${statLabel}`}
                      </button>
                    )}
                    {!atMax && <span className="text-[10px] text-gray-600">{upgradeCost(selLevel).toLocaleString()} merits</span>}
                  </div>
                  <div className="flex flex-col items-start gap-1">
                    <button onClick={() => { linkingFromRef.current = selParticleId; setLinkingFromId(selParticleId); }}
                      disabled={actionLoading || linkingFromId !== null}
                      className="px-4 py-2 border border-yellow-900 text-yellow-500 hover:bg-yellow-950/40 disabled:opacity-30 disabled:cursor-not-allowed transition-colors tracking-wider">
                      LINK TO...
                    </button>
                    <span className="text-[10px] text-gray-600">free</span>
                  </div>
                </>
              )}
              <button onClick={() => { selParticleRef.current = null; setSelParticleId(null); linkingFromRef.current = null; setLinkingFromId(null); }}
                className="text-gray-600 hover:text-gray-400 px-1 text-base self-start">✕</button>
            </div>
          </div>
          );
        })()}

        {/* Link panel — responsive */}
        {selLink && !selParticle && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 sm:top-auto sm:translate-y-0 sm:bottom-5 w-[calc(100%-16px)] sm:w-auto max-w-lg border border-yellow-900/50 bg-[#05050f]/95 backdrop-blur px-3 sm:px-5 py-3 flex flex-col sm:flex-row sm:items-center gap-3 font-mono text-xs pointer-events-auto shadow-2xl">
            <div className="min-w-0 sm:min-w-[160px]">
              <div className="text-gray-500 text-[10px] uppercase tracking-widest">Selected Link</div>
              <div className="font-bold mt-0.5" style={{ color: linkSelColor(selLink.weight) }}>
                {linkFromP?.name} ↔ {linkToP?.name}
              </div>
              <div className="text-gray-600">Weight {selLink.weight} · next: {linkUpgradeCost(selLink.weight).toLocaleString()}M</div>
            </div>
            <div className="hidden sm:block w-px h-10 bg-gray-800 shrink-0" />
            <div className="flex flex-row flex-wrap gap-3 items-start">
              <div className="flex flex-col items-start gap-1">
                <button onClick={upgradeLink} disabled={actionLoading || merits < linkUpgradeCost(selLink.weight)}
                  className="px-4 py-2 border border-yellow-800 text-yellow-400 hover:bg-yellow-950/40 disabled:opacity-30 disabled:cursor-not-allowed transition-colors tracking-wider">
                  {actionLoading ? "..." : `BOOST W${selLink.weight}→W${selLink.weight + 1}`}
                </button>
                <span className="text-[10px] text-gray-600">{linkUpgradeCost(selLink.weight).toLocaleString()} merits</span>
              </div>
              <div className="flex flex-col items-start gap-1">
                <button onClick={removeLink} disabled={actionLoading}
                  className="px-4 py-2 border border-red-900/60 text-red-500 hover:bg-red-950/40 disabled:opacity-30 transition-colors tracking-wider">
                  {actionLoading ? "..." : "REMOVE"}
                </button>
                <span className="text-[10px] text-gray-600">free</span>
              </div>
              <button onClick={() => { selLinkRef.current = null; setSelLinkId(null); }}
                className="text-gray-600 hover:text-gray-400 px-1 text-base self-start">✕</button>
            </div>
          </div>
        )}

        {/* Legend */}
        <div className="absolute top-3 right-3 border border-gray-800 bg-[#05050f]/80 px-2 sm:px-3 py-2 text-[10px] font-mono space-y-1 pointer-events-none">
          <div className="text-gray-500 uppercase tracking-widest mb-1">Levels</div>
          {[1,2,3,4,5,6,7,8].map(l => (
            <div key={l} className="flex items-center gap-1.5 text-gray-600">
              <span className="w-2 h-2 rounded-full inline-block shrink-0" style={{ background: levelColor(l * 7), boxShadow: `0 0 4px ${levelColor(l * 7)}` }} />
              <span>L{(l - 1) * 7 + 1}–{l * 7}</span>
            </div>
          ))}
          <div className="hidden sm:block text-gray-700 mt-2 pt-2 border-t border-gray-800 space-y-0.5">
            <div>Scroll/pinch = zoom</div>
            <div>Drag canvas = pan</div>
            <div>Drag skill = move</div>
            <div>Tap line = edit link</div>
          </div>
        </div>
      </div>
    </div>
  );
}
