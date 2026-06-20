"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useGameStore } from "@/store/useGameStore";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";

interface Mission {
  _id: string;
  title: string;
  location: string;
  difficulty: string;
  type: string;
  isActive: boolean;
  rewards: { experience: number; credits: number; merits: number };
  requirements: { level?: number };
  durationMinutes: number;
}

const DIFFICULTY_COLORS: Record<string, string> = {
  easy: "text-green-400",
  medium: "text-yellow-400",
  hard: "text-red-400",
  legendary: "text-purple-400",
};

const BLANK_FORM = {
  title: "", location: "metapolis", description: "", narrative: "",
  difficulty: "easy", type: "solo",
  rewards: { experience: 50, credits: 100, merits: 0 },
  requirements: { level: 1 },
  durationMinutes: 10,
};

export default function AdminMissionsPage() {
  const router = useRouter();
  const { user, setUser, setCharacter } = useGameStore();
  const [missions, setMissions] = useState<Mission[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<typeof BLANK_FORM>(BLANK_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [statusMsg, setStatusMsg] = useState("");

  useEffect(() => {
    if (!user) {
      fetch("/api/auth/me").then(async (r) => {
        if (!r.ok) { router.push("/login"); return; }
        const d = await r.json();
        setUser(d.data.user);
        setCharacter(d.data.character);
        if (d.data.user.role === "player") router.push("/dashboard");
      });
    } else if (user.role === "player") {
      router.push("/dashboard");
    }
  }, [user, router, setUser, setCharacter]);

  const fetchMissions = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/missions");
    if (res.ok) {
      const data = await res.json();
      setMissions(data.data.missions);
    }
    setLoading(false);
  }, []);

  useEffect(() => { if (user && user.role !== "player") fetchMissions(); }, [user, fetchMissions]);

  async function createMission(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    setSaving(true);
    const res = await fetch("/api/admin/missions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (res.ok) {
      setStatusMsg("Mission created successfully");
      setShowForm(false);
      setForm(BLANK_FORM);
      fetchMissions();
    } else {
      setFormError(data.error);
    }
    setSaving(false);
  }

  async function toggleMission(id: string, currentlyActive: boolean) {
    let res: Response;
    if (currentlyActive) {
      res = await fetch(`/api/admin/missions?id=${id}`, { method: "DELETE" });
    } else {
      res = await fetch("/api/admin/missions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, isActive: true }),
      });
    }
    const data = await res.json();
    setStatusMsg(res.ok ? data.data.message : `ERROR: ${data.error}`);
    if (res.ok) fetchMissions();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-mono font-bold text-red-400">Mission Management</h1>
        <Button variant="secondary" onClick={() => setShowForm(!showForm)}>
          {showForm ? "Cancel" : "+ New Mission"}
        </Button>
      </div>

      {statusMsg && (
        <div className={`text-xs font-mono p-2 border ${statusMsg.startsWith("ERROR") ? "border-red-800 text-red-400" : "border-green-800 text-green-400"}`}>
          {statusMsg}
        </div>
      )}

      {showForm && (
        <Card title="Create Mission" accent="red">
          <form onSubmit={createMission} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Input label="Title" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} required />
              <div className="flex flex-col gap-1">
                <label className="text-xs font-mono text-gray-400 uppercase tracking-wider">Location</label>
                <select value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} className="bg-gray-900 border border-gray-700 text-gray-100 font-mono text-sm px-3 py-2 focus:outline-none focus:ring-1 focus:ring-cyan-500">
                  {["metapolis", "moon_junkyard", "earth", "mars"].map((l) => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-mono text-gray-400 uppercase tracking-wider">Difficulty</label>
                <select value={form.difficulty} onChange={(e) => setForm((f) => ({ ...f, difficulty: e.target.value }))} className="bg-gray-900 border border-gray-700 text-gray-100 font-mono text-sm px-3 py-2">
                  {["easy", "medium", "hard", "legendary"].map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-mono text-gray-400 uppercase tracking-wider">Type</label>
                <select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))} className="bg-gray-900 border border-gray-700 text-gray-100 font-mono text-sm px-3 py-2">
                  {["solo", "team", "guild"].map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <Input label="Duration (min)" type="number" value={form.durationMinutes} onChange={(e) => setForm((f) => ({ ...f, durationMinutes: parseInt(e.target.value) || 1 }))} />
            </div>
            <Input label="Description" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} required />
            <Input label="Narrative (shown on completion)" value={form.narrative} onChange={(e) => setForm((f) => ({ ...f, narrative: e.target.value }))} />
            <div className="grid grid-cols-4 gap-3">
              <Input label="XP Reward" type="number" value={form.rewards.experience} onChange={(e) => setForm((f) => ({ ...f, rewards: { ...f.rewards, experience: parseInt(e.target.value) || 0 } }))} />
              <Input label="Credits Reward" type="number" value={form.rewards.credits} onChange={(e) => setForm((f) => ({ ...f, rewards: { ...f.rewards, credits: parseInt(e.target.value) || 0 } }))} />
              <Input label="Merits Reward" type="number" value={form.rewards.merits} onChange={(e) => setForm((f) => ({ ...f, rewards: { ...f.rewards, merits: parseInt(e.target.value) || 0 } }))} />
              <Input label="Level Req" type="number" value={form.requirements.level ?? 1} onChange={(e) => setForm((f) => ({ ...f, requirements: { ...f.requirements, level: parseInt(e.target.value) || 1 } }))} />
            </div>
            {formError && <p className="text-xs font-mono text-red-400">ERROR: {formError}</p>}
            <Button type="submit" loading={saving}>Create Mission</Button>
          </form>
        </Card>
      )}

      {loading ? (
        <p className="text-xs font-mono text-gray-600">Loading missions...</p>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full font-mono text-xs">
              <thead>
                <tr className="text-gray-600 border-b border-gray-800">
                  <th className="text-left py-2 pr-4">Title</th>
                  <th className="text-left py-2 pr-4">Location</th>
                  <th className="text-left py-2 pr-4">Difficulty</th>
                  <th className="text-left py-2 pr-4">Type</th>
                  <th className="text-left py-2 pr-4">Rewards</th>
                  <th className="text-left py-2 pr-4">Status</th>
                  <th className="text-left py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {missions.map((m) => (
                  <tr key={m._id} className="border-b border-gray-900 hover:bg-gray-900">
                    <td className="py-2 pr-4 text-gray-300">{m.title}</td>
                    <td className="py-2 pr-4 text-gray-500">{m.location}</td>
                    <td className={`py-2 pr-4 ${DIFFICULTY_COLORS[m.difficulty]}`}>{m.difficulty}</td>
                    <td className="py-2 pr-4 text-gray-500">{m.type}</td>
                    <td className="py-2 pr-4 text-gray-500">
                      <span className="text-yellow-400">+{m.rewards.experience}xp</span>{" "}
                      <span className="text-cyan-400">+{m.rewards.credits}¢</span>
                      {m.rewards.merits > 0 && (
                        <><br /><span className="text-purple-400">+{m.rewards.merits}M</span></>
                      )}
                    </td>
                    <td className="py-2 pr-4">
                      {m.isActive
                        ? <span className="text-green-400">ACTIVE</span>
                        : <span className="text-red-600">INACTIVE</span>}
                    </td>
                    <td className="py-2">
                      {m.isActive ? (
                        <Button size="sm" variant="danger" onClick={() => toggleMission(m._id, true)}>
                          Deactivate
                        </Button>
                      ) : (
                        <Button size="sm" variant="success" onClick={() => toggleMission(m._id, false)}>
                          Reactivate
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
