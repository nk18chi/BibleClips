import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/lib/supabase";
import { useSupabase } from "@/hooks/useSupabase";
import { useCategories } from "@/hooks/useCategories";
import { router } from "expo-router";

const youtubeUrlRegex = /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/;

const verseRegex = /^(\d?\s?[A-Za-z]+)\s+(\d+):(\d+)(?:-(\d+))?$/;

const bookJaMap: Record<string, string> = {
  Genesis: "創世記",
  Exodus: "出エジプト記",
  Matthew: "マタイ",
  Mark: "マルコ",
  Luke: "ルカ",
  John: "ヨハネ",
  Acts: "使徒",
  Romans: "ローマ",
  Philippians: "ピリピ",
  Psalms: "詩篇",
  Proverbs: "箴言",
  Isaiah: "イザヤ",
  Revelation: "黙示録",
};

const clipFormSchema = z
  .object({
    youtubeUrl: z.string().min(1, "YouTube URL is required"),
    startTime: z.string().regex(/^\d+(\.\d+)?$/, "Must be a number"),
    endTime: z.string().regex(/^\d+(\.\d+)?$/, "Must be a number"),
    title: z.string().min(1, "Title is required").max(200),
    clipType: z.enum(["sermon", "song", "testimony"]),
    verseInput: z.string().optional(),
    categoryIds: z.array(z.string()).min(1, "Select at least one category"),
  })
  .refine(
    (data) => {
      const start = Number.parseFloat(data.startTime);
      const end = Number.parseFloat(data.endTime);
      return end > start;
    },
    { message: "End time must be after start time", path: ["endTime"] }
  )
  .refine(
    (data) => {
      const start = Number.parseFloat(data.startTime);
      const end = Number.parseFloat(data.endTime);
      return end - start <= 600;
    },
    { message: "Clip must be 10 minutes or less", path: ["endTime"] }
  );

type ClipFormData = z.infer<typeof clipFormSchema>;

const STEPS = ["URL", "Time", "Details", "Categories"] as const;
const CLIP_TYPES = ["sermon", "song", "testimony"] as const;

