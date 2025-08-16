import React, { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Modal,
  Platform,
} from 'react-native'
import DateTimePicker from '@react-native-community/datetimepicker'

interface FormFieldProps {
  label: string
  value: string
  onChangeText: (text: string) => void
  placeholder?: string
  multiline?: boolean
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad'
  required?: boolean
  error?: string
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters'
}

export const FormField: React.FC<FormFieldProps> = ({
  label,
  value,
  onChangeText,
  placeholder,
  multiline = false,
  keyboardType = 'default',
  required = false,
  error,
  autoCapitalize = 'sentences',
}) => {
  return (
    <View style={styles.fieldContainer}>
      <Text style={styles.label}>
        {label}
        {required && <Text style={styles.required}> *</Text>}
      </Text>
      <TextInput
        style={[
          styles.input,
          multiline && styles.textArea,
          error && styles.inputError
        ]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        multiline={multiline}
        numberOfLines={multiline ? 3 : 1}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
      />
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  )
}

interface PickerFieldProps {
  label: string
  value: string
  onValueChange: (value: string) => void
  options: Array<{ label: string; value: string }>
  placeholder?: string
  required?: boolean
  error?: string
}

export const PickerField: React.FC<PickerFieldProps> = ({
  label,
  value,
  onValueChange,
  options,
  placeholder = 'Select an option',
  required = false,
  error,
}) => {
  const [modalVisible, setModalVisible] = useState(false)

  const selectedOption = options.find(option => option.value === value)

  return (
    <View style={styles.fieldContainer}>
      <Text style={styles.label}>
        {label}
        {required && <Text style={styles.required}> *</Text>}
      </Text>
      <TouchableOpacity
        style={[styles.picker, error && styles.inputError]}
        onPress={() => setModalVisible(true)}
      >
        <Text style={[styles.pickerText, !selectedOption && styles.placeholderText]}>
          {selectedOption ? selectedOption.label : placeholder}
        </Text>
      </TouchableOpacity>
      {error && <Text style={styles.errorText}>{error}</Text>}

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{label}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Text style={styles.closeButton}>×</Text>
              </TouchableOpacity>
            </View>
            <ScrollView>
              {options.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.optionItem,
                    option.value === value && styles.selectedOption
                  ]}
                  onPress={() => {
                    onValueChange(option.value)
                    setModalVisible(false)
                  }}
                >
                  <Text style={[
                    styles.optionText,
                    option.value === value && styles.selectedOptionText
                  ]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  )
}

interface DatePickerFieldProps {
  label: string
  value: Date | null
  onDateChange: (date: Date | null) => void
  placeholder?: string
  required?: boolean
  error?: string
  minimumDate?: Date
  maximumDate?: Date
}

export const DatePickerField: React.FC<DatePickerFieldProps> = ({
  label,
  value,
  onDateChange,
  placeholder = 'Select date',
  required = false,
  error,
  minimumDate,
  maximumDate,
}) => {
  const [showPicker, setShowPicker] = useState(false)

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-AU', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowPicker(Platform.OS === 'ios')
    if (selectedDate) {
      onDateChange(selectedDate)
    }
  }

  return (
    <View style={styles.fieldContainer}>
      <Text style={styles.label}>
        {label}
        {required && <Text style={styles.required}> *</Text>}
      </Text>
      <TouchableOpacity
        style={[styles.picker, error && styles.inputError]}
        onPress={() => setShowPicker(true)}
      >
        <Text style={[styles.pickerText, !value && styles.placeholderText]}>
          {value ? formatDate(value) : placeholder}
        </Text>
      </TouchableOpacity>
      {error && <Text style={styles.errorText}>{error}</Text>}

      {showPicker && (
        <DateTimePicker
          value={value || new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleDateChange}
          minimumDate={minimumDate}
          maximumDate={maximumDate}
        />
      )}
    </View>
  )
}

interface CheckboxFieldProps {
  label: string
  value: boolean
  onValueChange: (value: boolean) => void
  required?: boolean
  error?: string
}

export const CheckboxField: React.FC<CheckboxFieldProps> = ({
  label,
  value,
  onValueChange,
  required = false,
  error,
}) => {
  return (
    <View style={styles.fieldContainer}>
      <TouchableOpacity
        style={styles.checkboxContainer}
        onPress={() => onValueChange(!value)}
      >
        <View style={[styles.checkbox, value && styles.checkboxChecked]}>
          {value && <Text style={styles.checkmark}>✓</Text>}
        </View>
        <Text style={styles.checkboxLabel}>
          {label}
          {required && <Text style={styles.required}> *</Text>}
        </Text>
      </TouchableOpacity>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  )
}

