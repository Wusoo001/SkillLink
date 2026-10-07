import React from "react";
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../context/ThemeContext";

export default function PrivacyPolicyScreen() {
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
        <Text style={[styles.title, { color: colors.textPrimary }]}>Privacy Policy</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.lastUpdated, { color: colors.textTertiary }]}>
          Last Updated: {new Date().toLocaleDateString()}
        </Text>

        <Section title="1. Introduction" colors={colors}>
          Street ("we", "us", "our") operates a mobile application that connects customers with
          local service providers in Nigeria. This Privacy Policy explains how we collect, use,
          and protect your personal information when you use our app.
        </Section>

        <Section title="2. Information We Collect" colors={colors}>
          • Account information: name, email, phone number, password{"\n"}
          • Profile information: photo, bio, skills, location{"\n"}
          • Transaction information: bookings, payments, escrow activity{"\n"}
          • Device information: device type, OS, app version{"\n"}
          • Location data: city/state you provide, and (only during active bookings) work location pins
        </Section>

        <Section title="3. How We Use Your Information" colors={colors}>
          • To create and manage your account{"\n"}
          • To process bookings and payments via third-party providers (Paystack, Pandascrow){"\n"}
          • To verify identity and prevent fraud{"\n"}
          • To send notifications about bookings and account activity{"\n"}
          • To improve the app and customer support
        </Section>

        <Section title="4. Payments & Escrow" colors={colors}>
          We use licensed third-party payment processors. We do not store your card details.
          Escrow funds are held by our licensed escrow partner until job completion is confirmed.
        </Section>

        <Section title="5. Sharing Your Information" colors={colors}>
          We do not sell your personal information. We share data only with:{"\n"}
          • Payment processors (Paystack, Pandascrow){"\n"}
          • Cloud storage providers (Cloudinary) for media{"\n"}
          • Legal authorities when required by law
        </Section>

        <Section title="6. Your Rights" colors={colors}>
          You have the right to:{"\n"}
          • Access, correct, or delete your personal data{"\n"}
          • Withdraw consent at any time{"\n"}
          • Delete your account at any time via Settings → Delete Account{"\n"}
          • Lodge a complaint with the Nigeria Data Protection Commission (NDPC)
        </Section>

        <Section title="7. Data Retention" colors={colors}>
          When you delete your account, we immediately remove your personal data, posts, wallet,
          and reviews. Booking history is anonymized for legal and financial record-keeping.
        </Section>

        <Section title="8. Children" colors={colors}>
          Street is not intended for users under 18. We do not knowingly collect data from minors.
        </Section>

        <Section title="9. Security" colors={colors}>
          We use industry-standard encryption, secure APIs, and access controls to protect your
          data. However, no system is 100% secure — please use a strong password.
        </Section>

        <Section title="10. Contact Us" colors={colors}>
          For privacy concerns, contact: support@streetapp.ng
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