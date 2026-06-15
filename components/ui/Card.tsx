import { ReactNode } from "react";

interface CardProps {
  title?: string;
  children: ReactNode;
  className?: string;
  accent?: "cyan" | "yellow" | "red" | "green" | "purple";
}

const accentColors = {
  cyan: "border-l-cyan-500",
  yellow: "border-l-yellow-500",
  red: "border-l-red-500",
  green: "border-l-green-500",
  purple: "border-l-purple-500",
};

export function Card({ title, children, className = "", accent }: CardProps) {
  return (
    <div
      className={`
        bg-gray-950 border border-gray-800
        ${accent ? `border-l-2 ${accentColors[accent]}` : ""}
        p-4 ${className}
      `}
    >
      {title && (
        <h3 className="text-xs font-mono text-gray-500 uppercase tracking-widest mb-3 border-b border-gray-800 pb-2">
          {title}
        </h3>
      )}
      {children}
    </div>
  );
}
