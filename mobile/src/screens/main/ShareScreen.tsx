import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
  Share as RNShare,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import * as Clipboard from 'expo-clipboard'
import * as Print from 'expo-print'
import * as Sharing from 'expo-sharing'
import * as FileSystem from 'expo-file-system'
import { SharingService } from '../../services/SharingService'
import {
  FormField,
  PickerField,
  CheckboxField,
  FormSection,
} from '../../components/BookingFormComponents'

interface ShareScreenProps {
  route: {
    params: {
      studyId: string
      studyData: any
    }
  }
  navigation: any
}

interface ShareRequest {
  recipientName: string
  recipientEmail: string
  recipientPhone: string
  shareType: string
  recipientType: string
  message: string
  urgency: string
  accessWindow: number
  includeReport: boolean
  includeImages: boolean
  permissionLevel: string
}

export const ShareScreen: React.FC<ShareScreenProps> = ({ route, navigation }) => {
  const { studyId, studyData } = route.params
  
  const [shareRequest, setShareRequest] = useState<ShareRequest>({
    recipientName: '',
    recipientEmail: '',
    recipientPhone: '',
    shareType: 'GP_REFERRAL',
    recipientType: 'REFERRING_GP',
    message: '',
    urgency: 'ROUTINE',
    accessWindow: 30,
    includeReport: true,
    includeImages: false,
    permissionLevel: 'VIEW_DOWNLOAD'
  })

  const [loading, setLoading] = useState(false)
  const [shares, setShares] = useState<any[]>([])
  const [showShareModal, setShowShareModal] = useState(false)
  const [showExportModal, setShowExportModal] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    loadExistingShares()
  }, [])

  const loadExistingShares = async () => {
    try {
      const patientShares = await SharingService.getPatientShares(studyData.patientId)
      setShares(patientShares.filter(share => share.studyId === studyId))
    } catch (error) {
      console.error('Error loading shares:', error)
    }
  }

  const updateShareRequest = (field: keyof ShareRequest, value: any) => {
    setShareRequest(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const validateShareRequest = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!shareRequest.recipientName.trim()) {
      newErrors.recipientName = 'Recipient name is required'
    }

    if (!shareRequest.recipientEmail.trim()) {
      newErrors.recipientEmail = 'Recipient email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(shareRequest.recipientEmail)) {
      newErrors.recipientEmail = 'Invalid email format'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const createShare = async () => {
    if (!validateShareRequest()) return

    try {
      setLoading(true)
      
      const result = await SharingService.createShare({
        studyId,
        patientId: studyData.patientId,
        ...shareRequest,
        createdBy: 'PATIENT'
      })

      if (result.success) {
        Alert.alert(
          'Share Created',
          `Study shared successfully with ${shareRequest.recipientName}. They will receive an email with secure access.`,
          [
            {
              text: 'Copy Link',
              onPress: () => copyShareLink(result.accessUrl!)
            },
            {
              text: 'OK',
              onPress: () => {
                setShowShareModal(false)
                loadExistingShares()
                resetForm()
              }
            }
          ]
        )
      } else {
        Alert.alert('Share Failed', result.message)
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to create share. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const copyShareLink = async (url: string) => {
    await Clipboard.setStringAsync(url)
    Alert.alert('Copied', 'Share link copied to clipboard')
  }

  const shareViaDeviceShare = async (url: string, recipientName: string) => {
    try {
      await RNShare.share({
        message: `View my medical scan results: ${url}\n\nShared via Axis Imaging Patient Portal`,
        title: `Medical Results - ${studyData.patient.firstName} ${studyData.patient.lastName}`
      })
    } catch (error) {
      console.error('Error sharing:', error)
    }
  }

  const exportToPDF = async () => {
    try {
      setLoading(true)
      
      const result = await SharingService.exportReport({
        studyId,
        patientId: studyData.patientId,
        format: 'PDF',
        purpose: 'PATIENT_REQUEST',
        requestedBy: 'PATIENT',
        includeReport: true,
        includeImages: false
      })

      if (result.success && result.downloadUrl) {
        // Download and save the PDF
        const fileUri = `${FileSystem.documentDirectory}medical-report-${Date.now()}.pdf`
        
        const downloadResult = await FileSystem.downloadAsync(result.downloadUrl, fileUri)
        
        if (downloadResult.status === 200) {
          // Share the PDF
          if (await Sharing.isAvailableAsync()) {
            await Sharing.shareAsync(downloadResult.uri, {
              mimeType: 'application/pdf',
              dialogTitle: 'Share Medical Report'
            })
          }
        }
      } else {
        Alert.alert('Export Failed', result.message)
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to export report. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const printReport = async () => {
    try {
      setLoading(true)
      
      // Generate print-friendly HTML
      const htmlContent = generatePrintHTML()
      
      await Print.printAsync({
        html: htmlContent,
        base64: false
      })
    } catch (error) {
      Alert.alert('Error', 'Failed to print report. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const generatePrintHTML = (): string => {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Medical Report - ${studyData.patient.firstName} ${studyData.patient.lastName}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 10px; }
          .patient-info, .study-info { margin: 20px 0; }
          .section-title { font-weight: bold; color: #2563eb; margin-top: 20px; }
          .watermark { 
            position: fixed; 
            top: 50%; 
            left: 50%; 
            transform: translate(-50%, -50%) rotate(-45deg);
            font-size: 60px; 
            color: rgba(0,0,0,0.1); 
            z-index: -1; 
          }
        </style>
      </head>
      <body>
        <div class="watermark">CONFIDENTIAL</div>
        
        <div class="header">
          <h1>AXIS IMAGING</h1>
          <p>Level 1, 107/21 Cityside Drive, Mickleham VIC 3064</p>
          <p>Phone: (03) 8746 4200 | Email: info@axisimaging.com.au</p>
          <h2>MEDICAL IMAGING REPORT</h2>
        </div>

        <div class="patient-info">
          <div class="section-title">PATIENT INFORMATION</div>
          <p><strong>Name:</strong> ${studyData.patient.firstName} ${studyData.patient.lastName}</p>
          <p><strong>Date of Birth:</strong> ${new Date(studyData.patient.dateOfBirth).toLocaleDateString()}</p>
          <p><strong>Patient Number:</strong> ${studyData.patient.patientNumber}</p>
        </div>

        <div class="study-info">
          <div class="section-title">STUDY INFORMATION</div>
          <p><strong>Study Date:</strong> ${new Date(studyData.studyDate).toLocaleDateString()}</p>
          <p><strong>Modality:</strong> ${studyData.modality}</p>
          <p><strong>Study Description:</strong> ${studyData.studyDescription || 'N/A'}</p>
          <p><strong>Accession Number:</strong> ${studyData.accessionNumber}</p>
        </div>

        ${studyData.report ? `
        <div class="report-content">
          <div class="section-title">RADIOLOGIST REPORT</div>
          
          ${studyData.report.clinicalHistory ? `
          <div style="margin: 15px 0;">
            <strong>CLINICAL HISTORY:</strong><br>
            ${studyData.report.clinicalHistory}
          </div>
          ` : ''}
          
          ${studyData.report.technique ? `
          <div style="margin: 15px 0;">
            <strong>TECHNIQUE:</strong><br>
            ${studyData.report.technique}
          </div>
          ` : ''}
          
          <div style="margin: 15px 0;">
            <strong>FINDINGS:</strong><br>
            ${studyData.report.findings}
          </div>
          
          <div style="margin: 15px 0;">
            <strong>IMPRESSION:</strong><br>
            ${studyData.report.impression}
          </div>
          
          ${studyData.report.recommendations ? `
          <div style="margin: 15px 0;">
            <strong>RECOMMENDATIONS:</strong><br>
            ${studyData.report.recommendations}
          </div>
          ` : ''}
        </div>
        ` : ''}

        <div style="margin-top: 30px; font-size: 12px; color: #666;">
          <p>Generated: ${new Date().toLocaleString()}</p>
          <p>This report is confidential and intended only for the named patient and their healthcare providers.</p>
        </div>
      </body>
      </html>
    `
  }

  const revokeShare = async (shareId: string) => {
    Alert.alert(
      'Revoke Share',
      'Are you sure you want to revoke this share? The recipient will no longer be able to access your results.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Revoke',
          style: 'destructive',
          onPress: async () => {
            try {
              const success = await SharingService.revokeShare(shareId, 'Patient revoked access')
              if (success) {
                Alert.alert('Success', 'Share has been revoked')
                loadExistingShares()
              } else {
                Alert.alert('Error', 'Failed to revoke share')
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to revoke share')
            }
          }
        }
      ]
    )
  }

  const resetForm = () => {
    setShareRequest({
      recipientName: '',
      recipientEmail: '',
      recipientPhone: '',
      shareType: 'GP_REFERRAL',
      recipientType: 'REFERRING_GP',
      message: '',
      urgency: 'ROUTINE',
      accessWindow: 30,
      includeReport: true,
      includeImages: false,
      permissionLevel: 'VIEW_DOWNLOAD'
    })
    setErrors({})
  }

  const renderShareModal = () => (
    <Modal visible={showShareModal} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={() => setShowShareModal(false)}>
            <Ionicons name="close" size={24} color="#374151" />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Share Study</Text>
          <TouchableOpacity onPress={createShare} disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#2563eb" />
            ) : (
              <Text style={styles.modalSaveText}>Share</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent}>
          <FormSection title="Recipient Information">
            <FormField
              label="Recipient Name"
              value={shareRequest.recipientName}
              onChangeText={(text) => updateShareRequest('recipientName', text)}
              placeholder="Dr. John Smith"
              required
              error={errors.recipientName}
            />
            
            <FormField
              label="Email Address"
              value={shareRequest.recipientEmail}
              onChangeText={(text) => updateShareRequest('recipientEmail', text)}
              placeholder="doctor@clinic.com.au"
              keyboardType="email-address"
              autoCapitalize="none"
              required
              error={errors.recipientEmail}
            />

            <FormField
              label="Phone Number"
              value={shareRequest.recipientPhone}
              onChangeText={(text) => updateShareRequest('recipientPhone', text)}
              placeholder="(03) 1234 5678"
              keyboardType="phone-pad"
            />
          </FormSection>

          <FormSection title="Share Settings">
            <PickerField
              label="Share Type"
              value={shareRequest.shareType}
              onValueChange={(value) => updateShareRequest('shareType', value)}
              options={[
                { label: 'GP Referral', value: 'GP_REFERRAL' },
                { label: 'Specialist Consultation', value: 'SPECIALIST' },
                { label: 'Second Opinion', value: 'SECOND_OPINION' },
                { label: 'Family Member', value: 'FAMILY_MEMBER' },
                { label: 'External Doctor', value: 'EXTERNAL_DOCTOR' }
              ]}
            />

            <PickerField
              label="Access Duration"
              value={shareRequest.accessWindow.toString()}
              onValueChange={(value) => updateShareRequest('accessWindow', parseInt(value))}
              options={[
                { label: '7 days', value: '7' },
                { label: '30 days', value: '30' },
                { label: '90 days', value: '90' },
                { label: '180 days', value: '180' }
              ]}
            />

            <CheckboxField
              label="Include Report"
              value={shareRequest.includeReport}
              onValueChange={(value) => updateShareRequest('includeReport', value)}
            />

            <CheckboxField
              label="Include Images"
              value={shareRequest.includeImages}
              onValueChange={(value) => updateShareRequest('includeImages', value)}
            />
          </FormSection>

          <FormSection title="Additional Information">
            <FormField
              label="Message (Optional)"
              value={shareRequest.message}
              onChangeText={(text) => updateShareRequest('message', text)}
              placeholder="Additional message for the recipient"
              multiline
            />

            <PickerField
              label="Urgency"
              value={shareRequest.urgency}
              onValueChange={(value) => updateShareRequest('urgency', value)}
              options={[
                { label: 'Routine', value: 'ROUTINE' },
                { label: 'Urgent', value: 'URGENT' },
                { label: 'Emergency', value: 'EMERGENCY' }
              ]}
            />
          </FormSection>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  )

  const renderExportModal = () => (
    <Modal visible={showExportModal} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={() => setShowExportModal(false)}>
            <Ionicons name="close" size={24} color="#374151" />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Export Options</Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.exportOptions}>
          <TouchableOpacity style={styles.exportOption} onPress={exportToPDF}>
            <Ionicons name="document-text" size={32} color="#2563eb" />
            <Text style={styles.exportOptionTitle}>Export as PDF</Text>
            <Text style={styles.exportOptionDescription}>
              Download a PDF copy of your report
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.exportOption} onPress={printReport}>
            <Ionicons name="print" size={32} color="#2563eb" />
            <Text style={styles.exportOptionTitle}>Print Report</Text>
            <Text style={styles.exportOptionDescription}>
              Print your report directly from your device
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.exportOption} 
            onPress={() => {
              setShowExportModal(false)
              setShowShareModal(true)
            }}
          >
            <Ionicons name="share-social" size={32} color="#2563eb" />
            <Text style={styles.exportOptionTitle}>Share Securely</Text>
            <Text style={styles.exportOptionDescription}>
              Create a secure link to share with healthcare providers
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  )

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#374151" />
        </TouchableOpacity>
        <Text style={styles.title}>Share & Export</Text>
        <TouchableOpacity onPress={() => setShowExportModal(true)}>
          <Ionicons name="download" size={24} color="#2563eb" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.studyCard}>
          <Text style={styles.studyTitle}>
            {studyData.modality} - {studyData.studyDescription}
          </Text>
          <Text style={styles.studyDate}>
            {new Date(studyData.studyDate).toLocaleDateString()}
          </Text>
          <Text style={styles.patientName}>
            {studyData.patient.firstName} {studyData.patient.lastName}
          </Text>
        </View>

        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={styles.primaryButton} 
            onPress={() => setShowShareModal(true)}
          >
            <Ionicons name="share" size={20} color="#ffffff" />
            <Text style={styles.buttonText}>Share with Doctor</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.secondaryButton} 
            onPress={() => setShowExportModal(true)}
          >
            <Ionicons name="download" size={20} color="#2563eb" />
            <Text style={styles.secondaryButtonText}>Export Report</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.sharesSection}>
          <Text style={styles.sectionTitle}>Active Shares</Text>
          {shares.length === 0 ? (
            <Text style={styles.emptyText}>No active shares for this study</Text>
          ) : (
            shares.map((share) => (
              <View key={share.id} style={styles.shareCard}>
                <View style={styles.shareHeader}>
                  <Text style={styles.shareRecipient}>{share.recipientName}</Text>
                  <Text style={styles.shareStatus}>{share.status}</Text>
                </View>
                <Text style={styles.shareEmail}>{share.recipientEmail}</Text>
                <Text style={styles.shareDate}>
                  Shared: {new Date(share.createdAt).toLocaleDateString()}
                </Text>
                <Text style={styles.shareExpiry}>
                  Expires: {new Date(share.expiresAt).toLocaleDateString()}
                </Text>
                {share.lastAccessedAt && (
                  <Text style={styles.shareAccess}>
                    Last accessed: {new Date(share.lastAccessedAt).toLocaleDateString()}
                  </Text>
                )}
                <View style={styles.shareActions}>
                  <TouchableOpacity 
                    style={styles.copyButton}
                    onPress={() => copyShareLink(share.accessUrl)}
                  >
                    <Text style={styles.copyButtonText}>Copy Link</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.revokeButton}
                    onPress={() => revokeShare(share.id)}
                  >
                    <Text style={styles.revokeButtonText}>Revoke</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {renderShareModal()}
      {renderExportModal()}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  studyCard: {
    backgroundColor: '#f8fafc',
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
  },
  studyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  studyDate: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  patientName: {
    fontSize: 14,
    color: '#374151',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: '#2563eb',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 8,
    gap: 8,
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 8,
    gap: 8,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButtonText: {
    color: '#2563eb',
    fontSize: 16,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  sharesSection: {
    marginTop: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    padding: 20,
    fontStyle: 'italic',
  },
  shareCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
  },
  shareHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  shareRecipient: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  shareStatus: {
    fontSize: 12,
    color: '#059669',
    backgroundColor: '#d1fae5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    textTransform: 'uppercase',
  },
  shareEmail: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  shareDate: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 2,
  },
  shareExpiry: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 2,
  },
  shareAccess: {
    fontSize: 12,
    color: '#059669',
    marginBottom: 12,
  },
  shareActions: {
    flexDirection: 'row',
    gap: 8,
  },
  copyButton: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  copyButtonText: {
    fontSize: 12,
    color: '#374151',
    fontWeight: '500',
  },
  revokeButton: {
    backgroundColor: '#fef2f2',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  revokeButtonText: {
    fontSize: 12,
    color: '#dc2626',
    fontWeight: '500',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  modalSaveText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2563eb',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  exportOptions: {
    padding: 20,
  },
  exportOption: {
    backgroundColor: '#f8fafc',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  exportOptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginTop: 8,
    marginBottom: 4,
  },
  exportOptionDescription: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
})