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

export function TeamChat() {
  const character = useGameStore((s) => s.character);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput]       = useState("");
  const [sending, setSending]   = useState(false);
  const [error, setError]       = useState("");
  const [cooldown, setCooldown] = useState(0);
  const chatContainerRef        = useRef<HTMLDivElement>(null);

  const fetchMessages = useCallback(async () => {
    const res = await fetch("/api/chat/team");
    if (res.ok) {
      const data = await res.json();
      setMessages(data.data.messages ?? []);
    }
  }, []);

  useEffect(() => {
    if (!character?.teamId) return;
    fetchMessages();
    const id = setInterval(fetchMessages, 5_000);
    return () => clearInterval(id);
  }, [character?.teamId, fetchMessages]);

  useEffect(() => {
    const el = chatContainerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1_000);
    return () => clearInterval(id);
  }, [cooldown]);

  if (!character?.teamId) return null;

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || cooldown > 0 || sending) return;
    setSending(true);
    setError("");
    const res = await fetch("/api/chat/team", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: input.trim() }),
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
    <Card title="Team Telepathy" accent="cyan">
      <div className="space-y-2">
        <p className="text-xs font-mono text-gray-700">Live channel · 1 message / min</p>

        <div ref={chatContainerRef} className="h-48 overflow-y-auto space-y-1 border border-gray-800 bg-gray-950 p-2">
          {messages.length === 0 ? (
            <p className="text-xs font-mono text-gray-800">No transmissions yet.</p>
          ) : (
            messages.map((m) => (
              <div key={m._id} className="flex gap-2 items-start">
                <span
                  className={`text-xs font-mono flex-shrink-0 ${
                    m.characterId === character.id ? "text-cyan-400" : "text-gray-400"
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
            placeholder={cooldown > 0 ? `Cooling down… ${cooldown}s` : "Telepathy message…"}
            className="flex-1 bg-gray-900 border border-gray-700 text-xs font-mono text-gray-200 px-2 py-1 focus:outline-none focus:border-cyan-700 disabled:opacity-50"
          />
          <Button type="submit" size="sm" loading={sending} disabled={!input.trim() || cooldown > 0}>
            {cooldown > 0 ? `${cooldown}s` : "Send"}
          </Button>
        </form>
        {error && <p className="text-xs font-mono text-red-400">{error}</p>}
      </div>
    </Card>
  );
}
