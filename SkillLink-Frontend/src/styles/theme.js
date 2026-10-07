// src/styles/theme.js
export const lightTheme = {
  // Backgrounds
  background: '#F9F8FC',        // subtle lavender-tinted gray
  card: '#FFFFFF',
  cardBorder: '#EFEBFA',        // soft lavender border
  inputBackground: '#F5F3FA',
  inputBorder: '#E4DEF5',       // lavender-tinted

  // Text
  textPrimary: '#0F0B1A',        // deep violet-black (from your palette)
  textSecondary: '#4A4358',      // muted violet-gray
  textTertiary: '#8A8499',
  textInverse: '#FFFFFF',

  // Brand
  primary: '#5B3CC4',            // Deep Violet — main action color
  primaryLight: '#E9E3FF',       // Soft Lavender — icon backgrounds, chips
  primaryAccent: '#7C4DFF',      // Violet Accent — highlights, gradients

  // Status
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  gray: '#E9E3FF',
  grayText: '#4A4358',

  // Shadows
  shadowColor: '#5B3CC4',        // shadow tinted slightly violet
  shadowOpacity: 0.06,

  // Status badges
  status: {
    pending: '#F59E0B',
    confirmed: '#7C4DFF',
    completed: '#10B981',
    cancelled: '#EF4444',
    awaiting_payment: '#F59E0B',
    paid_in_escrow: '#10B981',
  },
};

export const darkTheme = {
  background: '#0F0B1A',         // Deep Background — from your palette
  card: '#1A1428',               // slightly lifted violet-black
  cardBorder: '#2A1F3D',
  inputBackground: '#1A1428',
  inputBorder: '#2D2444',

  // Text
  textPrimary: '#F5F3FA',
  textSecondary: '#C4BED4',
  textTertiary: '#8A8499',
  textInverse: '#0F0B1A',

  // Brand
  primary: '#7C4DFF',            // Violet Accent — brighter for dark mode contrast
  primaryLight: '#2A1F4D',       // dark violet tint for icon backgrounds
  primaryAccent: '#9D71FF',      // brighter accent on dark

  // Status
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  gray: '#2A1F3D',
  grayText: '#C4BED4',

  // Shadows
  shadowColor: '#000000',
  shadowOpacity: 0.3,

  // Status badges
  status: {
    pending: '#F59E0B',
    confirmed: '#7C4DFF',
    completed: '#10B981',
    cancelled: '#EF4444',
    awaiting_payment: '#F59E0B',
    paid_in_escrow: '#10B981',
  },
};