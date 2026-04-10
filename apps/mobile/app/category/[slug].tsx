import { useLocalSearchParams } from "expo-router";
import { FilteredReelScreen } from "@/components/FilteredReelScreen";

export default function CategoryReelScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  return <FilteredReelScreen options={{ categorySlug: slug }} emptyMessage="No clips in this category" />;
}
