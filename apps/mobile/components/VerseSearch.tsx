import { bibleBookNamesEn } from "@bibleclips/validation";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

export function VerseSearch() {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);

  function handleChange(text: string) {
    setQuery(text);
    if (text.length >= 2) {
      setSuggestions(bibleBookNamesEn.filter((b) => b.toLowerCase().startsWith(text.toLowerCase())).slice(0, 5));
    } else {
      setSuggestions([]);
    }
  }

  function handleSelect(book: string) {
    setQuery(book);
    setSuggestions([]);
    router.push(`/verse/${book.replace(/ /g, "-")}`);
  }

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        placeholder="Search by verse (e.g. John 3:16)"
        placeholderTextColor="#888"
        value={query}
        onChangeText={handleChange}
      />
      {suggestions.map((s) => (
        <Pressable key={s} onPress={() => handleSelect(s)} style={styles.suggestion}>
          <Text style={styles.suggestionText}>{s}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  input: { backgroundColor: "#1a1a1a", color: "#fff", padding: 14, borderRadius: 8, fontSize: 16 },
  suggestion: { padding: 12, borderBottomWidth: 1, borderBottomColor: "#222" },
  suggestionText: { color: "#fff", fontSize: 15 },
});
