"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useGameStore } from "@/store/useGameStore";

interface NotifItem {
  _id: string;
  type: string;
  entityName: string;
  entityTag?: string;
  senderName?: string;
  status: "pending" | "accepted" | "declined" | "read";
  createdAt: string;
}

const TYPE_LABELS: Record<string, string> = {
  guild_invite: "Guild Invite",
  team_invite: "Team Invite",
  guild_app_accepted: "Application Accepted",
  guild_app_rejected: "Application Rejected",
  team_app_accepted: "Application Accepted",
  team_app_rejected: "Application Rejected",
  guild_kick: "Removed from Guild",
  team_kick: "Removed from Team",
};

function NotifMessage({ n }: { n: NotifItem }) {
  switch (n.type) {
    case "guild_invite":
      return <span><span className="text-cyan-400">{n.senderName}</span> invited you to join guild <span className="text-gray-200 font-semibold">[{n.entityTag}] {n.entityName}</span></span>;
    case "team_invite":
      return <span><span className="text-cyan-400">{n.senderName}</span> invited you to join team <span className="text-gray-200 font-semibold">&ldquo;{n.entityName}&rdquo;</span></span>;
    case "guild_app_accepted":
      return <span>Your application to guild <span className="text-green-400 font-semibold">[{n.entityTag}] {n.entityName}</span> was <span className="text-green-400">accepted</span>. You are now a member.</span>;
    case "guild_app_rejected":
      return <span>Your application to guild <span className="text-red-400 font-semibold">[{n.entityTag}] {n.entityName}</span> was <span className="text-red-400">rejected</span>.</span>;
    case "team_app_accepted":
      return <span>Your application to team <span className="text-green-400 font-semibold">&ldquo;{n.entityName}&rdquo;</span> was <span className="text-green-400">accepted</span>. You are now a member.</span>;
    case "team_app_rejected":
      return <span>Your application to team <span className="text-red-400 font-semibold">&ldquo;{n.entityName}&rdquo;</span> was <span className="text-red-400">rejected</span>.</span>;
    case "guild_kick":
      return <span>You were <span className="text-red-400">removed</span> from guild <span className="text-gray-200 font-semibold">[{n.entityTag}] {n.entityName}</span>.</span>;
    case "team_kick":
      return <span>You were <span className="text-red-400">removed</span> from team <span className="text-gray-200 font-semibold">&ldquo;{n.entityName}&rdquo;</span>.</span>;
    default:
      return <span>{n.entityName}</span>;
  }
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function NotificationsPage() {
  const router = useRouter();
  const { user, character, setUser, setCharacter } = useGameStore();
  const [notifs, setNotifs] = useState<NotifItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ id: string; text: string; ok: boolean } | null>(null);

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

  const fetchNotifs = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/notifications");
      if (r.ok) {
        const d = await r.json();
        setNotifs(d.data.notifications ?? []);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetchNotifs(); }, [fetchNotifs]);

  async function respond(notifId: string, action: "accept" | "decline") {
    setActing(notifId);
    setMsg(null);
    try {
      const r = await fetch(`/api/notifications/${notifId}/${action}`, { method: "POST" });
      const d = await r.json();
      if (r.ok) {
        setNotifs((prev) =>
          prev.map((n) =>
            n._id === notifId ? { ...n, status: action === "accept" ? "accepted" : "declined" } : n
          )
        );
        setMsg({ id: notifId, text: d.data?.message ?? "Done", ok: true });
      } else {
        setMsg({ id: notifId, text: d.error ?? "Error", ok: false });
      }
    } catch {
      setMsg({ id: notifId, text: "Connection error", ok: false });
    }
    setActing(null);
  }

  const isInvite = (n: NotifItem) => n.type === "guild_invite" || n.type === "team_invite";
  const pending = notifs.filter((n) => n.status === "pending");
  const rest    = notifs.filter((n) => n.status !== "pending");

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-mono font-bold text-gray-200">Notifications</h1>
        <p className="text-xs font-mono text-gray-600 mt-1">
          {pending.length > 0 ? `${pending.length} pending` : "All caught up"}
        </p>
      </div>

      {loading ? (
        <p className="text-xs font-mono text-gray-600">Loading...</p>
      ) : notifs.length === 0 ? (
        <p className="text-xs font-mono text-gray-600">No notifications yet.</p>
      ) : (
        <div className="space-y-6">
          {pending.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-xs font-mono text-gray-500 uppercase tracking-wider">Pending</h2>
              {pending.map((n) => (
                <div key={n._id} className="border border-cyan-900 bg-gray-950 p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <span className="text-[10px] font-mono text-cyan-700 uppercase tracking-wider">{TYPE_LABELS[n.type] ?? n.type}</span>
                      <p className="text-xs font-mono text-gray-400 leading-relaxed"><NotifMessage n={n} /></p>
                      <p className="text-[10px] font-mono text-gray-700">{timeAgo(n.createdAt)}</p>
                    </div>
                  </div>
                  {isInvite(n) && (
                    <div className="flex gap-3 pt-1">
                      <button
                        onClick={() => respond(n._id, "accept")}
                        disabled={acting === n._id}
                        className="text-xs font-mono text-green-400 hover:text-green-300 border border-green-800 hover:border-green-600 px-3 py-1 transition-colors disabled:opacity-50"
                      >
                        {acting === n._id ? "..." : "✓ Accept"}
                      </button>
                      <button
                        onClick={() => respond(n._id, "decline")}
                        disabled={acting === n._id}
                        className="text-xs font-mono text-red-400 hover:text-red-300 border border-red-900 hover:border-red-700 px-3 py-1 transition-colors disabled:opacity-50"
                      >
                        {acting === n._id ? "..." : "✗ Decline"}
                      </button>
                    </div>
                  )}
                  {msg?.id === n._id && (
                    <p className={`text-xs font-mono ${msg.ok ? "text-green-400" : "text-red-400"}`}>{msg.text}</p>
                  )}
                </div>
              ))}
            </div>
          )}

          {rest.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-xs font-mono text-gray-500 uppercase tracking-wider">History</h2>
              {rest.map((n) => (
                <div key={n._id} className="border border-gray-800 bg-gray-950 p-3 flex items-start justify-between gap-4">
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-mono text-gray-700 uppercase tracking-wider">{TYPE_LABELS[n.type] ?? n.type}</span>
                    <p className="text-xs font-mono text-gray-600 leading-relaxed"><NotifMessage n={n} /></p>
                    <p className="text-[10px] font-mono text-gray-800">{timeAgo(n.createdAt)}</p>
                  </div>
                  {n.status !== "read" && (
                    <span className={`text-[10px] font-mono shrink-0 ${n.status === "accepted" ? "text-green-700" : "text-red-700"}`}>
                      {n.status === "accepted" ? "✓ accepted" : "✗ declined"}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
