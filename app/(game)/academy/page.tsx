"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useGameStore } from "@/store/useGameStore";
import {
  ACADEMY_FIELDS,
  MAX_ACADEMY_LEVEL,
  UNLOCK_COST,
  upgradeCost,
  computeAcademyLayout,
  academyLevelColor,
  ACADEMY_STAT_GLOW,
  ACADEMY_STAT_LABEL,
  buildAcademyChildrenMap,
  type AcademyField,
} from "@/lib/academyFields";

const LAYOUT       = computeAcademyLayout();
const CHILDREN_MAP = buildAcademyChildrenMap();

function nearestField(wx: number, wy: number, threshold = 22): AcademyField | null {
  let best: AcademyField | null = null;
  let minD = threshold;
  for (const f of ACADEMY_FIELDS) {
    const pos = LAYOUT.get(f.id);
    if (!pos) continue;
    const d = Math.hypot(pos.x - wx, pos.y - wy);
    if (d < minD) { minD = d; best = f; }
  }
  return best;
}

// Node radius scales more aggressively with level: level 0 → 5px, level 500 → ~32px
function nodeRadius(level: number, isSelected: boolean): number {
  if (level <= 0) return isSelected ? 7 : 5;
  return 7 + Math.min(level, 500) * 0.05;
}

