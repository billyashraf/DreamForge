"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { useGameStore } from "@/store/useGameStore";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { getTitle, getNextTitle } from "@/lib/titles";

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

interface OwlMessage {
  _id: string;
  fromName?: string;
  content: string;
  deliveredAt: string;
  read: boolean;
}

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
  guilds: { _id: string; name: string; tag: string; positions: string[] }[];
  teams: { _id: string; name: string }[];
  isOwn: boolean;
  viewerOwlAvailable: boolean;
  viewerOwlReturnAt: string | null;
  viewerCharacterId: string | null;
  viewerName: string | null;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function ProfilePage() {
  const router = useRouter();
  const params = useParams<{ characterId: string }>();
  const { user, setUser, setCharacter } = useGameStore();

  const [profile, setProfile]   = useState<ProfileData | null>(null);
  const [loading, setLoading]   = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Compose owl state
  const [owlOpen, setOwlOpen]         = useState(false);
  const [message, setMessage]         = useState("");
  const [sending, setSending]         = useState(false);
  const [owlError, setOwlError]       = useState("");
  const [owlSuccess, setOwlSuccess]   = useState("");
  const [owlReturnAt, setOwlReturnAt] = useState<string | null>(null);
  const [now, setNow]                 = useState(() => Date.now());

  // Own-profile inbox state
  const [inbox, setInbox]             = useState<OwlMessage[]>([]);
  const [inboxLoading, setInboxLoading] = useState(false);

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

  // Fetch owl inbox for own profile
  useEffect(() => {
    if (!profile?.isOwn) return;
    setInboxLoading(true);
    fetch("/api/owl/inbox")
      .then((r) => r.json())
      .then((d) => { setInbox((d.data?.inbox ?? []).slice(0, 5)); })
      .finally(() => setInboxLoading(false));
  }, [profile?.isOwn]);

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

  const { character, guilds, teams, isOwn } = profile;
  const formColor = character.shadowForm ? (FORM_COLORS[character.shadowForm] ?? "text-gray-400") : "text-gray-600";
  const title = getTitle(character.level);
  const nextTitle = getNextTitle(title);

  return (
    <div className="max-w-lg mx-auto space-y-4">
      <button
        onClick={() => router.back()}
        className="text-xs font-mono text-gray-600 hover:text-gray-400 transition-colors"
      >
        ← Back
      </button>

      {/* Title banner */}
      <div
        className="border relative overflow-hidden py-5 px-5"
        style={{
          background: `linear-gradient(135deg, ${title.color}1a 0%, #030712 100%)`,
          borderColor: `${title.color}44`,
        }}
      >
        <div
          className="absolute top-1 right-4 text-6xl opacity-10 leading-none select-none pointer-events-none"
          style={{ color: title.color }}
        >
          {title.icon}
        </div>
        <div className="relative">
          <div className="text-[10px] font-mono text-gray-500 uppercase tracking-widest mb-1">
            Title · Level {character.level}
          </div>
          <div className="text-2xl font-mono font-bold tracking-wider" style={{ color: title.color }}>
            {title.icon} {title.label.toUpperCase()}
          </div>
          <div className="text-xs font-mono text-gray-600 mt-1 flex flex-wrap gap-x-3">
            <span>Lvl {title.min}–{title.max}</span>
            {nextTitle && character.level < title.max && (
              <span style={{ color: `${title.color}88` }}>
                {title.max - character.level} levels to {nextTitle.label}
              </span>
            )}
            {!nextTitle && character.level >= title.max && (
              <span style={{ color: title.color }}>Max Title Reached</span>
            )}
          </div>
        </div>
      </div>

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

      {/* Own profile sections */}
      {isOwn && (
        <>
          {/* My Messages (owl inbox) */}
          <Card title="Messages" accent="purple">
            <div className="space-y-1">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono text-gray-600 uppercase tracking-widest">Recent Inbox</span>
                <Link
                  href="/owl-inbox"
                  className="text-[10px] font-mono text-purple-600 hover:text-purple-400 transition-colors"
                >
                  view all →
                </Link>
              </div>
              {inboxLoading ? (
                <p className="text-xs font-mono text-gray-600 animate-pulse">Loading messages...</p>
              ) : inbox.length === 0 ? (
                <p className="text-xs font-mono text-gray-700">No messages received yet.</p>
              ) : (
                <ul className="space-y-2">
                  {inbox.map((msg) => (
                    <li key={msg._id} className="border border-gray-800 p-2 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono text-purple-400">
                          {msg.fromName ?? "Unknown"}
                        </span>
                        <span className="text-[10px] font-mono text-gray-700">
                          {timeAgo(msg.deliveredAt)}
                        </span>
                      </div>
                      <p className="text-xs font-mono text-gray-400 line-clamp-2 leading-relaxed">
                        {msg.content}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Card>

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
