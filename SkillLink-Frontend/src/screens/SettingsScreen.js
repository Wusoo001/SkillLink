import { useContext } from "react";
import { Button, Text, View } from "react-native";
import { AuthContext } from "../../context/AuthContext";

export default function SettingsScreen() {
  const { logout } = useContext(AuthContext);

  return (
    <View style={{ flex:1, justifyContent:"center", alignItems:"center" }}>
      <Text>Settings</Text>
      <Button title="Logout" onPress={logout} />
    </View>
  );
}
