export interface SMSTemplate {
  id: string
  name: string
  body: string
  variables: string[]
  category: 'report_ready' | 'appointment' | 'registration' | 'information' | 'emergency'
  description: string
}

export class SMSTemplateService {
  private templates: SMSTemplate[] = [
    // Report Readiness Templates
    {
      id: 'report_ready_general',
      name: 'General Report Ready',
      category: 'report_ready',
      description: 'Standard notification when any scan report is ready',
      variables: ['patientName', 'scanType', 'appLink'],
      body: 'Hi {{patientName}}, your {{scanType}} report from Axis Imaging is ready. View it in the app: {{appLink}} or book an appointment with your GP to discuss the results.'
    },
    {
      id: 'report_ready_xray',
      name: 'X-ray Report Ready',
      category: 'report_ready',
      description: 'Specific notification for X-ray reports',
      variables: ['patientName', 'appLink'],
      body: 'Hi {{patientName}}, your X-ray results from Axis Imaging are now available. Please book an appointment with your GP to discuss your results. View online: {{appLink}}'
    },
    {
      id: 'report_ready_ct',
      name: 'CT Scan Report Ready',
      category: 'report_ready',
      description: 'Specific notification for CT scan reports',
      variables: ['patientName', 'appLink'],
      body: 'Hi {{patientName}}, your CT scan results from Axis Imaging are ready. It\'s important to book an appointment with your GP to review these results. Access your report: {{appLink}}'
    },
    {
      id: 'report_ready_ultrasound',
      name: 'Ultrasound Report Ready',
      category: 'report_ready',
      description: 'Specific notification for ultrasound reports',
      variables: ['patientName', 'appLink'],
      body: 'Hi {{patientName}}, your ultrasound results from Axis Imaging are available. Please schedule an appointment with your GP to discuss your results. View report: {{appLink}}'
    },
    {
      id: 'report_ready_mri',
      name: 'MRI Report Ready',
      category: 'report_ready',
      description: 'Specific notification for MRI reports',
      variables: ['patientName', 'appLink'],
      body: 'Hi {{patientName}}, your MRI results from Axis Imaging are ready. Please book an appointment with your GP to review these detailed results. Access online: {{appLink}}'
    },
    {
      id: 'report_ready_mammogram',
      name: 'Mammogram Report Ready',
      category: 'report_ready',
      description: 'Specific notification for mammogram reports',
      variables: ['patientName', 'appLink'],
      body: 'Hi {{patientName}}, your mammogram results from Axis Imaging are available. Please contact your GP to discuss your results and any follow-up care needed. View report: {{appLink}}'
    },

    // Emergency/Critical Findings
    {
      id: 'urgent_review_required',
      name: 'Urgent Review Required',
      category: 'emergency',
      description: 'Critical findings requiring immediate attention',
      variables: ['patientName', 'contactNumber'],
      body: 'URGENT: {{patientName}}, your recent scan results from Axis Imaging require immediate medical attention. Please contact your GP or call us immediately on {{contactNumber}}.'
    },

    // Registration & Welcome
    {
      id: 'registration_invitation',
      name: 'Registration Invitation',
      category: 'registration',
      description: 'Invitation to register for patient portal after scan',
      variables: ['patientName', 'registrationLink'],
      body: 'Hi {{patientName}}, thanks for visiting Axis Imaging. Register for our patient portal to access your results online and book future appointments: {{registrationLink}}'
    },
    {
      id: 'welcome_new_patient',
      name: 'Welcome New Patient',
      category: 'registration',
      description: 'Welcome message after successful registration',
      variables: ['patientName', 'appLink', 'contactNumber'],
      body: 'Welcome to Axis Imaging, {{patientName}}! Your account is ready. Access your results at {{appLink}} or call us on {{contactNumber}} for assistance.'
    },

    // Appointment Related
    {
      id: 'appointment_confirmation',
      name: 'Appointment Confirmation',
      category: 'appointment',
      description: 'Confirmation of booked appointment',
      variables: ['patientName', 'appointmentDate', 'appointmentTime', 'scanType', 'location'],
      body: 'Hi {{patientName}}, your {{scanType}} appointment is confirmed for {{appointmentDate}} at {{appointmentTime}} at Axis Imaging {{location}}. Please arrive 15 minutes early.'
    },
    {
      id: 'appointment_reminder_24h',
      name: '24 Hour Appointment Reminder',
      category: 'appointment',
      description: 'Reminder sent 24 hours before appointment',
      variables: ['patientName', 'appointmentDate', 'appointmentTime', 'preparationInstructions'],
      body: 'Reminder: {{patientName}}, you have a scan appointment tomorrow {{appointmentDate}} at {{appointmentTime}} with Axis Imaging. {{preparationInstructions}}'
    },
    {
      id: 'appointment_reminder_2h',
      name: '2 Hour Appointment Reminder',
      category: 'appointment',
      description: 'Final reminder sent 2 hours before appointment',
      variables: ['patientName', 'appointmentTime', 'location'],
      body: 'Final reminder: {{patientName}}, your scan appointment is in 2 hours at {{appointmentTime}}. Axis Imaging is located at {{location}}. Please arrive 15 minutes early.'
    },

    // Information & Instructions
    {
      id: 'preparation_instructions_ct',
      name: 'CT Scan Preparation',
      category: 'information',
      description: 'Preparation instructions for CT scans',
      variables: ['patientName', 'appointmentDate', 'fastingHours'],
      body: 'Hi {{patientName}}, for your CT scan on {{appointmentDate}}: Fast for {{fastingHours}} hours beforehand, bring your referral, and arrive 15 minutes early. Questions? Call Axis Imaging.'
    },
    {
      id: 'preparation_instructions_ultrasound',
      name: 'Ultrasound Preparation',
      category: 'information',
      description: 'Preparation instructions for ultrasounds',
      variables: ['patientName', 'appointmentDate', 'preparationDetails'],
      body: 'Hi {{patientName}}, for your ultrasound on {{appointmentDate}}: {{preparationDetails}} Bring your referral and arrive 15 minutes early at Axis Imaging.'
    },
    {
      id: 'contact_information',
      name: 'Contact Information',
      category: 'information',
      description: 'Axis Imaging contact details',
      variables: ['patientName'],
      body: 'Hi {{patientName}}, Axis Imaging Mickleham: Level 1, 107/21 Cityside Drive, Mickleham VIC 3064. Phone: (03) 8746 4200. Mon-Fri 7AM-7PM, Sat 8AM-4PM.'
    },
    {
      id: 'gp_discussion_reminder',
      name: 'GP Discussion Reminder',
      category: 'information',
      description: 'Reminder to discuss results with GP',
      variables: ['patientName', 'scanType'],
      body: 'Hi {{patientName}}, your {{scanType}} results are available. Remember to book an appointment with your GP to discuss your results and any necessary follow-up care.'
    },

    // Custom/Manual Templates
    {
      id: 'custom_message',
      name: 'Custom Message',
      category: 'information',
      description: 'Template for staff to send custom messages',
      variables: ['patientName', 'message'],
      body: 'Hi {{patientName}}, {{message}} - Axis Imaging'
    }
  ]

