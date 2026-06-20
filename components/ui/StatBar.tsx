interface StatBarProps {
  label: string;
  value: number;
  max: number;
  color?: "cyan" | "red" | "green" | "yellow" | "orange" | "purple";
  /** When true, overlays a pulsing green tint to indicate poison */
  flash?: boolean;
}

const colors = {
  cyan:   "bg-cyan-500",
  red:    "bg-red-500",
  green:  "bg-green-500",
  yellow: "bg-yellow-500",
  orange: "bg-orange-500",
  purple: "bg-purple-500",
};

export function StatBar({ label, value, max, color = "cyan", flash = false }: StatBarProps) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));

  return (
    <div className="flex items-center gap-3">
      <span className="w-16 text-xs font-mono text-gray-500 uppercase">{label}</span>
      <div className="relative flex-1 h-1.5 bg-gray-800 overflow-hidden">
        <div
          className={`h-full ${colors[color]} transition-all duration-300`}
          style={{ width: `${pct}%` }}
        />
        {flash && (
          <div
            className="absolute inset-y-0 left-0 bg-green-400/60 animate-pulse"
            style={{ width: `${pct}%`, animationDuration: "0.5s" }}
          />
        )}
      </div>
      <span className="w-16 text-xs font-mono text-gray-400 text-right">
        {Math.round(value)}/{max}
      </span>
    </div>
  );
}
