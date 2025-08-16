import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Alert,
  Dimensions,
  Modal,
  FlatList,
  Platform
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');
const API_BASE_URL = Platform.OS === 'web' 
  ? 'http://localhost:3001/api'
  : Platform.select({
      ios: 'http://localhost:3001/api',
      android: 'http://10.0.2.2:3001/api', // Android emulator
      default: 'http://localhost:3001/api'
    });

// Main App Component with Navigation
export default function App() {
  const [currentScreen, setCurrentScreen] = useState('splash');
  const [authToken, setAuthToken] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [selectedScan, setSelectedScan] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);

  useEffect(() => {
    // Check for stored auth token
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (token) {
        setAuthToken(token);
        // Skip to main screen if already logged in
        setTimeout(() => setCurrentScreen('dashboard'), 2000);
      } else {
        // Show onboarding after splash
        setTimeout(() => setCurrentScreen('onboarding'), 2000);
      }
    } catch (error) {
      setTimeout(() => setCurrentScreen('onboarding'), 2000);
    }
  };

  const handleLogin = async (token, profile) => {
    setAuthToken(token);
    setUserProfile(profile);
    await AsyncStorage.setItem('authToken', token);
    setCurrentScreen('dashboard');
  };

  const handleLogout = async () => {
    await AsyncStorage.removeItem('authToken');
    setAuthToken(null);
    setUserProfile(null);
    setCurrentScreen('login');
  };

  const renderScreen = () => {
    switch (currentScreen) {
      case 'splash':
        return <SplashScreen />;
      case 'onboarding':
        return <OnboardingScreen onNext={() => setCurrentScreen('login')} />;
      case 'login':
        return <LoginScreen onLogin={handleLogin} />;
      case 'dashboard':
        return (
          <CleanDashboard 
            authToken={authToken}
            onNavigate={setCurrentScreen}
            onSelectScan={(scan) => {
              setSelectedScan(scan);
              setCurrentScreen('scanDetails');
            }}
            onLogout={handleLogout}
          />
        );
      case 'scanDetails':
        return (
          <ScanDetailView 
            scan={selectedScan}
            authToken={authToken}
            onBack={() => setCurrentScreen('dashboard')}
          />
        );
      case 'contact':
        return (
          <ContactUsScreen 
            onBack={() => setCurrentScreen('dashboard')}
          />
        );
      case 'bookAppointment':
        return (
          <BookAppointmentScreen 
            authToken={authToken}
            onBack={() => setCurrentScreen('dashboard')}
          />
        );
      case 'profile':
        return (
          <ProfileScreen 
            authToken={authToken}
            userProfile={userProfile}
            onBack={() => setCurrentScreen('dashboard')}
            onLogout={handleLogout}
          />
        );
      default:
        return <SplashScreen />;
    }
  };

  return renderScreen();
}

// Splash Screen Component (matches web app)
const SplashScreen = () => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 2;
      });
    }, 20);
    return () => clearInterval(interval);
  }, []);

  return (
    <LinearGradient
      colors={['#8B5CF6', '#EC4899']}
      style={styles.splashContainer}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <StatusBar barStyle="light-content" backgroundColor="#8B5CF6" />
      <Image 
        source={{ uri: '/assets/logos/axis-logo-white.png' }}
        style={styles.logo}
        resizeMode="contain"
      />
      <View style={styles.progressContainer}>
        <View style={[styles.progressBar, { width: `${progress}%` }]} />
      </View>
    </LinearGradient>
  );
};

// Onboarding Screen Component (matches web app)
const OnboardingScreen = ({ onNext }) => {
  return (
    <LinearGradient
      colors={['#8B5CF6', '#EC4899']}
      style={styles.onboardingContainer}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <StatusBar barStyle="light-content" backgroundColor="#8B5CF6" />
      <Image 
        source={{ uri: '/assets/logos/axis-logo-white.png' }}
        style={styles.onboardingLogo}
        resizeMode="contain"
      />
      <Text style={styles.onboardingTitle}>
        Radiology that puts your{'\n'}patients first
      </Text>
      <Text style={styles.onboardingSubtitle}>
        We understand every minute counts. Simple and clear updates when you need them, 
        providing peace of mind with unprecedented care that puts you and your care first.
      </Text>
      <Image 
        source={{ uri: '/assets/doctor-image.jpg' }}
        style={styles.onboardingImage}
        resizeMode="cover"
      />
      <TouchableOpacity style={styles.primaryButton} onPress={onNext}>
        <Text style={styles.primaryButtonText}>Start Your Journey</Text>
      </TouchableOpacity>
    </LinearGradient>
  );
};

