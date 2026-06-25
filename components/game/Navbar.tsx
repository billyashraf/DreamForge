"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useGameStore } from "@/store/useGameStore";

type PopupType = "notif" | "log" | null;

interface NotifItem {
  _id: string;
  type: string;
  entityName: string;
  entityTag?: string;
  senderName?: string;
  status: string;
  createdAt: string;
}

interface LogItem {
  _id: string;
  type: string;
  message: string;
  createdAt: string;
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

function NotifLabel({ n }: { n: NotifItem }) {
  switch (n.type) {
    case "guild_invite":
      return (
        <span>
          <span className="text-cyan-400">{n.senderName}</span> invited you to guild{" "}
          <span className="text-gray-200">[{n.entityTag}] {n.entityName}</span>
        </span>
      );
    case "team_invite":
      return (
        <span>
          <span className="text-cyan-400">{n.senderName}</span> invited you to team{" "}
          <span className="text-gray-200">&ldquo;{n.entityName}&rdquo;</span>
        </span>
      );
    case "guild_app_accepted":
      return <span>Your application to <span className="text-green-400">[{n.entityTag}] {n.entityName}</span> was <span className="text-green-400">accepted</span></span>;
    case "guild_app_rejected":
      return <span>Your application to <span className="text-red-400">[{n.entityTag}] {n.entityName}</span> was <span className="text-red-400">rejected</span></span>;
    case "team_app_accepted":
      return <span>Your application to team <span className="text-green-400">&ldquo;{n.entityName}&rdquo;</span> was <span className="text-green-400">accepted</span></span>;
    case "team_app_rejected":
      return <span>Your application to team <span className="text-red-400">&ldquo;{n.entityName}&rdquo;</span> was <span className="text-red-400">rejected</span></span>;
    case "guild_kick":
      return <span>You were <span className="text-red-400">removed</span> from guild <span className="text-gray-200">[{n.entityTag}] {n.entityName}</span></span>;
    case "team_kick":
      return <span>You were <span className="text-red-400">removed</span> from team <span className="text-gray-200">&ldquo;{n.entityName}&rdquo;</span></span>;
    default:
      return <span>{n.entityName}</span>;
  }
}

export function Navbar() {
  const user      = useGameStore((s) => s.user);
  const character = useGameStore((s) => s.character);
  const reset     = useGameStore((s) => s.reset);
  const router    = useRouter();

  const [loggingOut, setLoggingOut]   = useState(false);
  const [openPopup, setOpenPopup]     = useState<PopupType>(null);
  const [mobileOpen, setMobileOpen]   = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifs, setNotifs]           = useState<NotifItem[]>([]);
  const [logs, setLogs]               = useState<LogItem[]>([]);
  const [notifLoading, setNotifLoading] = useState(false);
  const [logLoading, setLogLoading]   = useState(false);
  const [acting, setActing]           = useState<string | null>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  const shadowForm  = character?.shadowForm ?? null;
  const canAcademy  = shadowForm === "rider"  || shadowForm === "assassin";
  const canCommitLog = shadowForm === "lancer" || shadowForm === "assassin";
  const canGuilds   = shadowForm === "caster"  || shadowForm === "assassin";

  const pollUnread = useCallback(async () => {
    if (!user) return;
    try {
      const r = await fetch("/api/notifications/unread");
      if (r.ok) {
        const d = await r.json();
        setUnreadCount(d.data.count ?? 0);
      }
    } catch { /* network */ }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    pollUnread();
    const id = setInterval(pollUnread, 15000);
    return () => clearInterval(id);
  }, [user, pollUnread]);

