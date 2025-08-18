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

interface RegisterScreenProps {
  navigation: any;
  route?: {
    params?: {
      token?: string;
    };
  };
}

const RegisterScreen: React.FC<RegisterScreenProps> = ({ navigation, route }) => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    dateOfBirth: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const { register } = useAuth();
  const invitationToken = route?.params?.token;

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const formatPhoneNumber = (text: string) => {
    // Remove all non-numeric characters
    const cleaned = text.replace(/\D/g, '');
    
    // Format as Australian phone number
    if (cleaned.length <= 10) {
      if (cleaned.length >= 4) {
        if (cleaned.length >= 7) {
          return `${cleaned.slice(0, 4)} ${cleaned.slice(4, 7)} ${cleaned.slice(7)}`;
        } else {
          return `${cleaned.slice(0, 4)} ${cleaned.slice(4)}`;
        }
      }
      return cleaned;
    }
    return text;
  };

  const formatDateOfBirth = (text: string) => {
    // Remove all non-numeric characters
    const cleaned = text.replace(/\D/g, '');
    
    // Format as DD/MM/YYYY
    if (cleaned.length >= 2) {
      if (cleaned.length >= 4) {
        return `${cleaned.slice(0, 2)}/${cleaned.slice(2, 4)}/${cleaned.slice(4, 8)}`;
      } else {
        return `${cleaned.slice(0, 2)}/${cleaned.slice(2)}`;
      }
    }
    return cleaned;
  };

  const validateForm = () => {
    const { firstName, lastName, email, password, confirmPassword, phone, dateOfBirth } = formData;

    if (!firstName.trim()) {
      Alert.alert('Error', 'First name is required');
      return false;
    }

    if (!lastName.trim()) {
      Alert.alert('Error', 'Last name is required');
      return false;
    }

    if (!email.trim()) {
      Alert.alert('Error', 'Email is required');
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return false;
    }

    if (!password) {
      Alert.alert('Error', 'Password is required');
      return false;
    }

    if (password.length < 8) {
      Alert.alert('Error', 'Password must be at least 8 characters long');
      return false;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return false;
    }

    if (!phone.trim()) {
      Alert.alert('Error', 'Phone number is required');
      return false;
    }

    if (!dateOfBirth.trim()) {
      Alert.alert('Error', 'Date of birth is required');
      return false;
    }

    // Validate date format
    const dateRegex = /^\d{2}\/\d{2}\/\d{4}$/;
    if (!dateRegex.test(dateOfBirth)) {
      Alert.alert('Error', 'Please enter date of birth in DD/MM/YYYY format');
      return false;
    }

    return true;
  };

  const handleRegister = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const registrationData = {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.trim(),
        password: formData.password,
        phone: formData.phone.replace(/\s/g, ''), // Remove spaces
        dateOfBirth: formData.dateOfBirth,
        invitationToken,
      };

      const result = await register(registrationData);
      if (result.success) {
        Alert.alert(
          'Registration Successful',
          'Your account has been created successfully!',
          [{ text: 'OK', onPress: () => navigation.navigate('Dashboard') }]
        );
      } else {
        Alert.alert('Registration Failed', result.message || 'Unable to create account');
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred during registration');
    } finally {
      setLoading(false);
    }
  };

  const handleBackToOnboarding = () => {
    navigation.navigate('Onboarding');
  };

  const handleLogin = () => {
    navigation.navigate('Login');
  };

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
            <Text style={styles.title}>Create Account</Text>
          </View>

          {/* Logo Section */}
          <View style={styles.logoSection}>
            <Text style={styles.logoText}>AXIS</Text>
            <Text style={styles.logoSubtext}>imaging</Text>
          </View>

          {/* Registration Card */}
          <View style={styles.card}>
            <View style={styles.cardContent}>
              <Text style={styles.cardTitle}>Join Axis Imaging</Text>
              <Text style={styles.cardSubtitle}>
                Create your account to access your medical imaging results
              </Text>

              {invitationToken && (
                <View style={styles.invitationBanner}>
                  <Ionicons name="checkmark-circle" size={20} color="#10b981" />
                  <Text style={styles.invitationText}>
                    You've been invited to join Axis Imaging
                  </Text>
                </View>
              )}

              <View style={styles.form}>
                <View style={styles.row}>
                  <View style={[styles.inputContainer, styles.halfWidth]}>
                    <Text style={styles.inputLabel}>First Name</Text>
                    <TextInput
                      style={styles.input}
                      value={formData.firstName}
                      onChangeText={(text) => updateField('firstName', text)}
                      placeholder="Enter first name"
                      autoCapitalize="words"
                      autoCorrect={false}
                    />
                  </View>

                  <View style={[styles.inputContainer, styles.halfWidth]}>
                    <Text style={styles.inputLabel}>Last Name</Text>
                    <TextInput
                      style={styles.input}
                      value={formData.lastName}
                      onChangeText={(text) => updateField('lastName', text)}
                      placeholder="Enter last name"
                      autoCapitalize="words"
                      autoCorrect={false}
                    />
                  </View>
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Email Address</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.email}
                    onChangeText={(text) => updateField('email', text)}
                    placeholder="Enter your email"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Phone Number</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.phone}
                    onChangeText={(text) => updateField('phone', formatPhoneNumber(text))}
                    placeholder="0412 345 678"
                    keyboardType="phone-pad"
                    maxLength={13}
                  />
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Date of Birth</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.dateOfBirth}
                    onChangeText={(text) => updateField('dateOfBirth', formatDateOfBirth(text))}
                    placeholder="DD/MM/YYYY"
                    keyboardType="numeric"
                    maxLength={10}
                  />
                  <Text style={styles.inputHint}>
                    Required for patient verification
                  </Text>
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Password</Text>
                  <View style={styles.passwordContainer}>
                    <TextInput
                      style={[styles.input, styles.passwordInput]}
                      value={formData.password}
                      onChangeText={(text) => updateField('password', text)}
                      placeholder="Create a password"
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

                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Confirm Password</Text>
                  <View style={styles.passwordContainer}>
                    <TextInput
                      style={[styles.input, styles.passwordInput]}
                      value={formData.confirmPassword}
                      onChangeText={(text) => updateField('confirmPassword', text)}
                      placeholder="Confirm your password"
                      secureTextEntry={!showConfirmPassword}
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                    <Pressable
                      style={styles.passwordToggle}
                      onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      <Ionicons
                        name={showConfirmPassword ? 'eye-off' : 'eye'}
                        size={20}
                        color="#6b7280"
                      />
                    </Pressable>
                  </View>
                </View>

                <Pressable
                  style={[styles.primaryButton, loading && styles.primaryButtonDisabled]}
                  onPress={handleRegister}
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
                      <Text style={styles.primaryButtonText}>Create Account</Text>
                    )}
                  </LinearGradient>
                </Pressable>

                <View style={styles.loginSection}>
                  <Text style={styles.loginPrompt}>Already have an account?</Text>
                  <Pressable style={styles.loginButton} onPress={handleLogin}>
                    <Text style={styles.loginButtonText}>Sign In</Text>
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
    marginBottom: 24,
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
    marginBottom: 32,
  },
  logoText: {
    fontSize: 36,
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
    padding: 24,
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
    marginBottom: 24,
    lineHeight: 24,
  },
  invitationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    borderRadius: 12,
    padding: 12,
    marginBottom: 24,
    gap: 8,
  },
  invitationText: {
    color: '#065f46',
    fontSize: 14,
    fontWeight: '500',
  },
  form: {
    gap: 20,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  inputContainer: {
    gap: 6,
  },
  halfWidth: {
    flex: 1,
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
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#f9fafb',
  },
  inputHint: {
    fontSize: 12,
    color: '#6b7280',
    fontStyle: 'italic',
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
    top: 12,
    padding: 4,
  },
  primaryButton: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#9333ea',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    marginTop: 8,
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
  loginSection: {
    alignItems: 'center',
    paddingTop: 16,
  },
  loginPrompt: {
    color: '#6b7280',
    fontSize: 16,
    marginBottom: 12,
  },
  loginButton: {
    paddingVertical: 8,
  },
  loginButtonText: {
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

export default RegisterScreen;