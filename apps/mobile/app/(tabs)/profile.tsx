import { View, Text, ScrollView, Pressable, StyleSheet } from "react-native";
import { Link } from "expo-router";
import { useSupabase } from "@/hooks/useSupabase";
import { supabase } from "@/lib/supabase";
import { MyClipsList } from "@/components/MyClipsList";

export default function ProfileScreen() {
  const { user, isLoading } = useSupabase();

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <Text style={styles.text}>Loading...</Text>
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.centered}>
        <Text style={styles.title}>Welcome to BibleClips</Text>
        <Link href="/(auth)/login" asChild>
          <Pressable style={styles.button}>
            <Text style={styles.buttonText}>Sign In</Text>
          </Pressable>
        </Link>
        <Link href="/(auth)/register" asChild>
          <Pressable style={[styles.button, styles.secondaryButton]}>
            <Text style={styles.buttonText}>Create Account</Text>
          </Pressable>
        </Link>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{user.email}</Text>
        <Pressable style={styles.button} onPress={() => supabase.auth.signOut()}>
          <Text style={styles.buttonText}>Sign Out</Text>
        </Pressable>
      </View>
      <Text style={styles.sectionTitle}>My Clips</Text>
      <MyClipsList />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000", paddingTop: 60 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24, backgroundColor: "#000" },
  header: { padding: 24, alignItems: "center" },
  title: { color: "#fff", fontSize: 24, fontWeight: "bold", marginBottom: 16 },
  sectionTitle: { color: "#fff", fontSize: 18, fontWeight: "600", paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  text: { color: "#888", fontSize: 16 },
  button: { backgroundColor: "#8B5CF6", paddingVertical: 14, paddingHorizontal: 32, borderRadius: 8, marginBottom: 12, width: "100%", alignItems: "center" },
  secondaryButton: { backgroundColor: "#333" },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
