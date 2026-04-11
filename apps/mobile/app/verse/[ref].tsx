import { Stack, useLocalSearchParams } from "expo-router";
import { FilteredReelScreen } from "@/components/FilteredReelScreen";

export default function VerseReelScreen() {
  const { ref } = useLocalSearchParams<{ ref: string }>();
  const title = ref?.replace(/-/g, " ").replace(/(\d+):/, " $1:") ?? "Verse";

  return (
    <>
      <Stack.Screen options={{ headerTitle: title }} />
      <FilteredReelScreen options={{ verse: ref }} emptyMessage="No clips for this verse" />
    </>
  );
}
