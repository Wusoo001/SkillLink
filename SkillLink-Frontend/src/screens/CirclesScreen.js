import React, { useState, useCallback, useContext } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { AuthContext } from "../../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { getMyCircle, joinCircle } from "../services/api";

export default function CirclesScreen() {
  const navigation = useNavigation();
  const { user } = useContext(AuthContext);
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const [myCircle, setMyCircle] = useState(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [joining, setJoining] = useState(false);

  const load = async () => {
    try {
      const res = await getMyCircle();
      if (res?.success) {
        setMyCircle(res.data);
        setMessage(res.message || "");
      }
    } catch (error) {
      console.log("Load my circle error:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      load();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const handleJoin = async () => {
    if (!myCircle || joining) return;
    setJoining(true);
    try {
      await joinCircle(myCircle._id);
      await load();
    } catch (err) {
      Alert.alert("Error", err.response?.data?.message || "Could not join circle");
    } finally {
      setJoining(false);
    }
  };

  const handleOpen = () => {
    if (!myCircle) return;
    navigation.navigate("CircleDetail", {
      circleId: myCircle._id,
      circleName: myCircle.name,
    });
  };

  if (loading) {
    return (
      <View style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: colors.card, borderColor: colors.inputBorder }]}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Street Circles</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  const noLgaSet = !user?.locationDetails?.city || !user?.locationDetails?.state;

  return (
    <View style={[styles.safeArea, { backgroundColor: colors.background, paddingTop: insets.top + 8 }]}>
      <View style={styles.header}>
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: colors.card, borderColor: colors.inputBorder }]}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Street Circles</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 40 }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.heroTitle, { color: colors.textPrimary }]}>
          Ask neighbors. Get real recommendations.
        </Text>
        <Text style={[styles.heroSub, { color: colors.textTertiary }]}>
          Your local circle connects you with people nearby who actually know who's good at what.
        </Text>

        {myCircle ? (
          <View
            style={[
              styles.circleCard,
              { backgroundColor: colors.card, borderColor: colors.inputBorder },
            ]}
          >
            <View style={styles.circleHeader}>
              <View style={[styles.circleIconWrap, { backgroundColor: colors.primaryLight }]}>
                <Ionicons name="location" size={22} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={[styles.circleName, { color: colors.textPrimary }]}
                  numberOfLines={1}
                >
                  {myCircle.name}
                </Text>
                <Text style={[styles.circleMeta, { color: colors.textTertiary }]}>
                  {myCircle.memberCount} member{myCircle.memberCount !== 1 ? "s" : ""}
                  {" · "}
                  {myCircle.requestCount} request{myCircle.requestCount !== 1 ? "s" : ""}
                </Text>
              </View>
            </View>

            {myCircle.memberCount < 5 && (
              <View style={[styles.earlyNudge, { backgroundColor: colors.primaryLight }]}>
                <Ionicons name="sparkles-outline" size={14} color={colors.primary} />
                <Text style={[styles.earlyNudgeText, { color: colors.primary }]}>
                  You're among the first here. Every neighbor who joins makes this circle stronger.
                </Text>
              </View>
            )}

            {myCircle.isMember ? (
              <TouchableOpacity
                style={[styles.openBtn, { backgroundColor: colors.primary }]}
                onPress={handleOpen}
                activeOpacity={0.9}
              >
                <Text style={[styles.openBtnText, { color: colors.textInverse }]}>
                  Open Circle
                </Text>
                <Ionicons name="arrow-forward" size={16} color={colors.textInverse} />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[
                  styles.openBtn,
                  { backgroundColor: colors.primary, opacity: joining ? 0.6 : 1 },
                ]}
                onPress={handleJoin}
                disabled={joining}
                activeOpacity={0.9}
              >
                {joining ? (
                  <ActivityIndicator color={colors.textInverse} size="small" />
                ) : (
                  <>
                    <Text style={[styles.openBtnText, { color: colors.textInverse }]}>
                      Join Your Circle
                    </Text>
                    <Ionicons name="arrow-forward" size={16} color={colors.textInverse} />
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View
            style={[
              styles.emptyCard,
              { backgroundColor: colors.card, borderColor: colors.inputBorder },
            ]}
          >
            <View style={[styles.emptyIcon, { backgroundColor: colors.inputBackground }]}>
              <Ionicons
                name={noLgaSet ? "location-outline" : "time-outline"}
                size={32}
                color={colors.textTertiary}
              />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
              {noLgaSet ? "Set Your LGA to Join" : message || "Your circle is coming soon"}
            </Text>
            <Text style={[styles.emptySub, { color: colors.textTertiary }]}>
              {noLgaSet
                ? "Street Circles is organized by your local area. Add your LGA in your profile to see your neighbors' circle."
                : "We'll be in your area soon."}
            </Text>
            {noLgaSet && (
              <TouchableOpacity
                style={[styles.ctaBtn, { backgroundColor: colors.primary }]}
                onPress={() => navigation.navigate("EditProfile")}
                activeOpacity={0.9}
              >
                <Text style={[styles.ctaBtnText, { color: colors.textInverse }]}>
                  Update Profile
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  headerTitle: { fontSize: 20, fontWeight: "800" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  scroll: { paddingHorizontal: 20 },
  heroTitle: {
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.4,
    marginBottom: 8,
  },
  heroSub: {
    fontSize: 13.5,
    lineHeight: 19,
    marginBottom: 24,
  },
  circleCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 18,
  },
  circleHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 14,
  },
  circleIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
  },
  circleName: {
    fontSize: 17,
    fontWeight: "800",
    letterSpacing: -0.2,
    marginBottom: 3,
  },
  circleMeta: { fontSize: 12.5, fontWeight: "500" },
  earlyNudge: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 11,
    borderRadius: 12,
    marginBottom: 14,
  },
  earlyNudgeText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "600",
  },
  openBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
  },
  openBtnText: { fontSize: 14.5, fontWeight: "700", letterSpacing: 0.1 },
  emptyCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 24,
    alignItems: "center",
  },
  emptyIcon: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 8,
    textAlign: "center",
    letterSpacing: -0.2,
  },
  emptySub: {
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
    marginBottom: 20,
    maxWidth: 280,
  },
  ctaBtn: {
    paddingVertical: 13,
    paddingHorizontal: 24,
    borderRadius: 14,
  },
  ctaBtnText: { fontSize: 14, fontWeight: "700" },
});