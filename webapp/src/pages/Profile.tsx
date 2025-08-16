import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm, Controller } from 'react-hook-form'
import { Save, Edit2, User, Phone, Mail, MapPin, Heart, Shield, Bell, ArrowLeft } from 'lucide-react'
import { usePatient, useUpdatePatient } from '@/hooks/useApi'
import LoadingSpinner from '@/components/common/LoadingSpinner'
import { medicalUtils, validators } from '@/utils'
import { toast } from 'react-hot-toast'
import type { Patient } from '@/types'

const Profile: React.FC = () => {
  const navigate = useNavigate()
  const [isEditing, setIsEditing] = useState(false)
  const { data: patient, isLoading } = usePatient()
  const updatePatient = useUpdatePatient()

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<Partial<Patient>>({
    defaultValues: patient || {},
  })

  React.useEffect(() => {
    if (patient) {
      reset(patient)
    }
  }, [patient, reset])

  const onSubmit = async (data: Partial<Patient>) => {
    try {
      await updatePatient.mutateAsync(data)
      setIsEditing(false)
      toast.success('Profile updated successfully')
    } catch (error) {
      toast.error('Failed to update profile')
    }
  }

  const handleCancel = () => {
    reset(patient)
    setIsEditing(false)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <LoadingSpinner size="lg">Loading profile...</LoadingSpinner>
      </div>
    )
  }

  if (!patient) {
    return (
      <div className="medical-card text-center py-8">
        <p className="text-neutral-600">Unable to load profile information.</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white px-6 py-4 flex items-center justify-between border-b border-gray-100">
        <button 
          onClick={() => navigate('/dashboard')}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-700" />
        </button>
        <div className="flex items-center">
          <img 
            src="/assets/logos/axis-logo-color.png" 
            alt="Axis Imaging" 
            className="h-20"
          />
        </div>
        <div className="w-10"></div> {/* Spacer for centering */}
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">
      {/* Header */}
      <div className="medical-card">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-primary-600 rounded-full flex items-center justify-center">
              <span className="text-white text-xl font-bold">
                {patient.firstName[0]}{patient.lastName[0]}
              </span>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-neutral-900">
                {patient.firstName} {patient.lastName}
              </h1>
              <p className="text-neutral-600">{patient.email}</p>
            </div>
          </div>
          
          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="btn-outline flex items-center space-x-2"
            >
              <Edit2 className="w-4 h-4" />
              <span>Edit Profile</span>
            </button>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        {/* Personal Information */}
        <div className="medical-card">
          <h2 className="medical-subheader">Personal Information</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="form-label">First Name</label>
              <Controller
                name="firstName"
                control={control}
                rules={{ required: 'First name is required' }}
                render={({ field }) => (
                  <input
                    type="text"
                    className="form-input"
                    disabled={!isEditing}
                    {...field}
                  />
                )}
              />
              {errors.firstName && (
                <p className="form-error">{errors.firstName.message}</p>
              )}
            </div>

            <div>
              <label className="form-label">Last Name</label>
              <Controller
                name="lastName"
                control={control}
                rules={{ required: 'Last name is required' }}
                render={({ field }) => (
                  <input
                    type="text"
                    className="form-input"
                    disabled={!isEditing}
                    {...field}
                  />
                )}
              />
              {errors.lastName && (
                <p className="form-error">{errors.lastName.message}</p>
              )}
            </div>

            <div>
              <label className="form-label">Date of Birth</label>
              <Controller
                name="dateOfBirth"
                control={control}
                rules={{ required: 'Date of birth is required' }}
                render={({ field }) => (
                  <input
                    type="date"
                    className="form-input"
                    disabled={!isEditing}
                    value={field.value ? new Date(field.value).toISOString().split('T')[0] : ''}
                    onChange={(e) => field.onChange(new Date(e.target.value))}
                  />
                )}
              />
              {errors.dateOfBirth && (
                <p className="form-error">{errors.dateOfBirth.message}</p>
              )}
            </div>

            <div>
              <label className="form-label">Phone Number</label>
              <Controller
                name="phoneNumber"
                control={control}
                rules={{
                  validate: (value) => !value || validators.australianMobile(value) || 'Please enter a valid Australian mobile number'
                }}
                render={({ field }) => (
                  <input
                    type="tel"
                    className="form-input"
                    disabled={!isEditing}
                    placeholder="0412 345 678"
                    {...field}
                  />
                )}
              />
              {errors.phoneNumber && (
                <p className="form-error">{errors.phoneNumber.message}</p>
              )}
            </div>

            <div className="md:col-span-2">
              <label className="form-label">Email Address</label>
              <Controller
                name="email"
                control={control}
                rules={{
                  required: 'Email is required',
                  validate: (value) => validators.email(value) || 'Please enter a valid email address'
                }}
                render={({ field }) => (
                  <input
                    type="email"
                    className="form-input"
                    disabled={!isEditing}
                    {...field}
                  />
                )}
              />
              {errors.email && (
                <p className="form-error">{errors.email.message}</p>
              )}
            </div>
          </div>
        </div>

        {/* Address */}
        <div className="medical-card">
          <h2 className="medical-subheader">Address</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="form-label">Street Address</label>
              <Controller
                name="address.street"
                control={control}
                render={({ field }) => (
                  <input
                    type="text"
                    className="form-input"
                    disabled={!isEditing}
                    {...field}
                  />
                )}
              />
            </div>

            <div>
              <label className="form-label">Suburb</label>
              <Controller
                name="address.suburb"
                control={control}
                render={({ field }) => (
                  <input
                    type="text"
                    className="form-input"
                    disabled={!isEditing}
                    {...field}
                  />
                )}
              />
            </div>

            <div>
              <label className="form-label">State</label>
              <Controller
                name="address.state"
                control={control}
                render={({ field }) => (
                  <select className="form-input" disabled={!isEditing} {...field}>
                    <option value="">Select state</option>
                    <option value="NSW">NSW</option>
                    <option value="VIC">VIC</option>
                    <option value="QLD">QLD</option>
                    <option value="WA">WA</option>
                    <option value="SA">SA</option>
                    <option value="TAS">TAS</option>
                    <option value="ACT">ACT</option>
                    <option value="NT">NT</option>
                  </select>
                )}
              />
            </div>

            <div>
              <label className="form-label">Postcode</label>
              <Controller
                name="address.postcode"
                control={control}
                render={({ field }) => (
                  <input
                    type="text"
                    className="form-input"
                    disabled={!isEditing}
                    {...field}
                  />
                )}
              />
            </div>

            <div>
              <label className="form-label">Country</label>
              <Controller
                name="address.country"
                control={control}
                render={({ field }) => (
                  <input
                    type="text"
                    className="form-input"
                    disabled={!isEditing}
                    value={field.value || 'Australia'}
                    {...field}
                  />
                )}
              />
            </div>
          </div>
        </div>

        {/* Medical Information */}
        <div className="medical-card">
          <h2 className="medical-subheader">Medical Information</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="form-label">Medicare Number</label>
              <Controller
                name="medicareNumber"
                control={control}
                render={({ field }) => (
                  <input
                    type="text"
                    className="form-input"
                    disabled={!isEditing}
                    placeholder="1234567890"
                    {...field}
                  />
                )}
              />
            </div>

            <div>
              <label className="form-label">Individual Healthcare Identifier (IHI)</label>
              <Controller
                name="ihi"
                control={control}
                render={({ field }) => (
                  <input
                    type="text"
                    className="form-input"
                    disabled={!isEditing}
                    {...field}
                  />
                )}
              />
            </div>

            <div className="md:col-span-2">
              <label className="form-label">Referring Physician</label>
              <Controller
                name="referringPhysician"
                control={control}
                render={({ field }) => (
                  <input
                    type="text"
                    className="form-input"
                    disabled={!isEditing}
                    placeholder="Dr. John Smith"
                    {...field}
                  />
                )}
              />
            </div>
          </div>
        </div>

        {/* Emergency Contact */}
        <div className="medical-card">
          <h2 className="medical-subheader">Emergency Contact</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="form-label">Name</label>
              <Controller
                name="emergencyContact.name"
                control={control}
                render={({ field }) => (
                  <input
                    type="text"
                    className="form-input"
                    disabled={!isEditing}
                    {...field}
                  />
                )}
              />
            </div>

            <div>
              <label className="form-label">Relationship</label>
              <Controller
                name="emergencyContact.relationship"
                control={control}
                render={({ field }) => (
                  <select className="form-input" disabled={!isEditing} {...field}>
                    <option value="">Select relationship</option>
                    <option value="Spouse">Spouse</option>
                    <option value="Parent">Parent</option>
                    <option value="Child">Child</option>
                    <option value="Sibling">Sibling</option>
                    <option value="Friend">Friend</option>
                    <option value="Other">Other</option>
                  </select>
                )}
              />
            </div>

            <div>
              <label className="form-label">Phone Number</label>
              <Controller
                name="emergencyContact.phoneNumber"
                control={control}
                render={({ field }) => (
                  <input
                    type="tel"
                    className="form-input"
                    disabled={!isEditing}
                    {...field}
                  />
                )}
              />
            </div>
          </div>
        </div>

        {/* Form Actions */}
        {isEditing && (
          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={handleCancel}
              className="btn-outline"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!isDirty || updatePatient.isPending}
              className="btn-primary flex items-center space-x-2"
            >
              {updatePatient.isPending ? (
                <LoadingSpinner size="sm" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span>Save Changes</span>
            </button>
          </div>
        )}
      </form>
      </div>
    </div>
  )
}

export default Profile