"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { useGameStore } from "@/store/useGameStore";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

interface GuildMember {
  _id: string;
  name: string;
  level: number;
  shadowForm: string | null;
  rank: string;
  position: string | null;
}

interface GuildInfo {
  _id: string;
  name: string;
  tag: string;
  description: string;
  marsRating: number;
  level: number;
  leaderId: string;
}

interface Application {
  characterId: string;
  name: string;
  level: number;
  shadowForm: string | null;
  message: string;
  appliedAt: string;
}

// ── Single unified rank system ─────────────────────────────────────────────
interface RankMeta { symbol: string; label: string; color: string; group: string }

const RANK_META: Record<string, RankMeta> = {
  // Chess
  king:      { symbol: "♔", label: "King",      color: "text-yellow-400", group: "Chess"       },
  queen:     { symbol: "♛", label: "Queen",     color: "text-purple-400", group: "Chess"       },
  rook:      { symbol: "♜", label: "Rook",      color: "text-orange-400", group: "Chess"       },
  bishop:    { symbol: "♝", label: "Bishop",    color: "text-blue-400",   group: "Chess"       },
  knight:    { symbol: "♞", label: "Knight",    color: "text-green-400",  group: "Chess"       },
  pawn:      { symbol: "♟", label: "Pawn",      color: "text-gray-400",   group: "Chess"       },
  // Shadow Forms
  saber:     { symbol: "◤", label: "Saber",     color: "text-red-400",    group: "Shadow Form" },
  lancer:    { symbol: "◭", label: "Lancer",    color: "text-orange-400", group: "Shadow Form" },
  rider:     { symbol: "◉", label: "Rider",     color: "text-yellow-400", group: "Shadow Form" },
  caster:    { symbol: "✦", label: "Caster",    color: "text-purple-400", group: "Shadow Form" },
  berserker: { symbol: "◈", label: "Berserker", color: "text-rose-500",   group: "Shadow Form" },
  archer:    { symbol: "◎", label: "Archer",    color: "text-green-400",  group: "Shadow Form" },
  assassin:  { symbol: "◆", label: "Assassin",  color: "text-violet-400", group: "Shadow Form" },
  // Special
  demon:     { symbol: "◈", label: "Demon",     color: "text-red-600",    group: "Demon"       },
};

const RANK_GROUPS = ["Chess", "Shadow Form", "Demon"] as const;
// All assignable positions (leader's King is implicit — shown separately, not in picker)
const ASSIGNABLE_RANKS = Object.entries(RANK_META)
  .filter(([k]) => k !== "king")
  .map(([k]) => k);

const RECRUIT: RankMeta = { symbol: "◌", label: "Recruit", color: "text-gray-600", group: "" };

const FORM_COLORS: Record<string, string> = {
  caster: "text-purple-400", assassin: "text-violet-400", saber: "text-red-400",
  lancer: "text-orange-400", rider: "text-yellow-400", berserker: "text-red-600",
  archer: "text-green-400",
};

// Sort members: leader first, then by rank priority, then by level
const RANK_ORDER = ["king","queen","rook","bishop","knight","pawn","saber","lancer","rider","caster","berserker","archer","assassin","demon"];
function sortMembers(members: GuildMember[], leaderId: string) {
  return [...members].sort((a, b) => {
    if (a._id === leaderId) return -1;
    if (b._id === leaderId) return 1;
    const aRank = a.position ? RANK_ORDER.indexOf(a.position) : 99;
    const bRank = b.position ? RANK_ORDER.indexOf(b.position) : 99;
    if (aRank !== bRank) return aRank - bRank;
    return b.level - a.level;
  });
}

async function safeJson(res: Response): Promise<{ ok: boolean; data?: Record<string, unknown>; error: string }> {
  try {
    const data = await res.json();
    return { ok: res.ok, data, error: data?.error ?? "Unknown error" };
  } catch {
    return { ok: false, error: `Server error (${res.status})` };
  }
}

