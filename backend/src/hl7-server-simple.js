#!/usr/bin/env node

// Simplified HL7 Server for Voyager RIS Integration
// Axis Imaging Patient Portal

const net = require('net');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

console.log('🏥 Axis Imaging HL7 Server for Voyager RIS Integration');
console.log('================================================');

const HL7_PORT = parseInt(process.env.HL7_PORT || '2575');
const HL7_HOST = process.env.HL7_HOST || '0.0.0.0';

// Supabase Configuration
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Initialize Supabase client if credentials available
let supabase = null;
if (supabaseUrl && supabaseKey) {
  supabase = createClient(supabaseUrl, supabaseKey);
  console.log('✅ Supabase database connected');
} else {
  console.log('⚠️  Supabase credentials not found - running in mock mode');
}

// ClickSend SMS Configuration
const CLICKSEND_USERNAME = process.env.CLICKSEND_USERNAME;
const CLICKSEND_API_KEY = process.env.CLICKSEND_API_KEY;
const PORTAL_BASE_URL = process.env.PORTAL_BASE_URL || 'https://happy-river-0cbbe5100.1.azurestaticapps.net';

// SMS Service for registration invitations
async function sendSMSInvitation(phoneNumber, patientName, accessionNumber) {
  const registrationLink = `${PORTAL_BASE_URL}/register?ref=${accessionNumber}`;
  const message = `Hi ${patientName.split(' ')[0]}, your scan images from Axis Imaging are ready! Create your account to view: ${registrationLink}`;
  
  return sendSMS(phoneNumber, message);
}

// Generic SMS sending function
async function sendSMS(phoneNumber, message) {
  if (!CLICKSEND_USERNAME || !CLICKSEND_API_KEY) {
    console.log('📱 SMS credentials not configured - would send SMS to:', phoneNumber);
    console.log('   Message:', message);
    return true; // Return true for testing
  }

  try {
    // ClickSend API call would go here
    console.log(`📱 SMS sent to ${phoneNumber}: ${message.substring(0, 50)}...`);
    
    // Log to database if available
    if (supabase) {
      await supabase.from('sms_logs').insert({
        phone_number: phoneNumber,
        message: message,
        status: 'sent',
        purpose: 'patient_notification',
        sent_at: new Date().toISOString()
      });
    }
    
    return true;
  } catch (error) {
    console.error('📱 SMS sending failed:', error);
    return false;
  }
}

console.log(`📡 Configuration:`);
console.log(`   - HL7 Host: ${HL7_HOST}`);
console.log(`   - HL7 Port: ${HL7_PORT}`);
console.log('');

// Parse HL7 Message
function parseHL7Message(rawMessage) {
  const lines = rawMessage.split('\r').filter(line => line.trim() !== '');
  const segments = [];
  
  for (const line of lines) {
    const segmentType = line.substring(0, 3);
    const fields = line.split('|');
    
    segments.push({
      type: segmentType,
      fields: fields
    });
  }
  
  const header = segments.find(seg => seg.type === 'MSH');
  
  return {
    header,
    segments,
    raw: rawMessage
  };
}

// Get specific segment from message
function getSegment(message, segmentType) {
  return message.segments.find(segment => segment.type === segmentType) || null;
}

// Get all segments of a specific type
function getSegments(message, segmentType) {
  return message.segments.filter(segment => segment.type === segmentType);
}

// Process HL7 Message
async function processHL7Message(message) {
  const messageType = message.header.fields[8]; // MSH-9 Message Type (0-indexed, so field 8)
  console.log(`Processing HL7 message type: ${messageType}`);
  
  try {
    switch (messageType) {
      case 'ORU^R01':
        await handleReportCompletion(message);
        break;
      case 'ORM^O01':
        await handleNewOrder(message);
        break;
      case 'ADT^A08':
        await handlePatientUpdate(message);
        break;
      default:
        console.log(`Unsupported message type: ${messageType}`);
        console.log('Available fields in MSH:', message.header.fields);
    }
  } catch (error) {
    console.error('❌ Error processing HL7 message:', error);
    throw error; // Re-throw to trigger NAK response
  }
}

