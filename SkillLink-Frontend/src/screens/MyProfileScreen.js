import { useContext, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from "react-native";
import { AuthContext } from "../../context/AuthContext";

export default function MyProfileScreen() {
  const { user } = useContext(AuthContext); // assuming you store user in context

  const [isEditing, setIsEditing] = useState(false);

  const [profile, setProfile] = useState({
    name: user?.name || "Your Name",
    skill: "Add your primary skill",
    location: "Your Location",
    about: "Write a short professional bio...",
    tags: ["skill1", "skill2"],
  });

  const handleSave = () => {
    setIsEditing(false);
    Alert.alert("Success", "Profile updated successfully");
  };

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.avatar} />

        {isEditing ? (
          <TextInput
            style={styles.inputName}
            value={profile.name}
            onChangeText={(text) =>
              setProfile({ ...profile, name: text })
            }
          />
        ) : (
          <Text style={styles.name}>{profile.name}</Text>
        )}

        {isEditing ? (
          <TextInput
            style={styles.input}
            value={profile.skill}
            onChangeText={(text) =>
              setProfile({ ...profile, skill: text })
            }
          />
        ) : (
          <Text style={styles.skill}>{profile.skill}</Text>
        )}

        {isEditing ? (
          <TextInput
            style={styles.input}
            value={profile.location}
            onChangeText={(text) =>
              setProfile({ ...profile, location: text })
            }
          />
        ) : (
          <Text style={styles.location}>{profile.location}</Text>
        )}
      </View>

      {/* About Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>

        {isEditing ? (
          <TextInput
            style={styles.textArea}
            multiline
            value={profile.about}
            onChangeText={(text) =>
              setProfile({ ...profile, about: text })
            }
          />
        ) : (
          <Text style={styles.about}>{profile.about}</Text>
        )}
      </View>

      {/* Skills Section */}
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

      {/* Action Button */}
      {isEditing ? (
        <TouchableOpacity style={styles.primaryButton} onPress={handleSave}>
          <Text style={styles.primaryButtonText}>Save Changes</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => setIsEditing(true)}
        >
          <Text style={styles.editText}>Edit Profile</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F6FA",
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

  inputName: {
    fontSize: 20,
    fontWeight: "700",
    borderBottomWidth: 1,
    width: "80%",
    textAlign: "center",
  },

  skill: {
    color: "#6B7280",
    marginTop: 4,
  },

  location: {
    color: "#6B7280",
    fontSize: 12,
    marginTop: 4,
  },

  input: {
    borderBottomWidth: 1,
    width: "80%",
    textAlign: "center",
    marginTop: 5,
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

  textArea: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    padding: 10,
    minHeight: 80,
    textAlignVertical: "top",
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

  editButton: {
    margin: 20,
    backgroundColor: "#0A66FF",
    padding: 15,
    borderRadius: 12,
    alignItems: "center",
  },

  editText: {
    color: "#FFF",
    fontWeight: "700",
  },

  primaryButton: {
    margin: 20,
    backgroundColor: "#16A34A",
    padding: 15,
    borderRadius: 12,
    alignItems: "center",
  },

  primaryButtonText: {
    color: "#FFF",
    fontWeight: "700",
  },
});