export default function GuildProfilePage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const { user, character, setUser, setCharacter } = useGameStore();

  const [guild, setGuild] = useState<GuildInfo | null>(null);
  const [members, setMembers] = useState<GuildMember[]>([]);
  const [isMember, setIsMember] = useState(false);
  const [isLeader, setIsLeader] = useState(false);
  const [viewerCharId, setViewerCharId] = useState("");
  const [viewerPosition, setViewerPosition] = useState<string | null>(null);
  const [hasApplied, setHasApplied] = useState(false);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [actingApp, setActingApp] = useState<string | null>(null);
  const [promotingMember, setPromotingMember] = useState<string | null>(null);
  const [actingPosition, setActingPosition] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  useEffect(() => {
    if (!user) {
      fetch("/api/auth/me").then(async (r) => {
        if (!r.ok) { router.push("/login"); return; }
        const d = await r.json();
        setUser(d.data.user);
        setCharacter(d.data.character);
      });
    }
  }, [user, router, setUser, setCharacter]);

  const fetchGuild = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/guilds/${id}`);
    const { ok, data } = await safeJson(res);
    if (ok && data?.data) {
      const d = data.data as Record<string, unknown>;
      const g = d.guild as GuildInfo;
      const ms = d.members as GuildMember[];
      setGuild(g);
      setMembers(sortMembers(ms, g.leaderId));
      setIsMember(d.isMember as boolean);
      setIsLeader(d.isLeader as boolean);
      setViewerCharId(d.viewerCharId as string);
      const viewer = ms.find(m => m._id === (d.viewerCharId as string));
      setViewerPosition(viewer?.position ?? null);
      setHasApplied(d.hasApplied as boolean);
    }
    setLoading(false);
  }, [id]);

  const fetchApplications = useCallback(async () => {
    const res = await fetch(`/api/guilds/${id}/applications`);
    const { ok, data } = await safeJson(res);
    if (ok && data?.data)
      setApplications((data.data as { applications: Application[] }).applications);
  }, [id]);

  useEffect(() => { fetchGuild(); }, [fetchGuild]);
  useEffect(() => {
    if (isLeader || viewerPosition === "queen") fetchApplications();
  }, [isLeader, viewerPosition, fetchApplications]);

  async function applyToGuild() {
    const message = prompt("Optional application message (leave blank to skip):") ?? "";
    setApplying(true);
    const res = await fetch(`/api/guilds/${id}/apply`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
    });
    const { ok, data, error } = await safeJson(res);
    setMsg({ text: ok ? (data?.data as { message: string })?.message : error, ok });
    if (ok) fetchGuild();
    setApplying(false);
  }

  async function leaveGuild() {
    if (!confirm("Are you sure you want to leave this guild?")) return;
    setLeaving(true);
    const res = await fetch(`/api/guilds/${id}/leave`, { method: "POST" });
    const { ok, data, error } = await safeJson(res);
    setMsg({ text: ok ? (data?.data as { message: string })?.message : error, ok });
    if (ok) {
      fetchGuild();
      setCharacter(character ? { ...character, guildIds: (character.guildIds as unknown as string[]).filter((g) => g !== id) as never } : character);
    }
    setLeaving(false);
  }

  async function deleteGuild() {
    if (!confirm(`Disband [${guild?.tag}] ${guild?.name}? This cannot be undone.`)) return;
    setDeleting(true);
    const res = await fetch(`/api/guilds/${id}`, { method: "DELETE" });
    const { ok, error } = await safeJson(res);
    if (ok) router.push("/guilds");
    else setMsg({ text: error, ok: false });
    setDeleting(false);
  }

  async function handleApplication(characterId: string, action: "accept" | "reject") {
    setActingApp(characterId + action);
    const res = await fetch(`/api/guilds/${id}/applications`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ characterId, action }),
    });
    const { ok, data, error } = await safeJson(res);
    setMsg({ text: ok ? (data?.data as { message: string })?.message : error, ok });
    setActingApp(null);
    if (ok) { fetchGuild(); fetchApplications(); }
  }

  async function setMemberPosition(memberId: string, position: string | null) {
    setActingPosition(memberId);
    const res = await fetch(`/api/guilds/${id}/position`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memberId, position }),
    });
    const { ok, data, error } = await safeJson(res);
    setMsg({ text: ok ? (data?.data as { message: string })?.message : error, ok });
    setActingPosition(null);
    setPromotingMember(null);
    if (ok) fetchGuild();
  }

  if (loading) return <p className="text-xs font-mono text-gray-600 p-4">Loading guild...</p>;

  if (!guild) {
    return (
      <div className="p-4 text-center">
        <p className="text-xs font-mono text-red-400">Guild not found.</p>
        <button onClick={() => router.push("/guilds")} className="mt-3 text-xs font-mono text-gray-600 hover:text-gray-400 underline">← Back to guilds</button>
      </div>
    );
  }

  const canManageApps = isLeader || viewerPosition === "queen";

  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      <button onClick={() => router.push("/guilds")} className="text-xs font-mono text-gray-600 hover:text-gray-400 transition-colors">
        ← Guild Hall
      </button>

      {/* Header */}
      <div className="border border-gray-800 bg-gray-950 p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <span className="text-xs font-mono text-gray-600 border border-gray-700 px-2 py-0.5">[{guild.tag}]</span>
              <h1 className="text-2xl font-mono font-bold text-gray-100">{guild.name}</h1>
            </div>
            <div className="flex flex-wrap gap-4 text-xs font-mono text-gray-600 mt-2">
              <span>Level <span className="text-gray-400">{guild.level}</span></span>
              <span>Members <span className="text-gray-400">{members.length}</span></span>
              <span>Mars Rating <span className="text-red-400">{guild.marsRating}</span></span>
              {isMember && (
                <span>
                  Your rank{" "}
                  {isLeader ? (
                    <span className="text-yellow-400">♔ King</span>
                  ) : viewerPosition ? (
                    <span className={RANK_META[viewerPosition]?.color ?? "text-gray-400"}>
                      {RANK_META[viewerPosition]?.symbol} {RANK_META[viewerPosition]?.label}
                    </span>
                  ) : (
                    <span className="text-gray-600">◌ Recruit</span>
                  )}
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-2 shrink-0">
            {!isMember && !hasApplied && (
              <Button size="sm" variant="secondary" loading={applying} onClick={applyToGuild}>Apply to Join</Button>
            )}
            {hasApplied && !isMember && (
              <span className="text-xs font-mono text-yellow-500 border border-yellow-900 px-3 py-1.5">Application Pending</span>
            )}
            {isMember && !isLeader && (
              <Button size="sm" variant="danger" loading={leaving} onClick={leaveGuild}>Leave Guild</Button>
            )}
            {isLeader && (
              <>
                <span className="text-xs font-mono text-yellow-400 border border-yellow-900 px-3 py-1.5">♔ Guild Leader</span>
                <Button size="sm" variant="danger" loading={deleting} onClick={deleteGuild}>Disband Guild</Button>
              </>
            )}
          </div>
        </div>
        {guild.description && (
          <p className="mt-4 text-sm font-mono text-gray-400 leading-relaxed border-t border-gray-800 pt-4">
            {guild.description}
          </p>
        )}
      </div>

      {msg && (
        <div className={`text-xs font-mono p-2 border ${msg.ok ? "border-green-800 text-green-400" : "border-red-800 text-red-400"}`}>
          {msg.text}
        </div>
      )}

      {/* Applications */}
      {canManageApps && (
        <Card title={`Applications (${applications.length})`} accent="yellow">
          {applications.length === 0 ? (
            <p className="text-xs font-mono text-gray-600">No pending applications.</p>
          ) : (
            <div className="space-y-3">
              {applications.map((app) => (
                <div key={app.characterId} className="border border-gray-800 p-3 flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-mono text-gray-200">{app.name}</span>
                      <span className="text-xs font-mono text-gray-600">Lv.{app.level}</span>
                      {app.shadowForm && <span className={`text-xs font-mono ${FORM_COLORS[app.shadowForm] ?? "text-gray-500"}`}>[{app.shadowForm}]</span>}
                    </div>
                    {app.message && <p className="text-xs text-gray-500 mt-1 italic">"{app.message}"</p>}
                    <p className="text-xs text-gray-700 mt-0.5">{new Date(app.appliedAt).toLocaleDateString()}</p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button size="sm" variant="success" loading={actingApp === app.characterId + "accept"} onClick={() => handleApplication(app.characterId, "accept")}>Accept</Button>
                    <Button size="sm" variant="danger" loading={actingApp === app.characterId + "reject"} onClick={() => handleApplication(app.characterId, "reject")}>Reject</Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Members */}
      <Card title={`Members — ${members.length}`} accent="cyan">
        <div className="space-y-1">
          {members.map((m) => {
            const isLeaderRow = m._id === guild.leaderId;
            const rankMeta = isLeaderRow
              ? RANK_META["king"]
              : m.position
              ? (RANK_META[m.position] ?? RECRUIT)
              : RECRUIT;
            const isPromoting = promotingMember === m._id;

            return (
              <div key={m._id} className="py-2.5 border-b border-gray-900 last:border-0">
                {/* Member row */}
                <div className="flex items-center gap-3">
                  {/* Single rank badge */}
                  <span className={`font-mono text-sm w-6 text-center shrink-0 ${rankMeta.color}`} title={rankMeta.label}>
                    {rankMeta.symbol}
                  </span>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className="text-sm font-mono text-gray-200 hover:text-cyan-400 cursor-pointer transition-colors"
                        onClick={() => router.push(`/profile/${m._id}`)}
                      >
                        {m.name}
                      </span>
                      <span className="text-xs font-mono text-gray-600">Lv.{m.level}</span>
                      {m.shadowForm && (
                        <span className={`text-xs font-mono ${FORM_COLORS[m.shadowForm] ?? "text-gray-500"}`}>
                          [{m.shadowForm}]
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Rank label */}
                  <span className={`text-xs font-mono shrink-0 hidden sm:block ${rankMeta.color}`}>
                    {rankMeta.label}
                  </span>

                  {/* Leader: Promote button (not for self) */}
                  {isLeader && !isLeaderRow && (
                    <button
                      onClick={() => setPromotingMember(isPromoting ? null : m._id)}
                      className={`text-xs font-mono shrink-0 transition-colors ${
                        isPromoting ? "text-cyan-500" : "text-gray-700 hover:text-cyan-600"
                      }`}
                    >
                      {isPromoting ? "✕ Close" : "Promote"}
                    </button>
                  )}
                </div>

                {/* Promotion picker — only visible to leader, for this member */}
                {isLeader && isPromoting && (
                  <div className="mt-3 ml-9 space-y-4 pb-1">
                    {RANK_GROUPS.map((group) => {
                      const slots = Object.entries(RANK_META).filter(([k, v]) => v.group === group && k !== "king");
                      return (
                        <div key={group}>
                          <p className={`text-xs font-mono uppercase tracking-widest mb-2 ${
                            group === "Demon" ? "text-red-700" : group === "Shadow Form" ? "text-violet-700" : "text-yellow-800"
                          }`}>
                            {group}
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {slots.map(([posId, meta]) => {
                              const isActive = m.position === posId;
                              return (
                                <button
                                  key={posId}
                                  disabled={actingPosition === m._id}
                                  onClick={() => setMemberPosition(m._id, isActive ? null : posId)}
                                  className={`text-xs font-mono px-2 py-1 border transition-colors ${
                                    isActive
                                      ? `border-current bg-gray-900 ${meta.color}`
                                      : `border-gray-800 ${meta.color} hover:border-gray-600`
                                  } ${group === "Demon" ? "font-bold" : ""}`}
                                  title={isActive ? "Click to demote to Recruit" : `Set rank to ${meta.label}`}
                                >
                                  {meta.symbol} {meta.label}
                                  {isActive && <span className="ml-1 opacity-50">✓</span>}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                    {m.position && (
                      <button
                        disabled={actingPosition === m._id}
                        onClick={() => setMemberPosition(m._id, null)}
                        className="text-xs font-mono text-gray-700 hover:text-gray-500 transition-colors"
                      >
                        ◌ Demote to Recruit
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
