"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useGameStore } from "@/store/useGameStore";
import {
  SHADOW_FORMS, FORM_POSITIONS, FORM_MAP,
  type ShadowFormId, type ShadowForm,
} from "@/lib/shadowForms";

// SVG viewport constants
const SVG_W = 500;
const SVG_H = 500;
const NODE_R = 44;          // vertex node radius
const CENTER_R = 52;        // saber center radius
const cx = 250, cy = 250;

// Hexagon vertex positions (clockwise from top)
const VERTEX_IDS: ShadowFormId[] = ["assassin", "archer", "rider", "berserker", "lancer", "caster"];

function hexPoints(): string {
  return VERTEX_IDS.map(id => {
    const p = FORM_POSITIONS[id];
    return `${p.x},${p.y}`;
  }).join(" ");
}

// ── Weapon icons (24×24 viewport, stroke-only, rendered inside each node) ────
const WEAPON_ICONS: Record<ShadowFormId, React.JSX.Element> = {
  // Sword (curved saber blade) + kite shield
  saber: (
    <g>
      <path d="M2 5L9 5L9 15L5.5 19L2 15Z" />
      <path d="M17 2Q22 8 16 19" />
      <line x1="13" y1="10" x2="21" y2="9" />
      <line x1="16" y1="19" x2="14" y2="22" />
      <circle cx="14" cy="22" r="1.5" fill="currentColor" />
    </g>
  ),
  // Two large battle axes, crescent blades facing outward
  rider: (
    <g>
      <line x1="8" y1="22" x2="10" y2="5" />
      <path d="M10 5C3 3 0 8 0 12C0 17 4 19 10 18L10 5" />
      <line x1="16" y1="22" x2="14" y2="5" />
      <path d="M14 5C21 3 24 8 24 12C24 17 20 19 14 18L14 5" />
    </g>
  ),
  // Bow (curved arc + string) with horizontal arrow
  archer: (
    <g>
      <path d="M18 2Q4 12 18 22" />
      <line x1="18" y1="2" x2="18" y2="22" />
      <line x1="3" y1="12" x2="18" y2="12" />
      <path d="M16 10L18 12L16 14" />
      <path d="M5 10L3 12L5 14" />
    </g>
  ),
  // Scythe — long handle + crescent blade sweeping from the top
  caster: (
    <g>
      <line x1="21" y1="22" x2="10" y2="6" />
      <path d="M10 6C2 2 1 8 1 11C1 16 5 17 9 14C10 12 10 9 10 6Z" />
    </g>
  ),
  // Spear — long diagonal shaft + narrow leaf tip
  lancer: (
    <g>
      <line x1="5" y1="23" x2="15" y2="9" />
      <path d="M15 9L13 6L15 1L17 6Z" />
    </g>
  ),
  // Dagger — narrow triangular blade, guard, grip, pommel
  assassin: (
    <g>
      <path d="M10 14L12 3L14 14Z" />
      <line x1="7" y1="14" x2="17" y2="14" />
      <line x1="12" y1="14" x2="12" y2="21" />
      <path d="M10 21Q12 24 14 21" />
    </g>
  ),
  // Double thick swords crossed in X with crossguards
  berserker: (
    <g>
      <line x1="4" y1="3" x2="20" y2="21" strokeWidth="3.5" />
      <line x1="20" y1="3" x2="4" y2="21" strokeWidth="3.5" />
      <line x1="6" y1="12" x2="12" y2="6" />
      <line x1="12" y1="6" x2="18" y2="12" />
    </g>
  ),
};

interface FormNodeProps {
  form: ShadowForm;
  isActive: boolean;
  isHovered: boolean;
  isSelected: boolean;
  onClick: () => void;
  onEnter: () => void;
  onLeave: () => void;
}

