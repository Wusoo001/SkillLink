import React, { useContext, useState, useEffect } from "react";
import {
View,
Text,
StyleSheet,
TextInput,
TouchableOpacity,
ScrollView,
Alert
} from "react-native";
import { AuthContext } from "../../context/AuthContext";
import{api} from "../services/api";

export default function EditProfileScreen({ navigation }) {

const { user } = useContext(AuthContext);

const [name, setName] = useState("");
const [skills, setSkills] = useState("");
const [responseTime, setResponseTime] = useState("");
const [portfolioTitle, setPortfolioTitle] = useState("");
const [portfolioDesc, setPortfolioDesc] = useState("");
const [loading, setLoading] = useState(false);

useEffect(() => {
loadProfile();
}, []);

const loadProfile = async () => {

try {

const res = await api.get(`/users/${user._id}`);

setName(res.data.name || "");
setSkills(res.data.skills?.join(", ") || "");
setResponseTime(res.data.responseTime || "");

if (res.data.portfolio?.length) {
setPortfolioTitle(res.data.portfolio[0].title);
setPortfolioDesc(res.data.portfolio[0].description);
}

} catch (error) {
console.log("Profile load error", error);
}

};

const updateProfile = async () => {

try {

setLoading(true);

await api.put(`/users/${user._id}`, {
name,
skills: skills.split(",").map(s => s.trim()),
responseTime,
portfolio: [
{
title: portfolioTitle,
description: portfolioDesc
}
]
});

Alert.alert("Success", "Profile updated");

navigation.goBack();

} catch (error) {

console.log("Update error", error);
Alert.alert("Error", "Profile update failed");

} finally {
setLoading(false);
}

};

return (

<ScrollView style={styles.container}>

<Text style={styles.title}>Edit Profile</Text>

<Text style={styles.label}>Name</Text>
<TextInput
style={styles.input}
value={name}
onChangeText={setName}
/>

<Text style={styles.label}>Skills (comma separated)</Text>
<TextInput
style={styles.input}
value={skills}
onChangeText={setSkills}
placeholder="Web Design, Plumbing, Photography"
/>

<Text style={styles.label}>Response Time</Text>
<TextInput
style={styles.input}
value={responseTime}
onChangeText={setResponseTime}
placeholder="30m, 1h"
/>

<Text style={styles.section}>Portfolio</Text>

<Text style={styles.label}>Project Title</Text>
<TextInput
style={styles.input}
value={portfolioTitle}
onChangeText={setPortfolioTitle}
/>

<Text style={styles.label}>Description</Text>
<TextInput
style={[styles.input, { height: 80 }]}
value={portfolioDesc}
onChangeText={setPortfolioDesc}
multiline
/>

<TouchableOpacity
style={styles.saveBtn}
onPress={updateProfile}
disabled={loading}
>
<Text style={styles.saveText}>
{loading ? "Updating..." : "Save Changes"}
</Text>
</TouchableOpacity>

</ScrollView>

);

}

const styles = StyleSheet.create({

container:{
flex:1,
backgroundColor:"#F5F6FA",
padding:20
},

title:{
fontSize:22,
fontWeight:"bold",
marginBottom:20
},

label:{
marginBottom:5,
fontWeight:"600"
},

input:{
backgroundColor:"white",
padding:12,
borderRadius:8,
marginBottom:15
},

section:{
fontSize:18,
fontWeight:"bold",
marginTop:20,
marginBottom:10
},

saveBtn:{
backgroundColor:"#3B6EF6",
padding:15,
borderRadius:8,
alignItems:"center",
marginTop:20
},

saveText:{
color:"white",
fontWeight:"bold"
}

});