import { Link } from "expo-router";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { ClipSubmitForm } from "@/components/ClipSubmitForm";
import { useSupabase } from "@/hooks/useSupabase";

export default function SubmitScreen() {
  const { user, isLoading } = useSupabase();

  if (isLoading) return <ActivityIndicator size="large" color="#8B5CF6" style={{ flex: 1, backgroundColor: "#000" }} />;

  if (!user) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 24, backgroundColor: "#000" }}>
        <Text style={{ color: "#fff", fontSize: 20, fontWeight: "700", marginBottom: 16 }}>Sign in to submit clips</Text>
        <Link href="/(auth)/login" asChild>
          <Pressable style={{ backgroundColor: "#8B5CF6", padding: 14, borderRadius: 8, width: "100%", alignItems: "center" }}>
            <Text style={{ color: "#fff", fontSize: 16, fontWeight: "600" }}>Sign In</Text>
          </Pressable>
        </Link>
      </View>
    );
  }

  return <ClipSubmitForm />;
}
