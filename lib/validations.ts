import { z } from "zod";

export const registerSchema = z.object({
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(20, "Username must be at most 20 characters")
    .regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores"),
  email: z.string().email("Invalid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const characterCreateSchema = z.object({
  name: z
    .string()
    .min(2, "Character name must be at least 2 characters")
    .max(20, "Character name must be at most 20 characters")
    .regex(/^[a-zA-Z0-9 _-]+$/, "Invalid character name"),
});

export const guildCreateSchema = z.object({
  name: z.string().min(3).max(30),
  tag: z
    .string()
    .min(2)
    .max(5)
    .regex(/^[A-Za-z0-9]+$/, "Tag must be alphanumeric"),
  description: z.string().max(500).optional(),
});

export const teamCreateSchema = z.object({
  name: z.string().min(2).max(30),
  maxSize: z.number().int().min(2).max(6).optional(),
  activity: z.string().max(100).optional(),
});

export const missionSchema = z.object({
  title: z.string().min(3).max(100),
  location: z.enum(["metapolis", "moon_junkyard", "earth", "mars"]),
  description: z.string().min(10).max(1000),
  narrative: z.string().max(2000).optional(),
  difficulty: z.enum(["easy", "medium", "hard", "legendary"]),
  type: z.enum(["solo", "team", "guild"]),
  rewards: z.object({
    experience: z.number().int().min(0),
    credits: z.number().int().min(0),
    merits: z.number().int().min(0).optional().default(0),
  }),
  requirements: z
    .object({
      level: z.number().int().min(1).optional(),
      strength: z.number().int().optional(),
      intelligence: z.number().int().optional(),
      agility: z.number().int().optional(),
    })
    .optional(),
  durationMinutes: z.number().int().min(1).max(1440),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CharacterCreateInput = z.infer<typeof characterCreateSchema>;
export type GuildCreateInput = z.infer<typeof guildCreateSchema>;
export type TeamCreateInput = z.infer<typeof teamCreateSchema>;
export type MissionInput = z.infer<typeof missionSchema>;
