import { useNavigation } from "@react-navigation/native";
import {
    FlatList,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

const services = [
  { id: "1", name: "Plumber" },
  { id: "2", name: "Electrician" },
  { id: "3", name: "Tailor" },
  { id: "4", name: "Tutor" },
  { id: "5", name: "Hair Stylist" },
];

export default function JobOptionsScreen() {
  const navigation = useNavigation();

  const handleSelectService = (service) => {
    navigation.navigate("RequestService", {
      selectedService: service,
    });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Select a Service</Text>

      <FlatList
        data={services}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => handleSelectService(item.name)}
          >
            <Text style={styles.serviceName}>{item.name}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#F9FAFB",
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 15,
  },
  card: {
    backgroundColor: "#FFF",
    padding: 15,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
  },
  serviceName: {
    fontSize: 16,
    fontWeight: "600",
  },
});
