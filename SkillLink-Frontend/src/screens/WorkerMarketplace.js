import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useState } from "react";
import {
    FlatList,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { getJobs, updateJobStatus } from "../data/jobStore";

export default function WorkerMarketplace() {
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

  const acceptJob = async (job) => {
    await updateJobStatus(job.id, "accepted", "me");
    const refreshed = await getJobs();
    setJobs(refreshed);
  };

  const pendingJobs = jobs.filter(
    (job) => job.status === "pending"
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Marketplace</Text>

      <FlatList
        data={pendingJobs}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.service}>{item.service}</Text>
            <Text>{item.description}</Text>
            <Text style={styles.location}>{item.location}</Text>

            <TouchableOpacity
              style={styles.button}
              onPress={() => acceptJob(item)}
            >
              <Text style={styles.buttonText}>Accept Job</Text>
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={
          <Text style={{ marginTop: 20 }}>
            No available jobs right now
          </Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  title: { fontSize: 22, fontWeight: "bold", marginBottom: 15 },
  card: {
    backgroundColor: "#FFF",
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,
  },
  service: { fontWeight: "600", marginBottom: 5 },
  location: { color: "#555", marginBottom: 10 },
  button: {
    backgroundColor: "#0A66FF",
    padding: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  buttonText: { color: "#FFF", fontWeight: "600" },
});
