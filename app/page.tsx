import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-6">
      <div className="max-w-2xl w-full space-y-8 text-center">
        <div className="space-y-2">
          <div className="text-xs font-mono text-gray-600 uppercase tracking-widest">
            Text-Based MMORPG &middot; Moon &middot; Earth &middot; Mars
          </div>
          <h1 className="text-5xl font-mono font-bold tracking-tight">
            <span className="text-cyan-400">DREAME</span>
            <span className="text-gray-500">FORGE</span>
          </h1>
          <p className="text-gray-500 font-mono text-sm mt-4 leading-relaxed">
            Build your legend across three worlds.<br />
            Survive the Moon Junkyard. Explore post-apocalyptic Earth.<br />
            Dominate the Mars Battle Royale.
          </p>
        </div>

        <div className="border border-gray-800 p-6 text-left space-y-2 font-mono text-sm">
          <div className="text-gray-600 text-xs uppercase tracking-widest mb-4">System Status</div>
          <div className="flex justify-between text-gray-400">
            <span>Server</span><span className="text-green-400">ONLINE</span>
          </div>
          <div className="flex justify-between text-gray-400">
            <span>World</span><span className="text-cyan-400">Metapolis &middot; Active</span>
          </div>
          <div className="flex justify-between text-gray-400">
            <span>Mars Tournament</span><span className="text-yellow-400">Season 1</span>
          </div>
        </div>

        <div className="flex gap-4 justify-center">
          <Link
            href="/register"
            className="px-8 py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-mono text-sm transition-colors border border-cyan-500"
          >
            CREATE ACCOUNT
          </Link>
          <Link
            href="/login"
            className="px-8 py-3 bg-gray-900 hover:bg-gray-800 text-gray-300 font-mono text-sm transition-colors border border-gray-700"
          >
            LOGIN
          </Link>
        </div>

        <div className="grid grid-cols-3 gap-4 text-left">
          {[
            { world: "Moon", tag: "Home Base", desc: "Train, trade, and take missions in Metapolis." },
            { world: "Earth", tag: "Exploration", desc: "Story missions in the apocalyptic wasteland." },
            { world: "Mars", tag: "PvP & Guilds", desc: "Battle royale and guild territory wars." },
          ].map((w) => (
            <div key={w.world} className="border border-gray-800 p-3">
              <div className="text-xs font-mono text-gray-600 uppercase">{w.tag}</div>
              <div className="text-sm font-mono text-gray-200 mt-1">{w.world}</div>
              <p className="text-xs text-gray-600 mt-1 leading-relaxed">{w.desc}</p>
            </div>
          ))}
        </div>

        <p className="text-gray-700 font-mono text-xs">
          &copy; {new Date().getFullYear()} DreameForge. All rights reserved.
        </p>
      </div>
    </main>
  );
}
