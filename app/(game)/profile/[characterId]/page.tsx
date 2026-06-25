"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { useGameStore } from "@/store/useGameStore";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { OwlInbox } from "@/components/game/OwlInbox";
import { TeamChat } from "@/components/game/TeamChat";
import { GuildChat } from "@/components/game/GuildChat";
import { getTitle, getNextTitle, TITLES } from "@/lib/titles";
import { ACADEMY_FIELDS } from "@/lib/academyFields";

const LOCATION_LABELS: Record<string, string> = {
  metapolis: "Metapolis, Moon",
  moon_junkyard: "Moon Junkyard",
  earth: "Earth",
  mars: "Mars",
};

const RANK_META: Record<string, { symbol: string; label: string; color: string }> = {
  king:      { symbol: "♔", label: "King",      color: "text-yellow-400" },
  queen:     { symbol: "♛", label: "Queen",     color: "text-purple-400" },
  rook:      { symbol: "♜", label: "Rook",      color: "text-orange-400" },
  bishop:    { symbol: "♝", label: "Bishop",    color: "text-blue-400"   },
  knight:    { symbol: "♞", label: "Knight",    color: "text-green-400"  },
  pawn:      { symbol: "♟", label: "Pawn",      color: "text-gray-400"   },
  saber:     { symbol: "◤", label: "Saber",     color: "text-red-400"    },
  lancer:    { symbol: "◭", label: "Lancer",    color: "text-orange-400" },
  rider:     { symbol: "◉", label: "Rider",     color: "text-yellow-400" },
  caster:    { symbol: "✦", label: "Caster",    color: "text-purple-400" },
  berserker: { symbol: "◈", label: "Berserker", color: "text-rose-500"   },
  archer:    { symbol: "◎", label: "Archer",    color: "text-green-400"  },
  assassin:  { symbol: "◆", label: "Assassin",  color: "text-violet-400" },
  demon:     { symbol: "◈", label: "Demon",     color: "text-red-600"    },
};

const FORM_COLORS: Record<string, string> = {
  saber:     "text-red-400",
  lancer:    "text-orange-400",
  rider:     "text-yellow-400",
  caster:    "text-purple-400",
  berserker: "text-red-600",
  archer:    "text-green-400",
  assassin:  "text-violet-400",
};

interface ProfileData {
  character: {
    _id: string;
    name: string;
    level: number;
    shadowForm: string | null;
    currentLocation: string;
    strength: number;
    intelligence: number;
    agility: number;
    isDead: boolean;
    merits: number;
  };
  academyTree: { fieldId: string; level: number }[];
  guilds: { _id: string; name: string; tag: string; positions: string[] }[];
  teams: { _id: string; name: string }[];
  isOwn: boolean;
  viewerOwlAvailable: boolean;
  viewerOwlReturnAt: string | null;
  viewerCharacterId: string | null;
  viewerName: string | null;
}