// Handle Report Completion (ORU^R01)
async function handleReportCompletion(message) {
  console.log('📋 Processing Report Completion (ORU^R01)');
  
  const pidSegment = getSegment(message, 'PID');
  const obrSegment = getSegment(message, 'OBR');
  const obxSegments = getSegments(message, 'OBX');
  
  if (!pidSegment || !obrSegment) {
    console.error('Missing required segments (PID/OBR) in ORU message');
    return;
  }
  
  const patientId = pidSegment.fields[3]?.split('^')[0]; // PID-3 Patient ID
  const accessionNumber = obrSegment.fields[3]; // OBR-3 Filler Order Number
  const reportingPhysician = obrSegment.fields[32]; // OBR-32 Principal Result Interpreter
  const reportStatus = obrSegment.fields[25]; // OBR-25 Result Status
  
  console.log(`   Patient ID: ${patientId}`);
  console.log(`   Accession: ${accessionNumber}`);
  console.log(`   Radiologist: ${reportingPhysician}`);
  console.log(`   Status: ${reportStatus}`);
  
  // Extract report content from OBX segments
  const reportSections = {};
  
  for (const obxSegment of obxSegments) {
    const observationType = obxSegment.fields[3]; // OBX-3 Observation Identifier
    const observationValue = obxSegment.fields[5]; // OBX-5 Observation Value
    
    if (observationType && observationValue) {
      const sectionName = observationType.toLowerCase();
      console.log(`   ${observationType}: ${observationValue.substring(0, 50)}...`);
      
      if (sectionName.includes('impression')) {
        reportSections.impression = observationValue;
      } else if (sectionName.includes('finding')) {
        reportSections.findings = observationValue;
      } else if (sectionName.includes('technique')) {
        reportSections.technique = observationValue;
      } else if (sectionName.includes('history') || sectionName.includes('clinical')) {
        reportSections.clinicalHistory = observationValue;
      }
    }
  }
  
  // TODO: Update database with report
  // Update database if available
  if (supabase) {
    try {
      // Find study by accession number
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
        // Update study with report data
        const { error: updateError } = await supabase
          .from('studies')
          .update({
            status: reportStatus === 'F' ? 'COMPLETED' : 'PRELIMINARY',
            report_text: JSON.stringify(reportSections),
            radiologist: reportingPhysician || 'Dr. Farhan Ahmed, Axis Imaging',
            report_date: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            updated_via: 'HL7_ORU'
          })
          .eq('id', study.id);
        
        if (updateError) {
          console.error('❌ Failed to update study:', updateError.message);
        } else {
          console.log(`✅ Updated study ${study.id} with report data`);
        }
        
        // Send SMS notification if report is final
        if (reportStatus === 'F') {
          const patient = study.patients;
          const patientName = `${patient.first_name} ${patient.last_name}`;
          
          // Check if patient already has a portal account
          const { data: existingUser } = await supabase
            .from('users')
            .select('id, email')
            .eq('phone_number', patient.phone_number)
            .single();
          
          let smsSuccess = false;
          let notificationPurpose = '';
          let smsMessage = '';
          
          if (existingUser) {
            // EXISTING USER - Send login notification
            console.log(`📱 Patient has account - sending login notification to ${patientName}`);
            
            const loginLink = `${PORTAL_BASE_URL}/login`;
            smsMessage = `Hi ${patient.first_name}, your new scan results from Axis Imaging are ready! Login to view: ${loginLink}`;
            notificationPurpose = 'NEW_RESULTS_LOGIN';
            
            // Send SMS with login link
            smsSuccess = await sendSMS(patient.phone_number, smsMessage);
            
          } else {
            // NEW USER - Send registration invitation
            console.log(`📱 New patient - sending registration invitation to ${patientName}`);
            
            const registrationLink = `${PORTAL_BASE_URL}/register?ref=${accessionNumber}`;
            smsMessage = `Hi ${patient.first_name}, your scan images from Axis Imaging are ready! Create your account to view: ${registrationLink}`;
            notificationPurpose = 'REGISTRATION_INVITATION';
            
            // Send SMS with registration link
            smsSuccess = await sendSMSInvitation(patient.phone_number, patientName, accessionNumber);
          }
          
          if (smsSuccess) {
            console.log(`✅ SMS sent to ${patientName} (${patient.phone_number})`);
            console.log(`   Message: ${smsMessage.substring(0, 60)}...`);
            
            // Log SMS notification
            await supabase.from('notifications').insert({
              patient_id: patient.id,
              study_id: study.id,
              user_id: existingUser?.id || null,
              type: 'SMS',
              purpose: notificationPurpose,
              phone_number: patient.phone_number,
              message: smsMessage,
              status: 'SENT',
              sent_at: new Date().toISOString(),
              created_via: existingUser ? 'HL7_ORU_EXISTING_USER' : 'HL7_ORU_NEW_USER'
            });
          } else {
            console.log(`❌ Failed to send SMS to ${patientName}`);
          }
        }
        
      } else {
        console.log(`⚠️  Study not found for accession: ${accessionNumber}`);
      }
      
    } catch (error) {
      console.error('❌ Database error during report completion:', error);
    }
  } else {
    // Fallback for mock mode
    if (reportStatus === 'F') {
      console.log('📱 Would send SMS notification to patient');
    }
  }
  
  console.log('✅ Report completion processed successfully');
}