interface FormSectionProps {
  title: string
  children: React.ReactNode
  collapsible?: boolean
}

export const FormSection: React.FC<FormSectionProps> = ({
  title,
  children,
  collapsible = false,
}) => {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <View style={styles.sectionContainer}>
      <TouchableOpacity
        style={styles.sectionHeader}
        onPress={() => collapsible && setCollapsed(!collapsed)}
        disabled={!collapsible}
      >
        <Text style={styles.sectionTitle}>{title}</Text>
        {collapsible && (
          <Text style={styles.sectionToggle}>{collapsed ? '+' : '−'}</Text>
        )}
      </TouchableOpacity>
      {!collapsed && (
        <View style={styles.sectionContent}>
          {children}
        </View>
      )}
    </View>
  )
}

interface FileUploadFieldProps {
  label: string
  onFileSelect: (file: any) => void
  selectedFile?: any
  required?: boolean
  error?: string
  acceptedTypes?: string[]
}

export const FileUploadField: React.FC<FileUploadFieldProps> = ({
  label,
  onFileSelect,
  selectedFile,
  required = false,
  error,
  acceptedTypes = ['image/*', 'application/pdf'],
}) => {
  const handleFileSelect = () => {
    Alert.alert(
      'Select File',
      'Choose how you want to add your referral',
      [
        {
          text: 'Take Photo',
          onPress: () => {
            // This will be handled by the parent component
            onFileSelect({ type: 'camera' })
          }
        },
        {
          text: 'Choose from Gallery',
          onPress: () => {
            // This will be handled by the parent component
            onFileSelect({ type: 'gallery' })
          }
        },
        {
          text: 'Cancel',
          style: 'cancel'
        }
      ]
    )
  }

  return (
    <View style={styles.fieldContainer}>
      <Text style={styles.label}>
        {label}
        {required && <Text style={styles.required}> *</Text>}
      </Text>
      <TouchableOpacity
        style={[styles.fileUpload, error && styles.inputError]}
        onPress={handleFileSelect}
      >
        {selectedFile ? (
          <View style={styles.selectedFileContainer}>
            <Text style={styles.selectedFileName}>{selectedFile.name || 'File selected'}</Text>
            <Text style={styles.changeFileText}>Tap to change</Text>
          </View>
        ) : (
          <Text style={styles.uploadText}>Tap to select file</Text>
        )}
      </TouchableOpacity>
      <Text style={styles.fileHint}>
        Accepted formats: PDF, JPEG, PNG (max 10MB)
      </Text>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  )
}

const styles = StyleSheet.create({
  fieldContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  required: {
    color: '#dc2626',
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#ffffff',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  inputError: {
    borderColor: '#dc2626',
  },
  errorText: {
    color: '#dc2626',
    fontSize: 14,
    marginTop: 4,
  },
  picker: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
  },
  pickerText: {
    fontSize: 16,
    color: '#374151',
  },
  placeholderText: {
    color: '#9ca3af',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    margin: 20,
    maxHeight: '80%',
    width: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
  },
  closeButton: {
    fontSize: 24,
    color: '#6b7280',
    fontWeight: 'bold',
  },
  optionItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  selectedOption: {
    backgroundColor: '#eff6ff',
  },
  optionText: {
    fontSize: 16,
    color: '#374151',
  },
  selectedOptionText: {
    color: '#2563eb',
    fontWeight: '600',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: '#d1d5db',
    borderRadius: 4,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  checkmark: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 12,
  },
  checkboxLabel: {
    fontSize: 16,
    color: '#374151',
    flex: 1,
  },
  sectionContainer: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: '#e5e7eb',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  sectionToggle: {
    fontSize: 20,
    color: '#6b7280',
    fontWeight: 'bold',
  },
  sectionContent: {
    // Content styling handled by children
  },
  fileUpload: {
    borderWidth: 2,
    borderColor: '#d1d5db',
    borderStyle: 'dashed',
    borderRadius: 8,
    paddingVertical: 24,
    paddingHorizontal: 16,
    alignItems: 'center',
    backgroundColor: '#f9fafb',
  },
  uploadText: {
    fontSize: 16,
    color: '#6b7280',
    fontWeight: '500',
  },
  selectedFileContainer: {
    alignItems: 'center',
  },
  selectedFileName: {
    fontSize: 16,
    color: '#374151',
    fontWeight: '500',
    marginBottom: 4,
  },
  changeFileText: {
    fontSize: 14,
    color: '#6b7280',
  },
  fileHint: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
    textAlign: 'center',
  },
})