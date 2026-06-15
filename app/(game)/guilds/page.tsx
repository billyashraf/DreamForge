"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useGameStore } from "@/store/useGameStore";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";

interface Guild {
  _id: string;
  name: string;
  tag: string;
  description: string;
  members: string[];
  marsRating: number;
  leaderId: { name: string; level: number };
}

export default function GuildsPage() {
  const router = useRouter();
  const { user, character, setUser, setCharacter, addLog } = useGameStore();
  const [guilds, setGuilds] = useState<Guild[]>([]);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ name: "", tag: "", description: "" });
  const [createError, setCreateError] = useState("");
  const [creating, setCreating] = useState(false);

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

  const fetchGuilds = useCallback(async () => {
    const res = await fetch("/api/guilds");
    if (res.ok) {
      const data = await res.json();
      setGuilds(data.data.guilds);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchGuilds(); }, [fetchGuilds]);

  async function joinGuild(guildId: string) {
    setJoining(guildId);
    const res = await fetch("/api/guilds/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ guildId }),
    });
    const data = await res.json();
    if (res.ok) {
      addLog(data.data.message, "success");
      setCharacter({ ...character!, guildId });
      fetchGuilds();
    } else {
      addLog(data.error, "error");
    }
    setJoining(null);
  }

  async function createGuild(e: React.FormEvent) {
    e.preventDefault();
    setCreateError("");
    setCreating(true);
    const res = await fetch("/api/guilds", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(createForm),
    });
    const data = await res.json();
    if (res.ok) {
      addLog(data.data.message, "success");
      setShowCreate(false);
      setCreateForm({ name: "", tag: "", description: "" });
      fetchGuilds();
    } else {
      setCreateError(data.error);
    }
    setCreating(false);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-mono font-bold text-gray-200">Guild Hall</h1>
          <p className="text-xs font-mono text-gray-600 mt-1">Mars rating leaders — top 20 guilds</p>
        </div>
        <Button onClick={() => setShowCreate(!showCreate)} variant="secondary">
          {showCreate ? "Cancel" : "+ Create Guild"}
        </Button>
      </div>

      {showCreate && (
        <Card title="Create Guild" accent="purple">
          <form onSubmit={createGuild} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Input label="Guild Name" value={createForm.name} onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))} placeholder="Iron Vanguard" required />
              <Input label="Tag (2-5 chars)" value={createForm.tag} onChange={(e) => setCreateForm((f) => ({ ...f, tag: e.target.value.toUpperCase() }))} placeholder="IV" maxLength={5} required />
            </div>
            <Input label="Description" value={createForm.description} onChange={(e) => setCreateForm((f) => ({ ...f, description: e.target.value }))} placeholder="Elite operatives dominating Mars..." />
            {createError && <p className="text-xs font-mono text-red-400">ERROR: {createError}</p>}
            <div className="text-xs font-mono text-gray-600">Requires Level 5 to create a guild.</div>
            <Button type="submit" loading={creating}>Create Guild</Button>
          </form>
        </Card>
      )}

      {loading ? (
        <p className="text-xs font-mono text-gray-600">Loading guilds...</p>
      ) : guilds.length === 0 ? (
        <p className="text-xs font-mono text-gray-600">No guilds yet. Be the first to create one!</p>
      ) : (
        <div className="space-y-2">
          {guilds.map((g, i) => (
            <div key={g._id} className="border border-gray-800 bg-gray-950 p-4 flex items-center gap-4">
              <div className="w-8 text-center text-xs font-mono text-gray-600">#{i + 1}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-gray-600">[{g.tag}]</span>
                  <span className="text-sm font-mono font-medium text-gray-200">{g.name}</span>
                </div>
                <p className="text-xs text-gray-600 mt-0.5 truncate">{g.description || "No description."}</p>
                <div className="flex gap-4 mt-1 text-xs font-mono text-gray-600">
                  <span>Leader: <span className="text-gray-400">{g.leaderId?.name}</span></span>
                  <span>Members: <span className="text-gray-400">{g.members.length}</span></span>
                  <span>Mars Rating: <span className="text-red-400">{g.marsRating}</span></span>
                </div>
              </div>
              {character && !character.guildId && (
                <Button
                  size="sm"
                  variant="secondary"
                  loading={joining === g._id}
                  onClick={() => joinGuild(g._id)}
                >
                  Join
                </Button>
              )}
              {character?.guildId === g._id && (
                <span className="text-xs font-mono text-cyan-500">[MEMBER]</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