function FormNode({ form, isActive, isHovered, isSelected, onClick, onEnter, onLeave }: FormNodeProps) {
  const pos  = FORM_POSITIONS[form.id];
  const r    = form.isCenter ? CENTER_R : NODE_R;
  const lit  = isActive || isHovered || isSelected;

  // Scale the 24×24 icon to fill ~65% of the circle diameter
  const iconScale  = form.isCenter ? 2.9 : 2.3;
  const iconOffset = 12 * iconScale; // centers the 24×24 box

  return (
    <g
      style={{ cursor: "pointer" }}
      onClick={onClick}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
    >
      {/* Ambient glow */}
      {lit && (
        <circle
          cx={pos.x} cy={pos.y} r={r + 14}
          fill={form.glow}
          opacity={isActive ? 0.45 : 0.2}
          style={{ filter: `blur(${isActive ? 12 : 8}px)` }}
        />
      )}

      {/* Active dashed ring */}
      {isActive && (
        <circle
          cx={pos.x} cy={pos.y} r={r + 6}
          fill="none"
          stroke={form.color}
          strokeWidth="2"
          opacity="0.8"
          strokeDasharray={form.isCenter ? undefined : "6 3"}
        />
      )}

      {/* Selection ring */}
      {isSelected && !isActive && (
        <circle
          cx={pos.x} cy={pos.y} r={r + 6}
          fill="none"
          stroke={form.color}
          strokeWidth="1.5"
          opacity="0.5"
        />
      )}

      {/* Main circle */}
      <circle
        cx={pos.x} cy={pos.y} r={r}
        fill={lit ? `${form.color}22` : "#0a0a18"}
        stroke={form.color}
        strokeWidth={isActive ? 2.5 : lit ? 1.5 : 1}
        opacity={lit ? 1 : 0.45}
      />

      {/* Weapon icon — 24×24 source, scaled & centered on the node */}
      <g
        transform={`translate(${pos.x - iconOffset}, ${pos.y - iconOffset}) scale(${iconScale})`}
        stroke={lit ? form.color : "#3a4060"}
        fill="none"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={lit ? 1 : 0.45}
      >
        {WEAPON_ICONS[form.id as ShadowFormId]}
      </g>

      {/* Label below circle */}
      <text
        x={pos.x} y={pos.y + r + 14}
        textAnchor="middle"
        fontSize={form.isCenter ? "10" : "9"}
        fontFamily="monospace"
        fontWeight="bold"
        fill={lit ? form.color : "#446"}
        letterSpacing="0.5"
        opacity={lit ? 0.95 : 0.45}
      >
        {form.label.toUpperCase()}
      </text>

      {/* Active badge */}
      {isActive && (
        <text
          x={pos.x} y={pos.y + r + 25}
          textAnchor="middle"
          fontSize="7"
          fontFamily="monospace"
          fill={form.color}
          opacity="0.8"
        >
          ◆ ACTIVE
        </text>
      )}
    </g>
  );
}

