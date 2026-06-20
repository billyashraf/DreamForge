import { create } from "zustand";

export interface InvItem {
  itemKey: string;
  name: string;
  quantity: number;
  effect: string | null;
  effectValue: number;
  cooldownMinutes: number;
  consumeTimeMinutes: number;
  description: string;
  rarity: string;
}

export interface ItemCooldown {
  itemKey: string;
  expiresAt: string;
}

interface CharacterState {
  id: string;
  name: string;
  level: number;
  experience: number;
  health: number;
  maxHealth: number;
  energy: number;
  maxEnergy: number;
  credits: number;
  strength: number;
  intelligence: number;
  agility: number;
  skills: {
    combat: number;
    scavenging: number;
    survival: number;
    strategy: number;
    crafting: number;
  };
  currentLocation: string;
  guildId?: string | null;
  teamId?: string | null;
  lastEnergyRegen?: string | null;
  pain?: number;
  maxPain?: number;
  madness?: number;
  lastPainUpdate?: string | null;
  shadowForm?: string | null;
  merits?: number;
}

interface UserState {
  id: string;
  username: string;
  email: string;
  role: string;
}

interface GameLog {
  id: string;
  message: string;
  type: "info" | "success" | "warning" | "error" | "narrative";
  timestamp: Date;
}

interface GameStore {
  user: UserState | null;
  character: CharacterState | null;
  logs: GameLog[];
  isLoading: boolean;

  setUser: (user: UserState | null) => void;
  setCharacter: (character: CharacterState | null) => void;
  updateCharacter: (updates: Partial<CharacterState>) => void;
  addLog: (message: string, type?: GameLog["type"]) => void;
  clearLogs: () => void;
  setLoading: (loading: boolean) => void;
  reset: () => void;
}

export const useGameStore = create<GameStore>((set) => ({
  user: null,
  character: null,
  logs: [],
  isLoading: false,

  setUser: (user) => set({ user }),
  setCharacter: (character) => set({ character }),
  updateCharacter: (updates) =>
    set((state) => ({
      character: state.character ? { ...state.character, ...updates } : null,
    })),

  addLog: (message, type = "info") =>
    set((state) => ({
      logs: [
        { id: Math.random().toString(36).slice(2), message, type, timestamp: new Date() },
        ...state.logs.slice(0, 99),
      ],
    })),

  clearLogs: () => set({ logs: [] }),
  setLoading: (isLoading) => set({ isLoading }),
  reset: () => set({ user: null, character: null, logs: [] }),
}));
