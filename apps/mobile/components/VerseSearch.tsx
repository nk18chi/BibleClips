import { bibleBookNamesEn, bibleBookNamesJa, getBookByJapaneseName } from "@bibleclips/validation";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { useCategories } from "@/hooks/useCategories";

type Suggestion = { type: "verse"; label: string; route: string } | { type: "category"; label: string; route: string };

const verseRegex = /^(\d?\s?[A-Za-z\u3040-\u9FFF]+)\s*(\d+)?(?::(\d+))?(?:-(\d+))?$/;

export function VerseSearch() {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const { categories } = useCategories();

  useEffect(() => {
    if (query.length < 2) {
      setSuggestions([]);
      return;
    }

    const results: Suggestion[] = [];
    const q = query.toLowerCase().trim();

    // Category search with # prefix
    if (q.startsWith("#")) {
      const catQuery = q.slice(1);
      for (const cat of categories) {
        if (cat.name_en.toLowerCase().includes(catQuery) || cat.slug.includes(catQuery)) {
          results.push({ type: "category", label: `#${cat.name_en}`, route: `/category/${cat.slug}` });
        }
      }
      setSuggestions(results.slice(0, 8));
      return;
    }

    // Category matches (without #)
    for (const cat of categories) {
      if (cat.name_en.toLowerCase().startsWith(q)) {
        results.push({ type: "category", label: `#${cat.name_en}`, route: `/category/${cat.slug}` });
      }
    }

    // Bible book matches (English)
    for (const book of bibleBookNamesEn) {
      if (book.toLowerCase().startsWith(q)) {
        results.push({ type: "verse", label: book, route: `/verse/${book.replace(/ /g, "-")}` });
      }
    }

    // Bible book matches (Japanese)
    for (const bookJa of bibleBookNamesJa) {
      if (bookJa.startsWith(query.trim())) {
        const bookEn = getBookByJapaneseName(bookJa);
        if (bookEn) {
          results.push({
            type: "verse",
            label: `${bookJa} (${bookEn.en})`,
            route: `/verse/${bookEn.en.replace(/ /g, "-")}`,
          });
        }
      }
    }

    // Full verse reference parsing (e.g. "John 3:16" or "John 3:16-18")
    const match = query.trim().match(verseRegex);
    if (match) {
      const [, bookPart, chapter, verseStart] = match;
      const bookName = bookPart.trim();
      const matchedBook = bibleBookNamesEn.find((b) => b.toLowerCase() === bookName.toLowerCase());
      const matchedBookJa = getBookByJapaneseName(bookName);

      const resolvedBook = matchedBook ?? matchedBookJa?.en;
      if (resolvedBook && chapter) {
        const ref = verseStart
          ? `${resolvedBook.replace(/ /g, "-")}-${chapter}:${verseStart}`
          : `${resolvedBook.replace(/ /g, "-")}-${chapter}`;
        const label = verseStart ? `${resolvedBook} ${chapter}:${verseStart}` : `${resolvedBook} ${chapter}`;
        // Add as first suggestion
        results.unshift({ type: "verse", label, route: `/verse/${ref}` });
      }
    }

    // Deduplicate by route
    const seen = new Set<string>();
    const unique = results.filter((r) => {
      if (seen.has(r.route)) return false;
      seen.add(r.route);
      return true;
    });

    setSuggestions(unique.slice(0, 8));
  }, [query, categories]);

  function handleSelect(suggestion: Suggestion) {
    setQuery("");
    setSuggestions([]);
    router.push(suggestion.route as any);
  }

  function handleSubmit() {
    if (suggestions.length > 0) {
      handleSelect(suggestions[0]);
    }
  }

  return (
    <View style={{ padding: 16 }}>
      <TextInput
        style={{ backgroundColor: "#1a1a1a", color: "#fff", padding: 14, borderRadius: 8, fontSize: 16 }}
        placeholder="Search by verse (e.g. John 3:16) or #category"
        placeholderTextColor="#888"
        value={query}
        onChangeText={setQuery}
        onSubmitEditing={handleSubmit}
        returnKeyType="search"
      />
      {suggestions.map((s) => (
        <Pressable
          key={s.route}
          onPress={() => handleSelect(s)}
          style={{ padding: 12, borderBottomWidth: 1, borderBottomColor: "#222" }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Text style={{ color: s.type === "category" ? "#8B5CF6" : "#3b82f6", fontSize: 12 }}>
              {s.type === "category" ? "CATEGORY" : "VERSE"}
            </Text>
            <Text style={{ color: "#fff", fontSize: 15 }}>{s.label}</Text>
          </View>
        </Pressable>
      ))}
    </View>
  );
}
