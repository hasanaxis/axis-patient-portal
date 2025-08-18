import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Pressable,
  Image,
  Alert,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import apiService, { DashboardData, Study } from '../services/supabaseApi';

const { width: screenWidth } = Dimensions.get('window');

interface DashboardScreenProps {
  navigation: any;
}

const DashboardScreen: React.FC<DashboardScreenProps> = ({ navigation }) => {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  const { patient, logout } = useAuth();

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const data = await apiService.getDashboardData();
      setDashboardData(data);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      // Use mock data as fallback
      setDashboardData({
        patient: patient || {
          id: '1',
          firstName: 'John',
          lastName: 'Doe',
          email: 'john.doe@example.com',
          phone: '0412345678',
          dateOfBirth: '1985-01-01',
          createdAt: '2024-01-01T00:00:00Z',
        },
        studies: [],
        stats: {
          totalScans: 0,
          pendingResults: 0,
          recentScans: 0,
          upcomingAppointments: 0,
        },
      });
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', style: 'destructive', onPress: () => logout() },
      ]
    );
  };

  const handleViewStudy = (study: Study) => {
    navigation.navigate('ScanDetail', { studyId: study.id });
  };

  const handleViewAllScans = () => {
    navigation.navigate('MyScans');
  };

  const handleBookAppointment = () => {
    navigation.navigate('BookAppointment');
  };

  const handleProfile = () => {
    navigation.navigate('Profile');
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    
    return date.toLocaleDateString('en-AU', { 
      day: 'numeric', 
      month: 'short', 
      year: 'numeric' 
    });
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading your results...</Text>
      </View>
    );
  }

  const recentStudies = dashboardData?.studies?.slice(0, 3) || [];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <LinearGradient
        colors={['#9333ea', '#ec4899']}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <Text style={styles.greeting}>
              {getGreeting()}, {dashboardData?.patient?.firstName || 'Patient'}
            </Text>
            <Text style={styles.welcomeText}>Welcome to Axis Imaging</Text>
          </View>
          <View style={styles.headerRight}>
            <Pressable style={styles.profileButton} onPress={handleProfile}>
              <Ionicons name="person-circle" size={32} color="white" />
            </Pressable>
            <Pressable style={styles.logoutButton} onPress={handleLogout}>
              <Ionicons name="log-out" size={24} color="white" />
            </Pressable>
          </View>
        </View>
      </LinearGradient>

      {/* Stats Cards */}
      <View style={styles.statsContainer}>
        <View style={styles.statsRow}>
          <View style={[styles.statCard, styles.statCardPrimary]}>
            <LinearGradient
              colors={['#9333ea', '#ec4899']}
              style={styles.statGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Ionicons name="document-text" size={24} color="white" />
              <Text style={styles.statNumber}>{dashboardData?.stats?.totalScans || 0}</Text>
              <Text style={styles.statLabel}>Total Scans</Text>
            </LinearGradient>
          </View>

          <View style={styles.statCard}>
            <Ionicons name="time" size={24} color="#f59e0b" />
            <Text style={styles.statNumber}>{dashboardData?.stats?.pendingResults || 0}</Text>
            <Text style={styles.statLabel}>Pending Results</Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Ionicons name="calendar" size={24} color="#10b981" />
            <Text style={styles.statNumber}>{dashboardData?.stats?.recentScans || 0}</Text>
            <Text style={styles.statLabel}>Recent Scans</Text>
          </View>

          <View style={styles.statCard}>
            <Ionicons name="calendar-outline" size={24} color="#3b82f6" />
            <Text style={styles.statNumber}>{dashboardData?.stats?.upcomingAppointments || 0}</Text>
            <Text style={styles.statLabel}>Upcoming</Text>
          </View>
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsContainer}>
          <Pressable style={styles.actionButton} onPress={handleViewAllScans}>
            <LinearGradient
              colors={['#9333ea', '#ec4899']}
              style={styles.actionGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Ionicons name="document-text" size={20} color="white" />
              <Text style={styles.actionText}>View All Scans</Text>
            </LinearGradient>
          </Pressable>

          <Pressable style={styles.actionButton} onPress={handleBookAppointment}>
            <LinearGradient
              colors={['#10b981', '#059669']}
              style={styles.actionGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Ionicons name="calendar" size={20} color="white" />
              <Text style={styles.actionText}>Book Appointment</Text>
            </LinearGradient>
          </Pressable>
        </View>
      </View>

      {/* Recent Scans */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Scans</Text>
          {recentStudies.length > 0 && (
            <Pressable onPress={handleViewAllScans}>
              <Text style={styles.viewAllText}>View All</Text>
            </Pressable>
          )}
        </View>

        {recentStudies.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="document-text-outline" size={48} color="#9ca3af" />
            <Text style={styles.emptyStateTitle}>No Recent Scans</Text>
            <Text style={styles.emptyStateText}>
              Your recent scan results will appear here when available.
            </Text>
            <Pressable style={styles.emptyActionButton} onPress={handleBookAppointment}>
              <Text style={styles.emptyActionText}>Book New Scan</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.studiesContainer}>
            {recentStudies.map((study) => (
              <Pressable
                key={study.id}
                style={styles.studyCard}
                onPress={() => handleViewStudy(study)}
              >
                <View style={styles.studyHeader}>
                  <View style={styles.studyInfo}>
                    <Text style={styles.studyTitle}>{study.description}</Text>
                    <Text style={styles.studySubtitle}>
                      {study.modality} • {study.bodyPart}
                    </Text>
                    <Text style={styles.studyDate}>{formatDate(study.studyDate)}</Text>
                  </View>
                  {study.thumbnailUrl && (
                    <Image source={{ uri: study.thumbnailUrl }} style={styles.studyThumbnail} />
                  )}
                </View>

                <View style={styles.studyFooter}>
                  <View style={[styles.statusBadge, 
                    study.status === 'completed' && styles.statusCompleted,
                    study.status === 'pending' && styles.statusPending,
                  ]}>
                    <Text style={[styles.statusText,
                      study.status === 'completed' && styles.statusTextCompleted,
                      study.status === 'pending' && styles.statusTextPending,
                    ]}>
                      {study.status === 'completed' ? 'Results Ready' : 'Pending'}
                    </Text>
                  </View>
                  
                  {study.isNew && (
                    <LinearGradient
                      colors={['#9333ea', '#ec4899']}
                      style={styles.newBadge}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                    >
                      <Text style={styles.newBadgeText}>NEW</Text>
                    </LinearGradient>
                  )}
                </View>
              </Pressable>
            ))}
          </View>
        )}
      </View>

      {/* Contact Section */}
      <View style={styles.contactSection}>
        <Text style={styles.contactTitle}>Need Assistance?</Text>
        <Text style={styles.contactInfo}>(03) 9333 4455</Text>
        <Text style={styles.contactInfo}>info@axisimaging.com.au</Text>
        <Text style={styles.contactLocation}>Axis Imaging, Mickleham, Victoria</Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollContent: {
    paddingBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    fontSize: 16,
    color: '#6b7280',
  },
  header: {
    paddingTop: 60,
    paddingBottom: 32,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerLeft: {
    flex: 1,
  },
  greeting: {
    fontSize: screenWidth < 400 ? 24 : 28,
    fontWeight: '600',
    color: 'white',
    marginBottom: 4,
  },
  welcomeText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '300',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  profileButton: {
    padding: 4,
  },
  logoutButton: {
    padding: 4,
  },
  statsContainer: {
    paddingHorizontal: 20,
    marginTop: -16,
    gap: 12,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  statCardPrimary: {
    padding: 0,
    overflow: 'hidden',
  },
  statGradient: {
    width: '100%',
    padding: 20,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1f2937',
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
    fontWeight: '500',
  },
  section: {
    paddingHorizontal: 20,
    marginTop: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1f2937',
  },
  viewAllText: {
    color: '#9333ea',
    fontSize: 14,
    fontWeight: '500',
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  actionText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 20,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  emptyActionButton: {
    backgroundColor: '#9333ea',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyActionText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  studiesContainer: {
    gap: 12,
  },
  studyCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  studyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  studyInfo: {
    flex: 1,
  },
  studyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  studySubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  studyDate: {
    fontSize: 12,
    color: '#9ca3af',
  },
  studyThumbnail: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
  },
  studyFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
  },
  statusCompleted: {
    backgroundColor: '#dcfce7',
  },
  statusPending: {
    backgroundColor: '#fef3c7',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6b7280',
  },
  statusTextCompleted: {
    color: '#166534',
  },
  statusTextPending: {
    color: '#92400e',
  },
  newBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  newBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: 'white',
    letterSpacing: 0.5,
  },
  contactSection: {
    marginTop: 32,
    marginHorizontal: 20,
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  contactTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  contactInfo: {
    fontSize: 14,
    fontWeight: '500',
    color: '#9333ea',
    marginBottom: 4,
  },
  contactLocation: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 8,
  },
});

export default DashboardScreen;