"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useGameStore } from "@/store/useGameStore";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";

interface Team {
  _id: string;
  name: string;
  activity: string;
  members: string[];
  maxSize: number;
  isOpen: boolean;
  leaderId: { name: string; level: number; currentLocation: string };
}

export default function TeamsPage() {
  const router = useRouter();
  const { user, character, setUser, setCharacter, addLog } = useGameStore();
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: "", activity: "exploring", maxSize: 4 });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

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
    const res = await fetch("/api/teams");
    if (res.ok) {
      const data = await res.json();
      setTeams(data.data.teams);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchTeams(); }, [fetchTeams]);

  async function createTeam(e: React.FormEvent) {
    e.preventDefault();
    setCreateError("");
    setCreating(true);
    const res = await fetch("/api/teams", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (res.ok) {
      addLog(data.data.message, "success");
      setShowCreate(false);
      fetchTeams();
    } else {
      setCreateError(data.error);
    }
    setCreating(false);
  }

  const LOCATION_LABELS: Record<string, string> = {
    metapolis: "Moon",
    moon_junkyard: "Junkyard",
    earth: "Earth",
    mars: "Mars",
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-mono font-bold text-gray-200">Team Recruitment</h1>
          <p className="text-xs font-mono text-gray-600 mt-1">Find or create a team for cooperative missions</p>
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
          {teams.map((t) => (
            <div key={t._id} className="border border-gray-800 bg-gray-950 p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-mono font-medium text-gray-200">{t.name}</span>
                    <span className="text-xs font-mono text-gray-600">
                      {t.members.length}/{t.maxSize}
                    </span>
                    {!t.isOpen && <span className="text-xs font-mono text-red-600">[FULL]</span>}
                  </div>
                  <div className="flex gap-4 mt-1 text-xs font-mono text-gray-600">
                    <span>Leader: <span className="text-gray-400">{t.leaderId?.name} (LVL {t.leaderId?.level})</span></span>
                    <span>Activity: <span className="text-gray-400">{t.activity}</span></span>
                    <span>Location: <span className="text-cyan-400">{LOCATION_LABELS[t.leaderId?.currentLocation] ?? t.leaderId?.currentLocation}</span></span>
                  </div>
                </div>
                {character && !character.teamId && t.isOpen && t.members.length < t.maxSize && (
                  <Button size="sm" variant="secondary">
                    Request Join
                  </Button>
                )}
                {character?.teamId === t._id && (
                  <span className="text-xs font-mono text-cyan-500">[YOUR TEAM]</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
