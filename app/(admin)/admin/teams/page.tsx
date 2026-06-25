"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useGameStore } from "@/store/useGameStore";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";

interface AdminTeam {
  _id: string;
  name: string;
  activity: string;
  membersCount: number;
  maxSize: number;
  isOpen: boolean;
  isSuspended: boolean;
  leader: { name: string; level: number } | null;
  createdAt: string;
}

export default function AdminTeamsPage() {
  const router = useRouter();
  const { user, setUser, setCharacter } = useGameStore();
  const [teams, setTeams] = useState<AdminTeam[]>([]);
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

  const fetchTeams = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/admin/teams?page=${page}&search=${encodeURIComponent(search)}`);
    if (res.ok) {
      const data = await res.json();
      setTeams(data.data.teams);
      setTotalPages(data.data.pages);
    }
    setLoading(false);
  }, [page, search]);

  useEffect(() => { if (user && user.role !== "player") fetchTeams(); }, [user, fetchTeams]);

  async function applyAction(teamId: string, action: string) {
    if (action === "delete" && !confirm("Permanently delete this team and remove all members?")) return;
    setActing(teamId + action);
    const res = await fetch("/api/admin/teams", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teamId, action }),
    });
    const data = await res.json();
    setStatusMsg(res.ok ? data.data.message : `ERROR: ${data.error}`);
    setActing(null);
    if (res.ok) fetchTeams();
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-mono font-bold text-red-400">Team Management</h1>

      <Input
        placeholder="Search by name..."
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
        <p className="text-xs font-mono text-gray-600">Loading teams...</p>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full font-mono text-xs">
              <thead>
                <tr className="text-gray-600 border-b border-gray-800">
                  <th className="text-left py-2 pr-4">Team</th>
                  <th className="text-left py-2 pr-4">Leader</th>
                  <th className="text-left py-2 pr-4">Members</th>
                  <th className="text-left py-2 pr-4">Activity</th>
                  <th className="text-left py-2 pr-4">Status</th>
                  <th className="text-left py-2 pr-4">Created</th>
                  <th className="text-left py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {teams.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-6 text-center text-gray-600">No teams found.</td>
                  </tr>
                )}
                {teams.map((t) => (
                  <tr key={t._id} className="border-b border-gray-900 hover:bg-gray-900">
                    <td className="py-2 pr-4 text-gray-200">{t.name}</td>
                    <td className="py-2 pr-4 text-gray-400">{t.leader?.name ?? "—"} {t.leader ? `(L${t.leader.level})` : ""}</td>
                    <td className="py-2 pr-4 text-gray-400">{t.membersCount}/{t.maxSize}</td>
                    <td className="py-2 pr-4 text-gray-500">{t.activity}</td>
                    <td className="py-2 pr-4">
                      {t.isSuspended ? (
                        <span className="text-orange-400">SUSPENDED</span>
                      ) : t.isOpen ? (
                        <span className="text-green-400">OPEN</span>
                      ) : (
                        <span className="text-gray-500">CLOSED</span>
                      )}
                    </td>
                    <td className="py-2 pr-4 text-gray-600">{new Date(t.createdAt).toLocaleDateString()}</td>
                    <td className="py-2">
                      <div className="flex gap-2">
                        {t.isSuspended ? (
                          <Button size="sm" variant="success" loading={acting === t._id + "unsuspend"} onClick={() => applyAction(t._id, "unsuspend")}>
                            Unsuspend
                          </Button>
                        ) : (
                          <Button size="sm" variant="secondary" loading={acting === t._id + "suspend"} onClick={() => applyAction(t._id, "suspend")}>
                            Suspend
                          </Button>
                        )}
                        {user?.role === "admin" && (
                          <Button size="sm" variant="danger" loading={acting === t._id + "delete"} onClick={() => applyAction(t._id, "delete")}>
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
