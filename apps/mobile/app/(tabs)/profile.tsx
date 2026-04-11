import { Link } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";
import { MyClipsList } from "@/components/MyClipsList";
import { useSupabase } from "@/hooks/useSupabase";
import { supabase } from "@/lib/supabase";

export default function ProfileScreen() {
  const { user, isLoading } = useSupabase();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#000" }}>
        <Text style={{ color: "#888", fontSize: 16 }}>Loading...</Text>
      </View>
    );
  }

  if (!user) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 24, backgroundColor: "#000" }}>
        <Text style={{ color: "#fff", fontSize: 24, fontWeight: "700", marginBottom: 16 }}>Welcome to BibleClips</Text>
        <Link href="/(auth)/login" asChild>
          <Pressable style={{ backgroundColor: "#8B5CF6", padding: 14, borderRadius: 8, marginBottom: 12, width: "100%", alignItems: "center" }}>
            <Text style={{ color: "#fff", fontSize: 16, fontWeight: "600" }}>Sign In</Text>
          </Pressable>
        </Link>
        <Link href="/(auth)/register" asChild>
          <Pressable style={{ backgroundColor: "#333", padding: 14, borderRadius: 8, marginBottom: 12, width: "100%", alignItems: "center" }}>
            <Text style={{ color: "#fff", fontSize: 16, fontWeight: "600" }}>Create Account</Text>
          </Pressable>
        </Link>
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#000", paddingTop: 60 }}>
      <View style={{ padding: 24, alignItems: "center" }}>
        <Text style={{ color: "#fff", fontSize: 24, fontWeight: "700", marginBottom: 16 }}>{user.email}</Text>
        <Pressable style={{ backgroundColor: "#8B5CF6", padding: 14, borderRadius: 8, width: "100%", alignItems: "center" }} onPress={() => supabase.auth.signOut()}>
          <Text style={{ color: "#fff", fontSize: 16, fontWeight: "600" }}>Sign Out</Text>
        </Pressable>
      </View>
      <Text style={{ color: "#fff", fontSize: 18, fontWeight: "600", padding: 16, paddingBottom: 8 }}>My Clips</Text>
      <MyClipsList />
    </ScrollView>
  );
}
