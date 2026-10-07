import React from "react";
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../context/ThemeContext";

export default function TermsScreen() {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          style={[styles.backBtn, { backgroundColor: colors.card, borderColor: colors.inputBorder }]}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Terms & Conditions</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.lastUpdated, { color: colors.textTertiary }]}>
          Last Updated: {new Date().toLocaleDateString()}
        </Text>

        <Section title="1. Acceptance of Terms" colors={colors}>
          By creating an account or using Street, you agree to these Terms. If you do not agree,
          do not use the app.
        </Section>

        <Section title="2. Eligibility" colors={colors}>
          You must be at least 18 years old and legally able to enter into contracts in Nigeria.
        </Section>

        <Section title="3. Account Responsibilities" colors={colors}>
          • You are responsible for keeping your password secure{"\n"}
          • You must provide accurate information{"\n"}
          • You may not impersonate others or create multiple accounts{"\n"}
          • You must not use the app for any illegal purpose
        </Section>

        <Section title="4. Service Provider Obligations" colors={colors}>
          If you offer services on Street:{"\n"}
          • You must accurately describe your skills and pricing{"\n"}
          • You must complete accepted jobs in good faith{"\n"}
          • You must not solicit customers to pay outside the app{"\n"}
          • You must not share contact details before a paid booking
        </Section>

        <Section title="5. Customer Obligations" colors={colors}>
          If you book services:{"\n"}
          • You must provide accurate job details{"\n"}
          • You must pay through the app only{"\n"}
          • You must confirm job completion honestly
        </Section>

        <Section title="6. Payments & Escrow" colors={colors}>
          • All payments are processed via licensed providers{"\n"}
          • Funds are held in escrow until job completion is confirmed{"\n"}
          • Street charges a service fee on each transaction{"\n"}
          • Refunds are subject to our dispute policy
        </Section>

        <Section title="7. Prohibited Conduct" colors={colors}>
          You may not:{"\n"}
          • Take transactions off-platform to avoid fees{"\n"}
          • Harass, threaten, or defraud other users{"\n"}
          • Post false, misleading, or illegal content{"\n"}
          • Attempt to hack, scrape, or reverse-engineer the app
        </Section>

        <Section title="8. Content" colors={colors}>
          You retain ownership of content you post. By posting, you grant Street a license to
          display it within the app. We may remove content that violates these Terms.
        </Section>

        <Section title="9. Suspension & Termination" colors={colors}>
          We may suspend or delete accounts that violate these Terms, engage in fraud, or harm
          other users. You may delete your own account at any time via Settings.
        </Section>

        <Section title="10. Disclaimers" colors={colors}>
          Street is a marketplace — we do not provide the services ourselves. We are not liable
          for the quality, safety, or legality of services provided by third parties.
        </Section>

        <Section title="11. Limitation of Liability" colors={colors}>
          To the maximum extent permitted by law, Street is not liable for indirect, incidental,
          or consequential damages arising from your use of the app.
        </Section>

        <Section title="12. Governing Law" colors={colors}>
          These Terms are governed by the laws of the Federal Republic of Nigeria.
        </Section>

        <Section title="13. Changes to Terms" colors={colors}>
          We may update these Terms. Continued use of Street after changes means you accept the
          new Terms.
        </Section>

        <Section title="14. Contact" colors={colors}>
          Questions? Contact: support@streetapp.ng
        </Section>
      </ScrollView>
    </View>
  );
}

const Section = ({ title, children, colors }) => (
  <View style={styles.section}>
    <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{title}</Text>
    <Text style={[styles.sectionBody, { color: colors.textSecondary }]}>{children}</Text>
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
  title: { fontSize: 18, fontWeight: "800", letterSpacing: -0.3, flex: 1 },
  content: { paddingHorizontal: 20 },
  lastUpdated: { fontSize: 12, fontWeight: "500", marginBottom: 16 },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 15, fontWeight: "700", marginBottom: 6, letterSpacing: -0.2 },
  sectionBody: { fontSize: 13.5, lineHeight: 21, fontWeight: "400" },
});