  async getTemplate(templateId: string, variables: Record<string, string>): Promise<string> {
    const template = this.templates.find(t => t.id === templateId)
    if (!template) {
      throw new Error(`SMS template not found: ${templateId}`)
    }

    return this.interpolateTemplate(template.body, variables)
  }

  async getTemplatesByCategory(category: SMSTemplate['category']): Promise<SMSTemplate[]> {
    return this.templates.filter(t => t.category === category)
  }

  async getAllTemplates(): Promise<SMSTemplate[]> {
    return [...this.templates]
  }

  async validateTemplate(templateId: string, variables: Record<string, string>): Promise<{ valid: boolean; missingVariables: string[] }> {
    const template = this.templates.find(t => t.id === templateId)
    if (!template) {
      return { valid: false, missingVariables: [] }
    }

    const missingVariables = template.variables.filter(variable => !variables[variable])
    return {
      valid: missingVariables.length === 0,
      missingVariables
    }
  }

  private interpolateTemplate(template: string, variables: Record<string, string>): string {
    let result = template
    
    // Replace {{variable}} placeholders
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g')
      result = result.replace(regex, value || '')
    })

    // Check for any remaining unreplaced variables
    const unreplacedMatches = result.match(/{{[^}]+}}/g)
    if (unreplacedMatches) {
      console.warn('Unreplaced template variables:', unreplacedMatches)
      // Remove unreplaced variables to avoid showing {{variable}} in SMS
      unreplacedMatches.forEach(match => {
        result = result.replace(match, '')
      })
    }

    return result.trim()
  }

  // Generate standard variables for common use cases
  generateReportReadyVariables(patient: any, scan: any, appBaseUrl: string): Record<string, string> {
    const appLink = `${appBaseUrl}/scan/${scan.id}?token=${this.generateSecureToken()}`
    
    return {
      patientName: `${patient.firstName} ${patient.lastName}`,
      scanType: this.formatScanType(scan.modality, scan.studyDescription),
      appLink: appLink,
      contactNumber: '(03) 8746 4200'
    }
  }

  generateAppointmentVariables(patient: any, appointment: any): Record<string, string> {
    return {
      patientName: `${patient.firstName} ${patient.lastName}`,
      appointmentDate: this.formatDate(appointment.scheduledAt),
      appointmentTime: this.formatTime(appointment.scheduledAt),
      scanType: appointment.scanType || 'imaging',
      location: 'Mickleham',
      contactNumber: '(03) 8746 4200',
      preparationInstructions: this.getPreparationInstructions(appointment.scanType)
    }
  }

  generateRegistrationVariables(patient: any, registrationBaseUrl: string): Record<string, string> {
    const registrationLink = `${registrationBaseUrl}/register?invite=${this.generateSecureToken()}&email=${encodeURIComponent(patient.email)}`
    
    return {
      patientName: `${patient.firstName} ${patient.lastName}`,
      registrationLink: registrationLink,
      contactNumber: '(03) 8746 4200'
    }
  }

  private formatScanType(modality: string, description?: string): string {
    const modalityMap: Record<string, string> = {
      'XR': 'X-ray',
      'CT': 'CT scan',
      'MR': 'MRI',
      'US': 'ultrasound',
      'MG': 'mammogram',
      'DX': 'digital X-ray',
      'CR': 'computed radiography'
    }

    const formattedModality = modalityMap[modality] || modality.toLowerCase()
    return description ? `${formattedModality} (${description})` : formattedModality
  }

  private formatDate(date: Date): string {
    return date.toLocaleDateString('en-AU', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  private formatTime(date: Date): string {
    return date.toLocaleTimeString('en-AU', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  private getPreparationInstructions(scanType?: string): string {
    const instructions: Record<string, string> = {
      'ct': 'Please fast for 4 hours before your appointment.',
      'ultrasound_abdominal': 'Please fast for 6 hours and drink 1L of water 1 hour before your appointment.',
      'ultrasound_pelvic': 'Please drink 1L of water 1 hour before your appointment.',
      'mri': 'Please remove all metal objects and inform us of any implants.',
      'xray': 'No special preparation required.',
      'mammogram': 'Please avoid deodorant, perfume, or powder on the day of your appointment.'
    }

    return instructions[scanType?.toLowerCase() || ''] || 'Please follow any preparation instructions provided with your referral.'
  }

  private generateSecureToken(): string {
    // Generate a secure token for links (in production, use crypto.randomBytes)
    return Math.random().toString(36).substring(2) + Date.now().toString(36)
  }
}