export function ClipSubmitForm() {
  const { user } = useSupabase();
  const { categories } = useCategories();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const {
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ClipFormData>({
    resolver: zodResolver(clipFormSchema),
    defaultValues: {
      youtubeUrl: "",
      startTime: "0",
      endTime: "60",
      title: "",
      clipType: "sermon",
      verseInput: "",
      categoryIds: [],
    },
  });

  const selectedCategories = watch("categoryIds");

  const onSubmit = async (data: ClipFormData) => {
    if (!user) return;
    const videoIdMatch = data.youtubeUrl.match(youtubeUrlRegex);
    if (!videoIdMatch?.[1]) {
      Alert.alert("Error", "Invalid YouTube URL");
      return;
    }

    setSubmitting(true);
    try {
      const { data: clip, error } = await supabase
        .from("clips")
        .insert({
          youtube_video_id: videoIdMatch[1],
          start_time: Number.parseFloat(data.startTime),
          end_time: Number.parseFloat(data.endTime),
          title: data.title,
          clip_type: data.clipType,
          submitted_by: user.id,
          status: "PENDING",
        })
        .select()
        .single();

      if (error) throw error;

      // Insert verse reference if provided
      if (data.verseInput) {
        const match = data.verseInput.trim().match(verseRegex);
        if (match) {
          const [, book, chapter, verseStart, verseEnd] = match;
          const { error: verseError } = await supabase.from("clip_verses").insert({
            clip_id: clip.id,
            book,
            book_ja: bookJaMap[book] || book,
            chapter: Number.parseInt(chapter, 10),
            verse_start: Number.parseInt(verseStart, 10),
            verse_end: verseEnd ? Number.parseInt(verseEnd, 10) : null,
          });
          if (verseError) throw verseError;
        }
      }

      // Insert category associations
      if (data.categoryIds.length > 0) {
        const { error: catError } = await supabase.from("clip_categories").insert(
          data.categoryIds.map((categoryId) => ({
            clip_id: clip.id,
            category_id: categoryId,
          }))
        );
        if (catError) throw catError;
      }

      Alert.alert("Success", "Clip submitted for review!", [
        { text: "OK", onPress: () => router.replace("/(tabs)/profile") },
      ]);
    } catch (err) {
      Alert.alert("Error", err instanceof Error ? err.message : "Submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  const nextStep = () => setStep((s) => Math.min(s + 1, STEPS.length - 1));
  const prevStep = () => setStep((s) => Math.max(s - 1, 0));

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>Submit a Clip</Text>
      <View style={styles.stepIndicator}>
        {STEPS.map((label, i) => (
          <View key={label} style={[styles.stepDot, i <= step && styles.stepDotActive]}>
            <Text style={[styles.stepText, i <= step && styles.stepTextActive]}>{i + 1}</Text>
          </View>
        ))}
      </View>

      {step === 0 && (
        <View style={styles.stepContent}>
          <Text style={styles.label}>YouTube URL</Text>
          <Controller
            control={control}
            name="youtubeUrl"
            render={({ field: { onChange, value } }) => (
              <TextInput
                style={styles.input}
                placeholder="https://youtube.com/watch?v=..."
                placeholderTextColor="#666"
                value={value}
                onChangeText={onChange}
                autoCapitalize="none"
                keyboardType="url"
              />
            )}
          />
          {errors.youtubeUrl && <Text style={styles.error}>{errors.youtubeUrl.message}</Text>}
        </View>
      )}

      {step === 1 && (
        <View style={styles.stepContent}>
          <Text style={styles.label}>Start Time (seconds)</Text>
          <Controller
            control={control}
            name="startTime"
            render={({ field: { onChange, value } }) => (
              <TextInput
                style={styles.input}
                placeholder="0"
                placeholderTextColor="#666"
                value={value}
                onChangeText={onChange}
                keyboardType="decimal-pad"
              />
            )}
          />
          {errors.startTime && <Text style={styles.error}>{errors.startTime.message}</Text>}

          <Text style={[styles.label, { marginTop: 16 }]}>End Time (seconds)</Text>
          <Controller
            control={control}
            name="endTime"
            render={({ field: { onChange, value } }) => (
              <TextInput
                style={styles.input}
                placeholder="60"
                placeholderTextColor="#666"
                value={value}
                onChangeText={onChange}
                keyboardType="decimal-pad"
              />
            )}
          />
          {errors.endTime && <Text style={styles.error}>{errors.endTime.message}</Text>}
        </View>
      )}

      {step === 2 && (
        <View style={styles.stepContent}>
          <Text style={styles.label}>Title</Text>
          <Controller
            control={control}
            name="title"
            render={({ field: { onChange, value } }) => (
              <TextInput
                style={styles.input}
                placeholder="Clip title"
                placeholderTextColor="#666"
                value={value}
                onChangeText={onChange}
              />
            )}
          />
          {errors.title && <Text style={styles.error}>{errors.title.message}</Text>}

          <Text style={[styles.label, { marginTop: 16 }]}>Clip Type</Text>
          <Controller
            control={control}
            name="clipType"
            render={({ field: { onChange, value } }) => (
              <View style={styles.typeRow}>
                {CLIP_TYPES.map((type) => (
                  <Pressable
                    key={type}
                    style={[styles.typeButton, value === type && styles.typeButtonActive]}
                    onPress={() => onChange(type)}
                  >
                    <Text style={[styles.typeText, value === type && styles.typeTextActive]}>{type}</Text>
                  </Pressable>
                ))}
              </View>
            )}
          />

          <Text style={[styles.label, { marginTop: 16 }]}>Verse Reference (optional)</Text>
          <Controller
            control={control}
            name="verseInput"
            render={({ field: { onChange, value } }) => (
              <TextInput
                style={styles.input}
                placeholder="e.g. John 3:16"
                placeholderTextColor="#666"
                value={value}
                onChangeText={onChange}
              />
            )}
          />
        </View>
      )}

      {step === 3 && (
        <View style={styles.stepContent}>
          <Text style={styles.label}>Categories</Text>
          <Controller
            control={control}
            name="categoryIds"
            render={({ field: { onChange } }) => (
              <View style={styles.categoryGrid}>
                {categories.map((cat) => {
                  const selected = selectedCategories.includes(cat.id);
                  return (
                    <Pressable
                      key={cat.id}
                      style={[styles.categoryChip, selected && styles.categoryChipActive]}
                      onPress={() => {
                        const next = selected
                          ? selectedCategories.filter((id) => id !== cat.id)
                          : [...selectedCategories, cat.id];
                        onChange(next);
                      }}
                    >
                      <Text style={[styles.categoryText, selected && styles.categoryTextActive]}>
                        {cat.name_en}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            )}
          />
          {errors.categoryIds && <Text style={styles.error}>{errors.categoryIds.message}</Text>}
        </View>
      )}

      <View style={styles.navRow}>
        {step > 0 && (
          <Pressable style={styles.navButton} onPress={prevStep}>
            <Text style={styles.navText}>Back</Text>
          </Pressable>
        )}
        <View style={{ flex: 1 }} />
        {step < STEPS.length - 1 ? (
          <Pressable style={[styles.navButton, styles.navPrimary]} onPress={nextStep}>
            <Text style={[styles.navText, styles.navPrimaryText]}>Next</Text>
          </Pressable>
        ) : (
          <Pressable
            style={[styles.navButton, styles.navPrimary]}
            onPress={handleSubmit(onSubmit)}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={[styles.navText, styles.navPrimaryText]}>Submit</Text>
            )}
          </Pressable>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  content: { padding: 20 },
  heading: { color: "#fff", fontSize: 24, fontWeight: "700", marginBottom: 20 },
  stepIndicator: { flexDirection: "row", justifyContent: "center", gap: 12, marginBottom: 24 },
  stepDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#333",
    alignItems: "center",
    justifyContent: "center",
  },
  stepDotActive: { backgroundColor: "#8B5CF6" },
  stepText: { color: "#888", fontSize: 14, fontWeight: "600" },
  stepTextActive: { color: "#fff" },
  stepContent: { marginBottom: 24 },
  label: { color: "#ccc", fontSize: 14, fontWeight: "500", marginBottom: 8 },
  input: {
    backgroundColor: "#1a1a1a",
    color: "#fff",
    fontSize: 16,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#333",
  },
  error: { color: "#ef4444", fontSize: 12, marginTop: 4 },
  typeRow: { flexDirection: "row", gap: 8 },
  typeButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#333",
    alignItems: "center",
  },
  typeButtonActive: { borderColor: "#8B5CF6", backgroundColor: "rgba(139,92,246,0.15)" },
  typeText: { color: "#888", fontSize: 14, textTransform: "capitalize" },
  typeTextActive: { color: "#8B5CF6" },
  categoryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#333",
  },
  categoryChipActive: { borderColor: "#8B5CF6", backgroundColor: "rgba(139,92,246,0.15)" },
  categoryText: { color: "#888", fontSize: 13 },
  categoryTextActive: { color: "#8B5CF6" },
  navRow: { flexDirection: "row", alignItems: "center", marginTop: 8 },
  navButton: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8, borderWidth: 1, borderColor: "#333" },
  navPrimary: { backgroundColor: "#8B5CF6", borderColor: "#8B5CF6" },
  navText: { color: "#ccc", fontSize: 16, fontWeight: "600" },
  navPrimaryText: { color: "#fff" },
});
