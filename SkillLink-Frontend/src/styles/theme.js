// src/styles/theme.js
export const lightTheme = {
  // Backgrounds
  background: '#F8FAFC',
  card: '#FFFFFF',
  cardBorder: '#F0F2F5',
  inputBackground: '#F8FAFC',
  inputBorder: '#E2E8F0',
  // Text
  textPrimary: '#0F172A',
  textSecondary: '#334155',
  textTertiary: '#64748B',
  textInverse: '#FFFFFF',
  // UI Elements
  primary: '#2563EB',
  primaryLight: '#EFF6FF',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  gray: '#E2E8F0',
  grayText: '#475569',
  // Shadows
  shadowColor: '#000000',
  shadowOpacity: 0.05,
  // Status colors (matching existing)
  status: {
    pending: '#F59E0B',
    confirmed: '#3B82F6',
    completed: '#10B981',
    cancelled: '#EF4444',
    awaiting_payment: '#F59E0B',
    paid_in_escrow: '#10B981',
  },
};

export const darkTheme = {
  background: '#0F172A',
  card: '#1E293B',
  cardBorder: '#334155',
  inputBackground: '#1E293B',
  inputBorder: '#334155',
  textPrimary: '#F1F5F9',
  textSecondary: '#CBD5E1',
  textTertiary: '#94A3B8',
  textInverse: '#0F172A',
  primary: '#3B82F6',
  primaryLight: '#1E293B',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  gray: '#334155',
  grayText: '#94A3B8',
  shadowColor: '#000000',
  shadowOpacity: 0.2,
  status: {
    pending: '#F59E0B',
    confirmed: '#3B82F6',
    completed: '#10B981',
    cancelled: '#EF4444',
    awaiting_payment: '#F59E0B',
    paid_in_escrow: '#10B981',
  },
};