// Login Screen Component (matches web app styling)
const LoginScreen = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter both email and password');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();
      
      if (response.ok) {
        onLogin(data.token, data.user);
      } else {
        Alert.alert('Login Failed', data.message || 'Invalid credentials');
      }
    } catch (error) {
      console.error('Login error:', error);
      // For demo purposes, use mock login
      if (email === 'demo@axis.com' && password === 'demo123') {
        onLogin('mock-token', { 
          firstName: 'Arwa',
          lastName: 'May', 
          email: 'demo@axis.com',
          patientId: 'PAT001'
        });
      } else {
        Alert.alert('Error', 'Unable to connect to server. Use demo@axis.com / demo123');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.loginContainer}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <ScrollView contentContainerStyle={styles.loginScrollContent}>
        <Image 
          source={{ uri: '/assets/logos/axis-logo-color.png' }}
          style={styles.loginLogo}
          resizeMode="contain"
        />
        <Text style={styles.loginTitle}>Login</Text>
        
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>📧</Text>
          <TextInput
            style={styles.input}
            placeholder="Email or Mobile Number"
            placeholderTextColor="#999"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>🔒</Text>
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor="#999"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
        </View>

        <TouchableOpacity 
          style={[styles.loginButton, loading && styles.loginButtonDisabled]} 
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.loginButtonText}>Login</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.forgotPassword}>
          <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

