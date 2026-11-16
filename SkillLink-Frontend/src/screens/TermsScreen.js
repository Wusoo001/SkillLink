import React from "react";
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Linking } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../context/ThemeContext";

// ===== LEGAL DOCUMENT METADATA =====
// ⚠️ Update this when the terms are materially changed.
// Format: "Month DD, YYYY"
const LAST_UPDATED = "November 16, 2026";
const TERMS_VERSION = "1.0";
const SUPPORT_EMAIL = "support@streetapp.ng";

export default function TermsScreen() {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const handleEmailPress = () => {
    Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=Street Terms Question`).catch(() => {});
  };

  return (
    <View style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          style={[
            styles.backBtn,
            { backgroundColor: colors.card, borderColor: colors.inputBorder },
          ]}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          Terms & Conditions
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.metaRow, { borderBottomColor: colors.inputBorder }]}>
          <Text style={[styles.lastUpdated, { color: colors.textTertiary }]}>
            Last Updated: {LAST_UPDATED}
          </Text>
          <Text style={[styles.version, { color: colors.textTertiary }]}>
            v{TERMS_VERSION}
          </Text>
        </View>

        {renderSection("1. Acceptance of Terms", colors,
          "By creating an account or using Street, you agree to these Terms. If you do not agree, do not use the app."
        )}

        {renderSection("2. Eligibility", colors,
          "You must be at least 18 years old and legally able to enter into contracts in Nigeria."
        )}

        {renderSection("3. Account Responsibilities", colors,
          "• You are responsible for keeping your password secure\n• You must provide accurate information\n• You may not impersonate others or create multiple accounts\n• You must not use the app for any illegal purpose"
        )}

        {renderSection("4. Service Provider Obligations", colors,
          "If you offer services on Street:\n• You must accurately describe your skills and pricing\n• You must complete accepted jobs in good faith\n• You must not solicit customers to pay outside the app\n• You must not share contact details before a paid booking"
        )}

        {renderSection("5. Customer Obligations", colors,
          "If you book services:\n• You must provide accurate job details\n• You must pay through the app only\n• You must confirm job completion honestly"
        )}

        {renderSection("6. Payments & Escrow", colors,
          "• All payments are processed via licensed providers\n• Funds are held in escrow until job completion is confirmed\n• Street charges a service fee on each transaction\n• Refunds are subject to our dispute policy"
        )}

        {renderSection("7. Prohibited Conduct", colors,
          "You may not:\n• Take transactions off-platform to avoid fees\n• Harass, threaten, or defraud other users\n• Post false, misleading, or illegal content\n• Attempt to hack, scrape, or reverse-engineer the app"
        )}

        {renderSection("8. Content", colors,
          "You retain ownership of content you post. By posting, you grant Street a license to display it within the app. We may remove content that violates these Terms."
        )}

        {renderSection("9. Suspension & Termination", colors,
          "We may suspend or delete accounts that violate these Terms, engage in fraud, or harm other users. You may delete your own account at any time via Settings."
        )}

        {renderSection("10. Disclaimers", colors,
          "Street is a marketplace — we do not provide the services ourselves. We are not liable for the quality, safety, or legality of services provided by third parties."
        )}

        {renderSection("11. Limitation of Liability", colors,
          "To the maximum extent permitted by law, Street is not liable for indirect, incidental, or consequential damages arising from your use of the app."
        )}

        {renderSection("12. Governing Law", colors,
          "These Terms are governed by the laws of the Federal Republic of Nigeria."
        )}

        {renderSection("13. Changes to Terms", colors,
          "We may update these Terms. Continued use of Street after changes means you accept the new Terms."
        )}

        {/* Contact — with tappable email */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            14. Contact
          </Text>
          <Text style={[styles.sectionBody, { color: colors.textSecondary }]}>
            Questions? Contact:{" "}
            <Text
              style={[styles.link, { color: colors.primary }]}
              onPress={handleEmailPress}
              selectable
            >
              {SUPPORT_EMAIL}
            </Text>
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const renderSection = (title, colors, content) => (
  <View style={styles.section}>
    <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
      {title}
    </Text>
    <Text style={[styles.sectionBody, { color: colors.textSecondary }]}>
      {content}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginBottom: 12,
    gap: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: -0.3,
    flex: 1,
  },
  content: { paddingHorizontal: 20 },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 12,
    marginBottom: 16,
    borderBottomWidth: 1,
  },
  lastUpdated: { fontSize: 12, fontWeight: "500" },
  version: { fontSize: 11, fontWeight: "700", letterSpacing: 0.3 },
  section: { marginBottom: 20 },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 6,
    letterSpacing: -0.2,
  },
  sectionBody: { fontSize: 13.5, lineHeight: 21, fontWeight: "400" },
  link: { fontWeight: "700", textDecorationLine: "underline" },
});