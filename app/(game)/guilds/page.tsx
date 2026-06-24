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

interface MyGuild {
  _id: string;
  name: string;
  tag: string;
}

type Tab = "hall" | "mine";

export default function GuildsPage() {
  const router = useRouter();
  const { user, character, setUser, setCharacter, addLog } = useGameStore();
  const [tab, setTab] = useState<Tab>("hall");
  const [guilds, setGuilds] = useState<Guild[]>([]);
  const [myGuilds, setMyGuilds] = useState<MyGuild[]>([]);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState<string | null>(null);
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
    setLoading(true);
    const [hallRes, mineRes] = await Promise.all([
      fetch("/api/guilds"),
      fetch("/api/guilds/mine"),
    ]);
    if (hallRes.ok) {
      const data = await hallRes.json();
      setGuilds(data.data.guilds);
    }
    if (mineRes.ok) {
      const data = await mineRes.json();
      setMyGuilds(data.data.guilds);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchGuilds(); }, [fetchGuilds]);

  async function applyToGuild(guildId: string) {
    const message = prompt("Optional application message (leave blank to skip):") ?? "";
    setApplying(guildId);
    const res = await fetch(`/api/guilds/${guildId}/apply`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
    });
    const data = await res.json();
    if (res.ok) {
      addLog(data.data.message, "success");
      fetchGuilds();
    } else {
      addLog(data.error, "error");
    }
    setApplying(null);
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

  const shadowForm = character?.shadowForm ?? null;
  if (user && character && shadowForm !== "caster" && shadowForm !== "assassin") {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-120px)] gap-6 text-center px-4">
        <div className="text-5xl text-purple-900">◈</div>
        <div className="font-mono text-purple-500 text-lg font-bold tracking-widest uppercase">Guild Hall Locked</div>
        <div className="font-mono text-gray-500 text-sm max-w-xs leading-relaxed">
          Only the <span className="text-purple-400 font-bold">Caster</span> or{" "}
          <span className="text-violet-400 font-bold">Assassin</span> form may enter the Guild Hall.
          Arcane minds and shadow operatives govern these halls.
        </div>
        <button
          onClick={() => router.push("/shadow-form")}
          className="mt-2 px-6 py-2 border border-purple-900 text-purple-700 hover:text-purple-400 hover:border-purple-600 font-mono text-xs tracking-widest transition-colors"
        >
          SELECT SHADOW FORM →
        </button>
      </div>
    );
  }

  const myGuildIds = new Set(myGuilds.map((g) => g._id));

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-mono font-bold text-gray-200">Guilds</h1>
        <Button onClick={() => setShowCreate(!showCreate)} variant="secondary">
          {showCreate ? "Cancel" : "+ Create Guild"}
        </Button>
      </div>

      {/* Sub-navbar */}
      <div className="flex border-b border-gray-800">
        <button
          onClick={() => setTab("hall")}
          className={`px-5 py-2 font-mono text-xs tracking-widest transition-colors ${
            tab === "hall"
              ? "text-cyan-400 border-b-2 border-cyan-500 -mb-px"
              : "text-gray-600 hover:text-gray-400"
          }`}
        >
          GUILD HALL
        </button>
        <button
          onClick={() => setTab("mine")}
          className={`px-5 py-2 font-mono text-xs tracking-widest transition-colors relative ${
            tab === "mine"
              ? "text-cyan-400 border-b-2 border-cyan-500 -mb-px"
              : "text-gray-600 hover:text-gray-400"
          }`}
        >
          MY GUILDS
          {myGuilds.length > 0 && (
            <span className="ml-1.5 bg-cyan-900 text-cyan-300 text-xs px-1.5 py-0.5 rounded-sm">
              {myGuilds.length}
            </span>
          )}
        </button>
      </div>

      {/* Create Guild Form */}
      {showCreate && (
        <Card title="Create Guild" accent="purple">
          <form onSubmit={createGuild} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Guild Name"
                value={createForm.name}
                onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Iron Vanguard"
                required
              />
              <Input
                label="Tag (2-5 chars)"
                value={createForm.tag}
                onChange={(e) => setCreateForm((f) => ({ ...f, tag: e.target.value.toUpperCase() }))}
                placeholder="IV"
                maxLength={5}
                required
              />
            </div>
            <Input
              label="Description"
              value={createForm.description}
              onChange={(e) => setCreateForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Elite operatives dominating Mars..."
            />
            {createError && <p className="text-xs font-mono text-red-400">ERROR: {createError}</p>}
            <div className="text-xs font-mono text-gray-600">Requires Level 5 to create a guild.</div>
            <Button type="submit" loading={creating}>Create Guild</Button>
          </form>
        </Card>
      )}

      {loading ? (
        <p className="text-xs font-mono text-gray-600">Loading...</p>
      ) : tab === "hall" ? (
        /* Guild Hall tab */
        <div className="space-y-2">
          {guilds.length === 0 ? (
            <p className="text-xs font-mono text-gray-600">No guilds yet. Be the first to create one!</p>
          ) : (
            guilds.map((g, i) => (
              <div key={g._id} className="border border-gray-800 bg-gray-950 p-4 flex items-center gap-4">
                <div className="w-8 text-center text-xs font-mono text-gray-600">#{i + 1}</div>
                <div
                  className="flex-1 min-w-0 cursor-pointer"
                  onClick={() => router.push(`/guilds/${g._id}`)}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-gray-600">[{g.tag}]</span>
                    <span className="text-sm font-mono font-medium text-gray-200 hover:text-cyan-400 transition-colors">
                      {g.name}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 mt-0.5 truncate">{g.description || "No description."}</p>
                  <div className="flex gap-4 mt-1 text-xs font-mono text-gray-600">
                    <span>Leader: <span className="text-gray-400">{g.leaderId?.name}</span></span>
                    <span>Members: <span className="text-gray-400">{g.members.length}</span></span>
                    <span>Mars Rating: <span className="text-red-400">{g.marsRating}</span></span>
                  </div>
                </div>
                {myGuildIds.has(g._id) ? (
                  <span className="text-xs font-mono text-cyan-500">[MEMBER]</span>
                ) : (
                  <Button
                    size="sm"
                    variant="secondary"
                    loading={applying === g._id}
                    onClick={() => applyToGuild(g._id)}
                  >
                    Apply
                  </Button>
                )}
              </div>
            ))
          )}
        </div>
      ) : (
        /* My Guilds tab */
        <div className="space-y-2">
          {myGuilds.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-3xl text-gray-800 mb-3">◈</div>
              <p className="text-xs font-mono text-gray-600">You have not joined any guilds yet.</p>
              <button
                onClick={() => setTab("hall")}
                className="mt-3 text-xs font-mono text-cyan-700 hover:text-cyan-500 underline"
              >
                Browse Guild Hall
              </button>
            </div>
          ) : (
            myGuilds.map((g) => (
              <div
                key={g._id}
                className="border border-gray-800 bg-gray-950 p-4 flex items-center gap-4 cursor-pointer hover:border-gray-700 transition-colors"
                onClick={() => router.push(`/guilds/${g._id}`)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-gray-600">[{g.tag}]</span>
                    <span className="text-sm font-mono font-medium text-gray-200">{g.name}</span>
                  </div>
                </div>
                <span className="text-xs font-mono text-gray-600">View Profile →</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
