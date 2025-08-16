import React, { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useNavigation, useRoute } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'

const { width } = Dimensions.get('window')

// Mock scan data
const mockScanData = {
  id: '1',
  title: 'Lorem Ipsum Dolor',
  examinationName: 'X-Ray Chest',
  technique: {
    description: 'At this is a test report that we are currently doing are kindly ignore relevant information that comes up.',
    findings: [
      'Normal findings found',
      'Chain smoker',
      'Chest x-ray'
    ]
  },
  measurements: '258.88 m',
  findings: 'Measure absolutely cm x #3 cm x 45 cm',
  interpretation: `Lorem ipsum dolor sit amet consectetur. Gravida amet velit semper tristique lectus donec. Sed ornare dui facilisi enim turpis cursus. Aenean facilisi non lectus at nunc. Diam tellus leo placerat id sed. Posuere nunc enim mi nisl.

Faucibus nulla egestas accumsan nunc commodo iaculis magna. Enim morbi nam lacinia volutpat fermentum aenean augue est. Cursus faucibus tincidunt tincidunt at sit ut consectetur.

Massa risus consectetur velit urna dui vivamus laoreet amet. Cras ante eu vulputate leo integer ac a dolor.`
}

export const ScanViewerScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<any>>()
  const route = useRoute()

  const handleBack = () => {
    navigation.goBack()
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Ionicons name="chevron-back" size={24} color="#374151" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{mockScanData.title}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Medical Image Container */}
        <View style={styles.imageContainer}>
          <View style={styles.medicalImage}>
            {/* Placeholder for X-ray image */}
            <View style={styles.imagePlaceholder}>
              <Ionicons name="scan-outline" size={60} color="#6B7280" />
              <Text style={styles.imageLabel}>X-Ray Image</Text>
            </View>
            
            {/* Measurement Overlay */}
            <View style={styles.measurementOverlay}>
              <View style={styles.measurementLine}>
                <View style={styles.measurementDot} />
                <View style={styles.measurementLineBar} />
                <View style={styles.measurementDot} />
              </View>
              <Text style={styles.measurementText}>{mockScanData.measurements}</Text>
            </View>
          </View>
        </View>

        {/* Content Sections */}
        <View style={styles.contentContainer}>
          {/* Examination Name */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Examination Name: {mockScanData.examinationName}</Text>
          </View>

          {/* Technique Section */}
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>Technique:</Text>
            <Text style={styles.sectionText}>{mockScanData.technique.description}</Text>
            
            <View style={styles.findingsList}>
              {mockScanData.technique.findings.map((finding, index) => (
                <Text key={index} style={styles.findingItem}>- {finding}</Text>
              ))}
            </View>
          </View>

          {/* Findings Section */}
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>Findings:</Text>
            <Text style={styles.sectionText}>{mockScanData.findings}</Text>
          </View>

          {/* Interpretation Section */}
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>Interpretation:</Text>
            <Text style={styles.interpretationText}>{mockScanData.interpretation}</Text>
          </View>
        </View>

        {/* Bottom Spacer */}
        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Bottom Indicator */}
      <View style={styles.bottomIndicator}>
        <View style={styles.indicatorBar} />
      </View>
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
  backButton: {
    width: 44,
    height: 44,
    backgroundColor: '#F3F4F6',
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 44,
  },
  scrollView: {
    flex: 1,
  },
  imageContainer: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  medicalImage: {
    width: '100%',
    height: 280,
    backgroundColor: '#1F2937',
    borderRadius: 16,
    position: 'relative',
    overflow: 'hidden',
  },
  imagePlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#374151',
  },
  imageLabel: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 8,
  },
  measurementOverlay: {
    position: 'absolute',
    top: '40%',
    left: 20,
    right: 20,
    alignItems: 'center',
  },
  measurementLine: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '80%',
  },
  measurementDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  measurementLineBar: {
    flex: 1,
    height: 2,
    backgroundColor: '#EF4444',
    marginHorizontal: 4,
  },
  measurementText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#EF4444',
    marginTop: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  contentContainer: {
    paddingHorizontal: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    lineHeight: 28,
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 12,
  },
  sectionText: {
    fontSize: 16,
    color: '#6B7280',
    lineHeight: 24,
    marginBottom: 12,
  },
  findingsList: {
    paddingLeft: 8,
  },
  findingItem: {
    fontSize: 16,
    color: '#6B7280',
    lineHeight: 24,
    marginBottom: 4,
  },
  interpretationText: {
    fontSize: 16,
    color: '#6B7280',
    lineHeight: 24,
  },
  bottomSpacer: {
    height: 40,
  },
  bottomIndicator: {
    alignItems: 'center',
    paddingBottom: 20,
    paddingTop: 10,
  },
  indicatorBar: {
    width: 134,
    height: 4,
    backgroundColor: '#1F2937',
    borderRadius: 2,
  },
})