// Clean Dashboard Component (matches web app CleanDashboard)
const CleanDashboard = ({ authToken, onNavigate, onSelectScan, onLogout }) => {
  const [scans, setScans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showHamburgerMenu, setShowHamburgerMenu] = useState(false);

  useEffect(() => {
    fetchScans();
  }, []);

  const fetchScans = async () => {
    try {
      setLoading(false);
      // Use mock data for demo (matching web app data)
      setScans(mockScans);
    } catch (error) {
      console.error('Error fetching scans:', error);
      setScans(mockScans);
    } finally {
      setLoading(false);
    }
  };

  const mockScans = [
    {
      id: '1',
      title: 'Right Ankle X-Ray Examination',
      studyDate: 'August 12, 2025',
      modality: 'X-Ray',
      bodyPart: 'Right Ankle',
      status: 'new',
      thumbnail: '/test-images/ankle-xray-1-thumb.jpg',
      fullImage: '/test-images/ankle-xray-1.jpg',
      description: 'Right Ankle AP View',
      isNew: true
    }
  ];

  const handleMenuAction = (action) => {
    setShowHamburgerMenu(false);
    switch (action) {
      case 'myScans':
        // Already on dashboard showing scans
        break;
      case 'bookAppointment':
        onNavigate('bookAppointment');
        break;
      case 'contact':
        onNavigate('contact');
        break;
    }
  };

  const handleProfileAction = (action) => {
    setShowProfileDropdown(false);
    switch (action) {
      case 'settings':
        onNavigate('profile');
        break;
      case 'logout':
        onLogout();
        break;
    }
  };

  const renderScanCard = ({ item }) => (
    <TouchableOpacity 
      style={styles.scanCard} 
      onPress={() => onSelectScan(item)}
    >
      <View style={styles.scanCardContent}>
        <Image 
          source={{ uri: item.thumbnail }}
          style={styles.scanThumbnail}
          resizeMode="cover"
        />
        
        <View style={styles.scanInfo}>
          <Text style={styles.scanTitle}>{item.title}</Text>
          <Text style={styles.scanDate}>{item.studyDate}</Text>
          {item.isNew && (
            <View style={styles.newBadge}>
              <Text style={styles.newBadgeText}>NEW</Text>
            </View>
          )}
        </View>
      </View>
      
      <View style={styles.scanActions}>
        <TouchableOpacity style={styles.viewButton}>
          <Text style={styles.viewButtonText}>View Details</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.dashboardContainer}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* Header */}
      <View style={styles.dashboardHeader}>
        <TouchableOpacity onPress={() => setShowHamburgerMenu(true)}>
          <Text style={styles.hamburgerIcon}>☰</Text>
        </TouchableOpacity>
        
        <Image 
          source={{ uri: '/assets/logos/axis-logo-color.png' }}
          style={styles.headerLogo}
          resizeMode="contain"
        />
        
        <TouchableOpacity onPress={() => setShowProfileDropdown(true)}>
          <View style={styles.profileIcon}>
            <Text style={styles.profileIconText}>A</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Hero Section */}
      <LinearGradient
        colors={['#662D91', '#EC008C']}
        style={styles.heroSection}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <View style={styles.heroContent}>
          <View style={styles.heroText}>
            <Text style={styles.heroGreeting}>Hello Arwa,</Text>
            <Text style={styles.heroWelcome}>Welcome to Axis Imaging</Text>
            <TouchableOpacity 
              style={styles.heroButton}
              onPress={() => onNavigate('bookAppointment')}
            >
              <Text style={styles.heroButtonText}>Book Appointment</Text>
            </TouchableOpacity>
          </View>
          <Image 
            source={{ uri: '/assets/doctor-image.jpg' }}
            style={styles.doctorImage}
            resizeMode="cover"
          />
        </View>
      </LinearGradient>

      {/* Scans Section */}
      <View style={styles.scansSection}>
        <Text style={styles.scansSectionTitle}>Your Recent Scans</Text>
        
        {loading ? (
          <ActivityIndicator size="large" color="#8B5CF6" style={styles.loader} />
        ) : (
          <FlatList
            data={scans}
            renderItem={renderScanCard}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.scansList}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>

      {/* Hamburger Menu Modal */}
      <Modal
        visible={showHamburgerMenu}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowHamburgerMenu(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          onPress={() => setShowHamburgerMenu(false)}
        >
          <View style={styles.hamburgerMenu}>
            <TouchableOpacity 
              style={styles.menuItem}
              onPress={() => handleMenuAction('myScans')}
            >
              <Text style={styles.menuItemText}>My Scans</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.menuItem}
              onPress={() => handleMenuAction('bookAppointment')}
            >
              <Text style={styles.menuItemText}>Book Appointment</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.menuItem}
              onPress={() => handleMenuAction('contact')}
            >
              <Text style={styles.menuItemText}>Contact Us</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Profile Dropdown Modal */}
      <Modal
        visible={showProfileDropdown}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowProfileDropdown(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          onPress={() => setShowProfileDropdown(false)}
        >
          <View style={styles.profileMenu}>
            <TouchableOpacity 
              style={styles.menuItem}
              onPress={() => handleProfileAction('settings')}
            >
              <Text style={styles.menuItemText}>Account Settings</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.menuItem}
              onPress={() => handleProfileAction('logout')}
            >
              <Text style={styles.menuItemText}>Sign Out</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
};

