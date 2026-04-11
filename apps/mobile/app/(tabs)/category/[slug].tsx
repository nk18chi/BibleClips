import { Stack, useLocalSearchParams } from "expo-router";
import { FilteredReelScreen } from "@/components/FilteredReelScreen";

export default function CategoryReelScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const title = slug ? slug.charAt(0).toUpperCase() + slug.slice(1) : "Category";

  return (
    <>
      <Stack.Screen options={{ headerTitle: title }} />
      <FilteredReelScreen options={{ categorySlug: slug }} emptyMessage="No clips in this category" />
    </>
  );
}
