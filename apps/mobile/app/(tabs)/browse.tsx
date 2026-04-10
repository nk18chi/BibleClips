import { ScrollView, StyleSheet } from "react-native";
import { CategoryGrid } from "@/components/CategoryGrid";
import { VerseSearch } from "@/components/VerseSearch";

export default function BrowseScreen() {
  return (
    <ScrollView style={styles.container}>
      <VerseSearch />
      <CategoryGrid />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000", paddingTop: 60 },
});
