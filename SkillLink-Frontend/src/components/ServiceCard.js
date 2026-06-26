import React from "react";
import {
View,
Text,
StyleSheet,
TouchableOpacity,
Image
} from "react-native";

export default function ServiceCard({ post, navigation }) {

return (

<View style={styles.card}>

{/* USER INFO */}

<View style={styles.userRow}>

<Image
source={{
uri:
post.user?.avatar ||
"https://cdn-icons-png.flaticon.com/512/149/149071.png"
}}
style={styles.avatar}
/>

<Text style={styles.username}>
{post.user?.name || "User"}
</Text>

</View>

{/* SERVICE TITLE */}

<Text style={styles.title}>
{post.title}
</Text>

{/* DESCRIPTION */}

<Text style={styles.description}>
{post.description}
</Text>

{/* BUDGET */}

<Text style={styles.budget}>
Budget: ₦{post.budget || "N/A"}
</Text>

{/* ACTION BUTTONS */}

<View style={styles.buttonRow}>

<TouchableOpacity
style={styles.profileBtn}
onPress={() =>
navigation.navigate("UserProfile", {
userId: post.user?._id
})
}
>
<Text style={styles.btnText}>View Profile</Text>
</TouchableOpacity>

<TouchableOpacity
style={styles.bookBtn}
onPress={() =>
navigation.navigate("BookingScreen", {
providerId: post.user?._id
})
}
>
<Text style={styles.btnText}>Book</Text>
</TouchableOpacity>

</View>

</View>

);
}

const styles = StyleSheet.create({

card:{
backgroundColor:"white",
padding:15,
marginBottom:15,
borderRadius:10,
shadowColor:"#000",
shadowOpacity:0.05,
shadowRadius:5
},

userRow:{
flexDirection:"row",
alignItems:"center",
marginBottom:10
},

avatar:{
width:35,
height:35,
borderRadius:18,
marginRight:10
},

username:{
fontWeight:"bold"
},

title:{
fontSize:16,
fontWeight:"bold",
marginBottom:5
},

description:{
color:"#555",
marginBottom:6
},

budget:{
fontWeight:"bold",
marginBottom:10
},

buttonRow:{
flexDirection:"row",
justifyContent:"space-between"
},

profileBtn:{
backgroundColor:"#4CAF50",
padding:8,
borderRadius:6
},

bookBtn:{
backgroundColor:"#3B6EF6",
padding:8,
borderRadius:6
},

btnText:{
color:"white",
fontWeight:"bold"
}

});