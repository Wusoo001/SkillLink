import { useContext, useState } from "react";
import { View, TextInput, Button, StyleSheet, Alert } from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system";

import { AuthContext } from "../../context/AuthContext";
import { createPost } from "../services/api";
import { PostContext } from "../../context/PostContext";

const CLOUD_NAME = "dz2te6uth";
const UPLOAD_PRESET = "SkillLink";

export default function CreatePostScreen({ navigation }) {
  const { userToken } = useContext(AuthContext);
  const { addNewPost } = useContext(PostContext);

  const [skill, setSkill] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [location, setLocation] = useState("");

  const [mediaBase64, setMediaBase64] = useState(null);
  const [mediaType, setMediaType] = useState(null);

  // ==============================
  // PICK MEDIA (IMAGE OR VIDEO)
  // ==============================
  const pickMedia = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsEditing: true,
      quality: 0.7,
      base64: true, // ✅ important: get base64 for both image and video
    });

    if (!result.canceled) {
      const asset = result.assets[0];
      const type = asset.type; // "image" or "video"
      
      // For video, asset.base64 might be missing; fallback to reading file
      let base64 = asset.base64;
      if (type === "video" && !base64) {
        // Read video file as base64
        const fileBase64 = await FileSystem.readAsStringAsync(asset.uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        base64 = fileBase64;
      }
      
      const mimeType = type === "image" ? "image/jpeg" : "video/mp4";
      const dataUrl = `data:${mimeType};base64,${base64}`;
      
      setMediaBase64(dataUrl);
      setMediaType(type);
    }
  };

  // ==============================
  // UPLOAD TO CLOUDINARY
  // ==============================
  const uploadMedia = async (base64Data, type) => {
    const formData = new FormData();
    
    // Convert base64 to a blob-like object for Cloudinary
    // We'll send the base64 string directly (Cloudinary accepts base64)
    formData.append("file", base64Data);
    formData.append("upload_preset", UPLOAD_PRESET);
    
    // Optional: add cloud_name for clarity
    formData.append("cloud_name", CLOUD_NAME);

    const endpoint = type === "video"
      ? `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/video/upload`
      : `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;

    console.log("Uploading to:", endpoint);
    console.log("Preset:", UPLOAD_PRESET);

    const res = await fetch(endpoint, {
      method: "POST",
      body: formData,
      headers: {
        "Accept": "application/json",
      },
    });

    const data = await res.json();
    console.log("Cloudinary response:", data);

    if (!data.secure_url) {
      throw new Error(data.error?.message || "Upload failed");
    }
    return data.secure_url;
  };

  // ==============================
  // CREATE POST
  // ==============================
  const handlePost = async () => {
    if (!skill || !description) {
      return Alert.alert("Error", "Skill and description are required");
    }

    let mediaUrl = null;

    try {
      if (mediaBase64) {
        mediaUrl = await uploadMedia(mediaBase64, mediaType);
      }

      // Optimistic post
      const tempPost = {
        _id: Math.random().toString(),
        skill,
        description,
        tags: tags.split(",").filter(t => t.trim()),
        location,
        media: mediaUrl,
        mediaType,
        user: { _id: "me", name: "You" },
      };
      addNewPost(tempPost);

      const response = await createPost(
        {
          skill,
          description,
          tags: tags.split(",").filter(t => t.trim()),
          location,
          media: mediaUrl,
          mediaType,
        },
        userToken
      );

      if (response.success) {
        Alert.alert("Success", "Post created!");
        if (navigation.canGoBack()) {
          navigation.goBack();
        } else {
          navigation.navigate("Home");
        }
      } else {
        Alert.alert("Error", response.message || "Failed to create post");
      }
    } catch (error) {
      console.log("Create post error:", error);
      Alert.alert("Error", error.message || "Failed to create post");
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
      <TextInput
        placeholder="Location"
        value={location}
        onChangeText={setLocation}
        style={styles.input}
      />

      <Button title="Pick Image/Video" onPress={pickMedia} />
      <Button title="Post" onPress={handlePost} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#F5F6FA" },
  input: {
    backgroundColor: "#FFF",
    padding: 12,
    borderRadius: 12,
    marginBottom: 15,
  },
});