import { useRoute } from "@react-navigation/native";
import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";

export default function ProfileScreen() {
  const route = useRoute();
  const { userId } = route.params || {};

  const [profile, setProfile] = useState(null);

  useEffect(() => {
    // Temporary mock profile data
    const mockProfiles = {
      "1": {
        name: "John the Plumber",
        skill: "Professional Plumbing Services",
        rating: 4.8,
        jobs: 21,
        location: "Lagos, Nigeria",
        about:
          "Experienced plumber specializing in leak repairs, pipe installations, and full bathroom renovations.",
        tags: ["plumbing", "renovation", "repair"],
        reviews: [
          { id: "r1", text: "Excellent work and very professional!" },
          { id: "r2", text: "Quick response and affordable service." },
        ],
      },
      "2": {
        name: "Sarah Electric",
        skill: "Certified Electrician",
        rating: 4.6,
        jobs: 15,
        location: "Abuja, Nigeria",
        about:
          "Certified electrician offering safe wiring, lighting installations, and backup systems.",
        tags: ["electrician", "wiring", "backup"],
        reviews: [
          { id: "r1", text: "Great attention to detail." },
          { id: "r2", text: "Reliable and efficient." },
        ],
      },
      "3": {
        name: "Michael Tech",
        skill: "Laptop & Device Repairs",
        rating: 4.9,
        jobs: 30,
        location: "Port Harcourt, Nigeria",
        about:
          "Tech repair specialist handling diagnostics, screen replacements, and hardware fixes.",
        tags: ["tech", "hardware", "repair"],
        reviews: [
          { id: "r1", text: "Fixed my laptop in one day!" },
          { id: "r2", text: "Very knowledgeable technician." },
        ],
      },
    };

    setProfile(mockProfiles[userId]);
  }, [userId]);

  if (!profile) {
    return (
      <View style={styles.center}>
        <Text>Profile not found</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.avatar} />
        <Text style={styles.name}>{profile.name}</Text>
        <Text style={styles.skill}>{profile.skill}</Text>
        <Text style={styles.rating}>
          ⭐ {profile.rating} • {profile.jobs} jobs completed
        </Text>
        <Text style={styles.location}>{profile.location}</Text>
      </View>

      {/* About */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>
        <Text style={styles.about}>{profile.about}</Text>
      </View>

      {/* Skills */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Skills</Text>
        <View style={styles.tagContainer}>
          {profile.tags.map((tag, index) => (
            <Text key={index} style={styles.tag}>
              #{tag}
            </Text>
          ))}
        </View>
      </View>

      {/* Reviews */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Reviews</Text>
        {profile.reviews.map((review) => (
          <View key={review.id} style={styles.reviewCard}>
            <Text style={styles.reviewText}>{review.text}</Text>
          </View>
        ))}
      </View>

      {/* CTA */}
      <TouchableOpacity style={styles.primaryButton}>
        <Text style={styles.primaryButtonText}>Book Service</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F6FA",
  },

  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  header: {
    alignItems: "center",
    padding: 20,
    backgroundColor: "#FFF",
  },

  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "#D1D5DB",
    marginBottom: 10,
  },

  name: {
    fontSize: 20,
    fontWeight: "700",
  },

  skill: {
    color: "#6B7280",
    marginTop: 4,
  },

  rating: {
    marginTop: 4,
    color: "#F59E0B",
    fontSize: 13,
  },

  location: {
    marginTop: 4,
    color: "#6B7280",
    fontSize: 12,
  },

  section: {
    backgroundColor: "#FFF",
    padding: 15,
    marginTop: 10,
  },

  sectionTitle: {
    fontWeight: "700",
    marginBottom: 8,
  },

  about: {
    color: "#374151",
    fontSize: 14,
  },

  tagContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
  },

  tag: {
    backgroundColor: "#EEF2FF",
    color: "#4F46E5",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    fontSize: 12,
    marginRight: 6,
    marginBottom: 6,
  },

  reviewCard: {
    backgroundColor: "#F9FAFB",
    padding: 10,
    borderRadius: 10,
    marginBottom: 8,
  },

  reviewText: {
    fontSize: 13,
    color: "#374151",
  },

  primaryButton: {
    margin: 20,
    backgroundColor: "#0A66FF",
    padding: 15,
    borderRadius: 12,
    alignItems: "center",
  },

  primaryButtonText: {
    color: "#FFF",
    fontWeight: "700",
  },
});