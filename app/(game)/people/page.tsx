"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useGameStore } from "@/store/useGameStore";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

interface PlayerCharacter {
  _id: string;
  name: string;
  level: number;
  shadowForm: string | null;
  currentLocation: string;
  guilds: { name: string; tag: string }[];
  teams: { name: string }[];
}

interface MyEntity { _id: string; name: string; tag?: string }

function safeJson(res: Response) {
  return res.json().catch(() => ({ data: {}, error: "Server error" }));
}

const SHADOW_FORMS: Record<string, string> = {
  saber: "⚔",
  lancer: "◭",
  rider: "◉",
  caster: "✦",
  berserker: "◈",
  archer: "◎",
  assassin: "◆",
  demon: "☠",
};

const LOCATIONS: Record<string, string> = {
  metapolis: "Moon",
  moon_junkyard: "Junkyard",
  earth: "Earth",
  mars: "Mars",
};

export default function PeoplePage() {
  const router = useRouter();
  const { user, character, setUser, setCharacter } = useGameStore();

  const [search, setSearch] = useState("");
  const [players, setPlayers] = useState<PlayerCharacter[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const [myGuilds, setMyGuilds] = useState<MyEntity[]>([]);
  const [myTeams, setMyTeams] = useState<MyEntity[]>([]);

  const [inviteOpen, setInviteOpen] = useState<string | null>(null);
  const [inviting, setInviting] = useState<string | null>(null);
  const [inviteMsg, setInviteMsg] = useState<Record<string, { text: string; ok: boolean }>>({});

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

  useEffect(() => {
    // Load my led guilds and teams for invite panels
    Promise.all([
      fetch("/api/guilds/mine").then(safeJson),
      fetch("/api/teams/mine").then(safeJson),
    ]).then(([gData, tData]) => {
      setMyGuilds(gData.data?.owned?.map((g: { _id: string; name: string; tag: string }) => ({ _id: g._id, name: g.name, tag: g.tag })) ?? []);
      setMyTeams(tData.data?.owned?.map((t: { _id: string; name: string }) => ({ _id: t._id, name: t.name })) ?? []);
    });
  }, []);

  const fetchPlayers = useCallback(async (q: string, pg: number) => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(pg) });
    if (q) params.set("search", q);
    const res = await fetch(`/api/people?${params}`);
    const data = await safeJson(res);
    if (res.ok) {
      setPlayers(data.data.characters ?? []);
      setTotal(data.data.total ?? 0);
      setPages(data.data.pages ?? 1);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchPlayers(search, page); }, [fetchPlayers, search, page]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    fetchPlayers(search, 1);
  }

  async function invite(targetId: string, entityId: string, type: "guild" | "team", entityName: string) {
    const key = `${targetId}-${entityId}`;
    setInviting(key);
    const res = await fetch("/api/people/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetCharacterId: targetId, entityId, type }),
    });
    const data = await safeJson(res);
    setInviteMsg((prev) => ({ ...prev, [targetId]: { text: data.data?.message ?? data.error ?? "Error", ok: res.ok } }));
    setInviting(null);
  }

  const myCharId = character?.id;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-mono font-bold text-gray-200">People</h1>
        <p className="text-xs font-mono text-gray-600 mt-1">Browse all players · invite to your guilds or teams</p>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <Input
          label=""
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name..."
          className="flex-1"
        />
        <Button type="submit" size="sm" variant="secondary">Search</Button>
        {search && <Button type="button" size="sm" variant="ghost" onClick={() => { setSearch(""); setPage(1); fetchPlayers("", 1); }}>Clear</Button>}
      </form>

      {/* Count */}
      <p className="text-xs font-mono text-gray-600">{total} players{search ? ` matching "${search}"` : ""}</p>

      {/* Player list */}
      {loading ? (
        <p className="text-xs font-mono text-gray-600">Loading players...</p>
      ) : players.length === 0 ? (
        <p className="text-xs font-mono text-gray-600">No players found.</p>
      ) : (
        <div className="space-y-2">
          {players.map((p) => {
            const isMe = p._id === myCharId;
            const thisMsg = inviteMsg[p._id];
            const isInviteOpen = inviteOpen === p._id;
            const canInvite = !isMe && (myGuilds.length > 0 || myTeams.length > 0);

            return (
              <div key={p._id} className={`border bg-gray-950 p-4 ${isMe ? "border-cyan-800" : "border-gray-800"}`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        onClick={() => router.push(`/profile/${p._id}`)}
                        className="text-sm font-mono font-medium text-cyan-400 hover:text-cyan-300"
                      >
                        {p.name}
                      </button>
                      <span className="text-xs font-mono text-gray-600">LVL {p.level}</span>
                      {p.shadowForm && (
                        <span className="text-xs font-mono text-purple-400" title={p.shadowForm}>
                          {SHADOW_FORMS[p.shadowForm] ?? "◆"} {p.shadowForm}
                        </span>
                      )}
                      {isMe && <span className="text-xs font-mono text-cyan-600">[you]</span>}
                    </div>
                    <div className="flex gap-3 mt-1 flex-wrap text-xs font-mono text-gray-600">
                      <span>📍 <span className="text-gray-400">{LOCATIONS[p.currentLocation] ?? p.currentLocation}</span></span>
                      {p.guilds.length > 0 && (
                        <span>Guilds: <span className="text-gray-400">{p.guilds.map((g) => `[${g.tag}]`).join(" ")}</span></span>
                      )}
                      {p.teams.length > 0 && (
                        <span>Teams: <span className="text-gray-400">{p.teams.map((t) => t.name).join(", ")}</span></span>
                      )}
                    </div>
                  </div>

                  {canInvite && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setInviteOpen(isInviteOpen ? null : p._id)}
                    >
                      {isInviteOpen ? "Close" : "Invite"}
                    </Button>
                  )}
                </div>

                {/* Invite panel */}
                {isInviteOpen && (
                  <div className="mt-3 border-t border-gray-800 pt-3 space-y-2">
                    {thisMsg && (
                      <p className={`text-xs font-mono ${thisMsg.ok ? "text-cyan-400" : "text-red-400"}`}>{thisMsg.text}</p>
                    )}
                    {myGuilds.length > 0 && (
                      <div>
                        <p className="text-xs font-mono text-gray-500 uppercase tracking-wider mb-1">Invite to Guild</p>
                        <div className="flex flex-wrap gap-2">
                          {myGuilds.map((g) => (
                            <Button
                              key={g._id}
                              size="sm"
                              variant="secondary"
                              loading={inviting === `${p._id}-${g._id}`}
                              onClick={() => invite(p._id, g._id, "guild", g.name)}
                            >
                              [{g.tag}] {g.name}
                            </Button>
                          ))}
                        </div>
                      </div>
                    )}
                    {myTeams.length > 0 && (
                      <div>
                        <p className="text-xs font-mono text-gray-500 uppercase tracking-wider mb-1">Invite to Team</p>
                        <div className="flex flex-wrap gap-2">
                          {myTeams.map((t) => (
                            <Button
                              key={t._id}
                              size="sm"
                              variant="ghost"
                              loading={inviting === `${p._id}-${t._id}`}
                              onClick={() => invite(p._id, t._id, "team", t.name)}
                            >
                              {t.name}
                            </Button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center gap-3 justify-center pt-2">
          <Button size="sm" variant="ghost" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>←</Button>
          <span className="text-xs font-mono text-gray-500">Page {page} of {pages}</span>
          <Button size="sm" variant="ghost" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>→</Button>
        </div>
      )}
    </div>
  );
}