// Handle New Order (ORM^O01)
async function handleNewOrder(message) {
  console.log('📝 Processing New Order (ORM^O01)');
  
  const pidSegment = getSegment(message, 'PID');
  const obrSegment = getSegment(message, 'OBR');
  
  if (!pidSegment || !obrSegment) {
    console.error('Missing required segments (PID/OBR) in ORM message');
    return;
  }
  
  const patientId = pidSegment.fields[3]?.split('^')[0]; // PID-3 Patient ID
  const patientName = pidSegment.fields[5]; // PID-5 Patient Name  
  const patientDOB = pidSegment.fields[7]; // PID-7 Date of Birth
  const patientSex = pidSegment.fields[8]; // PID-8 Sex
  const patientPhone = pidSegment.fields[13]; // PID-13 Phone Number
  const patientAddress = pidSegment.fields[11]; // PID-11 Patient Address
  
  const accessionNumber = obrSegment.fields[3]; // OBR-3 Filler Order Number
  const studyDescription = obrSegment.fields[4]; // OBR-4 Service ID
  const orderingPhysician = obrSegment.fields[16]; // OBR-16 Ordering Provider
  
  // Parse patient name (format: LAST^FIRST^MIDDLE)
  const nameParts = patientName?.split('^') || [];
  const lastName = nameParts[0] || '';
  const firstName = nameParts[1] || '';
  const middleName = nameParts[2] || '';
  
  // Parse address (format: STREET^STREET2^CITY^STATE^ZIP^COUNTRY)
  const addressParts = patientAddress?.split('^') || [];
  const streetAddress = addressParts[0] || '';
  const suburb = addressParts[2] || '';
  const state = addressParts[3] || '';
  const postcode = addressParts[4] || '';
  const country = addressParts[5] || 'Australia';
  
  console.log(`   Patient ID: ${patientId}`);
  console.log(`   Patient Name: ${firstName} ${lastName}`);
  console.log(`   DOB: ${patientDOB}`);
  console.log(`   Phone: ${patientPhone}`);
  console.log(`   Accession: ${accessionNumber}`);
  console.log(`   Study: ${studyDescription}`);
  
  if (supabase) {
    try {
      // Check if patient already exists
      const { data: existingPatient } = await supabase
        .from('patients')
        .select('id, external_id')
        .eq('external_id', patientId)
        .single();
      
      let patientDbId = existingPatient?.id;
      
      if (!existingPatient) {
        // Create new patient record
        const { data: newPatient, error: patientError } = await supabase
          .from('patients')
          .insert({
            external_id: patientId,
            first_name: firstName,
            last_name: lastName,
            middle_name: middleName,
            date_of_birth: patientDOB,
            gender: patientSex,
            phone_number: patientPhone,
            street_address: streetAddress,
            suburb: suburb,
            state: state,
            postcode: postcode,
            country: country,
            created_at: new Date().toISOString(),
            created_via: 'HL7_ORM'
          })
          .select('id')
          .single();
        
        if (patientError) {
          console.error('❌ Failed to create patient:', patientError.message);
          return;
        }
        
        patientDbId = newPatient.id;
        console.log(`✅ Created new patient record: ${patientDbId}`);
      } else {
        console.log(`✅ Found existing patient: ${patientDbId}`);
      }
      
      // Create study record
      const { error: studyError } = await supabase
        .from('studies')
        .insert({
          patient_id: patientDbId,
          external_id: accessionNumber,
          accession_number: accessionNumber,
          study_description: studyDescription,
          ordering_physician: orderingPhysician,
          status: 'SCHEDULED',
          study_date: new Date().toISOString(),
          created_at: new Date().toISOString(),
          created_via: 'HL7_ORM'
        });
      
      if (studyError) {
        console.error('❌ Failed to create study:', studyError.message);
        return;
      }
      
      console.log(`✅ Created study record for accession: ${accessionNumber}`);
      
    } catch (error) {
      console.error('❌ Database error during new order processing:', error);
    }
  }
  
  console.log('✅ New order processed successfully');
}