export default function AcademyPage() {
  const router = useRouter();
  const { user, character, setUser, setCharacter } = useGameStore();

  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const frameRef     = useRef<number>(0);
  const dimRef       = useRef({ W: 800, H: 500 });
  const xfRef        = useRef({ scale: 1, ox: 0, oy: 0 });

  const selectedRef = useRef<string | null>(null);
  const unlockedRef = useRef<Map<string, number>>(new Map());

  const [unlockedMap,  setUnlockedMap]  = useState<Map<string, number>>(new Map());
  const [selectedId,   setSelectedId]   = useState<string | null>(null);
  const [merits,       setMerits]       = useState(0);
  const [pageReady,    setPageReady]    = useState(false);
  const [actionLoading,setActionLoading]= useState(false);
  const [statusMsg,    setStatusMsg]    = useState<string | null>(null);

  selectedRef.current  = selectedId;
  unlockedRef.current  = unlockedMap;

  const flash = useCallback((msg: string) => {
    setStatusMsg(msg);
    setTimeout(() => setStatusMsg(null), 2500);
  }, []);

  // ── Auth + load saved academy ─────────────────────────────────────────────
  useEffect(() => {
    async function init() {
      if (!user) {
        const r = await fetch("/api/auth/me");
        if (!r.ok) { router.push("/login"); return; }
        const d = await r.json();
        setUser(d.data.user); setCharacter(d.data.character);
        if (!d.data.character) { router.push("/character/create"); return; }
      }
      const r2 = await fetch("/api/academy");
      if (r2.ok) {
        const d2 = await r2.json();
        setMerits(d2.data.merits ?? 1000);
        const saved: { fieldId: string; level: number }[] = d2.data.academyTree ?? [];
        const m = new Map<string, number>();
        for (const n of saved) m.set(n.fieldId, n.level);
        setUnlockedMap(m);
      }
      setPageReady(true);
    }
    init();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Canvas draw loop ──────────────────────────────────────────────────────
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

    const allX = [...LAYOUT.values()].map(p => p.x);
    const treeW = Math.max(...allX) - Math.min(...allX) + 120;
    const initScale = Math.min(1, (W - 40) / treeW);
    const minX = Math.min(...allX);
    xfRef.current = {
      scale: initScale,
      ox: (W - treeW * initScale) / 2 - minX * initScale + 60 * initScale,
      oy: 20,
    };

    const GRID = 80;

    function draw() {
      const { scale, ox, oy } = xfRef.current;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      ctx.setTransform(dpr * scale, 0, 0, dpr * scale, dpr * ox, dpr * oy);

      // Grid
      ctx.save();
      ctx.strokeStyle = "rgba(15,15,40,0.7)";
      ctx.lineWidth = 0.5 / scale;
      for (let x = 0; x <= W * 4; x += GRID) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H * 4); ctx.stroke(); }
      for (let y = 0; y <= H * 4; y += GRID) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W * 4, y); ctx.stroke(); }
      ctx.restore();

      const unlocked = unlockedRef.current;
      const selId    = selectedRef.current;

      // ── Edges ─────────────────────────────────────────────────────────────
      for (const field of ACADEMY_FIELDS) {
        if (!field.parent) continue;
        const from = LAYOUT.get(field.parent);
        const to   = LAYOUT.get(field.id);
        if (!from || !to) continue;

        const parentUnlocked = unlocked.has(field.parent);
        const childUnlocked  = unlocked.has(field.id);
        const active    = parentUnlocked && childUnlocked;
        const reachable = parentUnlocked && !childUnlocked;

        const childLevel = unlocked.get(field.id) ?? 0;

        ctx.save();
        // Line width stays constant in screen pixels (divided by scale = less scalable)
        ctx.lineWidth = active ? 2 / scale : 1 / scale;

        if (active) {
          // Edge color reflects the child node's level color
          const ec = academyLevelColor(Math.max(childLevel, 1));
          ctx.strokeStyle = ec + "99";
          ctx.shadowBlur  = 10 / scale;
          ctx.shadowColor = ec + "55";
        } else if (reachable) {
          ctx.strokeStyle = "rgba(60,80,120,0.5)";
        } else {
          ctx.strokeStyle = "rgba(25,25,45,0.5)";
        }

        ctx.beginPath();
        const mx = (from.x + to.x) / 2;
        const my = (from.y + to.y) / 2;
        ctx.moveTo(from.x, from.y);
        ctx.bezierCurveTo(from.x, my, to.x, my, to.x, to.y);
        ctx.stroke();
        ctx.restore();
      }

      // ── Nodes ─────────────────────────────────────────────────────────────
      for (const field of ACADEMY_FIELDS) {
        const pos   = LAYOUT.get(field.id);
        if (!pos) continue;
        const level  = unlocked.get(field.id) ?? 0;
        const isUnlocked = level > 0;
        const isSel  = selId === field.id;
        const r      = nodeRadius(level, isSel);

        const parentOk = field.parent === null || unlocked.has(field.parent);
        const isRoot   = field.parent === null;

        const fillColor = isUnlocked
          ? (isRoot ? "#ffd700" : academyLevelColor(level))
          : isSel
          ? "#00e5ff"
          : parentOk
          ? "rgba(60,80,120,0.7)"
          : "rgba(25,25,45,0.5)";

        const glowColor = isUnlocked
          ? (isRoot ? "#ffd700" : ACADEMY_STAT_GLOW[field.stat])
          : isSel
          ? "#00e5ff"
          : parentOk
          ? "#334466"
          : "transparent";

        ctx.save();
        if (isUnlocked || isSel) {
          ctx.shadowBlur  = isSel ? 24 : 8 + Math.min(level, 499) * 0.03;
          ctx.shadowColor = glowColor;
        }
        if (isSel) {
          ctx.beginPath();
          ctx.arc(pos.x, pos.y, r + 5, 0, Math.PI * 2);
          ctx.strokeStyle = "#00e5ff";
          ctx.lineWidth   = 1.5 / scale;
          ctx.stroke();
        }
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, r, 0, Math.PI * 2);
        ctx.fillStyle = fillColor;
        ctx.fill();
        ctx.shadowBlur = 0;

        const fontSize = Math.max(6, Math.min(10, 8));
        ctx.font       = `${fontSize}px monospace`;
        ctx.textAlign  = "center";
        ctx.fillStyle  = isUnlocked ? "#fff" : isSel ? "#00e5ff" : parentOk ? "rgba(100,130,180,0.9)" : "rgba(50,50,70,0.7)";
        const words = field.label.split(" ");
        let line = "";
        let lineY = pos.y + r + 12;
        for (const w of words) {
          const test = line ? `${line} ${w}` : w;
          if (test.length > 12 && line) {
            ctx.fillText(line, pos.x, lineY);
            line = w; lineY += 10;
          } else { line = test; }
        }
        if (line) ctx.fillText(line, pos.x, lineY);

        if (isUnlocked && level > 0) {
          ctx.font      = `${Math.max(5, 7)}px monospace`;
          ctx.fillStyle = isRoot ? "#ffd700" : academyLevelColor(level);
          ctx.fillText(`L${level}`, pos.x, pos.y - r - 4);
        }

        if (isUnlocked) {
          ctx.font      = "5px monospace";
          ctx.fillStyle = ACADEMY_STAT_GLOW[field.stat];
          ctx.fillText(ACADEMY_STAT_LABEL[field.stat], pos.x, pos.y + r + (words.length > 1 ? 30 : 22));
        }

        ctx.restore();
      }

      frameRef.current = requestAnimationFrame(draw);
    }

    frameRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frameRef.current);
  }, []);

  // ── Mouse / wheel / touch / pan ───────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    type PanState  = { startMX: number; startMY: number; startOx: number; startOy: number };
    type PinchState = { d0: number; scale0: number; ox0: number; oy0: number; cx0: number; cy0: number };
    let panning: PanState | null = null;
    let panMoved = false;
    let pinch: PinchState | null = null;

    function screenPt(e: MouseEvent) {
      const rect = canvas!.getBoundingClientRect();
      return { sx: e.clientX - rect.left, sy: e.clientY - rect.top };
    }
    function touchPt(t: Touch) {
      const rect = canvas!.getBoundingClientRect();
      return { sx: t.clientX - rect.left, sy: t.clientY - rect.top };
    }
    function toWorld(sx: number, sy: number) {
      const { scale, ox, oy } = xfRef.current;
      return { wx: (sx - ox) / scale, wy: (sy - oy) / scale };
    }
    function selectAt(wx: number, wy: number, thr = 22) {
      const hit = nearestField(wx, wy, thr);
      if (hit) {
        const cur = selectedRef.current;
        const next = cur === hit.id ? null : hit.id;
        selectedRef.current = next;
        setSelectedId(next);
      } else {
        selectedRef.current = null;
        setSelectedId(null);
      }
    }

    // ── Mouse ──
    const onMouseDown = (e: MouseEvent) => {
      const { sx, sy } = screenPt(e);
      const { ox, oy } = xfRef.current;
      panning  = { startMX: sx, startMY: sy, startOx: ox, startOy: oy };
      panMoved = false;
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!panning) return;
      const { sx, sy } = screenPt(e);
      const dx = sx - panning.startMX;
      const dy = sy - panning.startMY;
      if (Math.hypot(dx, dy) > 4) {
        panMoved = true;
        xfRef.current.ox = panning.startOx + dx;
        xfRef.current.oy = panning.startOy + dy;
        canvas!.style.cursor = "grabbing";
      }
    };

    const onMouseUp = (e: MouseEvent) => {
      const wasPan = panMoved;
      panning = null; panMoved = false;
      canvas!.style.cursor = "default";
      if (!wasPan) {
        const { sx, sy } = screenPt(e);
        const { wx, wy } = toWorld(sx, sy);
        selectAt(wx, wy, 22);
      }
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const { sx, sy } = screenPt(e);
      const { scale, ox, oy } = xfRef.current;
      const factor   = e.deltaY < 0 ? 1.12 : 1 / 1.12;
      const newScale = Math.max(0.05, Math.min(15, scale * factor));
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
        panning = null; panMoved = false;
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
        const { ox, oy } = xfRef.current;
        panning  = { startMX: sx, startMY: sy, startOx: ox, startOy: oy };
        panMoved = false;
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
        const newScale = Math.max(0.05, Math.min(15, pinch.scale0 * (d / pinch.d0)));
        xfRef.current = {
          scale: newScale,
          ox: cx - newScale * (pinch.cx0 - pinch.ox0) / pinch.scale0,
          oy: cy - newScale * (pinch.cy0 - pinch.oy0) / pinch.scale0,
        };
      } else if (e.touches.length === 1 && panning) {
        const { sx, sy } = touchPt(e.touches[0]);
        const dx = sx - panning.startMX;
        const dy = sy - panning.startMY;
        if (Math.hypot(dx, dy) > 6) {
          panMoved = true;
          xfRef.current.ox = panning.startOx + dx;
          xfRef.current.oy = panning.startOy + dy;
        }
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      e.preventDefault();
      if (e.touches.length < 2) pinch = null;
      if (e.touches.length === 0) {
        const wasPan = panMoved;
        const changedT = e.changedTouches[0];
        const { sx, sy } = touchPt(changedT);
        panning = null; panMoved = false;
        if (!wasPan) {
          const { wx, wy } = toWorld(sx, sy);
          selectAt(wx, wy, 30);
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
  }, []);

  // ESC clears selection
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { selectedRef.current = null; setSelectedId(null); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // ── Zoom helpers ─────────────────────────────────────────────────────────
  const zoomBy = useCallback((factor: number) => {
    const { scale, ox, oy } = xfRef.current;
    const { W, H } = dimRef.current;
    const cx = W / 2, cy = H / 2;
    const ns = Math.max(0.05, Math.min(15, scale * factor));
    xfRef.current = { scale: ns, ox: cx - (cx - ox) * (ns / scale), oy: cy - (cy - oy) * (ns / scale) };
  }, []);
  const zoomReset = useCallback(() => {
    const { W } = dimRef.current;
    const allX = [...LAYOUT.values()].map(p => p.x);
    const treeW = Math.max(...allX) - Math.min(...allX) + 120;
    const initScale = Math.min(1, (W - 40) / treeW);
    const minX = Math.min(...allX);
    xfRef.current = {
      scale: initScale,
      ox: (W - treeW * initScale) / 2 - minX * initScale + 60 * initScale,
      oy: 20,
    };
  }, []);

  // ── Unlock field ─────────────────────────────────────────────────────────
  const unlockSelected = useCallback(async () => {
    if (!selectedId || actionLoading) return;
    const field = ACADEMY_FIELDS.find(f => f.id === selectedId);
    if (!field || unlockedMap.has(selectedId)) return;
    if (field.parent !== null && !unlockedMap.has(field.parent)) {
      const parentField = ACADEMY_FIELDS.find(f => f.id === field.parent);
      flash(`Unlock "${parentField?.label ?? field.parent}" first`);
      return;
    }
    if (merits < UNLOCK_COST) { flash("Not enough merits!"); return; }
    setActionLoading(true);
    try {
      const res  = await fetch("/api/academy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "unlock", fieldId: selectedId }),
      });
      const json = await res.json();
      if (!res.ok) { flash(json.error ?? "Failed"); return; }
      setMerits(json.data.merits);
      setUnlockedMap(prev => new Map(prev).set(selectedId, 1));
      flash(`${field.label} unlocked! +1 ${ACADEMY_STAT_LABEL[field.stat]}`);
    } finally { setActionLoading(false); }
  }, [selectedId, unlockedMap, merits, actionLoading, flash]);

  // ── Upgrade field ────────────────────────────────────────────────────────
  const upgradeSelected = useCallback(async () => {
    if (!selectedId || actionLoading) return;
    const level = unlockedMap.get(selectedId);
    if (level === undefined) return;
    const field = ACADEMY_FIELDS.find(f => f.id === selectedId);
    if (!field) return;
    if (level >= MAX_ACADEMY_LEVEL) { flash(`Max level (${MAX_ACADEMY_LEVEL}) reached!`); return; }
    const cost = upgradeCost(level);
    if (merits < cost) { flash("Not enough merits!"); return; }
    setActionLoading(true);
    try {
      const res  = await fetch("/api/academy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "upgrade", fieldId: selectedId }),
      });
      const json = await res.json();
      if (!res.ok) { flash(json.error ?? "Failed"); return; }
      setMerits(json.data.merits);
      setUnlockedMap(prev => new Map(prev).set(selectedId, json.data.newLevel));
      flash(`${field.label} L${json.data.newLevel} · +1 ${ACADEMY_STAT_LABEL[field.stat]}`);
    } finally { setActionLoading(false); }
  }, [selectedId, unlockedMap, merits, actionLoading, flash]);

  // ── Derived UI ────────────────────────────────────────────────────────────
  const selField   = selectedId ? ACADEMY_FIELDS.find(f => f.id === selectedId) ?? null : null;
  const selLevel   = selectedId ? unlockedMap.get(selectedId) ?? 0 : 0;
  const isUnlocked = selLevel > 0;
  const atMax      = selLevel >= MAX_ACADEMY_LEVEL;
  const parentId   = selField?.parent ?? null;
  const parentOk   = parentId === null || unlockedMap.has(parentId);
  const parentField = parentId ? ACADEMY_FIELDS.find(f => f.id === parentId) : null;
  const nextCost   = isUnlocked ? upgradeCost(selLevel) : UNLOCK_COST;

  const totalUnlocked = unlockedMap.size;
  const shadowForm = character?.shadowForm ?? null;

  // ── Gate: Rider or Assassin form required ─────────────────────────────────
  if (pageReady && shadowForm !== "rider" && shadowForm !== "assassin") {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100dvh-120px)] gap-6 text-center px-4">
        <div className="text-5xl text-yellow-900">◈</div>
        <div className="font-mono text-amber-500 text-lg font-bold tracking-widest uppercase">Academy Locked</div>
        <div className="font-mono text-gray-500 text-sm max-w-xs leading-relaxed">
          The Academy opens only to those who embody the <span className="text-cyan-400 font-bold">Rider</span> form.
          Scholars say the greatest minds first learned to ride before they learned to think.
        </div>
        <button
          onClick={() => router.push("/shadow-form")}
          className="mt-2 px-6 py-2 border border-cyan-900 text-cyan-600 hover:text-cyan-300 hover:border-cyan-600 font-mono text-xs tracking-widest transition-colors"
        >
          SELECT SHADOW FORM →
        </button>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="-mx-4 -mt-4 -mb-4 flex flex-col bg-black" style={{ height: "calc(100dvh - 56px)", overflow: "hidden" }}>

      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-800 bg-[#05050f] shrink-0 gap-2 flex-wrap">
        <div className="flex items-center gap-3">
          <span className="text-sm font-mono font-bold text-amber-400 tracking-widest uppercase">Academy</span>
          <span className="text-xs font-mono text-gray-600">
            {totalUnlocked}/{ACADEMY_FIELDS.length} fields · max L{MAX_ACADEMY_LEVEL}
          </span>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {statusMsg && (
            <span className="text-xs font-mono text-cyan-400 animate-pulse">{statusMsg}</span>
          )}
          <div className="border border-amber-900/60 bg-amber-950/20 px-3 py-1 text-xs font-mono shrink-0">
            <span className="text-gray-500">MERITS </span>
            <span className="text-amber-300 font-bold">{merits.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Canvas */}
      <div ref={containerRef} className="relative flex-1 overflow-hidden" style={{ cursor: "default", touchAction: "none" }}>
        <canvas ref={canvasRef} className="block" />

        {!pageReady && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-xs font-mono text-gray-600 animate-pulse tracking-widest">LOADING ACADEMY...</span>
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

        {/* Selected field panel — responsive */}
        {selField && (() => {
          const statColor = ACADEMY_STAT_GLOW[selField.stat];
          const statLabel = ACADEMY_STAT_LABEL[selField.stat];
          return (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 sm:top-auto sm:translate-y-0 sm:bottom-5 w-[calc(100%-16px)] sm:w-auto max-w-lg border border-gray-700 bg-[#05050f]/95 backdrop-blur px-3 sm:px-5 py-3 flex flex-col sm:flex-row sm:items-center gap-3 font-mono text-xs pointer-events-auto shadow-2xl">
              <div className="min-w-0 sm:min-w-[150px]">
                <div className="text-gray-500 text-[10px] uppercase tracking-widest">Selected Field</div>
                <div className="text-base font-bold mt-0.5"
                  style={{ color: selField.id === "philosophy" ? "#ffd700" : isUnlocked ? academyLevelColor(selLevel) : "#00e5ff" }}>
                  {selField.label}
                </div>
                {parentField && (
                  <div className="text-gray-600 text-[10px] mt-0.5">under {parentField.label}</div>
                )}
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-sm"
                    style={{ color: statColor, border: `1px solid ${statColor}55`, background: `${statColor}11` }}>
                    {statLabel}
                  </span>
                  {isUnlocked && (
                    <span className="text-gray-600 text-[10px]">
                      L{selLevel}/{MAX_ACADEMY_LEVEL} · +{selLevel} {statLabel}
                    </span>
                  )}
                </div>
              </div>

              <div className="hidden sm:block w-px h-12 bg-gray-800 shrink-0" />

              <div className="flex flex-row flex-wrap gap-3 items-start">
                {!isUnlocked ? (
                  <div className="flex flex-col items-start gap-1">
                    {!parentOk ? (
                      <span className="px-4 py-2 border border-gray-700 text-gray-500 tracking-wider text-[11px]">
                        LOCKED
                      </span>
                    ) : (
                      <button onClick={unlockSelected} disabled={actionLoading || merits < UNLOCK_COST}
                        className="px-4 py-2 border border-amber-800 text-amber-400 hover:bg-amber-950/40 disabled:opacity-30 disabled:cursor-not-allowed transition-colors tracking-wider">
                        {actionLoading ? "..." : "UNLOCK"}
                      </button>
                    )}
                    <span className="text-[10px] text-gray-600">
                      {parentOk ? `${UNLOCK_COST} merits · +1 ${statLabel}` : `Unlock ${parentField?.label ?? ""} first`}
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-col items-start gap-1">
                    {atMax ? (
                      <span className="px-4 py-2 border border-yellow-700 text-yellow-500 tracking-wider text-[11px]">
                        MAX LEVEL
                      </span>
                    ) : (
                      <button onClick={upgradeSelected} disabled={actionLoading || merits < nextCost}
                        className="px-4 py-2 border border-amber-700 text-amber-300 hover:bg-amber-950/40 disabled:opacity-30 disabled:cursor-not-allowed transition-colors tracking-wider">
                        {actionLoading ? "..." : `L${selLevel}→${selLevel + 1}`}
                      </button>
                    )}
                    {!atMax && (
                      <span className="text-[10px] text-gray-600">
                        {nextCost.toLocaleString()} merits · +1 {statLabel}
                      </span>
                    )}
                  </div>
                )}
                <button onClick={() => { selectedRef.current = null; setSelectedId(null); }}
                  className="text-gray-600 hover:text-gray-400 px-1 text-base self-start">✕</button>
              </div>
            </div>
          );
        })()}

        {/* Legend */}
        <div className="absolute top-3 right-3 border border-gray-800 bg-[#05050f]/80 px-2 sm:px-3 py-2 text-[10px] font-mono space-y-0.5 pointer-events-none">
          <div className="text-gray-500 uppercase tracking-widest mb-1">Levels</div>
          {[
            { range: "1–50",    color: "#00e5ff" },
            { range: "51–100",  color: "#00ccee" },
            { range: "101–150", color: "#00ffcc" },
            { range: "151–200", color: "#00ff88" },
            { range: "201–250", color: "#55ff44" },
            { range: "251–300", color: "#aaff00" },
            { range: "301–350", color: "#ffee00" },
            { range: "351–400", color: "#ffaa00" },
            { range: "401–450", color: "#ff5500" },
            { range: "451–500", color: "#ffd700" },
          ].map(({ range, color }) => (
            <div key={range} className="flex items-center gap-1.5 text-gray-600">
              <span className="w-2 h-2 rounded-full inline-block shrink-0" style={{ background: color, boxShadow: `0 0 4px ${color}` }} />
              <span>{range}</span>
            </div>
          ))}
          <div className="hidden sm:block text-gray-700 mt-2 pt-2 border-t border-gray-800 space-y-0.5">
            <div>Tap = select</div>
            <div>Drag/swipe = pan</div>
            <div>Pinch/scroll = zoom</div>
          </div>
        </div>
      </div>
    </div>
  );
}