  // Close popup on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        setOpenPopup(null);
      }
    }
    if (openPopup) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [openPopup]);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [router]);

  async function handleBellClick() {
    if (openPopup === "notif") {
      router.push("/notifications");
      setOpenPopup(null);
      return;
    }
    setOpenPopup("notif");
    setNotifLoading(true);
    try {
      const r = await fetch("/api/notifications");
      if (r.ok) {
        const d = await r.json();
        setNotifs((d.data.notifications ?? []).slice(0, 5));
        setTimeout(pollUnread, 500);
      }
    } catch { /* ignore */ }
    setNotifLoading(false);
  }

  async function handleLogClick() {
    if (openPopup === "log") {
      router.push("/logs");
      setOpenPopup(null);
      return;
    }
    setOpenPopup("log");
    setLogLoading(true);
    try {
      const r = await fetch("/api/logs");
      if (r.ok) {
        const d = await r.json();
        setLogs((d.data.logs ?? []).slice(0, 5));
      }
    } catch { /* ignore */ }
    setLogLoading(false);
  }

  async function respondToInvite(notifId: string, action: "accept" | "decline") {
    setActing(notifId);
    try {
      const r = await fetch(`/api/notifications/${notifId}/${action}`, { method: "POST" });
      if (r.ok) {
        setNotifs((prev) =>
          prev.map((n) => n._id === notifId ? { ...n, status: action === "accept" ? "accepted" : "declined" } : n)
        );
        pollUnread();
      }
    } catch { /* ignore */ }
    setActing(null);
  }

  async function logout() {
    setLoggingOut(true);
    await fetch("/api/auth/logout", { method: "POST" });
    reset();
    router.push("/login");
  }

  const isInvite = (n: NotifItem) => n.type === "guild_invite" || n.type === "team_invite";

  return (
    <nav className="bg-gray-950 border-b border-gray-800 relative z-50">
      {/* Main bar */}
      <div className="px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="font-mono font-bold text-cyan-400 text-lg tracking-tight">
            DREAM<span className="text-gray-500">FORGE</span>
          </Link>
          {/* Desktop nav links */}
          <div className="hidden md:flex items-center gap-4 text-xs font-mono text-gray-500">
            <Link href="/dashboard" className="hover:text-gray-200 transition-colors">Dashboard</Link>
            {canGuilds ? (
              <Link href="/guilds" className="hover:text-gray-200 transition-colors">Guilds</Link>
            ) : (
              <span title="Requires Caster or Assassin form" className="text-gray-800 cursor-not-allowed select-none">Guilds</span>
            )}
            <Link href="/teams" className="hover:text-gray-200 transition-colors">Teams</Link>
            <Link href="/people" className="hover:text-gray-200 transition-colors">People</Link>
            {canCommitLog ? (
              <Link href="/commit-log" className="hover:text-gray-200 transition-colors text-gray-600">Commit Log</Link>
            ) : (
              <span title="Requires Lancer or Assassin form" className="text-gray-800 cursor-not-allowed select-none">Commit Log</span>
            )}
            <Link href="/curse-tree" className="hover:text-purple-300 transition-colors text-purple-600 font-semibold">Curse Tree</Link>
            {canAcademy ? (
              <Link href="/academy" className="hover:text-amber-300 transition-colors text-amber-600 font-semibold">Academy</Link>
            ) : (
              <span title="Requires Rider form" className="text-yellow-900 cursor-not-allowed select-none font-semibold">Academy</span>
            )}
            <Link href="/shadow-form" className="hover:text-indigo-300 transition-colors text-indigo-600 font-semibold">Shadow Form</Link>
            {user?.role !== "player" && (
              <Link href="/admin" className="text-red-500 hover:text-red-400 transition-colors">Admin</Link>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3" ref={popupRef}>
          {shadowForm && (
            <span className="text-[10px] font-mono text-gray-700 hidden sm:block uppercase tracking-widest">◆ {shadowForm}</span>
          )}
          {user && (
            <span className="text-xs font-mono text-gray-600 hidden sm:block">[{user.role.toUpperCase()}] {user.username}</span>
          )}

          {/* Log icon */}
          {user && (
            <div className="relative">
              <button
                onClick={handleLogClick}
                title={openPopup === "log" ? "Click again to open full log" : "Activity log"}
                className={`text-sm font-mono transition-colors px-1 ${openPopup === "log" ? "text-amber-400" : "text-gray-600 hover:text-amber-400"}`}
              >
                ▤
              </button>
              {openPopup === "log" && (
                <div className="absolute right-0 top-8 w-72 bg-gray-950 border border-gray-800 shadow-xl z-50">
                  <div className="flex items-center justify-between px-3 py-2 border-b border-gray-800">
                    <span className="text-[10px] font-mono text-gray-500 uppercase tracking-wider">Activity Log</span>
                    <span className="text-[10px] font-mono text-amber-600 cursor-pointer hover:text-amber-400" onClick={() => { router.push("/logs"); setOpenPopup(null); }}>
                      view all →
                    </span>
                  </div>
                  {logLoading ? (
                    <p className="text-xs font-mono text-gray-600 px-3 py-3">Loading...</p>
                  ) : logs.length === 0 ? (
                    <p className="text-xs font-mono text-gray-600 px-3 py-3">No activity yet.</p>
                  ) : (
                    <ul className="divide-y divide-gray-900">
                      {logs.map((l) => (
                        <li key={l._id} className="px-3 py-2">
                          <p className="text-xs font-mono text-gray-300 leading-snug">{l.message}</p>
                          <p className="text-[10px] font-mono text-gray-700 mt-0.5">{timeAgo(l.createdAt)}</p>
                        </li>
                      ))}
                    </ul>
                  )}
                  <div className="px-3 py-2 border-t border-gray-800">
                    <button onClick={() => { router.push("/logs"); setOpenPopup(null); }} className="text-[10px] font-mono text-amber-600 hover:text-amber-400">
                      Click again to open full log page →
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Notification bell */}
          {user && (
            <div className="relative">
              <button
                onClick={handleBellClick}
                title={openPopup === "notif" ? "Click again to open full notifications" : "Notifications"}
                className={`text-sm font-mono transition-colors px-1 relative ${openPopup === "notif" ? "text-cyan-400" : "text-gray-600 hover:text-cyan-400"}`}
              >
                ◉
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[9px] font-mono rounded-full min-w-[14px] h-[14px] flex items-center justify-center px-0.5 leading-none">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>
              {openPopup === "notif" && (
                <div className="absolute right-0 top-8 w-80 bg-gray-950 border border-gray-800 shadow-xl z-50">
                  <div className="flex items-center justify-between px-3 py-2 border-b border-gray-800">
                    <span className="text-[10px] font-mono text-gray-500 uppercase tracking-wider">Notifications</span>
                    <span className="text-[10px] font-mono text-cyan-600 cursor-pointer hover:text-cyan-400" onClick={() => { router.push("/notifications"); setOpenPopup(null); }}>
                      view all →
                    </span>
                  </div>
                  {notifLoading ? (
                    <p className="text-xs font-mono text-gray-600 px-3 py-3">Loading...</p>
                  ) : notifs.length === 0 ? (
                    <p className="text-xs font-mono text-gray-600 px-3 py-3">No notifications.</p>
                  ) : (
                    <ul className="divide-y divide-gray-900">
                      {notifs.map((n) => (
                        <li key={n._id} className="px-3 py-2 space-y-1.5">
                          <p className="text-xs font-mono text-gray-400 leading-snug">
                            <NotifLabel n={n} />
                          </p>
                          <p className="text-[10px] font-mono text-gray-700">{timeAgo(n.createdAt)}</p>
                          {isInvite(n) && n.status === "pending" && (
                            <div className="flex gap-2">
                              <button
                                onClick={() => respondToInvite(n._id, "accept")}
                                disabled={acting === n._id}
                                className="text-[10px] font-mono text-green-400 hover:text-green-300 border border-green-800 hover:border-green-600 px-2 py-0.5 transition-colors disabled:opacity-50"
                              >
                                {acting === n._id ? "..." : "Accept"}
                              </button>
                              <button
                                onClick={() => respondToInvite(n._id, "decline")}
                                disabled={acting === n._id}
                                className="text-[10px] font-mono text-red-400 hover:text-red-300 border border-red-900 hover:border-red-700 px-2 py-0.5 transition-colors disabled:opacity-50"
                              >
                                {acting === n._id ? "..." : "Decline"}
                              </button>
                            </div>
                          )}
                          {isInvite(n) && n.status !== "pending" && (
                            <span className={`text-[10px] font-mono ${n.status === "accepted" ? "text-green-600" : "text-gray-600"}`}>
                              {n.status === "accepted" ? "✓ Accepted" : "✗ Declined"}
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                  <div className="px-3 py-2 border-t border-gray-800">
                    <button onClick={() => { router.push("/notifications"); setOpenPopup(null); }} className="text-[10px] font-mono text-cyan-600 hover:text-cyan-400">
                      Click again to open full notifications page →
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Profile icon */}
          {character && (
            <Link
              href={`/profile/${character.id}`}
              title="My Profile"
              className="text-sm font-mono text-gray-600 hover:text-cyan-400 transition-colors px-1"
            >
              ◎
            </Link>
          )}

          <button
            onClick={logout}
            disabled={loggingOut}
            className="text-xs font-mono text-gray-600 hover:text-red-400 transition-colors disabled:opacity-50 hidden sm:block"
          >
            LOGOUT
          </button>

          {/* Hamburger — mobile only */}
          <button
            onClick={() => setMobileOpen((v) => !v)}
            className="md:hidden flex flex-col justify-center items-center w-8 h-8 gap-1.5 text-gray-400 hover:text-gray-200 transition-colors"
            aria-label="Toggle menu"
          >
            <span className={`block w-5 h-px bg-current transition-all duration-200 ${mobileOpen ? "rotate-45 translate-y-[7px]" : ""}`} />
            <span className={`block w-5 h-px bg-current transition-all duration-200 ${mobileOpen ? "opacity-0" : ""}`} />
            <span className={`block w-5 h-px bg-current transition-all duration-200 ${mobileOpen ? "-rotate-45 -translate-y-[7px]" : ""}`} />
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="md:hidden border-t border-gray-800 bg-gray-950 px-4 py-3 flex flex-col gap-1">
          {user && (
            <div className="flex items-center justify-between pb-2 mb-1 border-b border-gray-800">
              <span className="text-xs font-mono text-gray-500">[{user.role.toUpperCase()}] {user.username}</span>
              {shadowForm && <span className="text-[10px] font-mono text-gray-700 uppercase tracking-widest">◆ {shadowForm}</span>}
            </div>
          )}
          <MobileNavLink href="/dashboard" onClick={() => setMobileOpen(false)}>Dashboard</MobileNavLink>
          {canGuilds ? (
            <MobileNavLink href="/guilds" onClick={() => setMobileOpen(false)}>Guilds</MobileNavLink>
          ) : (
            <MobileNavDisabled title="Requires Caster or Assassin form">Guilds</MobileNavDisabled>
          )}
          <MobileNavLink href="/teams" onClick={() => setMobileOpen(false)}>Teams</MobileNavLink>
          <MobileNavLink href="/people" onClick={() => setMobileOpen(false)}>People</MobileNavLink>
          {canCommitLog ? (
            <MobileNavLink href="/commit-log" onClick={() => setMobileOpen(false)} className="text-gray-500">Commit Log</MobileNavLink>
          ) : (
            <MobileNavDisabled title="Requires Lancer or Assassin form">Commit Log</MobileNavDisabled>
          )}
          <MobileNavLink href="/curse-tree" onClick={() => setMobileOpen(false)} className="text-purple-600">Curse Tree</MobileNavLink>
          {canAcademy ? (
            <MobileNavLink href="/academy" onClick={() => setMobileOpen(false)} className="text-amber-600">Academy</MobileNavLink>
          ) : (
            <MobileNavDisabled title="Requires Rider form" className="text-yellow-900">Academy</MobileNavDisabled>
          )}
          <MobileNavLink href="/shadow-form" onClick={() => setMobileOpen(false)} className="text-indigo-600">Shadow Form</MobileNavLink>
          {character && (
            <MobileNavLink href={`/profile/${character.id}`} onClick={() => setMobileOpen(false)} className="text-cyan-600">My Profile</MobileNavLink>
          )}
          {user?.role !== "player" && (
            <MobileNavLink href="/admin" onClick={() => setMobileOpen(false)} className="text-red-500">Admin</MobileNavLink>
          )}
          <div className="pt-2 mt-1 border-t border-gray-800">
            <button
              onClick={logout}
              disabled={loggingOut}
              className="text-xs font-mono text-gray-600 hover:text-red-400 transition-colors disabled:opacity-50"
            >
              LOGOUT
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}

function MobileNavLink({
  href,
  onClick,
  className = "",
  children,
}: {
  href: string;
  onClick: () => void;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`text-sm font-mono py-2 px-2 text-gray-400 hover:text-gray-200 hover:bg-gray-900 transition-colors rounded ${className}`}
    >
      {children}
    </Link>
  );
}

function MobileNavDisabled({
  title,
  className = "",
  children,
}: {
  title: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      title={title}
      className={`text-sm font-mono py-2 px-2 text-gray-800 cursor-not-allowed select-none ${className}`}
    >
      {children}
    </span>
  );
}
