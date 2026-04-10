import { Redirect } from "expo-router";
import { ActivityIndicator } from "react-native";
import { ClipSubmitForm } from "@/components/ClipSubmitForm";
import { useSupabase } from "@/hooks/useSupabase";

export default function SubmitScreen() {
  const { user, isLoading } = useSupabase();

  if (isLoading) return <ActivityIndicator size="large" color="#8B5CF6" style={{ flex: 1, backgroundColor: "#000" }} />;
  if (!user) return <Redirect href="/(auth)/login" />;

  return <ClipSubmitForm />;
}
