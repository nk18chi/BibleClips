import { z } from "zod";

export const userRoleSchema = z.enum(["USER", "ADMIN"]);

export type UserRole = z.infer<typeof userRoleSchema>;

export const preferredLanguageSchema = z.enum(["en", "ja"]);

export type PreferredLanguage = z.infer<typeof preferredLanguageSchema>;

export const userProfileSchema = z.object({
  displayName: z.string().min(1).max(100).optional(),
  preferredLanguage: preferredLanguageSchema.default("en"),
});

export type UserProfile = z.infer<typeof userProfileSchema>;

export const userProfileUpdateSchema = userProfileSchema.partial();
