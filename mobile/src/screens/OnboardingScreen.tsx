import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, SafeAreaView, Image } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import type { AuthStackParamList } from '../navigation/AuthNavigator'

type OnboardingScreenNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'Onboarding'>

const { width, height } = Dimensions.get('window')

export const OnboardingScreen: React.FC = () => {
  const navigation = useNavigation<OnboardingScreenNavigationProp>()

  const handleLogin = () => {
    navigation.navigate('Login')
  }

  const handleSignUp = () => {
    navigation.navigate('Register')
  }

  return (
    <LinearGradient
      colors={['#8B5CF6', '#EC4899']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          {/* Header with logo and branding */}
          <View style={styles.header}>
            <Image
              source={require('../assets/axis-logo-white.png')}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={styles.title}>axis</Text>
            <Text style={styles.subtitle}>imaging</Text>
          </View>

          {/* Main messaging */}
          <View style={styles.messaging}>
            <Text style={styles.tagline}>Radiology that puts your patients first</Text>
            <Text style={styles.description}>
              We make cutting-edge imaging clear, simple and accessible – delivering expert diagnostic services with compassionate care that you can trust for your patients.
            </Text>
          </View>

          {/* Patient image */}
          <View style={styles.imageContainer}>
            <View style={styles.imagePlaceholder}>
              <View style={styles.patientIcon}>
                <View style={styles.patientIconInner}>
                  <Text style={styles.patientIconText}>📱</Text>
                </View>
              </View>
              <Text style={styles.imageCaption}>Secure access to your results</Text>
            </View>
          </View>

          {/* App Store Badges */}
          <View style={styles.badgeContainer}>
            <Text style={styles.badgeText}>Download our mobile app</Text>
            <View style={styles.badgeRow}>
              <TouchableOpacity style={styles.badge} activeOpacity={0.8}>
                <Image
                  source={require('../assets/download-on-the-app-store-apple-logo.svg')}
                  style={styles.badgeImage}
                  resizeMode="contain"
                />
              </TouchableOpacity>
              <TouchableOpacity style={styles.badge} activeOpacity={0.8}>
                <Image
                  source={require('../assets/Google_Play-Badge-Logo.wine.svg')}
                  style={styles.badgeImage}
                  resizeMode="contain"
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Action buttons */}
          <View style={styles.actionContainer}>
            <TouchableOpacity
              style={styles.getStartedButton}
              onPress={handleSignUp}
              activeOpacity={0.9}
            >
              <Text style={styles.getStartedButtonText}>Let's Get Started</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.loginButton}
              onPress={handleLogin}
              activeOpacity={0.9}
            >
              <Text style={styles.loginButtonText}>Already have an account? Sign In</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Bottom indicator */}
        <View style={styles.bottomIndicator}>
          <View style={styles.indicatorBar} />
        </View>
      </SafeAreaView>
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
    justifyContent: 'space-between',
  },
  header: {
    alignItems: 'center',
    paddingTop: 20,
  },
  logo: {
    width: 80,
    height: 40,
    marginBottom: 16,
    tintColor: '#FFFFFF',
  },
  title: {
    fontSize: 56,
    fontWeight: '300',
    color: '#FFFFFF',
    letterSpacing: 3,
    fontFamily: 'System',
  },
  subtitle: {
    fontSize: 24,
    fontWeight: '300',
    color: '#FFFFFF',
    letterSpacing: 2,
    marginTop: -8,
    fontFamily: 'System',
  },
  messaging: {
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  tagline: {
    fontSize: 28,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 36,
    marginBottom: 20,
    fontFamily: 'System',
  },
  description: {
    fontSize: 16,
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 24,
    opacity: 0.9,
    fontFamily: 'System',
  },
  imageContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  imagePlaceholder: {
    width: width * 0.7,
    height: width * 0.5,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  patientIcon: {
    width: 120,
    height: 120,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  patientIconInner: {
    width: 80,
    height: 80,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  patientIconText: {
    fontSize: 32,
  },
  imageCaption: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.8,
    fontFamily: 'System',
  },
  badgeContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  badgeText: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.8,
    marginBottom: 12,
    fontFamily: 'System',
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 16,
    alignItems: 'center',
  },
  badge: {
    opacity: 0.9,
  },
  badgeImage: {
    width: 120,
    height: 40,
  },
  actionContainer: {
    paddingBottom: 40,
  },
  getStartedButton: {
    backgroundColor: '#00BCD4',
    paddingVertical: 18,
    paddingHorizontal: 32,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  getStartedButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 0.5,
    fontFamily: 'System',
  },
  loginButton: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 16,
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  loginButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
    letterSpacing: 0.3,
    fontFamily: 'System',
  },
  bottomIndicator: {
    alignItems: 'center',
    paddingBottom: 20,
  },
  indicatorBar: {
    width: 120,
    height: 4,
    backgroundColor: '#FFFFFF',
    borderRadius: 2,
    opacity: 0.8,
  },
})