export default function ProfilePage() {
  const router = useRouter();
  const params = useParams<{ characterId: string }>();
  const { user, setUser, setCharacter } = useGameStore();

  const [profile, setProfile]   = useState<ProfileData | null>(null);
  const [loading, setLoading]   = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Compose owl state (for viewing other players)
  const [owlOpen, setOwlOpen]         = useState(false);
  const [message, setMessage]         = useState("");
  const [sending, setSending]         = useState(false);
  const [owlError, setOwlError]       = useState("");
  const [owlSuccess, setOwlSuccess]   = useState("");
  const [owlReturnAt, setOwlReturnAt] = useState<string | null>(null);
  const [now, setNow]                 = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1_000);
    return () => clearInterval(id);
  }, []);

  // Ensure session
  useEffect(() => {
    if (!user) {
      fetch("/api/auth/me").then(async (r) => {
        if (!r.ok) { router.push("/login"); return; }
        const d = await r.json();
        setUser(d.data.user);
        setCharacter(d.data.character);
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const fetchProfile = useCallback(async () => {
    const res = await fetch(`/api/profile/${params.characterId}`);
    if (res.status === 404) { setNotFound(true); setLoading(false); return; }
    if (!res.ok) { setLoading(false); return; }
    const data = await res.json();
    setProfile(data.data);
    setOwlReturnAt(data.data.viewerOwlReturnAt);
    setLoading(false);
  }, [params.characterId]);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  const owlAvailable = !owlReturnAt || new Date(owlReturnAt).getTime() <= now;
  const owlMsLeft    = owlReturnAt ? Math.max(0, new Date(owlReturnAt).getTime() - now) : 0;
  const owlMins      = Math.floor(owlMsLeft / 60_000);
  const owlSecs      = Math.floor((owlMsLeft % 60_000) / 1_000);

  async function sendOwl(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim() || !owlAvailable || !profile) return;
    setSending(true);
    setOwlError("");
    const res = await fetch("/api/owl/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ toCharacterId: profile.character._id, content: message.trim() }),
    });
    const data = await res.json();
    if (res.ok) {
      setOwlReturnAt(data.data.owlReturnAt);
      setOwlSuccess(`Owl dispatched to ${profile.character.name}. Arrives in 10 minutes.`);
      setMessage("");
      setOwlOpen(false);
    } else {
      setOwlError(data.error);
    }
    setSending(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-xs font-mono text-gray-600 animate-pulse">LOADING PROFILE...</div>
      </div>
    );
  }

  if (notFound || !profile) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <div className="text-xs font-mono text-gray-600">Character not found.</div>
        <button onClick={() => router.back()} className="text-xs font-mono text-gray-500 hover:text-gray-300">
          ← Go back
        </button>
      </div>
    );
  }

  const { character, guilds, teams, academyTree, isOwn } = profile;
  const formColor = character.shadowForm ? (FORM_COLORS[character.shadowForm] ?? "text-gray-400") : "text-gray-600";

  // Derive best title from academy tree (highest tier across all unlocked fields)
  const bestTitle = academyTree.length > 0
    ? academyTree.reduce((best, node) => {
        const t = getTitle(node.level);
        return t.min > best.min ? t : best;
      }, TITLES[0])
    : null;

  const nextBestTitle = bestTitle ? getNextTitle(bestTitle) : null;

  // Build academy title list: merge with field labels, sort by level desc
  const fieldLabelMap = new Map(ACADEMY_FIELDS.map((f) => [f.id, f.label]));
  const sortedAcademy = academyTree
    .slice()
    .sort((a, b) => b.level - a.level)
    .map((node) => ({
      ...node,
      label: fieldLabelMap.get(node.fieldId) ?? node.fieldId,
      title: getTitle(node.level),
    }));

  return (
    <div className="max-w-lg mx-auto space-y-4">
      <button
        onClick={() => router.back()}
        className="text-xs font-mono text-gray-600 hover:text-gray-400 transition-colors"
      >
        ← Back
      </button>

      {/* Title banner — academy-based, only shown when at least one field is unlocked */}
      {bestTitle && (
        <div
          className="border relative overflow-hidden py-5 px-5"
          style={{
            background: `linear-gradient(135deg, ${bestTitle.color}1a 0%, #030712 100%)`,
            borderColor: `${bestTitle.color}44`,
          }}
        >
          <div
            className="absolute top-1 right-4 text-6xl opacity-10 leading-none select-none pointer-events-none"
            style={{ color: bestTitle.color }}
          >
            {bestTitle.icon}
          </div>
          <div className="relative">
            <div className="text-[10px] font-mono text-gray-500 uppercase tracking-widest mb-1">
              Highest Academy Title
            </div>
            <div className="text-2xl font-mono font-bold tracking-wider" style={{ color: bestTitle.color }}>
              {bestTitle.icon} {bestTitle.label.toUpperCase()}
            </div>
            <div className="text-xs font-mono mt-1 flex flex-wrap gap-x-3">
              <span className="text-gray-600">Lvl {bestTitle.min}–{bestTitle.max}</span>
              {nextBestTitle && (
                <span style={{ color: `${bestTitle.color}88` }}>
                  Reach Lvl {bestTitle.max + 1} in any field → {nextBestTitle.label}
                </span>
              )}
              {!nextBestTitle && (
                <span style={{ color: bestTitle.color }}>Max Title</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main profile card */}
      <Card title="Character Profile" accent="cyan">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-mono font-bold text-cyan-400">{character.name}</h1>
              <div className="text-xs font-mono text-gray-600 mt-0.5">
                Level {character.level} · {LOCATION_LABELS[character.currentLocation] ?? character.currentLocation}
              </div>
              {character.shadowForm && (
                <div className={`text-sm font-mono font-bold mt-1 uppercase ${formColor}`}>
                  {character.shadowForm} Form
                </div>
              )}
            </div>
            <div className="text-right space-y-1">
              {character.isDead && (
                <div className="text-xs font-mono text-red-500 font-bold animate-pulse">DECEASED</div>
              )}
              <div className="text-xs font-mono text-yellow-600">{character.merits} merits</div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 border-t border-gray-800 pt-3">
            {[
              { label: "STR", value: character.strength },
              { label: "INT", value: character.intelligence },
              { label: "AGI", value: character.agility },
            ].map(({ label, value }) => (
              <div key={label} className="text-center border border-gray-800 py-2">
                <div className="text-xs font-mono text-gray-600">{label}</div>
                <div className="text-lg font-mono font-bold text-gray-200">{value}</div>
              </div>
            ))}
          </div>

          {/* Guilds */}
          {guilds.length > 0 && (
            <div className="border-t border-gray-800 pt-3">
              <div className="text-xs font-mono text-gray-600 uppercase mb-1">Guilds</div>
              <div className="space-y-1.5">
                {guilds.map((g) => (
                  <div key={g._id} className="flex items-center gap-2 flex-wrap">
                    {isOwn ? (
                      <Link
                        href={`/guilds/${g._id}`}
                        className="text-xs font-mono text-purple-400 border border-purple-900 px-2 py-0.5 hover:border-purple-600 hover:text-purple-300 transition-colors"
                      >
                        [{g.tag}] {g.name}
                      </Link>
                    ) : (
                      <span className="text-xs font-mono text-purple-400 border border-purple-900 px-2 py-0.5">
                        [{g.tag}] {g.name}
                      </span>
                    )}
                    {g.positions.length > 0 ? (
                      g.positions.map((p) => {
                        const meta = RANK_META[p];
                        if (!meta) return null;
                        return (
                          <span key={p} className={`text-xs font-mono ${meta.color}`} title={meta.label}>
                            {meta.symbol} {meta.label}
                          </span>
                        );
                      })
                    ) : (
                      <span className="text-xs font-mono text-gray-700">◌ Recruit</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Teams */}
          {teams.length > 0 && (
            <div className="border-t border-gray-800 pt-3">
              <div className="text-xs font-mono text-gray-600 uppercase mb-1">Teams</div>
              <div className="flex flex-wrap gap-2">
                {teams.map((t) =>
                  isOwn ? (
                    <Link
                      key={t._id}
                      href={`/teams/${t._id}`}
                      className="text-xs font-mono text-cyan-400 border border-cyan-900 px-2 py-0.5 hover:border-cyan-600 hover:text-cyan-300 transition-colors"
                    >
                      {t.name}
                    </Link>
                  ) : (
                    <span key={t._id} className="text-xs font-mono text-cyan-400">
                      {t.name}
                    </span>
                  )
                )}
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Academy Titles — shown for all profiles */}
      {sortedAcademy.length > 0 && (
        <Card title="Academy Titles" accent="yellow">
          <div className="max-h-56 overflow-y-auto space-y-0">
            {sortedAcademy.map((node) => (
              <div
                key={node.fieldId}
                className="flex items-center justify-between py-1.5 border-b border-gray-900 last:border-0"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm leading-none" style={{ color: node.title.color }}>
                    {node.title.icon}
                  </span>
                  <div className="min-w-0">
                    <div className="text-xs font-mono text-gray-300 truncate">{node.label}</div>
                    <div className="text-[10px] font-mono" style={{ color: node.title.color }}>
                      {node.title.label}
                    </div>
                  </div>
                </div>
                <span className="text-xs font-mono text-gray-600 shrink-0 ml-2">L{node.level}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Shadow Owl — for other players */}
      {!isOwn && (
        <Card title="Shadow Owl" accent="purple">
          {owlSuccess && (
            <p className="text-xs font-mono text-green-400 mb-3">{owlSuccess}</p>
          )}
          <div className="flex items-center gap-3 mb-3">
            <span className={`text-xs font-mono font-bold ${owlAvailable ? "text-green-500" : "text-yellow-500"}`}>
              {owlAvailable ? "◈ OWL AVAILABLE" : `◈ IN FLIGHT  ${owlMins}m ${owlSecs}s`}
            </span>
          </div>
          {!owlOpen ? (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => { setOwlOpen(true); setOwlSuccess(""); }}
              disabled={!owlAvailable}
            >
              {owlAvailable ? `Send message to ${character.name}` : `Owl returns in ${owlMins}m ${owlSecs}s`}
            </Button>
          ) : (
            <form onSubmit={sendOwl} className="space-y-3">
              <div>
                <label className="block text-xs font-mono text-gray-500 mb-1">
                  Message to {character.name} (max 500)
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  maxLength={500}
                  rows={5}
                  className="w-full bg-gray-900 border border-gray-700 text-xs font-mono text-gray-200 p-2 resize-none focus:outline-none focus:border-purple-700"
                  placeholder="Your message..."
                  autoFocus
                />
                <div className="text-right text-xs font-mono text-gray-700">{message.length}/500</div>
              </div>
              {owlError && <p className="text-xs font-mono text-red-400">ERROR: {owlError}</p>}
              <div className="flex gap-2">
                <Button type="submit" loading={sending} disabled={!message.trim() || !owlAvailable}>
                  Dispatch Owl
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => { setOwlOpen(false); setOwlError(""); }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          )}
        </Card>
      )}

      {/* Own profile — full communication hub + guild/team links */}
      {isOwn && (
        <>
          <OwlInbox />
          <TeamChat />
          <GuildChat />

          {/* My Guilds */}
          {guilds.length > 0 && (
            <Card title="My Guilds" accent="purple">
              <div className="space-y-2">
                {guilds.map((g) => (
                  <Link
                    key={g._id}
                    href={`/guilds/${g._id}`}
                    className="flex items-center justify-between border border-gray-800 hover:border-purple-800 px-3 py-2 transition-colors group"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-purple-400 group-hover:text-purple-300">
                        [{g.tag}] {g.name}
                      </span>
                      <div className="flex gap-1 flex-wrap">
                        {g.positions.length > 0 ? (
                          g.positions.map((p) => {
                            const meta = RANK_META[p];
                            if (!meta) return null;
                            return (
                              <span key={p} className={`text-[10px] font-mono ${meta.color}`}>
                                {meta.symbol}
                              </span>
                            );
                          })
                        ) : (
                          <span className="text-[10px] font-mono text-gray-700">◌</span>
                        )}
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-gray-700 group-hover:text-gray-500">→</span>
                  </Link>
                ))}
              </div>
            </Card>
          )}

          {/* My Teams */}
          {teams.length > 0 && (
            <Card title="My Teams" accent="cyan">
              <div className="space-y-2">
                {teams.map((t) => (
                  <Link
                    key={t._id}
                    href={`/teams/${t._id}`}
                    className="flex items-center justify-between border border-gray-800 hover:border-cyan-800 px-3 py-2 transition-colors group"
                  >
                    <span className="text-xs font-mono text-cyan-400 group-hover:text-cyan-300">
                      {t.name}
                    </span>
                    <span className="text-[10px] font-mono text-gray-700 group-hover:text-gray-500">→</span>
                  </Link>
                ))}
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
