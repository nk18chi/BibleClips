import { ScrollView, StyleSheet } from "react-native";
import { VerseSearch } from "@/components/VerseSearch";
import { CategoryGrid } from "@/components/CategoryGrid";

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
