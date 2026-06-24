"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useGameStore } from "@/store/useGameStore";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

interface Member {
  _id: string;
  name: string;
  level: number;
  shadowForm: string | null;
  isLeader: boolean;
}

interface Application {
  characterId: string;
  name: string;
  level: number;
  shadowForm: string | null;
  message: string;
  appliedAt: string;
}

interface TeamInfo {
  _id: string;
  name: string;
  activity: string;
  maxSize: number;
  isOpen: boolean;
  leaderId: string;
  createdAt: string;
}

function safeJson(res: Response) {
  return res.json().catch(() => ({ data: {}, error: "Server error" }));
}

const SHADOW_FORMS: Record<string, string> = {
  saber: "⚔",
  lancer: "◭",
  rider: "◉",
  caster: "✦",
  berserker: "◈",
  archer: "◎",
  assassin: "◆",
  demon: "☠",
};

export default function TeamProfilePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user, setUser, setCharacter } = useGameStore();

  const [team, setTeam] = useState<TeamInfo | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [isMember, setIsMember] = useState(false);
  const [isLeader, setIsLeader] = useState(false);
  const [hasApplied, setHasApplied] = useState(false);
  const [viewerCharId, setViewerCharId] = useState("");

  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const [kickingId, setKickingId] = useState<string | null>(null);
  const [leaving, setLeaving] = useState(false);
  const [disbanding, setDisbanding] = useState(false);
  const [appsLoaded, setAppsLoaded] = useState(false);
  const [processingAppId, setProcessingAppId] = useState<string | null>(null);

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

  const fetchTeam = useCallback(async () => {
    const res = await fetch(`/api/teams/${id}`);
    const data = await safeJson(res);
    if (!res.ok) { setLoading(false); setMsg({ text: data.error ?? "Not found", ok: false }); return; }
    const d = data.data;
    setTeam(d.team);
    setMembers(d.members ?? []);
    setIsMember(d.isMember);
    setIsLeader(d.isLeader);
    setHasApplied(d.hasApplied);
    setViewerCharId(d.viewerCharId ?? "");
    setLoading(false);
  }, [id]);

  const fetchApplications = useCallback(async () => {
    if (!isLeader) return;
    const res = await fetch(`/api/teams/${id}/applications`);
    const data = await safeJson(res);
    if (res.ok) { setApplications(data.data.applications ?? []); setAppsLoaded(true); }
  }, [id, isLeader]);

  useEffect(() => { fetchTeam(); }, [fetchTeam]);
  useEffect(() => { if (isLeader) fetchApplications(); }, [isLeader, fetchApplications]);

  async function kickMember(memberId: string, name: string) {
    if (!confirm(`Kick ${name} from the team?`)) return;
    setKickingId(memberId);
    setMembers((prev) => prev.filter((m) => m._id !== memberId));
    const res = await fetch(`/api/teams/${id}/kick`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memberId }),
    });
    const data = await safeJson(res);
    if (!res.ok) { fetchTeam(); setMsg({ text: data.error ?? "Error", ok: false }); }
    else setMsg({ text: data.data?.message ?? "Kicked", ok: true });
    setKickingId(null);
  }

  async function leaveTeam() {
    if (!confirm("Leave this team?")) return;
    setLeaving(true);
    const res = await fetch(`/api/teams/${id}/leave`, { method: "POST" });
    const data = await safeJson(res);
    if (res.ok) { router.push("/teams"); }
    else setMsg({ text: data.error ?? "Error", ok: false });
    setLeaving(false);
  }

  async function disbandTeam() {
    if (!confirm(`Disband team "${team?.name}"? This cannot be undone.`)) return;
    setDisbanding(true);
    const res = await fetch(`/api/teams/${id}`, { method: "DELETE" });
    const data = await safeJson(res);
    if (res.ok) { router.push("/teams"); }
    else setMsg({ text: data.error ?? "Error", ok: false });
    setDisbanding(false);
  }

  async function handleApplication(characterId: string, action: "accept" | "reject") {
    setProcessingAppId(characterId + action);
    const res = await fetch(`/api/teams/${id}/applications`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ characterId, action }),
    });
    const data = await safeJson(res);
    setMsg({ text: data.data?.message ?? data.error ?? "Error", ok: res.ok });
    if (res.ok) {
      setApplications((prev) => prev.filter((a) => a.characterId !== characterId));
      if (action === "accept") fetchTeam();
    }
    setProcessingAppId(null);
  }

  if (loading) return <p className="text-xs font-mono text-gray-600">Loading team...</p>;
  if (!team) return <p className="text-xs font-mono text-red-400">Team not found.</p>;

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <button onClick={() => router.back()} className="text-xs font-mono text-gray-600 hover:text-gray-400 mb-2 block">← Back</button>
          <h1 className="text-2xl font-mono font-bold text-gray-100">{team.name}</h1>
          <p className="text-xs font-mono text-gray-500 mt-1">
            {members.length}/{team.maxSize} members · {team.activity}
            {!team.isOpen && <span className="ml-2 text-red-500">[CLOSED]</span>}
          </p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          {isLeader && (
            <Button size="sm" variant="ghost" onClick={disbandTeam} loading={disbanding}>
              Disband
            </Button>
          )}
          {isMember && !isLeader && (
            <Button size="sm" variant="ghost" onClick={leaveTeam} loading={leaving}>
              Leave Team
            </Button>
          )}
        </div>
      </div>

      {msg && (
        <div className={`text-xs font-mono px-3 py-2 border ${msg.ok ? "border-cyan-700 text-cyan-300 bg-cyan-950" : "border-red-700 text-red-300 bg-red-950"}`}>
          {msg.text}
          <button onClick={() => setMsg(null)} className="ml-3 text-gray-500 hover:text-gray-300">×</button>
        </div>
      )}

      {/* Members */}
      <Card title={`Members — ${members.length}/${team.maxSize}`} accent="cyan">
        <div className="space-y-1">
          {members.map((m) => (
            <div key={m._id} className="flex items-center justify-between py-1.5 border-b border-gray-800 last:border-0">
              <div className="flex items-center gap-3">
                <span className={`text-sm font-mono ${m.isLeader ? "text-cyan-400 font-bold" : "text-gray-200"}`}>
                  {m.isLeader ? "⊛" : "○"} {m.name}
                </span>
                <span className="text-xs font-mono text-gray-600">LVL {m.level}</span>
                {m.shadowForm && (
                  <span className="text-xs font-mono text-purple-400" title={m.shadowForm}>
                    {SHADOW_FORMS[m.shadowForm] ?? "◆"} {m.shadowForm}
                  </span>
                )}
                {m._id === viewerCharId && <span className="text-xs font-mono text-cyan-600">[you]</span>}
              </div>
              {isLeader && !m.isLeader && (
                <Button
                  size="sm"
                  variant="ghost"
                  loading={kickingId === m._id}
                  onClick={() => kickMember(m._id, m.name)}
                >
                  Kick
                </Button>
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* Applications (leader only) */}
      {isLeader && (
        <Card title={`Applications${appsLoaded ? ` — ${applications.length}` : ""}`} accent="purple">
          {!appsLoaded ? (
            <p className="text-xs font-mono text-gray-600">Loading applications...</p>
          ) : applications.length === 0 ? (
            <p className="text-xs font-mono text-gray-600">No pending applications.</p>
          ) : (
            <div className="space-y-3">
              {applications.map((a) => (
                <div key={a.characterId} className="border border-gray-800 p-3 space-y-2">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-mono text-gray-200">{a.name}</span>
                      <span className="text-xs font-mono text-gray-600">LVL {a.level}</span>
                      {a.shadowForm && (
                        <span className="text-xs font-mono text-purple-400">{SHADOW_FORMS[a.shadowForm] ?? "◆"} {a.shadowForm}</span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        loading={processingAppId === a.characterId + "accept"}
                        onClick={() => handleApplication(a.characterId, "accept")}
                      >
                        Accept
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        loading={processingAppId === a.characterId + "reject"}
                        onClick={() => handleApplication(a.characterId, "reject")}
                      >
                        Reject
                      </Button>
                    </div>
                  </div>
                  {a.message && (
                    <p className="text-xs font-mono text-gray-500 italic">"{a.message}"</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Applied notice */}
      {!isMember && hasApplied && (
        <div className="text-xs font-mono text-yellow-400 border border-yellow-800 bg-yellow-950 px-3 py-2">
          Your application is pending review by the team leader.
        </div>
      )}
    </div>
  );
}
