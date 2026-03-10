import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useCallback, useState } from "react";
import {
    FlatList,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { getJobs } from "../data/jobStore";

export default function Dashboard() {
  const navigation = useNavigation();
  const [jobs, setJobs] = useState([]);

  useFocusEffect(
    useCallback(() => {
      const loadJobs = async () => {
        const storedJobs = await getJobs();
        setJobs(storedJobs);
      };
      loadJobs();
    }, [])
  );

  const myRequests = jobs.filter(job => job.createdBy === "me");
  const acceptedJobs = jobs.filter(job => job.acceptedBy === "me");

  return (
    <View style={styles.container}>
      <Text style={styles.title}>My Dashboard</Text>

      <TouchableOpacity
        style={styles.button}
        onPress={() => navigation.navigate("JobOptions")}
      >
        <Text style={styles.buttonText}>+ New Request</Text>
      </TouchableOpacity>

      <Text style={styles.sectionTitle}>My Requests</Text>
      <FlatList
        data={myRequests}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text>{item.service}</Text>
            <Text>Status: {item.status}</Text>
          </View>
        )}
      />

      <Text style={styles.sectionTitle}>Jobs I Accepted</Text>
      <FlatList
        data={acceptedJobs}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text>{item.service}</Text>
            <Text>Status: {item.status}</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  title: { fontSize: 22, fontWeight: "bold", marginBottom: 15 },
  sectionTitle: { fontSize: 18, fontWeight: "600", marginTop: 20 },
  button: {
    backgroundColor: "#0A66FF",
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  buttonText: { color: "#FFF", fontWeight: "600" },
  card: {
    backgroundColor: "#FFF",
    padding: 12,
    borderRadius: 10,
    marginTop: 10,
  },
});