// ScanDetailView Component (matches web app)
const ScanDetailView = ({ scan, authToken, onBack }) => {
  if (!scan) {
    return (
      <SafeAreaView style={styles.detailsContainer}>
        <Text>No scan selected</Text>
      </SafeAreaView>
    );
  }

  const reportData = {
    technique: 'XR RIGHT LEG, XR RIGHT FEMUR, XR RIGHT ANKLE AND FOOT examination performed.',
    clinicalHistory: 'Fell and landed on right leg, has been limping still? Fracture',
    findings: 'No definite evidence of a bony injury seen in the right leg. The hip, knee and ankle joints are congruent. No fracture seen in the right foot. Normal alignment. Growth plates are intact to the extent visualised. No gross soft tissue abnormality observed.',
    impression: 'No fractures or malalignment observed in the visualised bones.',
    radiologist: 'Dr. Farhan Ahmed, Axis Imaging',
    reportDate: '15/08/2025',
    status: 'Final'
  };

  return (
    <SafeAreaView style={styles.detailsContainer}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* Header */}
      <View style={styles.detailsHeader}>
        <TouchableOpacity onPress={onBack}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Image 
          source={{ uri: '/assets/logos/axis-logo-color.png' }}
          style={styles.headerLogo}
          resizeMode="contain"
        />
        <View style={{ width: 60 }} />
      </View>
      
      <ScrollView style={styles.detailsContent}>
        {/* Scan Info Card */}
        <View style={styles.scanInfoCard}>
          <Text style={styles.scanDetailTitle}>{scan.title}</Text>
          
          <View style={styles.scanMetaInfo}>
            <View style={styles.metaRow}>
              <Text style={styles.metaIcon}>🩻</Text>
              <Text style={styles.metaText}>{scan.modality}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaIcon}>📅</Text>
              <Text style={styles.metaText}>{scan.studyDate}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaIcon}>👨‍⚕️</Text>
              <Text style={styles.metaText}>Craigieburn Medical And Dental Centre</Text>
            </View>
          </View>
          
          <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.actionButton}>
              <Text style={styles.actionButtonText}>📥 Download</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton}>
              <Text style={styles.actionButtonText}>↗️ Share</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Images Section */}
        <View style={styles.imagesCard}>
          <Text style={styles.cardTitle}>Images</Text>
          
          <View style={styles.mainImageContainer}>
            <Image 
              source={{ uri: scan.fullImage || scan.thumbnail }}
              style={styles.mainImage}
              resizeMode="contain"
            />
            <TouchableOpacity style={styles.zoomButton}>
              <Text style={styles.zoomButtonText}>🔍</Text>
            </TouchableOpacity>
          </View>
          
          <Text style={styles.imageDescription}>{scan.description}</Text>
          
          <TouchableOpacity style={styles.fullViewerButton}>
            <Text style={styles.fullViewerButtonText}>👁️ Open Full Viewer</Text>
          </TouchableOpacity>
        </View>

        {/* Medical Report Section */}
        <View style={styles.reportCard}>
          <View style={styles.cardHeader}>
            <Text style={styles.reportIcon}>📋</Text>
            <Text style={styles.cardTitle}>Medical Report</Text>
          </View>

          {/* Technique */}
          <View style={styles.reportSection}>
            <Text style={styles.reportSectionTitle}>Technique</Text>
            <Text style={styles.reportSectionText}>{reportData.technique}</Text>
          </View>

          {/* Clinical History */}
          <View style={styles.reportSection}>
            <Text style={styles.reportSectionTitle}>Clinical History</Text>
            <Text style={styles.reportSectionText}>{reportData.clinicalHistory}</Text>
          </View>

          {/* Findings */}
          <View style={styles.reportSection}>
            <Text style={styles.reportSectionTitle}>Findings</Text>
            <Text style={styles.reportSectionText}>{reportData.findings}</Text>
          </View>

          {/* Impression */}
          <View style={styles.impressionSection}>
            <Text style={styles.reportSectionTitle}>Impression</Text>
            <Text style={styles.impressionText}>{reportData.impression}</Text>
          </View>

          {/* Report Info */}
          <View style={styles.reportInfo}>
            <View style={styles.reportInfoRow}>
              <Text style={styles.reportInfoLabel}>Radiologist:</Text>
              <Text style={styles.reportInfoValue}>{reportData.radiologist}</Text>
            </View>
            <View style={styles.reportInfoRow}>
              <Text style={styles.reportInfoLabel}>Report Date:</Text>
              <Text style={styles.reportInfoValue}>{reportData.reportDate}</Text>
            </View>
            <View style={styles.reportInfoRow}>
              <Text style={styles.reportInfoLabel}>Status:</Text>
              <Text style={styles.statusFinal}>{reportData.status}</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