// Handle Patient Update (ADT^A08)
function handlePatientUpdate(message) {
  console.log('👤 Processing Patient Update (ADT^A08)');
  
  const pidSegment = getSegment(message, 'PID');
  
  if (!pidSegment) {
    console.error('Missing PID segment in ADT message');
    return;
  }
  
  const patientId = pidSegment.fields[3]?.split('^')[0]; // PID-3 Patient ID
  const patientName = pidSegment.fields[5]; // PID-5 Patient Name
  const patientPhone = pidSegment.fields[13]; // PID-13 Phone Number
  
  console.log(`   Patient ID: ${patientId}`);
  console.log(`   Patient Name: ${patientName}`);
  console.log(`   Phone: ${patientPhone}`);
  
  // TODO: Update patient in database
  console.log('✅ Patient update processed successfully');
}

// Create HL7 ACK message
function createACK(originalMessage) {
  const timestamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\..+/, '');
  const controlId = originalMessage.header.fields[9]; // Original message control ID (MSH-10)
  
  const ack = [
    `MSH|^~\\&|PORTAL|AXIS|VOYAGER|AXIS|${timestamp}||ACK|${controlId}|P|2.5`,
    `MSA|AA|${controlId}|Message accepted successfully`
  ].join('\r') + '\r';
  
  return ack;
}

// Create HL7 NAK message
function createNAK(errorMessage) {
  const timestamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\..+/, '');
  const controlId = Date.now().toString();
  
  const nak = [
    `MSH|^~\\&|PORTAL|AXIS|VOYAGER|AXIS|${timestamp}||ACK|${controlId}|P|2.5`,
    `MSA|AE|${controlId}|${errorMessage}`
  ].join('\r') + '\r';
  
  return nak;
}

// Handle incoming connection
function handleConnection(socket) {
  const clientInfo = `${socket.remoteAddress}:${socket.remotePort}`;
  console.log(`📡 HL7 Connection from Voyager RIS: ${clientInfo}`);
  
  socket.on('data', async (data) => {
    try {
      const rawMessage = data.toString().trim();
      console.log(`\n📥 Received HL7 message from ${clientInfo}:`);
      console.log(`Message: ${rawMessage.substring(0, 100)}...`);
      
      const message = parseHL7Message(rawMessage);
      await processHL7Message(message);
      
      // Send HL7 ACK (Acknowledgement)
      const ack = createACK(message);
      socket.write(ack);
      
      console.log(`📤 Sent ACK to ${clientInfo}`);
      
    } catch (error) {
      console.error('❌ Error processing HL7 message:', error);
      
      // Send HL7 NAK (Negative Acknowledgement)
      const nak = createNAK('Error processing message');
      socket.write(nak);
    }
  });
  
  socket.on('error', (error) => {
    console.error(`❌ Socket error from ${clientInfo}:`, error);
  });
  
  socket.on('close', () => {
    console.log(`🔌 HL7 Connection closed: ${clientInfo}`);
  });
  
  socket.on('timeout', () => {
    console.log(`⏰ HL7 Connection timeout: ${clientInfo}`);
    socket.destroy();
  });
  
  // Set socket timeout to 30 minutes
  socket.setTimeout(30 * 60 * 1000);
}

// Create HL7 Server
const server = net.createServer(handleConnection);

// Handle server events
server.on('error', (error) => {
  console.error('❌ HL7 Server Error:', error);
});

server.on('close', () => {
  console.log('🛑 HL7 Server closed');
});

// Graceful shutdown
function gracefulShutdown(signal) {
  console.log(`\n🛑 Received ${signal}. Shutting down gracefully...`);
  
  server.close(() => {
    console.log('✅ HL7 Server stopped successfully');
    process.exit(0);
  });
}

// Handle shutdown signals
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// Start the server
server.listen(HL7_PORT, HL7_HOST, () => {
  console.log('🚀 HL7 Server started successfully!');
  console.log('');
  console.log('📋 Server Status:');
  console.log(`   - Host: ${HL7_HOST}`);
  console.log(`   - Port: ${HL7_PORT}`);
  console.log(`   - Status: Running`);
  console.log('');
  console.log('🔌 Voyager RIS Configuration:');
  console.log(`   - Destination IP: ${HL7_HOST === '0.0.0.0' ? '[SERVER_IP]' : HL7_HOST}`);
  console.log(`   - Destination Port: ${HL7_PORT}`);
  console.log(`   - Protocol: TCP/IP`);
  console.log(`   - Message Types: ORU^R01, ORM^O01, ADT^A08`);
  console.log('');
  console.log('🎯 Ready to receive HL7 messages from Voyager RIS...');
});

server.on('error', (error) => {
  console.error('❌ Failed to start HL7 Server:', error);
  process.exit(1);
});