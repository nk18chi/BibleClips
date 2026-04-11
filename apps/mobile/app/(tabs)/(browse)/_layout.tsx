import { Stack } from "expo-router";

export default function BrowseLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: "#000" },
        headerTintColor: "#fff",
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false, title: "Browse" }} />
      <Stack.Screen name="verse/[ref]" options={{ headerTitle: "Verse" }} />
      <Stack.Screen name="category/[slug]" options={{ headerTitle: "Category" }} />
      <Stack.Screen name="clip/[id]" options={{ headerTitle: "Clip" }} />
    </Stack>
  );
}
