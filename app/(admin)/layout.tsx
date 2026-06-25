import { Navbar } from "@/components/game/Navbar";
import { DemoBanner } from "@/components/game/DemoBanner";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-gray-950">
      <DemoBanner />
      <Navbar />
      <div className="flex-1 flex">
        <aside className="w-48 border-r border-gray-800 p-4 space-y-1">
          <div className="text-xs font-mono text-red-600 uppercase tracking-widest mb-3">Admin Panel</div>
          {[
            { label: "Overview",  href: "/admin" },
            { label: "Users",     href: "/admin/users" },
            { label: "Missions",  href: "/admin/missions" },
            { label: "Guilds",    href: "/admin/guilds" },
            { label: "Teams",     href: "/admin/teams" },
          ].map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="block text-xs font-mono text-gray-500 hover:text-gray-200 py-1.5 px-2 hover:bg-gray-900 transition-colors"
            >
              {link.label}
            </a>
          ))}
        </aside>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
