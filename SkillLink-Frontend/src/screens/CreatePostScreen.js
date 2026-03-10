import { useState, useContext } from "react";
import { View, TextInput, Button, StyleSheet, Alert } from "react-native";
import { AuthContext } from "../../context/AuthContext";
import { createPost } from "../services/api";

export default function CreatePostScreen({ navigation, route }) {
  const { userToken } = useContext(AuthContext);
  const [skill, setSkill] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");

  const handlePost = async () => {
    if (!skill || !description) {
      Alert.alert("Error", "Please fill all fields");
      return;
    }

    const postData = {
      skill,
      description,
      tags: tags.split(",").map((t) => t.trim()),
    };

    const result = await createPost(postData, userToken);

    if (result.success) {
      Alert.alert("Success", "Post created!");
      // Refresh HomeScreen using callback
      if (route.params?.onRefresh) route.params.onRefresh();
      navigation.goBack();
    } else {
      Alert.alert("Error", result.message || "Failed to create post");
    }
  };

  return (
    <View style={styles.container}>
      <TextInput
        placeholder="Skill"
        value={skill}
        onChangeText={setSkill}
        style={styles.input}
      />
      <TextInput
        placeholder="Description"
        value={description}
        onChangeText={setDescription}
        style={styles.input}
        multiline
      />
      <TextInput
        placeholder="Tags (comma separated)"
        value={tags}
        onChangeText={setTags}
        style={styles.input}
      />
      <Button title="Post" onPress={handlePost} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#F5F6FA" },
  input: { backgroundColor: "#FFF", padding: 12, borderRadius: 10, marginBottom: 15 },
});