"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useGameStore } from "@/store/useGameStore";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";

interface AdminUser {
  _id: string;
  username: string;
  email: string;
  role: "player" | "moderator" | "admin";
  isBanned: boolean;
  isVerified: boolean;
  banReason?: string;
  createdAt: string;
  lastLogin: string;
}

const ROLE_LEVEL: Record<string, number> = { player: 0, moderator: 1, admin: 2 };

export default function AdminUsersPage() {
  const router = useRouter();
  const { user, setUser, setCharacter } = useGameStore();
  const [users, setUsers] = useState<AdminUser[]>([]);
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

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/admin/users?page=${page}&search=${encodeURIComponent(search)}`);
    if (res.ok) {
      const data = await res.json();
      setUsers(data.data.users);
      setTotalPages(data.data.pages);
    }
    setLoading(false);
  }, [page, search]);

  useEffect(() => { if (user && user.role !== "player") fetchUsers(); }, [user, fetchUsers]);

  async function applyAction(userId: string, action: string, extra: Record<string, string> = {}) {
    setActing(userId + action);
    setStatusMsg("");
    const res = await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, action, ...extra }),
    });
    const data = await res.json();
    setStatusMsg(res.ok ? data.data.message : `ERROR: ${data.error}`);
    setActing(null);
    if (res.ok) fetchUsers();
  }

  const actorLevel = ROLE_LEVEL[user?.role ?? "player"] ?? 0;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-mono font-bold text-red-400">User Management</h1>

      <div className="flex gap-3">
        <Input
          placeholder="Search username or email..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="max-w-sm"
        />
      </div>

      {statusMsg && (
        <div className={`text-xs font-mono p-2 border ${statusMsg.startsWith("ERROR") ? "border-red-800 text-red-400" : "border-green-800 text-green-400"}`}>
          {statusMsg}
        </div>
      )}

      {loading ? (
        <p className="text-xs font-mono text-gray-600">Loading users...</p>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full font-mono text-xs">
              <thead>
                <tr className="text-gray-600 border-b border-gray-800">
                  <th className="text-left py-2 pr-4">Username</th>
                  <th className="text-left py-2 pr-4">Email</th>
                  <th className="text-left py-2 pr-4">Role</th>
                  <th className="text-left py-2 pr-4">Status</th>
                  <th className="text-left py-2 pr-4">Last Login</th>
                  <th className="text-left py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const targetLevel = ROLE_LEVEL[u.role] ?? 0;
                  const canAct = actorLevel > targetLevel;
                  return (
                    <tr key={u._id} className="border-b border-gray-900 hover:bg-gray-900">
                      <td className="py-2 pr-4 text-gray-300">{u.username}</td>
                      <td className="py-2 pr-4 text-gray-500">{u.email}</td>
                      <td className="py-2 pr-4">
                        <span className={
                          u.role === "admin" ? "text-red-400" :
                          u.role === "moderator" ? "text-yellow-400" :
                          "text-gray-500"
                        }>
                          {u.role}
                        </span>
                      </td>
                      <td className="py-2 pr-4 space-y-0.5">
                        {u.isBanned ? (
                          <span className="text-red-400 block">BANNED</span>
                        ) : (
                          <span className="text-green-400 block">ACTIVE</span>
                        )}
                        {!u.isVerified && (
                          <span className="text-orange-400 block text-[10px]">UNVERIFIED</span>
                        )}
                      </td>
                      <td className="py-2 pr-4 text-gray-600">
                        {new Date(u.lastLogin).toLocaleDateString()}
                      </td>
                      <td className="py-2">
                        <div className="flex flex-wrap gap-1.5">
                          {/* Ban / Unban — moderators can ban players, admins can ban mods/players */}
                          {canAct && !u.isBanned && (
                            <Button
                              size="sm"
                              variant="danger"
                              loading={acting === u._id + "ban"}
                              onClick={() => {
                                const reason = prompt("Ban reason:") ?? "Policy violation";
                                applyAction(u._id, "ban", { reason });
                              }}
                            >
                              Ban
                            </Button>
                          )}
                          {canAct && u.isBanned && (
                            <Button
                              size="sm"
                              variant="success"
                              loading={acting === u._id + "unban"}
                              onClick={() => applyAction(u._id, "unban")}
                            >
                              Unban
                            </Button>
                          )}

                          {/* Promote to moderator — mods and admins can promote players */}
                          {(user?.role === "admin" || user?.role === "moderator") && u.role === "player" && (
                            <Button
                              size="sm"
                              variant="secondary"
                              loading={acting === u._id + "promote_moderator"}
                              onClick={() => applyAction(u._id, "promote_moderator")}
                            >
                              →Mod
                            </Button>
                          )}

                          {/* Promote to admin — admin only */}
                          {user?.role === "admin" && u.role === "moderator" && (
                            <Button
                              size="sm"
                              variant="secondary"
                              loading={acting === u._id + "promote_admin"}
                              onClick={() => {
                                if (confirm(`Promote ${u.username} to admin?`)) {
                                  applyAction(u._id, "promote_admin");
                                }
                              }}
                            >
                              →Admin
                            </Button>
                          )}

                          {/* Demote admin → moderator */}
                          {user?.role === "admin" && u.role === "admin" && (
                            <Button
                              size="sm"
                              variant="danger"
                              loading={acting === u._id + "demote_moderator"}
                              onClick={() => applyAction(u._id, "demote_moderator")}
                            >
                              →Mod
                            </Button>
                          )}

                          {/* Demote moderator → player */}
                          {user?.role === "admin" && u.role === "moderator" && (
                            <Button
                              size="sm"
                              variant="danger"
                              loading={acting === u._id + "demote_player"}
                              onClick={() => applyAction(u._id, "demote_player")}
                            >
                              →Player
                            </Button>
                          )}

                          {/* Delete user — admin only, cannot delete other admins */}
                          {user?.role === "admin" && u.role !== "admin" && (
                            <Button
                              size="sm"
                              variant="danger"
                              loading={acting === u._id + "delete_user"}
                              onClick={() => {
                                if (confirm(`Permanently delete "${u.username}"? This cannot be undone.`)) {
                                  applyAction(u._id, "delete_user");
                                }
                              }}
                            >
                              Delete
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex gap-2 mt-4 justify-end">
              <Button size="sm" variant="ghost" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
                Prev
              </Button>
              <span className="text-xs font-mono text-gray-600 self-center">
                {page} / {totalPages}
              </span>
              <Button size="sm" variant="ghost" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>
                Next
              </Button>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
