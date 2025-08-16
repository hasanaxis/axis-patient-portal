import React from 'react'
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Image } from 'expo-image'
import { Ionicons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import type { MainStackParamList } from '../../navigation/MainNavigator'

const { width } = Dimensions.get('window')

// Mock data for studies
const mockStudies = [
  {
    id: '1',
    title: 'Lorem Ipsum',
    type: 'X-Ray',
    date: 'Aug 12, 2025',
    description: 'Lorem ipsum dolor sit amet consectetur pulvinar sit euismod.',
    thumbnail: null, // Placeholder for X-ray image
    modality: 'XR',
  },
  {
    id: '2',
    title: 'Lorem Ipsum',
    type: 'X-Ray',
    date: 'Aug 12, 2025',
    description: 'Lorem ipsum dolor sit amet consectetur pulvinar sit euismod.',
    thumbnail: null, // Placeholder for X-ray image
    modality: 'XR',
  },
  {
    id: '3',
    title: 'Lorem Ipsum',
    type: 'CT',
    date: 'Aug 12, 2025',
    description: 'Lorem ipsum dolor sit amet consectetur pulvinar sit euismod.',
    thumbnail: null, // Placeholder for CT scan
    modality: 'CT',
  },
  {
    id: '4',
    title: 'Lorem Ipsum',
    type: 'CT',
    date: 'Aug 12, 2025',
    description: 'Lorem ipsum dolor sit amet consectetur pulvinar sit euismod.',
    thumbnail: null, // Placeholder for CT scan
    modality: 'CT',
  },
]

type DashboardScreenNavigationProp = NativeStackNavigationProp<MainStackParamList>

export const DashboardScreen: React.FC = () => {
  const navigation = useNavigation<DashboardScreenNavigationProp>()
  const handleMenuPress = () => {
    console.log('Menu pressed')
  }

  const handleProfilePress = () => {
    console.log('Profile pressed')
  }

  const handleLearnMore = () => {
    console.log('Learn more pressed')
  }

  const handleStudyAction = (action: string, studyId: string) => {
    console.log(`${action} pressed for study ${studyId}`)
    if (action === 'view') {
      // Navigate to scan viewer
      navigation.navigate('ScanViewer', { scanId: studyId })
    }
  }

  const renderStudyItem = (study: any) => (
    <View key={study.id} style={styles.studyItem}>
      <View style={styles.studyThumbnail}>
        <View style={styles.thumbnailPlaceholder}>
          <Ionicons 
            name={study.modality === 'CT' ? 'medical-outline' : 'scan-outline'} 
            size={32} 
            color="#6B7280" 
          />
        </View>
      </View>
      
      <View style={styles.studyInfo}>
        <Text style={styles.studyTitle}>{study.title}</Text>
        <View style={styles.studyMeta}>
          <View style={styles.modalityBadge}>
            <Ionicons 
              name={study.modality === 'CT' ? 'medical-outline' : 'document-outline'} 
              size={14} 
              color="#8B5CF6" 
            />
            <Text style={styles.modalityText}>{study.type}</Text>
          </View>
          <Text style={styles.studyDate}>{study.date}</Text>
        </View>
        <Text style={styles.studyDescription}>{study.description}</Text>
        
        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => handleStudyAction('view', study.id)}
          >
            <Ionicons name="eye-outline" size={20} color="#0EA5E9" />
            <Text style={[styles.actionButtonText, { color: '#0EA5E9' }]}>View</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => handleStudyAction('download', study.id)}
          >
            <Ionicons name="download-outline" size={20} color="#EC4899" />
            <Text style={[styles.actionButtonText, { color: '#EC4899' }]}>Download</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => handleStudyAction('report', study.id)}
          >
            <Ionicons name="document-text-outline" size={20} color="#8B5CF6" />
            <Text style={[styles.actionButtonText, { color: '#8B5CF6' }]}>Report</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => handleStudyAction('share', study.id)}
          >
            <Ionicons name="share-outline" size={20} color="#6366F1" />
            <Text style={[styles.actionButtonText, { color: '#6366F1' }]}>Share</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  )

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.menuButton} onPress={handleMenuPress}>
          <Ionicons name="menu-outline" size={24} color="#374151" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Homepage</Text>
        <TouchableOpacity style={styles.profileButton} onPress={handleProfilePress}>
          <View style={styles.avatar}>
            <Ionicons name="person-outline" size={20} color="#6B7280" />
          </View>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Promotional Banner */}
        <View style={styles.bannerContainer}>
          <LinearGradient
            colors={['#8B5CF6', '#EC4899']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.banner}
          >
            <View style={styles.bannerContent}>
              <Text style={styles.bannerText}>
                Lorem ipsum dolor sit{'\n'}amet consectetur.
              </Text>
              <TouchableOpacity style={styles.learnMoreButton} onPress={handleLearnMore}>
                <Text style={styles.learnMoreText}>Learn more</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.bannerImageContainer}>
              <View style={styles.doctorPlaceholder}>
                <Ionicons name="medical-outline" size={40} color="#FFFFFF" />
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* Studies Section */}
        <View style={styles.studiesSection}>
          <Text style={styles.sectionTitle}>Lorem Ipsum Dolor Sit</Text>
          {mockStudies.map(renderStudyItem)}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
  },
  menuButton: {
    width: 44,
    height: 44,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
  },
  profileButton: {
    width: 44,
    height: 44,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  bannerContainer: {
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  banner: {
    borderRadius: 16,
    padding: 24,
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 140,
  },
  bannerContent: {
    flex: 1,
  },
  bannerText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    lineHeight: 28,
    marginBottom: 16,
  },
  learnMoreButton: {
    backgroundColor: '#EC4899',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  learnMoreText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  bannerImageContainer: {
    marginLeft: 16,
  },
  doctorPlaceholder: {
    width: 80,
    height: 80,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  studiesSection: {
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 20,
  },
  studyItem: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  studyThumbnail: {
    width: 80,
    height: 120,
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
    backgroundColor: '#1F2937',
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbnailPlaceholder: {
    width: 60,
    height: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  studyInfo: {
    flex: 1,
    padding: 16,
  },
  studyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  studyMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 12,
  },
  modalityText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#8B5CF6',
    marginLeft: 4,
  },
  studyDate: {
    fontSize: 14,
    color: '#6B7280',
  },
  studyDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 16,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    alignItems: 'center',
    flex: 1,
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 4,
  },
})