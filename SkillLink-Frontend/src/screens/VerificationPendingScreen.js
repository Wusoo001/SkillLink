import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { resendVerificationEmail } from '../services/api';

export default function VerificationPendingScreen({ navigation, route }) {
  const { email } = route.params || {};
  const { colors } = useTheme();
  const [loading, setLoading] = useState(false);

  const handleResend = async () => {
    if (!email) {
      Alert.alert('Error', 'No email provided');
      return;
    }
    setLoading(true);
    try {
      const res = await resendVerificationEmail(email);
      if (res.success) {
        Alert.alert('Success', 'Verification email sent. Check your inbox.');
      } else {
        Alert.alert('Error', res.message || 'Failed to resend.');
      }
    } catch (error) {
      Alert.alert('Error', 'Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Ionicons name="mail-outline" size={80} color={colors.primary} style={styles.icon} />
        <Text style={[styles.title, { color: colors.textPrimary }]}>Check Your Email</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          We've sent a verification link to:
        </Text>
        <Text style={[styles.email, { color: colors.primary }]}>{email || 'your email'}</Text>
        <Text style={[styles.instruction, { color: colors.textSecondary }]}>
          Please click the link in the email to verify your account.
        </Text>

        <TouchableOpacity
          style={[styles.resendButton, { backgroundColor: colors.primary }]}
          onPress={handleResend}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={colors.textInverse} />
          ) : (
            <Text style={[styles.resendText, { color: colors.textInverse }]}>
              Resend Verification Email
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.loginLink}
          onPress={() => navigation.replace('Landing')}
        >
          <Text style={[styles.loginText, { color: colors.textTertiary }]}>
            Already verified? Login
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  icon: { marginBottom: 20 },
  title: { fontSize: 28, fontWeight: '700', marginBottom: 8 },
  subtitle: { fontSize: 16, marginBottom: 4 },
  email: { fontSize: 18, fontWeight: '600', marginBottom: 16 },
  instruction: { fontSize: 14, textAlign: 'center', marginBottom: 24, lineHeight: 20 },
  resendButton: {
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 40,
    marginBottom: 16,
    width: '100%',
    alignItems: 'center',
  },
  resendText: { fontWeight: '600', fontSize: 16 },
  loginLink: { paddingVertical: 10 },
  loginText: { fontSize: 15, fontWeight: '500' },
});