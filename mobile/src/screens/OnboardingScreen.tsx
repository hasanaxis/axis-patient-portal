import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Linking, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const { width: screenWidth } = Dimensions.get('window');

const OnboardingScreen: React.FC = () => {
  const handleContinueInApp = () => {
    // Navigate to registration screen
    console.log('Continue in app');
  };

  const handleLogin = () => {
    // Navigate to login screen
    console.log('Navigate to login');
  };

  const handleAppStorePress = () => {
    Linking.openURL('https://apps.apple.com/axis-imaging');
  };

  const handleGooglePlayPress = () => {
    Linking.openURL('https://play.google.com/store/apps/axis-imaging');
  };

  return (
    <LinearGradient
      colors={['#9333ea', '#ec4899', '#9333ea']}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Logo and Header */}
        <View style={styles.headerSection}>
          <Text style={styles.logoText}>AXIS</Text>
          <Text style={styles.logoSubtext}>imaging</Text>
          <Text style={styles.welcomeTitle}>Welcome to Axis Imaging</Text>
          <Text style={styles.subtitle}>
            Your medical imaging results, accessible anytime, anywhere
          </Text>
        </View>

        {/* Main Card */}
        <View style={styles.mainCard}>
          <Text style={styles.cardTitle}>Access Your Results</Text>
          <Text style={styles.cardSubtitle}>
            Choose how you'd like to view your medical imaging
          </Text>

          {/* App Store Badges */}
          <View style={styles.badgeContainer}>
            <Pressable 
              style={[styles.badge, styles.appStoreBadge]}
              onPress={handleAppStorePress}
            >
              <Ionicons name="logo-apple" size={24} color="white" />
              <View style={styles.badgeTextContainer}>
                <Text style={styles.badgeTopText}>Download on the</Text>
                <Text style={styles.badgeBottomText}>App Store</Text>
              </View>
            </Pressable>

            <Pressable 
              style={[styles.badge, styles.playStoreBadge]}
              onPress={handleGooglePlayPress}
            >
              <Ionicons name="logo-google-playstore" size={24} color="white" />
              <View style={styles.badgeTextContainer}>
                <Text style={styles.badgeTopText}>Get it on</Text>
                <Text style={styles.badgeBottomText}>Google Play</Text>
              </View>
            </Pressable>
          </View>

          {/* OR Divider */}
          <View style={styles.dividerContainer}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Continue in App Button */}
          <View style={styles.continueSection}>
            <Pressable 
              style={styles.continueButton}
              onPress={handleContinueInApp}
            >
              <LinearGradient
                colors={['#9333ea', '#ec4899']}
                style={styles.buttonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Ionicons name="desktop-outline" size={20} color="white" style={styles.buttonIcon} />
                <Text style={styles.buttonText}>Continue in App</Text>
              </LinearGradient>
            </Pressable>
            <Text style={styles.continueSubtext}>
              No download required - access instantly from any device
            </Text>
          </View>

          {/* Features Row */}
          <View style={styles.featuresContainer}>
            <View style={styles.feature}>
              <Ionicons name="shield-checkmark" size={24} color="#9333ea" />
              <Text style={styles.featureText}>Secure & Encrypted</Text>
            </View>
            <View style={styles.feature}>
              <Ionicons name="document-text" size={24} color="#9333ea" />
              <Text style={styles.featureText}>Instant Access</Text>
            </View>
            <View style={styles.feature}>
              <Ionicons name="notifications" size={24} color="#9333ea" />
              <Text style={styles.featureText}>Real-time Updates</Text>
            </View>
          </View>

          {/* Login Section */}
          <View style={styles.loginSection}>
            <Text style={styles.loginPrompt}>Already have an account?</Text>
            <Pressable style={styles.loginButton} onPress={handleLogin}>
              <Text style={styles.loginButtonText}>Sign In</Text>
            </Pressable>
          </View>
        </View>

        {/* Bottom Section */}
        <View style={styles.bottomSection}>
          <Text style={styles.bottomText}>
            <Text style={styles.bottomTextBold}>New to Axis Imaging?</Text> Only patients who have received scans at our clinic can register.
            You'll need your phone number and date of birth.
          </Text>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Need assistance?</Text>
          <Text style={styles.footerContact}>(03) 9333 4455 • info@axisimaging.com.au</Text>
          <Text style={styles.footerLocation}>Axis Imaging, Mickleham, Victoria</Text>
        </View>
      </ScrollView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingVertical: 32,
    minHeight: '100%',
    justifyContent: 'center',
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logoText: {
    fontSize: 48,
    fontWeight: '300',
    color: 'white',
    letterSpacing: 8,
    marginBottom: 4,
  },
  logoSubtext: {
    fontSize: 16,
    color: 'white',
    letterSpacing: 2,
    marginBottom: 24,
  },
  welcomeTitle: {
    fontSize: screenWidth < 400 ? 32 : 40,
    fontWeight: '300',
    color: 'white',
    textAlign: 'center',
    letterSpacing: 1,
    marginBottom: 16,
  },
  subtitle: {
    fontSize: screenWidth < 400 ? 18 : 20,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    fontWeight: '300',
    lineHeight: 28,
    paddingHorizontal: 20,
  },
  mainCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 24,
    marginHorizontal: 8,
    marginBottom: 32,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 20,
  },
  cardTitle: {
    fontSize: screenWidth < 400 ? 28 : 32,
    fontWeight: '300',
    color: '#1f2937',
    textAlign: 'center',
    marginTop: 48,
    marginBottom: 8,
  },
  cardSubtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 40,
    paddingHorizontal: 20,
  },
  badgeContainer: {
    flexDirection: screenWidth < 400 ? 'column' : 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 24,
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    minWidth: 140,
    minHeight: 48,
  },
  appStoreBadge: {
    backgroundColor: '#000',
  },
  playStoreBadge: {
    backgroundColor: '#01875f',
  },
  badgeTextContainer: {
    marginLeft: 8,
    flex: 1,
  },
  badgeTopText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '400',
  },
  badgeBottomText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 32,
    paddingHorizontal: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e5e7eb',
  },
  dividerText: {
    paddingHorizontal: 16,
    color: '#6b7280',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1,
  },
  continueSection: {
    alignItems: 'center',
    marginBottom: 40,
    paddingHorizontal: 20,
  },
  continueButton: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#9333ea',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 16,
  },
  buttonIcon: {
    marginRight: 12,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  continueSubtext: {
    color: '#6b7280',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 20,
  },
  featuresContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 32,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    flexWrap: 'wrap',
    gap: 20,
  },
  feature: {
    alignItems: 'center',
    flex: screenWidth < 400 ? 1 : 0,
    minWidth: screenWidth < 400 ? 80 : 100,
  },
  featureText: {
    color: '#374151',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 8,
    textAlign: 'center',
  },
  loginSection: {
    alignItems: 'center',
    paddingTop: 24,
    paddingBottom: 48,
    paddingHorizontal: 20,
  },
  loginPrompt: {
    color: '#6b7280',
    fontSize: 16,
    marginBottom: 16,
  },
  loginButton: {
    backgroundColor: '#9333ea',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: '#9333ea',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  loginButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  bottomSection: {
    backgroundColor: 'rgba(147, 51, 234, 0.1)',
    borderRadius: 16,
    padding: 24,
    marginHorizontal: 8,
    marginBottom: 32,
  },
  bottomText: {
    color: '#6b7280',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  bottomTextBold: {
    fontWeight: '600',
  },
  footer: {
    alignItems: 'center',
    paddingBottom: 32,
  },
  footerText: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 14,
    marginBottom: 8,
  },
  footerContact: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
  },
  footerLocation: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
  },
});

export default OnboardingScreen;