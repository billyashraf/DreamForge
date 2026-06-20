"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

interface OwlMessage {
  _id: string;
  fromCharacterId: string;
  fromName: string;
  toCharacterId: string;
  toName: string;
  content: string;
  sentAt: string;
  deliveredAt: string;
  read: boolean;
}

interface CharacterResult {
  _id: string;
  name: string;
  level: number;
  shadowForm: string | null;
}

type Tab = "inbox" | "sent" | "compose";

export function OwlInbox() {
  const [inbox, setInbox]               = useState<OwlMessage[]>([]);
  const [sent, setSent]                 = useState<OwlMessage[]>([]);
  const [owlReturnAt, setOwlReturnAt]   = useState<string | null>(null);
  const [tab, setTab]                   = useState<Tab>("inbox");
  const [now, setNow]                   = useState(() => Date.now());

  // Compose
  const [search, setSearch]             = useState("");
  const [results, setResults]           = useState<CharacterResult[]>([]);
  const [selected, setSelected]         = useState<CharacterResult | null>(null);
  const [content, setContent]           = useState("");
  const [sending, setSending]           = useState(false);
  const [sendError, setSendError]       = useState("");

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1_000);
    return () => clearInterval(id);
  }, []);

  const fetchInbox = useCallback(async () => {
    const res = await fetch("/api/owl/inbox");
    if (!res.ok) return;
    const data = await res.json();
    setInbox(data.data.inbox ?? []);
    setSent(data.data.sent ?? []);
    setOwlReturnAt(data.data.owlReturnAt ?? null);
  }, []);

  useEffect(() => {
    fetchInbox();
    const id = setInterval(fetchInbox, 30_000);
    return () => clearInterval(id);
  }, [fetchInbox]);

  // Character search with 300ms debounce
  useEffect(() => {
    if (!search.trim() || search.trim().length < 2 || selected) {
      if (!selected) setResults([]);
      return;
    }
    const t = setTimeout(async () => {
      const res = await fetch(`/api/characters?q=${encodeURIComponent(search.trim())}`);
      if (res.ok) {
        const data = await res.json();
        setResults(data.data.characters ?? []);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [search, selected]);

  const owlAvailable = !owlReturnAt || new Date(owlReturnAt).getTime() <= now;
  const owlMsLeft    = owlReturnAt ? Math.max(0, new Date(owlReturnAt).getTime() - now) : 0;
  const owlMins      = Math.floor(owlMsLeft / 60_000);
  const owlSecs      = Math.floor((owlMsLeft % 60_000) / 1_000);

  const unread = inbox.filter((m) => !m.read).length;

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!selected || !content.trim() || !owlAvailable) return;
    setSending(true);
    setSendError("");
    const res = await fetch("/api/owl/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ toCharacterId: selected._id, content: content.trim() }),
    });
    const data = await res.json();
    if (res.ok) {
      setOwlReturnAt(data.data.owlReturnAt);
      setContent("");
      setSelected(null);
      setSearch("");
      setResults([]);
      setTab("sent");
      fetchInbox();
    } else {
      setSendError(data.error);
    }
    setSending(false);
  }

  return (
    <Card title="Shadow Owl" accent="purple">
      {/* Owl status */}
      <div className="flex items-center gap-2 mb-3">
        <span className={`text-xs font-mono font-bold ${owlAvailable ? "text-green-500" : "text-yellow-500"}`}>
          {owlAvailable ? "◈ OWL AVAILABLE" : `◈ IN FLIGHT  ${owlMins}m ${owlSecs}s`}
        </span>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-3">
        {(["inbox", "sent", "compose"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`text-xs font-mono px-2 py-1 border transition-colors ${
              tab === t
                ? "border-purple-700 text-purple-400 bg-purple-950"
                : "border-gray-800 text-gray-600 hover:text-gray-400"
            }`}
          >
            {t === "inbox" ? `INBOX${unread > 0 ? ` (${unread})` : ""}` : t.toUpperCase()}
          </button>
        ))}
      </div>

      {/* INBOX */}
      {tab === "inbox" && (
        <div className="space-y-2">
          {inbox.length === 0 ? (
            <p className="text-xs font-mono text-gray-700">No messages delivered yet.</p>
          ) : (
            inbox.map((m) => (
              <div key={m._id} className="border border-gray-800 bg-gray-900 p-2 space-y-1">
                <div className="flex justify-between items-baseline">
                  <Link
                    href={`/profile/${m.fromCharacterId}`}
                    className="text-xs font-mono text-cyan-400 hover:underline"
                  >
                    {m.fromName}
                  </Link>
                  <span className="text-xs font-mono text-gray-700">
                    {new Date(m.deliveredAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
                <p className="text-xs font-mono text-gray-300 leading-relaxed whitespace-pre-wrap">{m.content}</p>
              </div>
            ))
          )}
        </div>
      )}

      {/* SENT */}
      {tab === "sent" && (
        <div className="space-y-2">
          {sent.length === 0 ? (
            <p className="text-xs font-mono text-gray-700">No sent messages.</p>
          ) : (
            sent.map((m) => {
              const delivered = new Date(m.deliveredAt).getTime() <= now;
              const msLeft = !delivered ? new Date(m.deliveredAt).getTime() - now : 0;
              const mLeft = Math.floor(msLeft / 60_000);
              const sLeft = Math.floor((msLeft % 60_000) / 1_000);
              return (
                <div key={m._id} className="border border-gray-800 bg-gray-900 p-2 space-y-1">
                  <div className="flex justify-between items-baseline">
                    <Link
                      href={`/profile/${m.toCharacterId}`}
                      className="text-xs font-mono text-gray-400 hover:underline"
                    >
                      → {m.toName}
                    </Link>
                    <span className={`text-xs font-mono ${delivered ? "text-green-600" : "text-yellow-600"}`}>
                      {delivered ? "delivered" : `in flight ${mLeft}m ${sLeft}s`}
                    </span>
                  </div>
                  <p className="text-xs font-mono text-gray-500 leading-relaxed whitespace-pre-wrap">{m.content}</p>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* COMPOSE */}
      {tab === "compose" && (
        <form onSubmit={handleSend} className="space-y-3">
          {!owlAvailable && (
            <p className="text-xs font-mono text-yellow-700">
              Owl returns in {owlMins}m {owlSecs}s — compose now and send when ready.
            </p>
          )}

          {/* Recipient search */}
          <div className="relative">
            <Input
              label="Recipient"
              value={selected ? selected.name : search}
              onChange={(e) => {
                setSearch(e.target.value);
                setSelected(null);
              }}
              placeholder="Type a character name..."
            />
            {results.length > 0 && !selected && (
              <div className="absolute z-10 w-full mt-1 bg-gray-900 border border-gray-700 shadow-lg">
                {results.map((c) => (
                  <button
                    key={c._id}
                    type="button"
                    className="w-full text-left px-3 py-2 text-xs font-mono text-gray-300 hover:bg-gray-800 flex justify-between"
                    onClick={() => { setSelected(c); setSearch(c.name); setResults([]); }}
                  >
                    <span>{c.name}</span>
                    <span className="text-gray-600">LVL {c.level}</span>
                  </button>
                ))}
              </div>
            )}
            {selected && (
              <button
                type="button"
                className="mt-1 text-xs font-mono text-gray-600 hover:text-red-400"
                onClick={() => { setSelected(null); setSearch(""); }}
              >
                ✕ clear recipient
              </button>
            )}
          </div>

          {/* Message body */}
          <div>
            <label className="block text-xs font-mono text-gray-500 mb-1">Message</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              maxLength={500}
              rows={4}
              className="w-full bg-gray-900 border border-gray-700 text-xs font-mono text-gray-200 p-2 resize-none focus:outline-none focus:border-purple-700"
              placeholder="Write your message..."
            />
            <div className="text-right text-xs font-mono text-gray-700">{content.length}/500</div>
          </div>

          {sendError && <p className="text-xs font-mono text-red-400">ERROR: {sendError}</p>}

          <Button
            type="submit"
            loading={sending}
            disabled={!selected || !content.trim() || !owlAvailable}
          >
            {owlAvailable ? "Dispatch Owl" : `Owl returns in ${owlMins}m ${owlSecs}s`}
          </Button>
        </form>
      )}
    </Card>
  );
}
