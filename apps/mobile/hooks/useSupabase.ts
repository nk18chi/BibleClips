import { useContext } from "react";
import { SupabaseContext } from "@/components/providers/SupabaseProvider";

export function useSupabase() {
  return useContext(SupabaseContext);
}
