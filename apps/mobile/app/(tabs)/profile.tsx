import { View, Text, Pressable, StyleSheet } from "react-native";
import { Link } from "expo-router";
import { useSupabase } from "@/hooks/useSupabase";
import { supabase } from "@/lib/supabase";

export default function ProfileScreen() {
  const { user, isLoading } = useSupabase();

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>Loading...</Text>
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.container}>
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
    <View style={styles.container}>
      <Text style={styles.title}>{user.email}</Text>
      <Pressable style={styles.button} onPress={() => supabase.auth.signOut()}>
        <Text style={styles.buttonText}>Sign Out</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24, backgroundColor: "#000" },
  title: { color: "#fff", fontSize: 24, fontWeight: "bold", marginBottom: 32 },
  text: { color: "#888", fontSize: 16 },
  button: { backgroundColor: "#8B5CF6", paddingVertical: 14, paddingHorizontal: 32, borderRadius: 8, marginBottom: 12, width: "100%", alignItems: "center" },
  secondaryButton: { backgroundColor: "#333" },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
