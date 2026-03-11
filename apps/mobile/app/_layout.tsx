import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SupabaseProvider } from "@/components/providers/SupabaseProvider";

export default function RootLayout() {
  return (
    <SupabaseProvider>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
      </Stack>
    </SupabaseProvider>
  );
}
