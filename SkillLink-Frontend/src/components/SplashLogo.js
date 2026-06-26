// src/components/SplashLogo.js
import React, { useEffect, useRef } from 'react';
import { View, Image, Animated, StyleSheet,Text } from 'react-native';
import { useTheme } from '../context/ThemeContext';


export default function SplashLogo() {
  const fadeAnim = useRef(new Animated.Value(0.5)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const { colors } = useTheme()

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 4,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.logoContainer,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <Image
          source={require('../../assets/images/street_logo.png')} // ✅ replace with your file name
          style={styles.logoImage}
          resizeMode="contain"
        />
          <Text style={[styles.motto, { color: colors.textTertiary }]}>Connect · Service · Grow</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  logoContainer: {
    alignItems: 'center',
  },
  logoImage: {
    width: 200,   // adjust as needed
    height: 200,  // adjust as needed
  },

});