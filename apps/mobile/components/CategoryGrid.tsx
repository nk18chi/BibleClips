import { View, Text, Pressable, StyleSheet } from "react-native";
import { router } from "expo-router";
import { useCategories } from "@/hooks/useCategories";

export function CategoryGrid() {
  const { categories, loading } = useCategories();
  if (loading) return null;

  return (
    <View style={styles.grid}>
      {categories.map((cat) => (
        <Pressable key={cat.id} style={styles.card} onPress={() => router.push(`/category/${cat.slug}`)}>
          <Text style={styles.nameEn}>{cat.name_en}</Text>
          <Text style={styles.nameJa}>{cat.name_ja}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", padding: 8, gap: 8 },
  card: { backgroundColor: "#1a1a1a", borderRadius: 8, padding: 16, width: "47%", alignItems: "center" },
  nameEn: { color: "#fff", fontSize: 14, fontWeight: "600" },
  nameJa: { color: "#888", fontSize: 12, marginTop: 4 },
});
