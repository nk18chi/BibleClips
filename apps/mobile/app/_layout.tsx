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
        <Stack
          screenOptions={{
            headerShown: false,
          }}
        >
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen
            name="verse/[ref]"
            options={{
              headerShown: true,
              headerTitle: "Verse",
              headerStyle: { backgroundColor: "#000" },
              headerTintColor: "#fff",
            }}
          />
          <Stack.Screen
            name="category/[slug]"
            options={{
              headerShown: true,
              headerTitle: "Category",
              headerStyle: { backgroundColor: "#000" },
              headerTintColor: "#fff",
            }}
          />
          <Stack.Screen
            name="clip/[id]"
            options={{
              headerShown: true,
              headerTitle: "Clip",
              headerStyle: { backgroundColor: "#000" },
              headerTintColor: "#fff",
            }}
          />
        </Stack>
      </SupabaseProvider>
    </LanguageProvider>
  );
}
