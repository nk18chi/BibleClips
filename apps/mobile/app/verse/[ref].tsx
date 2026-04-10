import { useLocalSearchParams } from "expo-router";
import { FilteredReelScreen } from "@/components/FilteredReelScreen";

export default function VerseReelScreen() {
  const { ref } = useLocalSearchParams<{ ref: string }>();
  return <FilteredReelScreen options={{ verse: ref }} emptyMessage="No clips for this verse" />;
}
