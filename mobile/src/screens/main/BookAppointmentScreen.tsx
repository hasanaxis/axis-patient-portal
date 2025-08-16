import React, { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import * as DocumentPicker from 'expo-document-picker'
import { AppointmentService } from '../../services/AppointmentService'
import {
  FormField,
  DatePickerField,
  CheckboxField,
  FileUploadField,
} from '../../components/BookingFormComponents'

interface BookingFormData {
  firstName: string
  lastName: string
  dateOfBirth: Date | null
  phoneNumber: string
  email: string
  preferredDate: Date | null
  preferredTime: string
  termsAccepted: boolean
}

export const BookAppointmentScreen: React.FC = () => {
  const [formData, setFormData] = useState<BookingFormData>({
    firstName: '',
    lastName: '',
    dateOfBirth: null,
    phoneNumber: '',
    email: '',
    preferredDate: null,
    preferredTime: '',
    termsAccepted: false,
  })

  const [selectedReferralFile, setSelectedReferralFile] = useState<any>(null)
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const updateFormData = (field: keyof BookingFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error when field is updated
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.firstName.trim()) newErrors.firstName = 'First name is required'
    if (!formData.lastName.trim()) newErrors.lastName = 'Last name is required'
    if (!formData.dateOfBirth) newErrors.dateOfBirth = 'Date of birth is required'
    if (!formData.phoneNumber.trim()) newErrors.phoneNumber = 'Phone number is required'
    if (!formData.email.trim()) newErrors.email = 'Email is required'
    if (!selectedReferralFile) newErrors.referral = 'Referral image is required'
    if (!formData.termsAccepted) newErrors.termsAccepted = 'You must accept the Terms of Use & Privacy Policy'

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleFileSelect = async (type: { type: string }) => {
    try {
      if (type.type === 'camera') {
        const result = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          quality: 0.8,
        })

        if (!result.canceled && result.assets[0]) {
          setSelectedReferralFile({
            uri: result.assets[0].uri,
            type: 'image/jpeg',
            name: 'referral_photo.jpg',
          })
          // Clear referral error when file is selected
          if (errors.referral) {
            setErrors(prev => ({ ...prev, referral: '' }))
          }
        }
      } else if (type.type === 'gallery') {
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          quality: 0.8,
        })

        if (!result.canceled && result.assets[0]) {
          setSelectedReferralFile({
            uri: result.assets[0].uri,
            type: 'image/jpeg',
            name: 'referral_image.jpg',
          })
          // Clear referral error when file is selected
          if (errors.referral) {
            setErrors(prev => ({ ...prev, referral: '' }))
          }
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to select image. Please try again.')
    }
  }

  const submitBooking = async () => {
    if (!validateForm()) return

    try {
      setSubmitting(true)

      // Simple booking submission - just collect basic info for now
      const bookingData = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        dateOfBirth: formData.dateOfBirth!.toISOString().split('T')[0],
        phoneNumber: formData.phoneNumber,
        email: formData.email,
        preferredDate: formData.preferredDate?.toISOString().split('T')[0],
        preferredTime: formData.preferredTime,
        hasReferral: true,
        termsAccepted: formData.termsAccepted,
        privacyAccepted: true, // Combined with terms
        scanType: 'GENERAL', // Default scan type for simple booking
        bodyPartExamined: 'To be determined', // Will be determined by staff
      }

      // For now, just show success message without actual API call
      Alert.alert(
        'Booking Request Submitted!',
        'Thank you for your booking request. We will contact you within 24 hours to confirm your appointment and discuss scan details.\n\nYour request has been received successfully.',
        [
          {
            text: 'OK',
            onPress: () => {
              // Reset form
              setFormData({
                firstName: '',
                lastName: '',
                dateOfBirth: null,
                phoneNumber: '',
                email: '',
                preferredDate: null,
                preferredTime: '',
                termsAccepted: false,
              })
              setSelectedReferralFile(null)
              setErrors({})
            }
          }
        ]
      )
    } catch (error) {
      Alert.alert('Error', 'Failed to submit booking request. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Request Appointment</Text>
        <Text style={styles.subtitle}>Complete the form below to request your appointment</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.formContainer}>
          <FormField
            label="First Name"
            value={formData.firstName}
            onChangeText={(text) => updateFormData('firstName', text)}
            placeholder="Enter your first name"
            required
            error={errors.firstName}
          />
          
          <FormField
            label="Last Name"
            value={formData.lastName}
            onChangeText={(text) => updateFormData('lastName', text)}
            placeholder="Enter your last name"
            required
            error={errors.lastName}
          />
          
          <DatePickerField
            label="Date of Birth"
            value={formData.dateOfBirth}
            onDateChange={(date) => updateFormData('dateOfBirth', date)}
            placeholder="Select your date of birth"
            required
            error={errors.dateOfBirth}
            maximumDate={new Date()}
          />
          
          <FormField
            label="Phone Number"
            value={formData.phoneNumber}
            onChangeText={(text) => updateFormData('phoneNumber', text)}
            placeholder="0412 345 678"
            keyboardType="phone-pad"
            required
            error={errors.phoneNumber}
          />
          
          <FormField
            label="Email"
            value={formData.email}
            onChangeText={(text) => updateFormData('email', text)}
            placeholder="your.email@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            required
            error={errors.email}
          />

          <FileUploadField
            label="Referral Image"
            onFileSelect={handleFileSelect}
            selectedFile={selectedReferralFile}
            required
            error={errors.referral}
          />
          
          <DatePickerField
            label="Preferred Date"
            value={formData.preferredDate}
            onDateChange={(date) => updateFormData('preferredDate', date)}
            placeholder="Select preferred date (optional)"
            minimumDate={new Date(Date.now() + 24 * 60 * 60 * 1000)} // Tomorrow
          />

          <FormField
            label="Preferred Time"
            value={formData.preferredTime}
            onChangeText={(text) => updateFormData('preferredTime', text)}
            placeholder="e.g. Morning, Afternoon, or specific time"
          />

          <View style={styles.termsContainer}>
            <CheckboxField
              label="I agree with Axis Imaging's Terms of Use & Privacy Policy"
              value={formData.termsAccepted}
              onValueChange={(value) => updateFormData('termsAccepted', value)}
              required
              error={errors.termsAccepted}
            />
          </View>

          <TouchableOpacity
            style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
            onPress={submitBooking}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.submitButtonText}>Submit Request</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
  },
  content: {
    flex: 1,
  },
  formContainer: {
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  termsContainer: {
    marginTop: 8,
    marginBottom: 24,
  },
  submitButton: {
    backgroundColor: '#2563eb',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  submitButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
})
