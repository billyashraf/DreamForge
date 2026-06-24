"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useGameStore } from "@/store/useGameStore";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";

interface AdminGuild {
  _id: string;
  name: string;
  tag: string;
  membersCount: number;
  marsRating: number;
  isSuspended: boolean;
  leader: { name: string; level: number } | null;
  createdAt: string;
}

export default function AdminGuildsPage() {
  const router = useRouter();
  const { user, setUser, setCharacter } = useGameStore();
  const [guilds, setGuilds] = useState<AdminGuild[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [acting, setActing] = useState<string | null>(null);
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

  const fetchGuilds = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/admin/guilds?page=${page}&search=${encodeURIComponent(search)}`);
    if (res.ok) {
      const data = await res.json();
      setGuilds(data.data.guilds);
      setTotalPages(data.data.pages);
    }
    setLoading(false);
  }, [page, search]);

  useEffect(() => { if (user && user.role !== "player") fetchGuilds(); }, [user, fetchGuilds]);

  async function applyAction(guildId: string, action: string) {
    if (action === "delete" && !confirm("Permanently delete this guild and remove all members?")) return;
    setActing(guildId + action);
    const res = await fetch("/api/admin/guilds", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ guildId, action }),
    });
    const data = await res.json();
    setStatusMsg(res.ok ? data.data.message : `ERROR: ${data.error}`);
    setActing(null);
    if (res.ok) fetchGuilds();
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-mono font-bold text-red-400">Guild Management</h1>

      <Input
        placeholder="Search name or tag..."
        value={search}
        onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        className="max-w-sm"
      />

      {statusMsg && (
        <div className={`text-xs font-mono p-2 border ${statusMsg.startsWith("ERROR") ? "border-red-800 text-red-400" : "border-green-800 text-green-400"}`}>
          {statusMsg}
        </div>
      )}

      {loading ? (
        <p className="text-xs font-mono text-gray-600">Loading guilds...</p>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full font-mono text-xs">
              <thead>
                <tr className="text-gray-600 border-b border-gray-800">
                  <th className="text-left py-2 pr-4">Guild</th>
                  <th className="text-left py-2 pr-4">Leader</th>
                  <th className="text-left py-2 pr-4">Members</th>
                  <th className="text-left py-2 pr-4">Mars Rating</th>
                  <th className="text-left py-2 pr-4">Status</th>
                  <th className="text-left py-2 pr-4">Created</th>
                  <th className="text-left py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {guilds.map((g) => (
                  <tr key={g._id} className="border-b border-gray-900 hover:bg-gray-900">
                    <td className="py-2 pr-4">
                      <span className="text-gray-600 mr-1">[{g.tag}]</span>
                      <span className="text-gray-200">{g.name}</span>
                    </td>
                    <td className="py-2 pr-4 text-gray-400">{g.leader?.name ?? "—"}</td>
                    <td className="py-2 pr-4 text-gray-400">{g.membersCount}</td>
                    <td className="py-2 pr-4 text-red-400">{g.marsRating}</td>
                    <td className="py-2 pr-4">
                      {g.isSuspended ? (
                        <span className="text-orange-400">SUSPENDED</span>
                      ) : (
                        <span className="text-green-400">ACTIVE</span>
                      )}
                    </td>
                    <td className="py-2 pr-4 text-gray-600">{new Date(g.createdAt).toLocaleDateString()}</td>
                    <td className="py-2">
                      <div className="flex gap-2">
                        {g.isSuspended ? (
                          <Button size="sm" variant="success" loading={acting === g._id + "unsuspend"} onClick={() => applyAction(g._id, "unsuspend")}>
                            Unsuspend
                          </Button>
                        ) : (
                          <Button size="sm" variant="secondary" loading={acting === g._id + "suspend"} onClick={() => applyAction(g._id, "suspend")}>
                            Suspend
                          </Button>
                        )}
                        {user?.role === "admin" && (
                          <Button size="sm" variant="danger" loading={acting === g._id + "delete"} onClick={() => applyAction(g._id, "delete")}>
                            Delete
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex gap-2 mt-4 justify-end">
              <Button size="sm" variant="ghost" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Prev</Button>
              <span className="text-xs font-mono text-gray-600 self-center">{page} / {totalPages}</span>
              <Button size="sm" variant="ghost" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
