"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { useGameStore } from "@/store/useGameStore";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Dialog } from "@/components/ui/Dialog";

interface GuildMember {
  _id: string;
  name: string;
  level: number;
  shadowForm: string | null;
  positions: string[];
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

interface RankMeta { symbol: string; label: string; color: string; group: string }
const RANK_META: Record<string, RankMeta> = {
  king:      { symbol: "♔", label: "King",      color: "text-yellow-400", group: "Chess"       },
  queen:     { symbol: "♛", label: "Queen",     color: "text-purple-400", group: "Chess"       },
  rook:      { symbol: "♜", label: "Rook",      color: "text-orange-400", group: "Chess"       },
  bishop:    { symbol: "♝", label: "Bishop",    color: "text-blue-400",   group: "Chess"       },
  knight:    { symbol: "♞", label: "Knight",    color: "text-green-400",  group: "Chess"       },
  pawn:      { symbol: "♟", label: "Pawn",      color: "text-gray-400",   group: "Chess"       },
  saber:     { symbol: "◤", label: "Saber",     color: "text-red-400",    group: "Shadow Form" },
  lancer:    { symbol: "◭", label: "Lancer",    color: "text-orange-400", group: "Shadow Form" },
  rider:     { symbol: "◉", label: "Rider",     color: "text-yellow-400", group: "Shadow Form" },
  caster:    { symbol: "✦", label: "Caster",    color: "text-purple-400", group: "Shadow Form" },
  berserker: { symbol: "◈", label: "Berserker", color: "text-rose-500",   group: "Shadow Form" },
  archer:    { symbol: "◎", label: "Archer",    color: "text-green-400",  group: "Shadow Form" },
  assassin:  { symbol: "◆", label: "Assassin",  color: "text-violet-400", group: "Shadow Form" },
  demon:     { symbol: "◈", label: "Demon",     color: "text-red-600",    group: "Demon"       },
};
const RANK_GROUPS = ["Chess", "Shadow Form", "Demon"] as const;
const ASSIGNABLE_RANKS = Object.keys(RANK_META).filter((k) => k !== "king");

const FORM_COLORS: Record<string, string> = {
  caster: "text-purple-400", assassin: "text-violet-400", saber: "text-red-400",
  lancer: "text-orange-400", rider: "text-yellow-400", berserker: "text-red-600",
  archer: "text-green-400",
};

async function safeJson(res: Response): Promise<{ ok: boolean; data?: Record<string, unknown>; error: string }> {
  try {
    const data = await res.json();
    return { ok: res.ok, data, error: data?.error ?? "Unknown error" };
  } catch {
    return { ok: false, error: `Server error (${res.status})` };
  }
}

type DlgCfg = {
  open: boolean;
  title: string;
  message: React.ReactNode;
  confirmLabel: string;
  confirmVariant: "danger" | "primary" | "success";
  withInput: boolean;
  inputPlaceholder: string;
  onConfirm: (val?: string) => void;
};
const CLOSED: DlgCfg = {
  open: false, title: "", message: "", confirmLabel: "Confirm",
  confirmVariant: "primary", withInput: false, inputPlaceholder: "", onConfirm: () => {},
};

export default function GuildProfilePage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const { user, character, setUser, setCharacter } = useGameStore();

  const [guild, setGuild]                     = useState<GuildInfo | null>(null);
  const [members, setMembers]                 = useState<GuildMember[]>([]);
  const [isMember, setIsMember]               = useState(false);
  const [isLeader, setIsLeader]               = useState(false);
  const [viewerCharId, setViewerCharId]       = useState("");
  const [viewerPositions, setViewerPositions] = useState<string[]>([]);
  const [hasApplied, setHasApplied]           = useState(false);
  const [applications, setApplications]       = useState<Application[]>([]);
  const [loading, setLoading]                 = useState(true);
  const [applying, setApplying]               = useState(false);
  const [leaving, setLeaving]                 = useState(false);
  const [deleting, setDeleting]               = useState(false);
  const [actingApp, setActingApp]             = useState<string | null>(null);
  const [promotingMember, setPromotingMember] = useState<string | null>(null);
  const [kickingMember, setKickingMember]     = useState<string | null>(null);
  const [savingPosition, setSavingPosition]   = useState<string | null>(null);
  const [draft, setDraft]                     = useState<string[]>([]);
  const [msg, setMsg]                         = useState<{ text: string; ok: boolean } | null>(null);

  // Generic dialog
  const [dlg, setDlg] = useState<DlgCfg>(CLOSED);
  const closeDlg = () => setDlg(CLOSED);
  function showDlg(cfg: Omit<DlgCfg, "open">) { setDlg({ open: true, ...cfg }); }

