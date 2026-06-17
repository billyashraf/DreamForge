interface StatBarProps {
  label: string;
  value: number;
  max: number;
  color?: "cyan" | "red" | "green" | "yellow" | "orange" | "purple";
}

const colors = {
  cyan:   "bg-cyan-500",
  red:    "bg-red-500",
  green:  "bg-green-500",
  yellow: "bg-yellow-500",
  orange: "bg-orange-500",
  purple: "bg-purple-500",
};

export function StatBar({ label, value, max, color = "cyan" }: StatBarProps) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));

  return (
    <div className="flex items-center gap-3">
      <span className="w-16 text-xs font-mono text-gray-500 uppercase">{label}</span>
      <div className="flex-1 h-1.5 bg-gray-800 overflow-hidden">
        <div
          className={`h-full ${colors[color]} transition-all duration-500`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-16 text-xs font-mono text-gray-400 text-right">
        {value}/{max}
      </span>
    </div>
  );
}
