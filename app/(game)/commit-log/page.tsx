"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useGameStore } from "@/store/useGameStore";

interface Commit {
  sha: string;
  message: string;
  body: string | null;
  author: string;
  date: string | null;
  url: string;
}

interface CommitData {
  commits: Commit[];
  repo: string;
  contributors: string[];
  total: number;
}

// Parse conventional commit prefix: "feat: ..." → { type: "feat", rest: "..." }
function parseCommit(message: string): { type: string; scope: string | null; rest: string } {
  const match = message.match(/^(\w+)(?:\(([^)]+)\))?!?:\s*(.+)$/);
  if (match) return { type: match[1], scope: match[2] ?? null, rest: match[3] };
  return { type: "other", scope: null, rest: message };
}

const TYPE_STYLES: Record<string, { label: string; color: string; bg: string }> = {
  feat:     { label: "FEAT",     color: "text-cyan-400",   bg: "border-cyan-900 bg-cyan-950/40" },
  fix:      { label: "FIX",      color: "text-red-400",    bg: "border-red-900 bg-red-950/40" },
  refactor: { label: "REFACTOR", color: "text-yellow-400", bg: "border-yellow-900 bg-yellow-950/40" },
  chore:    { label: "CHORE",    color: "text-gray-500",   bg: "border-gray-800 bg-gray-900/40" },
  docs:     { label: "DOCS",     color: "text-blue-400",   bg: "border-blue-900 bg-blue-950/40" },
  style:    { label: "STYLE",    color: "text-purple-400", bg: "border-purple-900 bg-purple-950/40" },
  perf:     { label: "PERF",     color: "text-green-400",  bg: "border-green-900 bg-green-950/40" },
  test:     { label: "TEST",     color: "text-orange-400", bg: "border-orange-900 bg-orange-950/40" },
  other:    { label: "COMMIT",   color: "text-gray-400",   bg: "border-gray-800 bg-gray-900/20" },
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hrs = Math.floor(min / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function CommitLogPage() {
  const router = useRouter();
  const { user, setUser, setCharacter } = useGameStore();

  const [data, setData] = useState<CommitData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("all");
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  useEffect(() => {
    async function checkAuth() {
      if (!user) {
        const r = await fetch("/api/auth/me");
        if (!r.ok) { router.push("/login"); return; }
        const d = await r.json();
        setUser(d.data.user);
        setCharacter(d.data.character);
        if (!d.data.character) { router.push("/character/create"); return; }
      }
    }
    checkAuth();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchCommits = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/commits");
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? "Failed to load commits."); return; }
      setData(json);
      setLastRefresh(new Date());
    } catch {
      setError("Cannot reach the server.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchCommits(); }, [fetchCommits]);

  const allTypes = data
    ? [...new Set(data.commits.map((c) => parseCommit(c.message).type))].sort()
    : [];

  const filtered = data
    ? filter === "all" ? data.commits : data.commits.filter((c) => parseCommit(c.message).type === filter)
    : [];

  const featCount  = data?.commits.filter((c) => parseCommit(c.message).type === "feat").length ?? 0;
  const fixCount   = data?.commits.filter((c) => parseCommit(c.message).type === "fix").length ?? 0;

  return (
    <div className="space-y-4 pb-8">

      {/* Header */}
      <div className="border border-gray-800 bg-gray-950 p-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-xs font-mono text-green-400 uppercase tracking-widest">Live Development Feed</span>
            </div>
            <h1 className="text-xl font-mono font-bold text-gray-100">Commit Log</h1>
            <a
              href={`https://github.com/${data?.repo ?? "billyashraf/DreamForge"}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-mono text-cyan-600 hover:text-cyan-400 transition-colors mt-0.5 inline-block"
            >
              github.com/{data?.repo ?? "billyashraf/DreamForge"} ↗
            </a>
          </div>
          <div className="flex flex-col items-end gap-2">
            <button
              onClick={fetchCommits}
              disabled={loading}
              className="px-3 py-1.5 border border-gray-700 text-xs font-mono text-gray-400 hover:text-gray-200 hover:border-gray-500 transition-colors disabled:opacity-40"
            >
              {loading ? "FETCHING..." : "↻ REFRESH"}
            </button>
            {lastRefresh && (
              <span className="text-xs font-mono text-gray-700">
                Updated {timeAgo(lastRefresh.toISOString())}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      {data && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total Commits", value: data.total, color: "text-gray-200" },
            { label: "New Features", value: featCount, color: "text-cyan-400" },
            { label: "Bug Fixes", value: fixCount, color: "text-red-400" },
            { label: "Contributors", value: data.contributors.length, color: "text-purple-400" },
          ].map((s) => (
            <div key={s.label} className="border border-gray-800 p-3 text-center">
              <div className={`text-2xl font-mono font-bold ${s.color}`}>{s.value}</div>
              <div className="text-xs font-mono text-gray-600 mt-0.5 uppercase tracking-wide">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Filter bar */}
      {data && allTypes.length > 1 && (
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-xs font-mono text-gray-600 uppercase tracking-widest">Filter:</span>
          {["all", ...allTypes].map((t) => {
            const style = TYPE_STYLES[t] ?? TYPE_STYLES.other;
            const active = filter === t;
            return (
              <button
                key={t}
                onClick={() => setFilter(t)}
                className={`px-2.5 py-1 text-xs font-mono border transition-colors ${
                  active
                    ? `${style.color} ${style.bg} border-current`
                    : "text-gray-600 border-gray-800 hover:text-gray-400"
                }`}
              >
                {t === "all" ? "ALL" : (TYPE_STYLES[t]?.label ?? t.toUpperCase())}
              </button>
            );
          })}
          {filter !== "all" && (
            <span className="text-xs font-mono text-gray-600">
              {filtered.length} commit{filtered.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>
      )}

      {/* Commit list */}
      <div className="space-y-2">
        {loading && !data && (
          <div className="border border-gray-800 p-8 text-center">
            <div className="text-xs font-mono text-gray-600 animate-pulse">FETCHING COMMIT HISTORY...</div>
          </div>
        )}

        {error && (
          <div className="border border-red-900 bg-red-950/20 p-4 text-xs font-mono text-red-400">
            ERROR: {error}
          </div>
        )}

        {filtered.map((commit) => {
          const { type, scope, rest } = parseCommit(commit.message);
          const style = TYPE_STYLES[type] ?? TYPE_STYLES.other;
          const isExpanded = expanded === commit.sha;

          return (
            <div
              key={commit.sha}
              className={`border p-3 transition-colors ${style.bg} cursor-pointer hover:brightness-110`}
              onClick={() => setExpanded(isExpanded ? null : commit.sha)}
            >
              <div className="flex items-start gap-3 flex-wrap">
                {/* Type badge */}
                <span className={`text-xs font-mono font-bold shrink-0 w-20 ${style.color}`}>
                  [{style.label}]
                </span>

                {/* Message + scope */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    {scope && (
                      <span className="text-xs font-mono text-gray-500">({scope})</span>
                    )}
                    <span className="text-sm font-mono text-gray-200 leading-tight">{rest}</span>
                  </div>

                  {/* Body (expanded) */}
                  {isExpanded && commit.body && (
                    <div className="mt-2 text-xs font-mono text-gray-500 whitespace-pre-wrap border-l border-gray-700 pl-3 leading-relaxed">
                      {commit.body}
                    </div>
                  )}

                  {/* Meta row */}
                  <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                    <span className="text-xs font-mono text-gray-600 font-bold">{commit.sha}</span>
                    <span className="text-xs font-mono text-gray-700">{commit.author}</span>
                    {commit.date && (
                      <span className="text-xs font-mono text-gray-700" title={formatDate(commit.date)}>
                        {timeAgo(commit.date)}
                      </span>
                    )}
                    <a
                      href={commit.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-xs font-mono text-gray-600 hover:text-cyan-400 transition-colors ml-auto"
                    >
                      View ↗
                    </a>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {data && filtered.length === 0 && !loading && (
          <div className="border border-gray-800 p-6 text-center text-xs font-mono text-gray-600">
            No commits match the selected filter.
          </div>
        )}
      </div>

      {/* Footer note */}
      {data && (
        <div className="text-xs font-mono text-gray-700 text-center pt-2">
          Showing last {data.total} commits · Auto-cached 60s · Add GITHUB_TOKEN to .env.local for higher rate limits
        </div>
      )}
    </div>
  );
}