  // Transfer leadership
  const [transferPickerOpen, setTransferPickerOpen] = useState(false);
  const [transferTarget, setTransferTarget]         = useState<GuildMember | null>(null);
  const [transferring, setTransferring]             = useState(false);

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
      setGuild(d.guild as GuildInfo);
      setMembers(d.members as GuildMember[]);
      setIsMember(d.isMember as boolean);
      setIsLeader(d.isLeader as boolean);
      setViewerCharId(d.viewerCharId as string);
      setViewerPositions((d.viewerPositions as string[]) ?? []);
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
    if (isLeader || viewerPositions.includes("queen")) fetchApplications();
  }, [isLeader, viewerPositions, fetchApplications]);

  function openPromoter(memberId: string) {
    if (promotingMember === memberId) { setPromotingMember(null); setDraft([]); return; }
    const member = members.find((m) => m._id === memberId);
    setPromotingMember(memberId);
    setDraft(member?.positions ?? []);
  }

  function toggleDraft(position: string) {
    setDraft((prev) => {
      if (prev.includes(position)) return prev.filter((p) => p !== position);
      if (prev.length >= 3) return prev;
      return [...prev, position];
    });
  }

  async function validatePositions(memberId: string) {
    const saved = members.find((m) => m._id === memberId)?.positions ?? [];
    const next = [...draft];
    setMembers((prev) => prev.map((m) => m._id === memberId ? { ...m, positions: next } : m));
    setPromotingMember(null);
    setDraft([]);
    setSavingPosition(memberId);
    const res = await fetch(`/api/guilds/${id}/position`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memberId, positions: next }),
    });
    const { ok, error } = await safeJson(res);
    setSavingPosition(null);
    if (!ok) {
      setMembers((prev) => prev.map((m) => m._id === memberId ? { ...m, positions: saved } : m));
      setMsg({ text: error, ok: false });
    } else {
      setMsg({ text: next.length ? "Ranks updated" : "Demoted to Recruit", ok: true });
    }
  }

  function applyToGuild() {
    showDlg({
      title: "Apply to Guild",
      message: "Add an optional message with your application.",
      confirmLabel: "Send Application",
      confirmVariant: "primary",
      withInput: true,
      inputPlaceholder: "Optional message...",
      onConfirm: async (message = "") => {
        closeDlg();
        setApplying(true);
        const res = await fetch(`/api/guilds/${id}/apply`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message }),
        });
        const { ok: resOk, data, error } = await safeJson(res);
        setMsg({ text: resOk ? (data?.data as { message: string })?.message : error, ok: resOk });
        if (resOk) fetchGuild();
        setApplying(false);
      },
    });
  }

  function leaveGuild() {
    showDlg({
      title: "Leave Guild",
      message: `Leave [${guild?.tag}] ${guild?.name}? You will need to re-apply to rejoin.`,
      confirmLabel: "Leave",
      confirmVariant: "danger",
      withInput: false,
      inputPlaceholder: "",
      onConfirm: async () => {
        closeDlg();
        setLeaving(true);
        const res = await fetch(`/api/guilds/${id}/leave`, { method: "POST" });
        const { ok: resOk, data, error } = await safeJson(res);
        setMsg({ text: resOk ? (data?.data as { message: string })?.message : error, ok: resOk });
        if (resOk) {
          fetchGuild();
          setCharacter(character ? { ...character, guildIds: (character.guildIds as unknown as string[]).filter((g) => g !== id) as never } : character);
        }
        setLeaving(false);
      },
    });
  }

  function deleteGuild() {
    showDlg({
      title: "Disband Guild",
      message: `Permanently disband [${guild?.tag}] ${guild?.name}? All members will be removed. This cannot be undone.`,
      confirmLabel: "Disband",
      confirmVariant: "danger",
      withInput: false,
      inputPlaceholder: "",
      onConfirm: async () => {
        closeDlg();
        setDeleting(true);
        const res = await fetch(`/api/guilds/${id}`, { method: "DELETE" });
        const { ok: resOk, error } = await safeJson(res);
        if (resOk) router.push("/guilds");
        else { setMsg({ text: error, ok: false }); setDeleting(false); }
      },
    });
  }

  function kickMember(memberId: string, name: string) {
    showDlg({
      title: "Kick Member",
      message: `Remove ${name} from the guild?`,
      confirmLabel: "Kick",
      confirmVariant: "danger",
      withInput: false,
      inputPlaceholder: "",
      onConfirm: async () => {
        closeDlg();
        setKickingMember(memberId);
        setMembers((prev) => prev.filter((m) => m._id !== memberId));
        setPromotingMember(null);
        const res = await fetch(`/api/guilds/${id}/kick`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ memberId }),
        });
        const { ok: resOk, error } = await safeJson(res);
        if (!resOk) { setMsg({ text: error, ok: false }); fetchGuild(); }
        else { setMsg({ text: `${name} has been kicked`, ok: true }); }
        setKickingMember(null);
      },
    });
  }

  async function transferLeadership(target: GuildMember) {
    setTransferTarget(null);
    setTransferring(true);
    const res = await fetch(`/api/guilds/${id}/transfer`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newLeaderId: target._id }),
    });
    const { ok: resOk, data, error } = await safeJson(res);
    setMsg({ text: resOk ? (data?.data as { message: string })?.message : error, ok: resOk });
    if (resOk) fetchGuild();
    setTransferring(false);
  }

  async function handleApplication(characterId: string, action: "accept" | "reject") {
    setActingApp(characterId + action);
    const res = await fetch(`/api/guilds/${id}/applications`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ characterId, action }),
    });
    const { ok: resOk, data, error } = await safeJson(res);
    setMsg({ text: resOk ? (data?.data as { message: string })?.message : error, ok: resOk });
    setActingApp(null);
    if (resOk) { fetchGuild(); fetchApplications(); }
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

  const canManageApps = isLeader || viewerPositions.includes("queen");
  const eligibleMembers = members.filter((m) => m._id !== viewerCharId);

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
                <span>Your rank{" "}
                  {isLeader
                    ? <span className="text-yellow-400">♔ King</span>
                    : viewerPositions.length
                    ? viewerPositions.map((p) => (
                        <span key={p} className={`mr-1 ${RANK_META[p]?.color ?? "text-gray-400"}`}>
                          {RANK_META[p]?.symbol} {RANK_META[p]?.label}
                        </span>
                      ))
                    : <span className="text-gray-600">◌ Recruit</span>
                  }
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-2 shrink-0">
            {!isMember && !isLeader && !hasApplied && (
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
                <Button
                  size="sm"
                  variant="secondary"
                  loading={transferring}
                  disabled={eligibleMembers.length === 0}
                  onClick={() => setTransferPickerOpen(true)}
                >
                  Transfer Leadership
                </Button>
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
                    {app.message && <p className="text-xs text-gray-500 mt-1 italic">&ldquo;{app.message}&rdquo;</p>}
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
            const isPromoting = promotingMember === m._id;

            return (
              <div key={m._id} className="py-2.5 border-b border-gray-900 last:border-0">
                <div className="flex items-center gap-3">
                  <div className="flex gap-1 shrink-0 min-w-[2rem]">
                    {isLeaderRow ? (
                      <span className="text-yellow-400 font-mono" title="King">♔</span>
                    ) : m.positions.length > 0 ? (
                      m.positions.map((p) => (
                        <span key={p} className={`font-mono ${RANK_META[p]?.color ?? "text-gray-400"}`} title={RANK_META[p]?.label}>
                          {RANK_META[p]?.symbol}
                        </span>
                      ))
                    ) : (
                      <span className="text-gray-700 font-mono" title="Recruit">◌</span>
                    )}
                  </div>

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
                      {!isLeaderRow && m.positions.length > 0 && (
                        <span className="text-xs font-mono text-gray-600">
                          {m.positions.map((p) => RANK_META[p]?.label ?? p).join(" · ")}
                        </span>
                      )}
                      {!isLeaderRow && m.positions.length === 0 && (
                        <span className="text-xs font-mono text-gray-700">Recruit</span>
                      )}
                    </div>
                  </div>

                  {isLeader && !isLeaderRow && (
                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => openPromoter(m._id)}
                        className={`text-xs font-mono transition-colors ${isPromoting ? "text-cyan-500" : "text-gray-700 hover:text-cyan-600"}`}
                      >
                        {isPromoting ? "✕ Close" : "Promote"}
                      </button>
                      <button
                        onClick={() => kickMember(m._id, m.name)}
                        disabled={kickingMember === m._id}
                        className="text-xs font-mono text-gray-700 hover:text-red-500 transition-colors disabled:opacity-40"
                      >
                        Kick
                      </button>
                    </div>
                  )}
                </div>

                {isLeader && isPromoting && (
                  <div className="mt-3 ml-8 space-y-3 pb-1 border-l border-gray-800 pl-4">
                    <p className="text-xs font-mono text-gray-500">
                      Select 1–3 ranks then click <span className="text-cyan-500">Validate</span>
                      <span className="ml-2 text-gray-700">({draft.length}/3)</span>
                    </p>

                    {RANK_GROUPS.map((group) => {
                      const slots = ASSIGNABLE_RANKS.filter((k) => RANK_META[k].group === group);
                      return (
                        <div key={group}>
                          <p className={`text-xs font-mono uppercase tracking-widest mb-1.5 ${
                            group === "Demon" ? "text-red-700" : group === "Shadow Form" ? "text-violet-700" : "text-yellow-800"
                          }`}>
                            {group}
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {slots.map((posId) => {
                              const meta = RANK_META[posId];
                              const isSelected = draft.includes(posId);
                              const maxed = !isSelected && draft.length >= 3;
                              return (
                                <button
                                  key={posId}
                                  disabled={maxed}
                                  onClick={() => toggleDraft(posId)}
                                  className={`text-xs font-mono px-2 py-1 border transition-colors ${
                                    isSelected
                                      ? `border-current bg-gray-900 ${meta.color}`
                                      : maxed
                                      ? `border-gray-900 text-gray-700 cursor-not-allowed`
                                      : `border-gray-800 ${meta.color} hover:border-gray-600`
                                  } ${group === "Demon" ? "font-bold" : ""}`}
                                  title={isSelected ? "Click to deselect" : maxed ? "Max 3 ranks" : meta.label}
                                >
                                  {meta.symbol} {meta.label}
                                  {isSelected && <span className="ml-1 opacity-60">✓</span>}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}

                    <div className="flex items-center gap-3 pt-1">
                      <Button size="sm" loading={savingPosition === m._id} onClick={() => validatePositions(m._id)}>
                        Validate
                      </Button>
                      {draft.length > 0 && (
                        <button onClick={() => setDraft([])} className="text-xs font-mono text-gray-700 hover:text-gray-400 transition-colors">
                          ◌ Clear selection
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      {/* Transfer Leadership — member picker */}
      {transferPickerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/70" onClick={() => setTransferPickerOpen(false)} />
          <div className="relative z-10 w-full max-w-sm bg-gray-950 border border-gray-700 shadow-2xl">
            <div className="px-5 py-3 border-b border-gray-800 flex items-center justify-between">
              <div>
                <h2 className="text-xs font-mono font-bold text-gray-200 uppercase tracking-widest">Transfer Leadership</h2>
                <p className="text-xs font-mono text-gray-600 mt-0.5">Select the new guild leader</p>
              </div>
              <button
                onClick={() => setTransferPickerOpen(false)}
                className="text-gray-600 hover:text-gray-300 font-mono text-lg leading-none transition-colors"
              >
                ✕
              </button>
            </div>
            {eligibleMembers.length === 0 ? (
              <p className="px-5 py-4 text-xs font-mono text-gray-600">No other members to transfer to.</p>
            ) : (
              <ul className="max-h-64 overflow-y-auto divide-y divide-gray-900">
                {eligibleMembers.map((m) => (
                  <li
                    key={m._id}
                    className="px-4 py-3 flex items-center gap-3 cursor-pointer hover:bg-gray-900 transition-colors"
                    onClick={() => { setTransferPickerOpen(false); setTransferTarget(m); }}
                  >
                    <div className="flex gap-1 shrink-0 min-w-[1.25rem]">
                      {m.positions.length > 0 ? (
                        m.positions.slice(0, 1).map((p) => (
                          <span key={p} className={`font-mono ${RANK_META[p]?.color ?? "text-gray-400"}`}>{RANK_META[p]?.symbol}</span>
                        ))
                      ) : (
                        <span className="text-gray-700 font-mono">◌</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-mono text-gray-200">{m.name}</span>
                      <span className="ml-2 text-xs font-mono text-gray-600">Lv.{m.level}</span>
                      {m.shadowForm && (
                        <span className={`ml-2 text-xs font-mono ${FORM_COLORS[m.shadowForm] ?? "text-gray-500"}`}>[{m.shadowForm}]</span>
                      )}
                    </div>
                    <span className="text-xs font-mono text-gray-700">→</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* Generic confirm / prompt dialog */}
      <Dialog
        open={dlg.open}
        title={dlg.title}
        message={dlg.message}
        confirmLabel={dlg.confirmLabel}
        confirmVariant={dlg.confirmVariant}
        withInput={dlg.withInput}
        inputPlaceholder={dlg.inputPlaceholder}
        onConfirm={dlg.onConfirm}
        onCancel={closeDlg}
      />

      {/* Transfer leadership confirmation */}
      <Dialog
        open={!!transferTarget}
        title="Confirm Transfer"
        message={
          <>
            Transfer guild leadership to{" "}
            <span className="text-yellow-400 font-semibold">{transferTarget?.name}</span>?{" "}
            You will become a regular member. This cannot be undone.
          </>
        }
        confirmLabel="Transfer"
        confirmVariant="danger"
        onConfirm={() => transferTarget && transferLeadership(transferTarget)}
        onCancel={() => setTransferTarget(null)}
      />
    </div>
  );
}
