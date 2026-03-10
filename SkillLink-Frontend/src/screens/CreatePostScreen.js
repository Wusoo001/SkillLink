import { useContext, useState } from "react";
import { View, TextInput, Button, StyleSheet, Alert } from "react-native";
import { AuthContext } from "../../context/AuthContext";
import { createPost } from "../services/api";
import { PostContext } from "../../context/PostContext";

export default function CreatePostScreen({ navigation }) {
  const { userToken } = useContext(AuthContext);
  const { addNewPost } = useContext(PostContext);

  const [skill, setSkill] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [location, setLocation] = useState("");

  const handlePost = async () => {
    if (!skill || !description) return Alert.alert("Fill all required fields");

    // create a temporary optimistic post
    const tempPost = {
      _id: Math.random().toString(), // temporary ID
      skill,
      description,
      tags: tags.split(","),
      location,
      name: "You",
      rating: 0,
      jobsCompleted: 0,
      user: { _id: "me" },
    };

    // immediately show in HomeScreen
    addNewPost(tempPost);

    try {
      const response = await createPost(
        { skill, description, tags: tags.split(","), location },
        userToken
      );

      if (response.success) {
        Alert.alert("Post created!");
        navigation.goBack();
      } else {
        Alert.alert(response.message || "Failed to create post");
      }
    } catch (error) {
      console.log("Create post error:", error);
      Alert.alert("Error", "Failed to create post");
    }
  };

  return (
    <View style={styles.container}>
      <TextInput placeholder="Skill" value={skill} onChangeText={setSkill} style={styles.input} />
      <TextInput placeholder="Description" value={description} onChangeText={setDescription} style={styles.input} multiline />
      <TextInput placeholder="Tags (comma separated)" value={tags} onChangeText={setTags} style={styles.input} />
      <TextInput placeholder="Location" value={location} onChangeText={setLocation} style={styles.input} />
      <Button title="Post" onPress={handlePost} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#F5F6FA" },
  input: { backgroundColor: "#FFF", padding: 12, borderRadius: 12, marginBottom: 15 },
});