// ContactUsScreen Component (matches web app)
const ContactUsScreen = ({ onBack }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [showThankYou, setShowThankYou] = useState(false);

  const handleSubmit = () => {
    if (!name || !email || !message) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    setShowThankYou(true);
    setTimeout(() => {
      setShowThankYou(false);
      onBack();
    }, 2000);
  };

  return (
    <SafeAreaView style={styles.contactContainer}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* Header */}
      <View style={styles.pageHeader}>
        <TouchableOpacity onPress={onBack}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Image 
          source={{ uri: '/assets/logos/axis-logo-color.png' }}
          style={styles.headerLogo}
          resizeMode="contain"
        />
        <View style={{ width: 60 }} />
      </View>

      <ScrollView style={styles.contactContent}>
        <Text style={styles.pageTitle}>Contact Us</Text>

        {/* Contact Information */}
        <View style={styles.contactInfoCard}>
          <Text style={styles.contactInfoTitle}>Axis Imaging</Text>
          
          <View style={styles.contactInfoItem}>
            <Text style={styles.contactIcon}>📍</Text>
            <View>
              <Text style={styles.contactInfoText}>Level 1, 107/21 Cityside Drive</Text>
              <Text style={styles.contactInfoText}>Mickleham Victoria 3064</Text>
            </View>
          </View>

          <View style={styles.contactInfoItem}>
            <Text style={styles.contactIcon}>📞</Text>
            <Text style={styles.contactInfoText}>0370361709</Text>
          </View>

          <View style={styles.contactInfoItem}>
            <Text style={styles.contactIcon}>📧</Text>
            <Text style={styles.contactInfoText}>merrifield@axisimaging.com.au</Text>
          </View>

          <View style={styles.contactInfoItem}>
            <Text style={styles.contactIcon}>🕒</Text>
            <Text style={styles.contactInfoText}>Monday-Friday 9am-5pm</Text>
          </View>
        </View>

        {/* Contact Form */}
        <View style={styles.contactFormCard}>
          <Text style={styles.formTitle}>Send us a message</Text>

          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Your Name</Text>
            <TextInput
              style={styles.formInput}
              value={name}
              onChangeText={setName}
              placeholder="Enter your name"
              placeholderTextColor="#999"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Email Address</Text>
            <TextInput
              style={styles.formInput}
              value={email}
              onChangeText={setEmail}
              placeholder="Enter your email"
              placeholderTextColor="#999"
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Message</Text>
            <TextInput
              style={[styles.formInput, styles.messageInput]}
              value={message}
              onChangeText={setMessage}
              placeholder="Enter your message"
              placeholderTextColor="#999"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
            <Text style={styles.submitButtonText}>Send Message</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Thank You Modal */}
      <Modal
        visible={showThankYou}
        transparent={true}
        animationType="fade"
      >
        <View style={styles.thankYouOverlay}>
          <View style={styles.thankYouModal}>
            <Text style={styles.thankYouTitle}>Thank You!</Text>
            <Text style={styles.thankYouMessage}>
              We've received your message and will get back to you soon.
            </Text>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

