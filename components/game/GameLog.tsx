"use client";

import { useGameStore } from "@/store/useGameStore";

const typeColors = {
  info: "text-gray-400",
  success: "text-green-400",
  warning: "text-yellow-400",
  error: "text-red-400",
  narrative: "text-cyan-300",
};

const typePrefixes = {
  info: ">",
  success: "✓",
  warning: "!",
  error: "✗",
  narrative: "»",
};

export function GameLog() {
  const logs = useGameStore((s) => s.logs);
  const clearLogs = useGameStore((s) => s.clearLogs);

  return (
    <div className="bg-gray-950 border border-gray-800 flex flex-col h-64">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-gray-800">
        <span className="text-xs font-mono text-gray-600 uppercase tracking-widest">Activity Log</span>
        <button onClick={clearLogs} className="text-xs font-mono text-gray-700 hover:text-gray-500 transition-colors">
          CLEAR
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-1 font-mono text-sm flex flex-col-reverse">
        {logs.length === 0 ? (
          <p className="text-gray-700 text-xs">No activity yet. Explore Metapolis to begin.</p>
        ) : (
          logs.map((log) => (
            <div key={log.id} className={`flex gap-2 ${typeColors[log.type]}`}>
              <span className="shrink-0 w-4 text-center">{typePrefixes[log.type]}</span>
              <span className="leading-relaxed">{log.message}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
