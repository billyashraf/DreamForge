"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useGameStore } from "@/store/useGameStore";
import { Button } from "@/components/ui/Button";

interface LogItem {
  _id: string;
  type: string;
  message: string;
  createdAt: string;
}

const TYPE_COLOR: Record<string, string> = {
  guild_joined:        "text-cyan-600",
  guild_left:          "text-gray-600",
  guild_kicked:        "text-red-600",
  guild_kick_issued:   "text-orange-700",
  guild_applied:       "text-blue-600",
  guild_app_accepted:  "text-green-600",
  guild_app_rejected:  "text-red-600",
  team_joined:         "text-cyan-600",
  team_left:           "text-gray-600",
  team_kicked:         "text-red-600",
  team_kick_issued:    "text-orange-700",
  team_applied:        "text-blue-600",
  team_app_accepted:   "text-green-600",
  team_app_rejected:   "text-red-600",
  invite_sent:         "text-indigo-600",
  invite_accepted:     "text-green-600",
  invite_declined:     "text-gray-600",
};

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function LogsPage() {
  const router = useRouter();
  const { user, character, setUser, setCharacter } = useGameStore();
  const [logs, setLogs]     = useState<LogItem[]>([]);
  const [total, setTotal]   = useState(0);
  const [page, setPage]     = useState(1);
  const [pages, setPages]   = useState(1);
  const [loading, setLoading] = useState(true);

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

  const fetchLogs = useCallback(async (pg: number) => {
    setLoading(true);
    try {
      const r = await fetch(`/api/logs?page=${pg}`);
      if (r.ok) {
        const d = await r.json();
        setLogs(d.data.logs ?? []);
        setTotal(d.data.total ?? 0);
        setPages(d.data.pages ?? 1);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetchLogs(page); }, [fetchLogs, page]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-mono font-bold text-gray-200">Activity Log</h1>
        <p className="text-xs font-mono text-gray-600 mt-1">
          {total > 0 ? `${total} recorded actions` : "No actions recorded yet"}
          {character && <span> · {character.name}</span>}
        </p>
      </div>

      {loading ? (
        <p className="text-xs font-mono text-gray-600">Loading...</p>
      ) : logs.length === 0 ? (
        <div className="border border-gray-800 bg-gray-950 p-6 text-center">
          <p className="text-xs font-mono text-gray-600">No activity recorded yet.</p>
          <p className="text-xs font-mono text-gray-700 mt-1">Actions like joining guilds, teams, sending invites, and more will appear here.</p>
        </div>
      ) : (
        <div className="border border-gray-800 divide-y divide-gray-900">
          {logs.map((l) => (
            <div key={l._id} className="flex items-start gap-4 px-4 py-3 hover:bg-gray-900 transition-colors">
              <div className="shrink-0 w-24">
                <p className="text-[10px] font-mono text-gray-700">{formatDate(l.createdAt)}</p>
              </div>
              <div className="flex-1 min-w-0">
                <span className={`text-[10px] font-mono uppercase tracking-wider mr-2 ${TYPE_COLOR[l.type] ?? "text-gray-700"}`}>
                  {l.type.replace(/_/g, " ")}
                </span>
                <span className="text-xs font-mono text-gray-400">{l.message}</span>
              </div>
            </div>
          ))}
        </div>
      )}

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
