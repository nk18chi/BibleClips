"use server";

import { createServerClient } from "@/lib/supabase/server";

type UserRole = "USER" | "CONTRIBUTOR" | "ADMIN";

type AuthResult = {
  userId: string;
  role: UserRole;
};

/**
 * Server-side authorization check for workspace actions.
 * Throws an error if the user is not authenticated or not authorized.
 */
export async function requireWorkspaceAccess(): Promise<AuthResult> {
  const supabase = createServerClient();

  // Get authenticated user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("Unauthorized: Please log in");
  }

  // Get user role from database
  const { data: profile, error: profileError } = await supabase.from("users").select("role").eq("id", user.id).single();

  if (profileError || !profile) {
    throw new Error("Unauthorized: User profile not found");
  }

  const role = (profile.role as UserRole) || "USER";

  // Check if user has workspace access
  if (role !== "ADMIN" && role !== "CONTRIBUTOR") {
    throw new Error("Forbidden: Workspace access requires CONTRIBUTOR or ADMIN role");
  }

  return { userId: user.id, role };
}

/**
 * Server-side authorization check for admin-only actions.
 */
export async function requireAdminAccess(): Promise<AuthResult> {
  const result = await requireWorkspaceAccess();

  if (result.role !== "ADMIN") {
    throw new Error("Forbidden: This action requires ADMIN role");
  }

  return result;
}