export default function ShadowFormPage() {
  const router = useRouter();
  const { user, character, setUser, setCharacter, updateCharacter } = useGameStore();

  const [activeForm,   setActiveForm]   = useState<ShadowFormId | null>(null);
  const [selectedForm, setSelectedForm] = useState<ShadowFormId | null>(null);
  const [hoveredForm,  setHoveredForm]  = useState<ShadowFormId | null>(null);
  const [pageReady,    setPageReady]    = useState(false);
  const [loading,      setLoading]      = useState(false);
  const [statusMsg,    setStatusMsg]    = useState<string | null>(null);

  const flash = useCallback((msg: string) => {
    setStatusMsg(msg); setTimeout(() => setStatusMsg(null), 2500);
  }, []);

  // ── Init ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    async function init() {
      if (!user) {
        const r = await fetch("/api/auth/me");
        if (!r.ok) { router.push("/login"); return; }
        const d = await r.json();
        setUser(d.data.user); setCharacter(d.data.character);
        if (!d.data.character) { router.push("/character/create"); return; }
        setActiveForm((d.data.character?.shadowForm ?? null) as ShadowFormId | null);
      } else {
        setActiveForm((character?.shadowForm ?? null) as ShadowFormId | null);
      }
      setPageReady(true);
    }
    init();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Activate form ─────────────────────────────────────────────────────────
  const activateForm = useCallback(async (formId: ShadowFormId) => {
    if (loading || formId === activeForm) return;
    setLoading(true);
    try {
      const res  = await fetch("/api/shadow-form", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ form: formId }),
      });
      const json = await res.json();
      if (!res.ok) { flash(json.error ?? "Failed"); return; }
      setActiveForm(formId);
      updateCharacter({ shadowForm: formId });
      const f = FORM_MAP.get(formId);
      flash(`${f?.label} form activated`);
    } finally { setLoading(false); }
  }, [loading, activeForm, flash, updateCharacter]);

  // ── Derived ───────────────────────────────────────────────────────────────
  const focusId   = selectedForm ?? hoveredForm;
  const focusForm = focusId ? FORM_MAP.get(focusId) ?? null : null;
  const activeFormData = activeForm ? FORM_MAP.get(activeForm) ?? null : null;

  if (!pageReady) {
    return (
      <div className="flex items-center justify-center h-64">
        <span className="text-xs font-mono text-gray-600 animate-pulse tracking-widest">LOADING SHADOW FORM...</span>
      </div>
    );
  }

  return (
    <div className="-mx-4 -mt-4 -mb-4 flex flex-col bg-black" style={{ height: "calc(100vh - 56px)", overflow: "hidden" }}>

      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-800 bg-[#05050f] shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-sm font-mono font-bold tracking-widest uppercase"
            style={{ color: activeFormData?.color ?? "#666" }}>
            Shadow Form
          </span>
          {activeFormData ? (
            <span className="text-xs font-mono px-2 py-0.5 border"
              style={{ color: activeFormData.color, borderColor: `${activeFormData.color}44`, background: `${activeFormData.color}11` }}>
              {activeFormData.label.toUpperCase()}
            </span>
          ) : (
            <span className="text-xs font-mono text-gray-600">No form selected</span>
          )}
        </div>
        {statusMsg && (
          <span className="text-xs font-mono text-cyan-400 animate-pulse">{statusMsg}</span>
        )}
      </div>

      {/* Main */}
      <div className="flex flex-1 overflow-hidden">

        {/* SVG hexagon */}
        <div className="flex-1 flex items-center justify-center p-4 min-w-0">
          <svg
            viewBox={`0 0 ${SVG_W} ${SVG_H}`}
            style={{ maxWidth: "min(480px, 100%)", width: "100%", height: "auto" }}
          >
            <defs>
              <radialGradient id="bg-grad" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#0a0a20" />
                <stop offset="100%" stopColor="#030308" />
              </radialGradient>
            </defs>

            {/* Background */}
            <rect width={SVG_W} height={SVG_H} fill="url(#bg-grad)" />

            {/* Subtle grid */}
            {Array.from({ length: 10 }, (_, i) => (
              <g key={i} stroke="#0d0d22" strokeWidth="0.5">
                <line x1={i * 55} y1="0" x2={i * 55} y2={SVG_H} />
                <line x1="0" y1={i * 55} x2={SVG_W} y2={i * 55} />
              </g>
            ))}

            {/* Hexagon outline */}
            <polygon
              points={hexPoints()}
              fill="none"
              stroke="#1a1a3a"
              strokeWidth="1"
            />

            {/* Spokes: center → each vertex */}
            {VERTEX_IDS.map(id => {
              const pos  = FORM_POSITIONS[id];
              const form = FORM_MAP.get(id)!;
              const lit  = id === activeForm || id === hoveredForm || id === selectedForm;
              return (
                <line
                  key={id}
                  x1={cx} y1={cy}
                  x2={pos.x} y2={pos.y}
                  stroke={lit ? form.color : "#1a1a3a"}
                  strokeWidth={lit ? 1 : 0.5}
                  opacity={lit ? 0.4 : 1}
                />
              );
            })}

            {/* Vertex nodes */}
            {SHADOW_FORMS.filter(f => !f.isCenter).map(form => (
              <FormNode
                key={form.id}
                form={form}
                isActive={activeForm === form.id}
                isHovered={hoveredForm === form.id}
                isSelected={selectedForm === form.id}
                onClick={() => setSelectedForm(prev => prev === form.id ? null : form.id as ShadowFormId)}
                onEnter={() => setHoveredForm(form.id as ShadowFormId)}
                onLeave={() => setHoveredForm(null)}
              />
            ))}

            {/* Center node (Saber) */}
            {SHADOW_FORMS.filter(f => f.isCenter).map(form => (
              <FormNode
                key={form.id}
                form={form}
                isActive={activeForm === form.id}
                isHovered={hoveredForm === form.id}
                isSelected={selectedForm === form.id}
                onClick={() => setSelectedForm(prev => prev === form.id ? null : form.id as ShadowFormId)}
                onEnter={() => setHoveredForm(form.id as ShadowFormId)}
                onLeave={() => setHoveredForm(null)}
              />
            ))}
          </svg>
        </div>

        {/* Detail panel */}
        <div className="w-80 border-l border-gray-800 bg-[#05050f] flex flex-col shrink-0 overflow-y-auto">
          {focusForm ? (
            <div className="flex-1 flex flex-col p-5 gap-4">
              {/* Form header */}
              <div>
                <div className="text-[10px] font-mono text-gray-600 uppercase tracking-widest mb-1">Shadow Form</div>
                <div className="text-2xl font-mono font-bold" style={{ color: focusForm.color }}>
                  {focusForm.label}
                </div>
                <div className="text-xs font-mono mt-0.5" style={{ color: `${focusForm.color}99` }}>
                  {focusForm.description}
                </div>
              </div>

              <div className="w-full h-px" style={{ background: `${focusForm.color}22` }} />

              {/* Lore */}
              <div className="text-xs font-mono text-gray-500 leading-relaxed italic">
                &ldquo;{focusForm.lore}&rdquo;
              </div>

              <div className="w-full h-px bg-gray-800" />

              {/* Stats */}
              <div className="space-y-2">
                <div className="text-[10px] font-mono text-gray-600 uppercase tracking-widest">Stat Bonus</div>
                <div className="text-xs font-mono px-3 py-2 border"
                  style={{ color: focusForm.color, borderColor: `${focusForm.color}33`, background: `${focusForm.color}0a` }}>
                  {focusForm.statBonus}
                </div>
              </div>

              {/* Unlocks */}
              <div className="space-y-2">
                <div className="text-[10px] font-mono text-gray-600 uppercase tracking-widest">Unlocks</div>
                <div className="text-xs font-mono px-3 py-2 border border-gray-800 text-gray-400 bg-gray-900/40">
                  {focusForm.unlocks === "–" ? (
                    <span className="text-gray-600">No special access</span>
                  ) : (
                    focusForm.unlocks
                  )}
                </div>
              </div>

              <div className="mt-auto pt-2">
                {activeForm === focusForm.id ? (
                  <div className="w-full py-2 border text-center text-xs font-mono tracking-wider"
                    style={{ color: focusForm.color, borderColor: `${focusForm.color}44`, background: `${focusForm.color}11` }}>
                    ◆ ACTIVE FORM
                  </div>
                ) : (
                  <button
                    onClick={() => activateForm(focusForm.id as ShadowFormId)}
                    disabled={loading}
                    className="w-full py-2 border text-center text-xs font-mono tracking-wider transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90"
                    style={{
                      color: focusForm.color,
                      borderColor: `${focusForm.color}66`,
                      background: `${focusForm.color}18`,
                    }}
                  >
                    {loading ? "ACTIVATING..." : `ACTIVATE ${focusForm.label.toUpperCase()}`}
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 p-6 text-center">
              <div className="text-3xl text-gray-700">◈</div>
              <div className="text-xs font-mono text-gray-600 leading-relaxed">
                Select a form to view its details and activate it.
              </div>
              <div className="text-[10px] font-mono text-gray-700 mt-2 space-y-1">
                <div><span className="text-cyan-800">Rider</span> → Academy</div>
                <div><span className="text-amber-800">Saber</span> → Missions · Commit Log</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
