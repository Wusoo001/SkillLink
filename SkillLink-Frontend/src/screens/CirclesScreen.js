import React, { useState, useCallback, useContext } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { AuthContext } from "../../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { getCircles, getMyCircle, joinCircle } from "../services/api";

export default function CirclesScreen() {
  const navigation = useNavigation();
  const { user } = useContext(AuthContext);
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const [myCircle, setMyCircle] = useState(null);
  const [myCircleMessage, setMyCircleMessage] = useState("");
  const [circles, setCircles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [joining, setJoining] = useState(false);

  const load = async () => {
    try {
      const [mineRes, listRes] = await Promise.all([getMyCircle(), getCircles(1, 20)]);
      if (mineRes?.success) {
        setMyCircle(mineRes.data);
        setMyCircleMessage(mineRes.message || "");
      }
      if (listRes?.success) {
        setCircles(listRes.data || []);
      }
    } catch (error) {
      console.log("Load circles error:", error);
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

  const handleOpen = (circle) => {
    navigation.navigate("CircleDetail", {
      circleId: circle._id,
      circleName: circle.name,
    });
  };

  const handleJoinAndOpen = async (circle) => {
    if (joining) return;
    setJoining(true);
    try {
      await joinCircle(circle._id);
      handleOpen(circle);
    } catch (error) {
      Alert.alert("Error", error.response?.data?.message || "Could not join circle");
    } finally {
      setJoining(false);
    }
  };

  const renderCircleCard = ({ item }) => (
    <TouchableOpacity
      style={[styles.circleCard, { backgroundColor: colors.card, borderColor: colors.inputBorder }]}
      onPress={() => handleOpen(item)}
      activeOpacity={0.85}
    >
      <View style={[styles.circleIcon, { backgroundColor: colors.primaryLight }]}>
        <Ionicons name="people" size={20} color={colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.circleName, { color: colors.textPrimary }]} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={[styles.circleMeta, { color: colors.textTertiary }]}>
          {item.memberCount} member{item.memberCount !== 1 ? "s" : ""} ·{" "}
          {item.requestCount} request{item.requestCount !== 1 ? "s" : ""}
        </Text>
      </View>
      {item.isMember ? (
        <View style={[styles.badge, { backgroundColor: colors.success + "15" }]}>
          <Text style={[styles.badgeText, { color: colors.success }]}>Member</Text>
        </View>
      ) : (
        <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
      )}
    </TouchableOpacity>
  );

  return (
    <View style={[styles.safeArea, { backgroundColor: colors.background, paddingTop: insets.top + 8 }]}>
      {/* Header */}
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

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={circles}
          keyExtractor={(item) => item._id}
          renderItem={renderCircleCard}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
          ListHeaderComponent={
            <>
              {/* ===== YOUR CIRCLE SECTION ===== */}
              <View style={styles.section}>
                <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>
                  YOUR CIRCLE
                </Text>

                {myCircle ? (
                  <TouchableOpacity
                    style={[
                      styles.myCircleCard,
                      { backgroundColor: colors.primaryLight, borderColor: colors.primary + "40" },
                    ]}
                    onPress={() =>
                      myCircle.isMember
                        ? handleOpen(myCircle)
                        : handleJoinAndOpen(myCircle)
                    }
                    activeOpacity={0.85}
                    disabled={joining}
                  >
                    <View style={styles.myCircleTop}>
                      <Ionicons name="home" size={22} color={colors.primary} />
                      <Text style={[styles.myCircleName, { color: colors.textPrimary }]}>
                        {myCircle.name}
                      </Text>
                    </View>
                    <Text style={[styles.myCircleSub, { color: colors.textSecondary }]}>
                      {myCircle.memberCount} member{myCircle.memberCount !== 1 ? "s" : ""} in your area
                    </Text>
                    <View style={[styles.myCircleBtn, { backgroundColor: colors.primary }]}>
                      <Text style={[styles.myCircleBtnText, { color: colors.textInverse }]}>
                        {myCircle.isMember ? "Open Circle" : joining ? "Joining..." : "Join Circle"}
                      </Text>
                      <Ionicons
                        name="arrow-forward"
                        size={14}
                        color={colors.textInverse}
                      />
                    </View>
                  </TouchableOpacity>
                ) : (
                  <View
                    style={[
                      styles.comingSoonCard,
                      { backgroundColor: colors.card, borderColor: colors.inputBorder },
                    ]}
                  >
                    <Ionicons
                      name="time-outline"
                      size={26}
                      color={colors.textTertiary}
                    />
                    <Text style={[styles.comingSoonTitle, { color: colors.textPrimary }]}>
                      {myCircleMessage || "Your circle is coming soon"}
                    </Text>
                    <Text style={[styles.comingSoonSub, { color: colors.textTertiary }]}>
                      {user?.locationDetails?.city
                        ? "We'll notify you when Street Circles launches in your area."
                        : "Set your LGA in your profile to see your local circle."}
                    </Text>
                  </View>
                )}
              </View>

              {/* ===== ACTIVE CIRCLES SECTION ===== */}
              {circles.length > 0 && (
                <Text style={[styles.sectionLabel, { color: colors.textTertiary, marginTop: 20 }]}>
                  ACTIVE CIRCLES
                </Text>
              )}
            </>
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="people-outline" size={44} color={colors.textTertiary} />
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
                No active circles yet
              </Text>
              <Text style={[styles.emptySub, { color: colors.textTertiary }]}>
                Street Circles is rolling out one neighborhood at a time. We'll be in your area soon.
              </Text>
            </View>
          }
        />
      )}
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
  listContent: { paddingHorizontal: 20, paddingBottom: 100 },
  section: { marginBottom: 8 },
  sectionLabel: {
    fontSize: 11.5,
    fontWeight: "800",
    letterSpacing: 0.6,
    marginBottom: 10,
  },
  myCircleCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
  },
  myCircleTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  myCircleName: { fontSize: 16, fontWeight: "800", letterSpacing: -0.2 },
  myCircleSub: { fontSize: 12.5, fontWeight: "500", marginBottom: 14 },
  myCircleBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 11,
    borderRadius: 12,
  },
  myCircleBtnText: { fontSize: 14, fontWeight: "700" },
  comingSoonCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 20,
    alignItems: "center",
  },
  comingSoonTitle: {
    fontSize: 15,
    fontWeight: "800",
    marginTop: 10,
    marginBottom: 6,
    textAlign: "center",
  },
  comingSoonSub: {
    fontSize: 12.5,
    lineHeight: 18,
    textAlign: "center",
  },
  circleCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
  },
  circleIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  circleName: { fontSize: 14.5, fontWeight: "700", marginBottom: 2 },
  circleMeta: { fontSize: 11.5, fontWeight: "500" },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  badgeText: { fontSize: 10.5, fontWeight: "800", letterSpacing: 0.2 },
  emptyContainer: {
    alignItems: "center",
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyTitle: { fontSize: 16, fontWeight: "700", marginTop: 12, marginBottom: 6 },
  emptySub: { fontSize: 13, textAlign: "center", lineHeight: 19, maxWidth: 280 },
});