// BookAppointmentScreen Component (matches web app)
const BookAppointmentScreen = ({ authToken, onBack }) => {
  const [preferredDate, setPreferredDate] = useState('');
  const [preferredTime, setPreferredTime] = useState('');
  const [notes, setNotes] = useState('');
  const [referralUploaded, setReferralUploaded] = useState(false);

  const handleSubmit = () => {
    Alert.alert('Success', 'Appointment request submitted successfully!');
    onBack();
  };

  const handleCameraUpload = () => {
    setReferralUploaded(true);
    Alert.alert('Success', 'Referral form uploaded successfully!');
  };

  const handleFileUpload = () => {
    setReferralUploaded(true);
    Alert.alert('Success', 'Referral form uploaded successfully!');
  };

  return (
    <SafeAreaView style={styles.bookingContainer}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* Header */}
      <View style={styles.pageHeader}>
        <TouchableOpacity onPress={onBack}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Image 
          source={{ uri: '/assets/logos/axis-logo-color.png' }}
          style={styles.headerLogo}
          resizeMode="contain"
        />
        <View style={{ width: 60 }} />
      </View>

      <ScrollView style={styles.bookingContent}>
        <Text style={styles.pageTitle}>Book Appointment</Text>
        <Text style={styles.pageSubtitle}>Schedule your radiology appointment</Text>

        <View style={styles.bookingFormCard}>
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Preferred Date</Text>
            <TextInput
              style={styles.formInput}
              value={preferredDate}
              onChangeText={setPreferredDate}
              placeholder="Select date (DD/MM/YYYY)"
              placeholderTextColor="#999"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Preferred Time</Text>
            <TextInput
              style={styles.formInput}
              value={preferredTime}
              onChangeText={setPreferredTime}
              placeholder="Select time"
              placeholderTextColor="#999"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Upload Referral Form</Text>
            <Text style={styles.uploadDescription}>
              Please upload your GP referral form or take a photo
            </Text>
            
            <View style={styles.uploadButtons}>
              <TouchableOpacity 
                style={[styles.uploadButton, Platform.OS === 'web' && styles.hiddenOnWeb]} 
                onPress={handleCameraUpload}
              >
                <Text style={styles.uploadButtonText}>📷 Take Photo</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.uploadButton} onPress={handleFileUpload}>
                <Text style={styles.uploadButtonText}>📁 Choose File</Text>
              </TouchableOpacity>
            </View>

            {referralUploaded && (
              <View style={styles.uploadSuccess}>
                <Text style={styles.uploadSuccessText}>✅ Referral form uploaded</Text>
              </View>
            )}
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Additional Notes</Text>
            <TextInput
              style={[styles.formInput, styles.messageInput]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Any additional information or special requirements"
              placeholderTextColor="#999"
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
            <Text style={styles.submitButtonText}>Submit Request</Text>
          </TouchableOpacity>

          <Text style={styles.bookingNote}>
            We will contact you to confirm your appointment within 24 hours.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

// ProfileScreen Component (basic implementation)
const ProfileScreen = ({ authToken, userProfile, onBack, onLogout }) => {
  return (
    <SafeAreaView style={styles.profileContainer}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* Header */}
      <View style={styles.pageHeader}>
        <TouchableOpacity onPress={onBack}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Image 
          source={{ uri: '/assets/logos/axis-logo-color.png' }}
          style={styles.headerLogo}
          resizeMode="contain"
        />
        <View style={{ width: 60 }} />
      </View>

      <ScrollView style={styles.profileContent}>
        <Text style={styles.pageTitle}>Account Settings</Text>

        <View style={styles.profileCard}>
          <View style={styles.profileAvatar}>
            <Text style={styles.profileAvatarText}>
              {userProfile?.firstName?.[0] || 'A'}{userProfile?.lastName?.[0] || 'M'}
            </Text>
          </View>
          <Text style={styles.profileName}>
            {userProfile?.firstName || 'Arwa'} {userProfile?.lastName || 'May'}
          </Text>
          <Text style={styles.profileEmail}>{userProfile?.email || 'demo@axis.com'}</Text>
        </View>

        <View style={styles.settingsCard}>
          <TouchableOpacity style={styles.settingItem}>
            <Text style={styles.settingItemText}>Personal Information</Text>
            <Text style={styles.settingItemArrow}>→</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.settingItem}>
            <Text style={styles.settingItemText}>Notifications</Text>
            <Text style={styles.settingItemArrow}>→</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.settingItem}>
            <Text style={styles.settingItemText}>Privacy Settings</Text>
            <Text style={styles.settingItemArrow}>→</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.settingItem} onPress={onLogout}>
            <Text style={[styles.settingItemText, styles.logoutText]}>Sign Out</Text>
            <Text style={styles.settingItemArrow}>→</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

