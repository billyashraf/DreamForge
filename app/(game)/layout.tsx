import { Navbar } from "@/components/game/Navbar";

export default function GameLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-gray-950">
      <Navbar />
      <main className="flex-1 p-4 max-w-7xl mx-auto w-full">
        {children}
      </main>
    </div>
  );
}
