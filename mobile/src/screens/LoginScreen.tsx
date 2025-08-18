import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';

const { width: screenWidth } = Dimensions.get('window');

interface LoginScreenProps {
  navigation: any;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');

  const { login } = useAuth();

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      const result = await login(email.trim(), password);
      if (result.success) {
        // Navigation will be handled by auth state change
      } else {
        Alert.alert('Login Failed', result.message || 'Invalid credentials');
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!forgotEmail) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }

    try {
      // TODO: Implement forgot password API call
      Alert.alert(
        'Password Reset',
        'If an account with this email exists, you will receive password reset instructions.'
      );
      setShowForgotPassword(false);
      setForgotEmail('');
    } catch (error) {
      Alert.alert('Error', 'Failed to send password reset email');
    }
  };

  const handleBackToOnboarding = () => {
    navigation.navigate('Onboarding');
  };

  const handleRegister = () => {
    navigation.navigate('Register');
  };

  if (showForgotPassword) {
    return (
      <LinearGradient
        colors={['#9333ea', '#ec4899', '#9333ea']}
        style={styles.container}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <KeyboardAvoidingView
          style={styles.keyboardContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView contentContainerStyle={styles.scrollContainer}>
            {/* Header */}
            <View style={styles.header}>
              <Pressable style={styles.backButton} onPress={() => setShowForgotPassword(false)}>
                <Ionicons name="arrow-back" size={24} color="white" />
              </Pressable>
              <Text style={styles.title}>Reset Password</Text>
            </View>

            {/* Forgot Password Card */}
            <View style={styles.card}>
              <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>Forgot Your Password?</Text>
                <Text style={styles.cardSubtitle}>
                  Enter your email address and we'll send you instructions to reset your password.
                </Text>

                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Email Address</Text>
                  <TextInput
                    style={styles.input}
                    value={forgotEmail}
                    onChangeText={setForgotEmail}
                    placeholder="Enter your email"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>

                <Pressable style={styles.primaryButton} onPress={handleForgotPassword}>
                  <LinearGradient
                    colors={['#9333ea', '#ec4899']}
                    style={styles.buttonGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    <Text style={styles.primaryButtonText}>Send Reset Instructions</Text>
                  </LinearGradient>
                </Pressable>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={['#9333ea', '#ec4899', '#9333ea']}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          {/* Header */}
          <View style={styles.header}>
            <Pressable style={styles.backButton} onPress={handleBackToOnboarding}>
              <Ionicons name="arrow-back" size={24} color="white" />
            </Pressable>
            <Text style={styles.title}>Sign In</Text>
          </View>

          {/* Logo Section */}
          <View style={styles.logoSection}>
            <Text style={styles.logoText}>AXIS</Text>
            <Text style={styles.logoSubtext}>imaging</Text>
          </View>

          {/* Login Card */}
          <View style={styles.card}>
            <View style={styles.cardContent}>
              <Text style={styles.cardTitle}>Welcome Back</Text>
              <Text style={styles.cardSubtitle}>
                Sign in to access your medical imaging results
              </Text>

              <View style={styles.form}>
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Email Address</Text>
                  <TextInput
                    style={styles.input}
                    value={email}
                    onChangeText={setEmail}
                    placeholder="Enter your email"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Password</Text>
                  <View style={styles.passwordContainer}>
                    <TextInput
                      style={[styles.input, styles.passwordInput]}
                      value={password}
                      onChangeText={setPassword}
                      placeholder="Enter your password"
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                    <Pressable
                      style={styles.passwordToggle}
                      onPress={() => setShowPassword(!showPassword)}
                    >
                      <Ionicons
                        name={showPassword ? 'eye-off' : 'eye'}
                        size={20}
                        color="#6b7280"
                      />
                    </Pressable>
                  </View>
                </View>

                <Pressable
                  style={styles.forgotPasswordButton}
                  onPress={() => setShowForgotPassword(true)}
                >
                  <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
                </Pressable>

                <Pressable
                  style={[styles.primaryButton, loading && styles.primaryButtonDisabled]}
                  onPress={handleLogin}
                  disabled={loading}
                >
                  <LinearGradient
                    colors={['#9333ea', '#ec4899']}
                    style={styles.buttonGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    {loading ? (
                      <ActivityIndicator color="white" />
                    ) : (
                      <Text style={styles.primaryButtonText}>Sign In</Text>
                    )}
                  </LinearGradient>
                </Pressable>

                <View style={styles.registerSection}>
                  <Text style={styles.registerPrompt}>Don't have an account?</Text>
                  <Pressable style={styles.registerButton} onPress={handleRegister}>
                    <Text style={styles.registerButtonText}>Register Now</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Need assistance?</Text>
            <Text style={styles.footerContact}>(03) 9333 4455 • info@axisimaging.com.au</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardContainer: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingVertical: 32,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 32,
    paddingTop: 20,
  },
  backButton: {
    padding: 8,
    marginRight: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: 'white',
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoText: {
    fontSize: 40,
    fontWeight: '300',
    color: 'white',
    letterSpacing: 6,
    marginBottom: 4,
  },
  logoSubtext: {
    fontSize: 14,
    color: 'white',
    letterSpacing: 2,
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 24,
    marginHorizontal: 8,
    marginBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 20,
  },
  cardContent: {
    padding: 32,
  },
  cardTitle: {
    fontSize: screenWidth < 400 ? 24 : 28,
    fontWeight: '600',
    color: '#1f2937',
    textAlign: 'center',
    marginBottom: 8,
  },
  cardSubtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  form: {
    gap: 24,
  },
  inputContainer: {
    gap: 8,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    backgroundColor: '#f9fafb',
  },
  passwordContainer: {
    position: 'relative',
  },
  passwordInput: {
    paddingRight: 50,
  },
  passwordToggle: {
    position: 'absolute',
    right: 16,
    top: 14,
    padding: 4,
  },
  forgotPasswordButton: {
    alignSelf: 'flex-end',
    paddingVertical: 4,
  },
  forgotPasswordText: {
    color: '#9333ea',
    fontSize: 14,
    fontWeight: '500',
  },
  primaryButton: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#9333ea',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  primaryButtonDisabled: {
    opacity: 0.7,
  },
  buttonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  registerSection: {
    alignItems: 'center',
    paddingTop: 16,
  },
  registerPrompt: {
    color: '#6b7280',
    fontSize: 16,
    marginBottom: 12,
  },
  registerButton: {
    paddingVertical: 8,
  },
  registerButtonText: {
    color: '#9333ea',
    fontSize: 16,
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
    fontSize: 14,
    fontWeight: '500',
  },
});

export default LoginScreen;