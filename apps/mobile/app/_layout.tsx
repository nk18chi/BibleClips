import "react-native-gesture-handler";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { LanguageProvider } from "@/components/providers/LanguageProvider";
import { SupabaseProvider } from "@/components/providers/SupabaseProvider";

export default function RootLayout() {
  return (
    <LanguageProvider>
      <SupabaseProvider>
        <StatusBar style="light" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="(auth)" />
        </Stack>
      </SupabaseProvider>
    </LanguageProvider>
  );
}
