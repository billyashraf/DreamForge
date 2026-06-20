"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useGameStore } from "@/store/useGameStore";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

interface ChatMsg {
  _id: string;
  characterId: string;
  characterName: string;
  content: string;
  createdAt: string;
}

interface GuildTab {
  _id: string;
  name: string;
  tag: string;
}

export function GuildChat() {
  const character = useGameStore((s) => s.character);
  const [guilds, setGuilds]         = useState<GuildTab[]>([]);
  const [activeGuild, setActiveGuild] = useState<string | null>(null);
  const [messages, setMessages]     = useState<ChatMsg[]>([]);
  const [input, setInput]           = useState("");
  const [sending, setSending]       = useState(false);
  const [error, setError]           = useState("");
  const [cooldown, setCooldown]     = useState(0);
  const chatContainerRef            = useRef<HTMLDivElement>(null);

  // Load guild names once
  useEffect(() => {
    if (!character?.guildIds?.length) return;
    fetch("/api/guilds/mine").then(async (r) => {
      if (!r.ok) return;
      const data = await r.json();
      const list: GuildTab[] = data.data.guilds ?? [];
      setGuilds(list);
      if (!activeGuild && list.length > 0) setActiveGuild(list[0]._id);
    });
  // run once when guildIds change
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [character?.guildIds?.join(",")]);

  const fetchMessages = useCallback(async () => {
    if (!activeGuild) return;
    const res = await fetch(`/api/chat/guild?guildId=${activeGuild}`);
    if (res.ok) {
      const data = await res.json();
      setMessages(data.data.messages ?? []);
    }
  }, [activeGuild]);

  useEffect(() => {
    if (!activeGuild) return;
    fetchMessages();
    const id = setInterval(fetchMessages, 5_000);
    return () => clearInterval(id);
  }, [activeGuild, fetchMessages]);

  useEffect(() => {
    const el = chatContainerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1_000);
    return () => clearInterval(id);
  }, [cooldown]);

  if (!character?.guildIds?.length) return null;

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || cooldown > 0 || sending || !activeGuild) return;
    setSending(true);
    setError("");
    const res = await fetch("/api/chat/guild", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: input.trim(), guildId: activeGuild }),
    });
    const data = await res.json();
    if (res.ok) {
      setInput("");
      setCooldown(60);
      fetchMessages();
    } else {
      setError(data.error);
      const match = data.error?.match(/wait (\d+)s/);
      if (match) setCooldown(parseInt(match[1]));
    }
    setSending(false);
  }

  return (
    <Card title="Guild Echo" accent="purple">
      <div className="space-y-2">
        {/* Guild tabs — only if in multiple guilds */}
        {guilds.length > 1 && (
          <div className="flex gap-1 flex-wrap">
            {guilds.map((g) => (
              <button
                key={g._id}
                onClick={() => setActiveGuild(g._id)}
                className={`text-xs font-mono px-2 py-1 border transition-colors ${
                  activeGuild === g._id
                    ? "border-purple-700 text-purple-400 bg-purple-950"
                    : "border-gray-800 text-gray-600 hover:text-gray-400"
                }`}
              >
                [{g.tag}]
              </button>
            ))}
          </div>
        )}
        {guilds.length === 1 && (
          <p className="text-xs font-mono text-gray-700">
            [{guilds[0].tag}] {guilds[0].name} · Live echo · 1 message / min
          </p>
        )}
        {guilds.length > 1 && (
          <p className="text-xs font-mono text-gray-700">Live echo · 1 message / min</p>
        )}

        <div ref={chatContainerRef} className="h-48 overflow-y-auto space-y-1 border border-gray-800 bg-gray-950 p-2">
          {messages.length === 0 ? (
            <p className="text-xs font-mono text-gray-800">No echoes yet.</p>
          ) : (
            messages.map((m) => (
              <div key={m._id} className="flex gap-2 items-start">
                <span
                  className={`text-xs font-mono flex-shrink-0 ${
                    m.characterId === character.id ? "text-purple-400" : "text-gray-400"
                  }`}
                >
                  {m.characterName}:
                </span>
                <span className="text-xs font-mono text-gray-300 break-words">{m.content}</span>
              </div>
            ))
          )}
        </div>

        <form onSubmit={send} className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            maxLength={300}
            disabled={cooldown > 0 || sending}
            placeholder={cooldown > 0 ? `Cooling down… ${cooldown}s` : "Echo message…"}
            className="flex-1 bg-gray-900 border border-gray-700 text-xs font-mono text-gray-200 px-2 py-1 focus:outline-none focus:border-purple-700 disabled:opacity-50"
          />
          <Button type="submit" size="sm" loading={sending} disabled={!input.trim() || cooldown > 0}>
            {cooldown > 0 ? `${cooldown}s` : "Echo"}
          </Button>
        </form>
        {error && <p className="text-xs font-mono text-red-400">{error}</p>}
      </div>
    </Card>
  );
}
