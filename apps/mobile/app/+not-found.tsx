import { View, Text } from "react-native";
import { Link } from "expo-router";

export default function NotFoundScreen() {
  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#000" }}>
      <Text style={{ color: "#fff", fontSize: 18 }}>Page not found</Text>
      <Link href="/" style={{ color: "#8B5CF6", marginTop: 16 }}>Go home</Link>
    </View>
  );
}