// Styles
const styles = StyleSheet.create({
  // Splash Screen Styles
  splashContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: 200,
    height: 80,
    marginBottom: 100,
  },
  progressContainer: {
    position: 'absolute',
    bottom: 100,
    width: '80%',
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 2,
  },

  // Onboarding Screen Styles
  onboardingContainer: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 20,
  },
  onboardingLogo: {
    width: 150,
    height: 60,
    marginBottom: 40,
  },
  onboardingTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 20,
  },
  onboardingSubtitle: {
    fontSize: 14,
    color: '#FFFFFF',
    textAlign: 'center',
    opacity: 0.9,
    marginBottom: 40,
    lineHeight: 20,
  },
  onboardingImage: {
    width: width - 40,
    height: 250,
    borderRadius: 20,
    marginBottom: 40,
  },
  primaryButton: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 30,
    position: 'absolute',
    bottom: 50,
  },
  primaryButtonText: {
    color: '#8B5CF6',
    fontSize: 16,
    fontWeight: '600',
  },

  // Login Screen Styles
  loginContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loginScrollContent: {
    flexGrow: 1,
    paddingHorizontal: 30,
    paddingTop: 60,
    alignItems: 'center',
  },
  loginLogo: {
    width: 120,
    height: 50,
    marginBottom: 60,
  },
  loginTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 40,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    maxWidth: 320,
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    paddingBottom: 10,
  },
  inputLabel: {
    fontSize: 20,
    marginRight: 15,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#333333',
  },
  loginButton: {
    backgroundColor: '#0EA5E9',
    width: '100%',
    maxWidth: 320,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 30,
  },
  loginButtonDisabled: {
    opacity: 0.6,
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  forgotPassword: {
    marginTop: 20,
  },
  forgotPasswordText: {
    color: '#666666',
    fontSize: 14,
  },

  // Dashboard Styles
  dashboardContainer: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  dashboardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  hamburgerIcon: {
    fontSize: 24,
    color: '#333333',
  },
  headerLogo: {
    width: 80,
    height: 32,
  },
  profileIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#8B5CF6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileIconText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  
  // Hero Section
  heroSection: {
    margin: 15,
    marginTop: 0,
    borderRadius: 20,
    overflow: 'hidden',
  },
  heroContent: {
    flexDirection: 'row',
    padding: 20,
    alignItems: 'center',
  },
  heroText: {
    flex: 1,
    paddingRight: 20,
  },
  heroGreeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 5,
  },
  heroWelcome: {
    fontSize: 16,
    color: '#FFFFFF',
    opacity: 0.9,
    marginBottom: 20,
  },
  heroButton: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    alignSelf: 'flex-start',
  },
  heroButtonText: {
    color: '#662D91',
    fontSize: 14,
    fontWeight: '600',
  },
  doctorImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },

  // Scans Section
  scansSection: {
    flex: 1,
    paddingHorizontal: 15,
  },
  scansSectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 15,
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
  },
  scansList: {
    paddingBottom: 20,
  },
  scanCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  scanCardContent: {
    flexDirection: 'row',
    padding: 12,
  },
  scanThumbnail: {
    width: 70,
    height: 70,
    borderRadius: 8,
    backgroundColor: '#F0F0F0',
  },
  scanInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  scanTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 4,
  },
  scanDate: {
    fontSize: 14,
    color: '#666666',
  },
  newBadge: {
    backgroundColor: '#EC4899',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginTop: 5,
  },
  newBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  scanActions: {
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  viewButton: {
    backgroundColor: '#0EA5E9',
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  viewButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
  },
  hamburgerMenu: {
    backgroundColor: '#FFFFFF',
    marginTop: 70,
    marginRight: 20,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    minWidth: 160,
  },
  profileMenu: {
    backgroundColor: '#FFFFFF',
    marginTop: 70,
    marginRight: 20,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    minWidth: 160,
  },
  menuItem: {
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  menuItemText: {
    fontSize: 16,
    color: '#333333',
  },

  // Detail View Styles
  detailsContainer: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  pageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  detailsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  backButton: {
    color: '#0EA5E9',
    fontSize: 16,
  },
  detailsContent: {
    flex: 1,
    padding: 20,
  },
  
  // Scan Info Card
  scanInfoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  scanDetailTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 15,
  },
  scanMetaInfo: {
    marginBottom: 20,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  metaIcon: {
    fontSize: 16,
    marginRight: 10,
    width: 24,
  },
  metaText: {
    fontSize: 14,
    color: '#666666',
    flex: 1,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#8B5CF6',
    paddingVertical: 10,
    marginHorizontal: 5,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },

  // Images Card
  imagesCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 15,
  },
  mainImageContainer: {
    position: 'relative',
    backgroundColor: '#000000',
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 10,
  },
  mainImage: {
    width: '100%',
    height: 250,
  },
  zoomButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  zoomButtonText: {
    fontSize: 16,
  },
  imageDescription: {
    textAlign: 'center',
    color: '#666666',
    fontSize: 14,
    marginBottom: 15,
  },
  fullViewerButton: {
    backgroundColor: '#0EA5E9',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  fullViewerButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },

  // Report Card
  reportCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  reportIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  reportSection: {
    marginBottom: 20,
  },
  reportSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666666',
    marginBottom: 8,
  },
  reportSectionText: {
    fontSize: 14,
    color: '#333333',
    lineHeight: 20,
  },
  impressionSection: {
    backgroundColor: '#F0F8FF',
    borderColor: '#BFDBFE',
    borderWidth: 1,
    borderRadius: 8,
    padding: 15,
    marginBottom: 20,
  },
  impressionText: {
    fontSize: 14,
    color: '#1E40AF',
    lineHeight: 20,
  },
  reportInfo: {
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    paddingTop: 15,
  },
  reportInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  reportInfoLabel: {
    fontSize: 14,
    color: '#666666',
  },
  reportInfoValue: {
    fontSize: 14,
    color: '#333333',
    fontWeight: '500',
  },
  statusFinal: {
    fontSize: 14,
    color: '#10B981',
    fontWeight: '500',
  },

  // Contact Us Styles
  contactContainer: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  contactContent: {
    flex: 1,
    padding: 20,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 20,
  },
  pageSubtitle: {
    fontSize: 16,
    color: '#666666',
    marginBottom: 20,
  },
  contactInfoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  contactInfoTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 15,
  },
  contactInfoItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 15,
  },
  contactIcon: {
    fontSize: 16,
    marginRight: 10,
    width: 24,
    marginTop: 2,
  },
  contactInfoText: {
    fontSize: 14,
    color: '#333333',
    lineHeight: 20,
  },

  // Form Styles
  contactFormCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  bookingFormCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 20,
  },
  formGroup: {
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333333',
    marginBottom: 8,
  },
  formInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333333',
    backgroundColor: '#FFFFFF',
  },
  messageInput: {
    height: 100,
    textAlignVertical: 'top',
  },
  submitButton: {
    backgroundColor: '#8B5CF6',
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },

  // Upload Styles
  uploadDescription: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 15,
  },
  uploadButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 15,
  },
  uploadButton: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderColor: '#D1D5DB',
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 12,
    marginHorizontal: 5,
    alignItems: 'center',
  },
  hiddenOnWeb: {
    display: Platform.OS === 'web' ? 'none' : 'flex',
  },
  uploadButtonText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  uploadSuccess: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
  },
  uploadSuccessText: {
    fontSize: 14,
    color: '#15803D',
    textAlign: 'center',
  },
  bookingNote: {
    fontSize: 12,
    color: '#666666',
    textAlign: 'center',
    marginTop: 15,
    fontStyle: 'italic',
  },

  // Booking Styles
  bookingContainer: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  bookingContent: {
    flex: 1,
    padding: 20,
  },

  // Thank You Modal
  thankYouOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  thankYouModal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 30,
    alignItems: 'center',
    marginHorizontal: 40,
  },
  thankYouTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 15,
  },
  thankYouMessage: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 22,
  },

  // Profile Styles
  profileContainer: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  profileContent: {
    flex: 1,
    padding: 20,
  },
  profileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  profileAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#8B5CF6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  profileAvatarText: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: 'bold',
  },
  profileName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 5,
  },
  profileEmail: {
    fontSize: 16,
    color: '#666666',
  },
  settingsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  settingItemText: {
    fontSize: 16,
    color: '#333333',
  },
  settingItemArrow: {
    fontSize: 16,
    color: '#666666',
  },
  logoutText: {
    color: '#EF4444',
  },
});