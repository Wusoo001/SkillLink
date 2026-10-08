import React, { useState, useEffect, useRef, useContext, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Image,
} from "react-native";
import { useNavigation, useRoute, useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AuthContext } from "../../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { getMessages, sendMessage } from "../services/api";

export default function ChatScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const { user } = useContext(AuthContext);
  const { colors } = useTheme();

  const {
    bookingId,
    otherPartyName = "User",
    otherPartyImage = null,
  } = route.params || {};

  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [chatOpen, setChatOpen] = useState(true);
  const [blockedMessage, setBlockedMessage] = useState(null);
  const [otherPartyAvatar, setOtherPartyAvatar] = useState(otherPartyImage);

  const listRef = useRef(null);
  const pollingRef = useRef(null);

  // ===== LOAD =====
  const loadMessages = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      try {
        const res = await getMessages(bookingId);
        if (res.success) {
          const msgs = res.data || [];
          setMessages(msgs);
          setChatOpen(res.chatOpen !== false);

          // ✅ Pull other party's avatar from messages if we don't have it
          if (!otherPartyImage && msgs.length > 0) {
            const otherMsg = msgs.find(
              (m) => m.sender?._id && m.sender._id !== user._id
            );
            if (otherMsg?.sender?.profileImage) {
              setOtherPartyAvatar(otherMsg.sender.profileImage);
            }
          }
        }
      } catch (error) {
        if (!silent) Alert.alert("Error", "Could not load messages");
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [bookingId, otherPartyImage, user._id]
  );

  useEffect(() => {
    loadMessages();
    pollingRef.current = setInterval(() => loadMessages(true), 5000);
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [loadMessages]);

  useFocusEffect(
    useCallback(() => {
      loadMessages(true);
    }, [loadMessages])
  );

  // ===== SEND =====
  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;

    setSending(true);
    setBlockedMessage(null);

    const tempMsg = {
      _id: `temp_${Date.now()}`,
      sender: {
        _id: user._id,
        name: user.name,
        profileImage: user.profileImage,
      },
      text: trimmed,
      createdAt: new Date().toISOString(),
      pending: true,
    };
    setMessages((prev) => [...prev, tempMsg]);
    setText("");

    try {
      const res = await sendMessage(bookingId, trimmed);
      if (res.success) {
        setMessages((prev) =>
          prev.map((m) => (m._id === tempMsg._id ? res.data : m))
        );
      }
    } catch (error) {
      const data = error.response?.data;
      setMessages((prev) => prev.filter((m) => m._id !== tempMsg._id));

      if (data?.blocked) {
        setBlockedMessage(data.message || "Message blocked");
        setText(trimmed);
      } else {
        Alert.alert("Error", data?.message || "Failed to send");
      }
    } finally {
      setSending(false);
    }
  };

  // ===== RENDER MESSAGE =====
  const renderMessage = ({ item }) => {
    const isMe = item.sender?._id === user._id;
    const senderImage = item.sender?.profileImage;
    const senderInitial =
      item.sender?.name?.charAt(0)?.toUpperCase() || "U";

    return (
      <View
        style={[
          styles.msgRow,
          { justifyContent: isMe ? "flex-end" : "flex-start" },
        ]}
      >
        {/* ✅ Avatar for other person's messages */}
        {!isMe ? (
          <View style={styles.avatarWrap}>
            {senderImage ? (
              <Image source={{ uri: senderImage }} style={styles.msgAvatar} />
            ) : (
              <View
                style={[
                  styles.msgAvatar,
                  styles.msgAvatarPlaceholder,
                  { backgroundColor: colors.primary },
                ]}
              >
                <Text
                  style={[
                    styles.msgAvatarText,
                    { color: colors.textInverse },
                  ]}
                >
                  {senderInitial}
                </Text>
              </View>
            )}
          </View>
        ) : null}

        <View
          style={[
            styles.bubble,
            isMe
              ? { backgroundColor: colors.primary, borderColor: colors.primary }
              : { backgroundColor: colors.card, borderColor: colors.inputBorder },
            item.pending && { opacity: 0.6 },
          ]}
        >
          <Text
            style={[
              styles.msgText,
              { color: isMe ? colors.textInverse : colors.textPrimary },
            ]}
          >
            {item.text}
          </Text>
          <Text
            style={[
              styles.msgTime,
              {
                color: isMe ? "rgba(255,255,255,0.7)" : colors.textTertiary,
              },
            ]}
          >
            {new Date(item.createdAt).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.safe, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* HEADER */}
        <View
          style={[
            styles.header,
            {
              paddingTop: insets.top + 8,
              backgroundColor: colors.card,
              borderBottomColor: colors.inputBorder,
            },
          ]}
        >
          <TouchableOpacity
            style={[
              styles.backBtn,
              {
                backgroundColor: colors.background,
                borderColor: colors.inputBorder,
              },
            ]}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
          </TouchableOpacity>

          <View style={styles.headerMid}>
            {/* ✅ Header avatar */}
            {otherPartyAvatar ? (
              <Image
                source={{ uri: otherPartyAvatar }}
                style={styles.headerAvatar}
              />
            ) : (
              <View
                style={[
                  styles.headerAvatar,
                  styles.headerAvatarPlaceholder,
                  { backgroundColor: colors.primary },
                ]}
              >
                <Text
                  style={[
                    styles.headerAvatarText,
                    { color: colors.textInverse },
                  ]}
                >
                  {otherPartyName.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            <View style={{ marginLeft: 10, flex: 1 }}>
              <Text
                style={[styles.headerName, { color: colors.textPrimary }]}
                numberOfLines={1}
              >
                {otherPartyName}
              </Text>
              <Text
                style={[styles.headerSub, { color: colors.textTertiary }]}
              >
                {chatOpen ? "Chat active" : "Chat closed"}
              </Text>
            </View>
          </View>

          <View style={{ width: 40 }} />
        </View>

        {/* CHAT BODY */}
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(item) => item._id}
            renderItem={renderMessage}
            contentContainerStyle={[
              styles.listContent,
              { paddingBottom: 16 },
            ]}
            onContentSizeChange={() =>
              listRef.current?.scrollToEnd({ animated: true })
            }
            onLayout={() =>
              listRef.current?.scrollToEnd({ animated: false })
            }
            ListEmptyComponent={
              <View style={styles.empty}>
                <Ionicons
                  name="chatbubble-ellipses-outline"
                  size={44}
                  color={colors.textTertiary}
                />
                <Text
                  style={[styles.emptyTitle, { color: colors.textPrimary }]}
                >
                  No messages yet
                </Text>
                <Text
                  style={[styles.emptyText, { color: colors.textTertiary }]}
                >
                  Say hi and discuss the job details.
                </Text>
              </View>
            }
          />
        )}

        {/* BLOCKED WARNING */}
        {blockedMessage ? (
          <View
            style={[
              styles.blockBanner,
              {
                backgroundColor: colors.danger + "15",
                borderColor: colors.danger + "40",
              },
            ]}
          >
            <Ionicons name="warning" size={16} color={colors.danger} />
            <Text style={[styles.blockText, { color: colors.danger }]}>
              {blockedMessage}
            </Text>
          </View>
        ) : null}

        {/* INPUT */}
        {chatOpen ? (
          <View
            style={[
              styles.inputBar,
              {
                backgroundColor: colors.card,
                borderTopColor: colors.inputBorder,
                paddingBottom: Math.max(insets.bottom, 10),
              },
            ]}
          >
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.inputBackground,
                  borderColor: colors.inputBorder,
                  color: colors.textPrimary,
                },
              ]}
              value={text}
              onChangeText={setText}
              placeholder="Type a message..."
              placeholderTextColor={colors.textTertiary}
              multiline
              maxLength={2000}
            />
            <TouchableOpacity
              style={[
                styles.sendBtn,
                {
                  backgroundColor: colors.primary,
                  opacity: !text.trim() || sending ? 0.5 : 1,
                },
              ]}
              onPress={handleSend}
              disabled={!text.trim() || sending}
              activeOpacity={0.85}
            >
              {sending ? (
                <ActivityIndicator size="small" color={colors.textInverse} />
              ) : (
                <Ionicons name="send" size={18} color={colors.textInverse} />
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <View
            style={[
              styles.closedBar,
              {
                backgroundColor: colors.card,
                borderTopColor: colors.inputBorder,
                paddingBottom: Math.max(insets.bottom, 10),
              },
            ]}
          >
            <Ionicons
              name="lock-closed-outline"
              size={16}
              color={colors.textTertiary}
            />
            <Text
              style={[styles.closedText, { color: colors.textTertiary }]}
            >
              This chat is closed.
            </Text>
          </View>
        )}
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingBottom: 12,
    borderBottomWidth: 1,
    gap: 10,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  headerMid: { flex: 1, flexDirection: "row", alignItems: "center" },
  headerAvatar: { width: 38, height: 38, borderRadius: 19 },
  headerAvatarPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  headerAvatarText: { fontWeight: "700", fontSize: 15 },
  headerName: { fontSize: 15, fontWeight: "700", letterSpacing: -0.2 },
  headerSub: { fontSize: 11.5, fontWeight: "500", marginTop: 1 },

  listContent: { paddingHorizontal: 14, paddingTop: 12, gap: 10 },
  msgRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    marginBottom: 2,
  },

  // ✅ Per-message avatar
  avatarWrap: { width: 32, height: 32 },
  msgAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
  },
  msgAvatarPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  msgAvatarText: { fontSize: 13, fontWeight: "800" },

  bubble: {
    maxWidth: "72%",
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 16,
    borderWidth: 1,
  },
  msgText: { fontSize: 14.5, lineHeight: 20, fontWeight: "500" },
  msgTime: { fontSize: 10.5, marginTop: 4, alignSelf: "flex-end" },

  empty: { alignItems: "center", paddingTop: 60 },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginTop: 12,
    marginBottom: 4,
  },
  emptyText: { fontSize: 13, textAlign: "center", maxWidth: 240 },

  blockBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 8,
  },
  blockText: { fontSize: 12.5, fontWeight: "600", flex: 1 },

  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 12,
    paddingTop: 10,
    gap: 8,
    borderTopWidth: 1,
  },
  input: {
    flex: 1,
    minHeight: 42,
    maxHeight: 110,
    borderRadius: 21,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14.5,
    fontWeight: "500",
    borderWidth: 1,
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },

  closedBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingTop: 14,
    borderTopWidth: 1,
  },
  closedText: { fontSize: 13, fontWeight: "600" },
});