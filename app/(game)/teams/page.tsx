"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useGameStore } from "@/store/useGameStore";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";

interface TeamLeader { _id?: string; name: string; level: number; currentLocation?: string }
interface Team {
  _id: string;
  name: string;
  activity: string;
  members: string[];
  maxSize: number;
  isOpen: boolean;
  leaderId: TeamLeader;
}
interface MyTeam {
  _id: string;
  name: string;
  activity: string;
  members: string[];
  maxSize: number;
  isOpen: boolean;
  leaderId?: TeamLeader;
}

type Tab = "hall" | "mine";

function safeJson(res: Response) {
  return res.json().catch(() => ({ data: {}, error: "Server error" }));
}

export default function TeamsPage() {
  const router = useRouter();
  const { user, character, setUser, setCharacter, addLog } = useGameStore();
  const [tab, setTab] = useState<Tab>("hall");

  // Hall state
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState<string | null>(null);
  const [applyMsg, setApplyMsg] = useState("");
  const [applyingId, setApplyingId] = useState<string | null>(null);

  // My Teams state
  const [owned, setOwned] = useState<MyTeam[]>([]);
  const [joined, setJoined] = useState<MyTeam[]>([]);
  const [mineLoading, setMineLoading] = useState(true);
  const [leavingId, setLeavingId] = useState<string | null>(null);

  // Create form
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: "", activity: "exploring", maxSize: 4 });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

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

  const fetchTeams = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/teams");
    if (res.ok) {
      const data = await res.json();
      setTeams(data.data.teams);
    }
    setLoading(false);
  }, []);

  const fetchMine = useCallback(async () => {
    setMineLoading(true);
    const res = await fetch("/api/teams/mine");
    if (res.ok) {
      const data = await res.json();
      setOwned(data.data.owned ?? []);
      setJoined(data.data.joined ?? []);
    }
    setMineLoading(false);
  }, []);

  useEffect(() => { fetchTeams(); }, [fetchTeams]);
  useEffect(() => { if (tab === "mine") fetchMine(); }, [tab, fetchMine]);

  async function createTeam(e: React.FormEvent) {
    e.preventDefault();
    setCreateError("");
    setCreating(true);
    const res = await fetch("/api/teams", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await safeJson(res);
    if (res.ok) {
      addLog(data.data.message, "success");
      setShowCreate(false);
      setForm({ name: "", activity: "exploring", maxSize: 4 });
      fetchTeams();
      fetchMine();
    } else {
      setCreateError(data.error ?? "Failed to create team");
    }
    setCreating(false);
  }

  async function applyToTeam(teamId: string) {
    setApplyingId(teamId);
    const res = await fetch(`/api/teams/${teamId}/apply`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: applyMsg }),
    });
    const data = await safeJson(res);
    setMsg({ text: data.data?.message ?? data.error ?? "Error", ok: res.ok });
    if (res.ok) { setApplying(null); setApplyMsg(""); }
    setApplyingId(null);
  }

  async function leaveTeam(teamId: string, name: string) {
    if (!confirm(`Leave team "${name}"?`)) return;
    setLeavingId(teamId);
    const res = await fetch(`/api/teams/${teamId}/leave`, { method: "POST" });
    const data = await safeJson(res);
    setMsg({ text: data.data?.message ?? data.error ?? "Error", ok: res.ok });
    if (res.ok) fetchMine();
    setLeavingId(null);
  }

  const LOCATION_LABELS: Record<string, string> = {
    metapolis: "Moon",
    moon_junkyard: "Junkyard",
    earth: "Earth",
    mars: "Mars",
  };

  const charTeamIds = character?.teamIds ?? [];

  return (
    <div className="space-y-4">
      {/* Sub-nav */}
      <div className="flex items-center gap-0 border-b border-gray-800">
        {(["hall", "mine"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-xs font-mono uppercase tracking-wider transition-colors ${
              tab === t
                ? "text-cyan-400 border-b-2 border-cyan-400 -mb-px"
                : "text-gray-500 hover:text-gray-300"
            }`}
          >
            {t === "hall" ? "Team Hall" : "My Teams"}
          </button>
        ))}
      </div>

      {msg && (
        <div className={`text-xs font-mono px-3 py-2 border ${msg.ok ? "border-cyan-700 text-cyan-300 bg-cyan-950" : "border-red-700 text-red-300 bg-red-950"}`}>
          {msg.text}
          <button onClick={() => setMsg(null)} className="ml-3 text-gray-500 hover:text-gray-300">×</button>
        </div>
      )}

      {/* ─── TEAM HALL ─── */}
      {tab === "hall" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-mono font-bold text-gray-200">Team Hall</h1>
              <p className="text-xs font-mono text-gray-600 mt-1">Browse open teams · max 5 led · max 19 joined</p>
            </div>
            <Button onClick={() => setShowCreate(!showCreate)} variant="secondary">
              {showCreate ? "Cancel" : "+ Create Team"}
            </Button>
          </div>

          {showCreate && (
            <Card title="Create Team" accent="cyan">
              <form onSubmit={createTeam} className="space-y-3">
                <Input label="Team Name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Moon Runners" required />
                <Input label="Activity" value={form.activity} onChange={(e) => setForm((f) => ({ ...f, activity: e.target.value }))} placeholder="Junkyard scavenging" />
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-mono text-gray-400 uppercase tracking-wider">Max Size</label>
                  <select
                    value={form.maxSize}
                    onChange={(e) => setForm((f) => ({ ...f, maxSize: parseInt(e.target.value) }))}
                    className="bg-gray-900 border border-gray-700 text-gray-100 font-mono text-sm px-3 py-2 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  >
                    {[2, 3, 4, 5, 6].map((n) => (
                      <option key={n} value={n}>{n} players</option>
                    ))}
                  </select>
                </div>
                {createError && <p className="text-xs font-mono text-red-400">ERROR: {createError}</p>}
                <Button type="submit" loading={creating}>Create Team</Button>
              </form>
            </Card>
          )}

          {loading ? (
            <p className="text-xs font-mono text-gray-600">Loading teams...</p>
          ) : teams.length === 0 ? (
            <p className="text-xs font-mono text-gray-600">No open teams. Create one and recruit players!</p>
          ) : (
            <div className="space-y-2">
              {teams.map((t) => {
                const isMine = charTeamIds.includes(t._id);
                const canApply = !isMine && t.isOpen && t.members.length < t.maxSize;
                return (
                  <div key={t._id} className="border border-gray-800 bg-gray-950 p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => router.push(`/teams/${t._id}`)}
                            className="text-sm font-mono font-medium text-cyan-400 hover:text-cyan-300 transition-colors"
                          >
                            {t.name}
                          </button>
                          <span className="text-xs font-mono text-gray-600">{t.members.length}/{t.maxSize}</span>
                          {!t.isOpen && <span className="text-xs font-mono text-red-600">[CLOSED]</span>}
                          {isMine && <span className="text-xs font-mono text-cyan-500">[MEMBER]</span>}
                        </div>
                        <div className="flex gap-4 mt-1 text-xs font-mono text-gray-600">
                          <span>Leader: <span className="text-gray-400">{t.leaderId?.name} (LVL {t.leaderId?.level})</span></span>
                          <span>Activity: <span className="text-gray-400">{t.activity}</span></span>
                          {t.leaderId?.currentLocation && (
                            <span>Location: <span className="text-cyan-400">{LOCATION_LABELS[t.leaderId.currentLocation] ?? t.leaderId.currentLocation}</span></span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {canApply && applying !== t._id && (
                          <Button size="sm" variant="secondary" onClick={() => { setApplying(t._id); setApplyMsg(""); }}>
                            Apply
                          </Button>
                        )}
                      </div>
                    </div>

                    {applying === t._id && (
                      <div className="mt-3 border-t border-gray-800 pt-3 space-y-2">
                        <textarea
                          value={applyMsg}
                          onChange={(e) => setApplyMsg(e.target.value)}
                          placeholder="Optional message to the team leader..."
                          maxLength={300}
                          rows={2}
                          className="w-full bg-gray-900 border border-gray-700 text-gray-200 font-mono text-xs px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-cyan-500"
                        />
                        <div className="flex gap-2">
                          <Button size="sm" loading={applyingId === t._id} onClick={() => applyToTeam(t._id)}>Send Application</Button>
                          <Button size="sm" variant="ghost" onClick={() => setApplying(null)}>Cancel</Button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ─── MY TEAMS ─── */}
      {tab === "mine" && (
        <div className="space-y-6">
          <h1 className="text-xl font-mono font-bold text-gray-200">My Teams</h1>

          {mineLoading ? (
            <p className="text-xs font-mono text-gray-600">Loading...</p>
          ) : (
            <>
              {owned.length > 0 && (
                <div className="space-y-2">
                  <h2 className="text-xs font-mono text-gray-500 uppercase tracking-wider">Leading ({owned.length}/5)</h2>
                  {owned.map((t) => (
                    <div key={t._id} className="border border-cyan-900 bg-gray-950 p-4 flex items-center justify-between gap-4">
                      <div>
                        <button onClick={() => router.push(`/teams/${t._id}`)} className="text-sm font-mono font-medium text-cyan-400 hover:text-cyan-300">{t.name}</button>
                        <p className="text-xs font-mono text-gray-600 mt-0.5">{t.members.length}/{t.maxSize} members · {t.activity}</p>
                      </div>
                      <Button size="sm" variant="secondary" onClick={() => router.push(`/teams/${t._id}`)}>Manage</Button>
                    </div>
                  ))}
                </div>
              )}

              {joined.length > 0 && (
                <div className="space-y-2">
                  <h2 className="text-xs font-mono text-gray-500 uppercase tracking-wider">Joined ({joined.length}/19)</h2>
                  {joined.map((t) => (
                    <div key={t._id} className="border border-gray-800 bg-gray-950 p-4 flex items-center justify-between gap-4">
                      <div>
                        <button onClick={() => router.push(`/teams/${t._id}`)} className="text-sm font-mono font-medium text-gray-200 hover:text-white">{t.name}</button>
                        <p className="text-xs font-mono text-gray-600 mt-0.5">
                          Leader: <span className="text-gray-400">{(t.leaderId as { name?: string })?.name ?? "?"}</span>
                          {" · "}
                          {t.members.length}/{t.maxSize} members
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        loading={leavingId === t._id}
                        onClick={() => leaveTeam(t._id, t.name)}
                      >
                        Leave
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {owned.length === 0 && joined.length === 0 && (
                <p className="text-xs font-mono text-gray-600">You are not in any teams. Browse the Team Hall to apply.</p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
