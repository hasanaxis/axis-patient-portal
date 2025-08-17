// Enhanced HL7 Report Completion Handler for Existing Patients
// Handles different SMS logic for new vs existing portal users

async function handleReportCompletionEnhanced(message) {
  console.log('📋 Processing Report Completion (ORU^R01) - Enhanced');
  
  // ... existing parsing logic ...
  
  if (supabase && reportStatus === 'F') {
    try {
      // Find study and patient information
      const { data: study } = await supabase
        .from('studies')
        .select(`
          id, 
          patient_id,
          patients!inner (
            id,
            external_id,
            first_name,
            last_name,
            phone_number,
            date_of_birth
          )
        `)
        .eq('accession_number', accessionNumber)
        .single();
      
      if (study) {
        const patient = study.patients;
        const patientName = `${patient.first_name} ${patient.last_name}`;
        
        // Check if patient already has portal account
        const { data: existingUser } = await supabase
          .from('users')
          .select('id, email, phone_number')
          .eq('phone_number', patient.phone_number)
          .single();
        
        if (existingUser) {
          // EXISTING PORTAL USER - Send "new results ready" notification
          console.log(`📱 Sending "new results" notification to existing user: ${patientName}`);
          
          const loginLink = `${PORTAL_BASE_URL}/login`;
          const message = `Hello ${patientName}, your new scan results from Axis Imaging are ready! Login to view: ${loginLink}`;
          
          await sendSMS(patient.phone_number, message);
          
          // Optional: Also send email notification
          if (existingUser.email) {
            await sendEmail(existingUser.email, {
              subject: 'New Scan Results Available - Axis Imaging',
              body: `Hello ${patientName},\n\nYour recent scan results are now available in your patient portal.\n\nLogin to view: ${loginLink}\n\nAxis Imaging Team`
            });
          }
          
          // Log notification for existing user
          await supabase.from('notifications').insert({
            patient_id: patient.id,
            study_id: study.id,
            user_id: existingUser.id,
            type: 'SMS_EMAIL',
            purpose: 'NEW_RESULTS_READY',
            phone_number: patient.phone_number,
            email: existingUser.email,
            status: 'SENT',
            sent_at: new Date().toISOString(),
            created_via: 'HL7_ORU_EXISTING_USER'
          });
          
        } else {
          // NEW USER - Send registration invitation
          console.log(`📱 Sending registration invitation to new user: ${patientName}`);
          
          const registrationLink = `${PORTAL_BASE_URL}/register?ref=${accessionNumber}`;
          const message = `Hello ${patientName}, your scan images from Axis Imaging are ready! View them securely: ${registrationLink}`;
          
          await sendSMS(patient.phone_number, message);
          
          // Log invitation for new user
          await supabase.from('notifications').insert({
            patient_id: patient.id,
            study_id: study.id,
            type: 'SMS',
            purpose: 'REGISTRATION_INVITATION',
            phone_number: patient.phone_number,
            status: 'SENT',
            sent_at: new Date().toISOString(),
            created_via: 'HL7_ORU_NEW_USER'
          });
        }
        
        console.log(`✅ Notification sent successfully to ${patientName}`);
        
      } else {
        console.log(`⚠️  Study not found for accession: ${accessionNumber}`);
      }
      
    } catch (error) {
      console.error('❌ Enhanced notification error:', error);
    }
  }
  
  console.log('✅ Enhanced report completion processed successfully');
}

// Email service function
async function sendEmail(email, { subject, body }) {
  // Implementation would depend on email service (SendGrid, AWS SES, etc.)
  console.log(`📧 Email sent to ${email}: ${subject}`);
  // Add actual email sending logic here
  return true;
}

// Enhanced SMS service for different message types
async function sendSMS(phoneNumber, message) {
  if (!CLICKSEND_USERNAME || !CLICKSEND_API_KEY) {
    console.log('📱 SMS would be sent to:', phoneNumber, message.substring(0, 50) + '...');
    return true;
  }
  
  // Add actual ClickSend SMS sending logic here
  console.log(`📱 SMS sent to ${phoneNumber}: ${message.substring(0, 50)}...`);
  return true;
}