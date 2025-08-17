// HL7 Listener Service for Voyager RIS Integration
// Axis Imaging Patient Portal

import * as net from 'net';

// HL7 Configuration
const HL7_PORT = parseInt(process.env.HL7_PORT || '2575');
const HL7_HOST = process.env.HL7_HOST || '0.0.0.0';

// Supabase Configuration (mock for now - will integrate later)
const supabaseUrl = process.env.SUPABASE_URL || 'https://mock.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'mock-key';

// Mock Supabase client for development
const supabase = {
  from: (table: string) => ({
    insert: (data: any) => Promise.resolve({ error: null, data }),
    update: (data: any) => ({ eq: (field: string, value: any) => Promise.resolve({ error: null }) }),
    select: (fields: string) => ({ eq: (field: string, value: any) => ({ single: () => Promise.resolve({ data: null }) }) })
  })
};

// HL7 Message Delimiters
const HL7_FIELD_SEPARATOR = '|';

interface HL7Message {
  header: HL7Segment;
  segments: HL7Segment[];
  raw: string;
}

interface HL7Segment {
  type: string;
  fields: string[];
}

class HL7Listener {
  private server: net.Server;
  private isRunning: boolean = false;

  constructor() {
    this.server = net.createServer(this.handleConnection.bind(this));
    this.setupServerEvents();
  }

  private setupServerEvents(): void {
    this.server.on('error', (error) => {
      console.error('HL7 Server Error:', error);
    });

    this.server.on('close', () => {
      console.log('HL7 Server closed');
      this.isRunning = false;
    });
  }

  private handleConnection(socket: net.Socket): void {
    const clientInfo = `${socket.remoteAddress}:${socket.remotePort}`;
    console.log(`HL7 Connection from Voyager RIS: ${clientInfo}`);

    socket.on('data', async (data) => {
      try {
        const rawMessage = data.toString().trim();
        console.log(`Received HL7 message from ${clientInfo}:`, rawMessage.substring(0, 100) + '...');
        
        const message = this.parseHL7Message(rawMessage);
        await this.processHL7Message(message);
        
        // Send HL7 ACK (Acknowledgement)
        const ack = this.createACK(message);
        socket.write(ack);
        
        console.log(`Sent ACK to ${clientInfo}`);
        
      } catch (error) {
        console.error('Error processing HL7 message:', error);
        
        // Send HL7 NAK (Negative Acknowledgement)
        const nak = this.createNAK('Error processing message');
        socket.write(nak);
      }
    });

    socket.on('error', (error) => {
      console.error(`Socket error from ${clientInfo}:`, error);
    });

    socket.on('close', () => {
      console.log(`HL7 Connection closed: ${clientInfo}`);
    });

    socket.on('timeout', () => {
      console.log(`HL7 Connection timeout: ${clientInfo}`);
      socket.destroy();
    });

    // Set socket timeout to 30 minutes  
    socket.setTimeout(30 * 60 * 1000);
  }

  private parseHL7Message(rawMessage: string): HL7Message {
    const lines = rawMessage.split('\r');
    const segments: HL7Segment[] = [];
    
    let header: HL7Segment | null = null;

    for (const line of lines) {
      if (line.trim() === '') continue;
      
      const segment = this.parseHL7Segment(line);
      
      if (segment.type === 'MSH') {
        header = segment;
      }
      segments.push(segment);
    }

    if (!header) {
      throw new Error('Invalid HL7 message: Missing MSH header');
    }

    return {
      header,
      segments,
      raw: rawMessage
    };
  }

  private parseHL7Segment(line: string): HL7Segment {
    const segmentType = line.substring(0, 3);
    
    // Special handling for MSH segment (has different field separator logic)
    if (segmentType === 'MSH') {
      const fields = line.split(HL7_FIELD_SEPARATOR);
      // MSH segment structure: MSH|^~\&|...
      return {
        type: segmentType,
        fields: ['MSH', '^~\\&', ...fields.slice(2)]
      };
    }
    
    const fields = line.split(HL7_FIELD_SEPARATOR);
    return {
      type: segmentType,
      fields
    };
  }

  private async processHL7Message(message: HL7Message): Promise<void> {
    const messageType = this.getMessageType(message);
    console.log(`Processing HL7 message type: ${messageType}`);

    // Log the message to audit trail
    await this.logHL7Message(message, messageType);

    switch (messageType) {
      case 'ORU^R01':
        await this.handleReportCompletion(message);
        break;
      case 'ORM^O01':
        await this.handleNewOrder(message);
        break;
      case 'ADT^A08':
        await this.handlePatientUpdate(message);
        break;
      default:
        console.log(`Unsupported message type: ${messageType}`);
    }
  }

  private getMessageType(message: HL7Message): string {
    // Message type is in MSH-9 (Message Type)
    return message.header.fields[9] || 'UNKNOWN';
  }

  private async logHL7Message(message: HL7Message, messageType: string): Promise<void> {
    try {
      const controlId = message.header.fields[10]; // MSH-10 Message Control ID
      
      await supabase.from('hl7_audit_log').insert({
        message_type: messageType,
        control_id: controlId,
        raw_message: message.raw,
        processed_at: new Date().toISOString(),
        status: 'PROCESSING'
      });
    } catch (error) {
      console.error('Failed to log HL7 message:', error);
    }
  }

  private async handleReportCompletion(message: HL7Message): Promise<void> {
    try {
      const pidSegment = this.getSegment(message, 'PID');
      const obrSegment = this.getSegment(message, 'OBR');
      const obxSegments = this.getSegments(message, 'OBX');

      if (!pidSegment || !obrSegment) {
        throw new Error('Missing required segments (PID/OBR) in ORU message');
      }

      const patientId = pidSegment.fields[3]?.split('^')[0]; // PID-3 Patient ID
      const accessionNumber = obrSegment.fields[3]; // OBR-3 Filler Order Number
      const reportingPhysician = obrSegment.fields[32]; // OBR-32 Principal Result Interpreter
      const reportStatus = obrSegment.fields[25]; // OBR-25 Result Status

      // Extract report content from OBX segments
      const reportSections: { [key: string]: string } = {};
      
      for (const obxSegment of obxSegments) {
        const observationType = obxSegment.fields[3]; // OBX-3 Observation Identifier
        const observationValue = obxSegment.fields[5]; // OBX-5 Observation Value
        
        if (observationType && observationValue) {
          const sectionName = observationType.toLowerCase();
          
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

      // Update study with report
      const { error: updateError } = await supabase
        .from('studies')
        .update({
          report_status: reportStatus === 'F' ? 'FINAL' : 'PRELIMINARY',
          report_text: JSON.stringify(reportSections),
          radiologist: reportingPhysician || 'Dr. Farhan Ahmed, Axis Imaging',
          updated_at: new Date().toISOString()
        })
        .eq('accession_number', accessionNumber);

      if (updateError) {
        throw new Error(`Failed to update study: ${updateError.message}`);
      }

      // Send SMS notification to patient if report is final
      if (reportStatus === 'F') {
        await this.sendSMSNotification(patientId, accessionNumber);
      }

      console.log(`Successfully processed report completion for accession: ${accessionNumber}`);

    } catch (error) {
      console.error('Error handling report completion:', error);
      throw error;
    }
  }

  private async handleNewOrder(message: HL7Message): Promise<void> {
    try {
      const pidSegment = this.getSegment(message, 'PID');
      const obrSegment = this.getSegment(message, 'OBR');

      if (!pidSegment || !obrSegment) {
        throw new Error('Missing required segments (PID/OBR) in ORM message');
      }

      const patientId = pidSegment.fields[3]?.split('^')[0]; // PID-3 Patient ID
      const patientName = pidSegment.fields[5]; // PID-5 Patient Name
      const patientDOB = pidSegment.fields[7]; // PID-7 Date of Birth
      const patientSex = pidSegment.fields[8]; // PID-8 Sex
      const patientPhone = pidSegment.fields[13]; // PID-13 Phone Number

      const accessionNumber = obrSegment.fields[3]; // OBR-3 Filler Order Number
      const studyDescription = obrSegment.fields[4]; // OBR-4 Service ID
      const orderingPhysician = obrSegment.fields[16]; // OBR-16 Ordering Provider

      // Parse patient name (format: LAST^FIRST^MIDDLE)
      const nameParts = patientName?.split('^') || [];
      const lastName = nameParts[0] || '';
      const firstName = nameParts[1] || '';

      // Create or update patient
      const { data: existingPatient } = await supabase
        .from('patients')
        .select('id')
        .eq('external_id', patientId)
        .single();

      let patientDbId = existingPatient?.id;

      if (!existingPatient) {
        const { data: newPatient, error: patientError } = await supabase
          .from('patients')
          .insert({
            external_id: patientId,
            first_name: firstName,
            last_name: lastName,
            date_of_birth: patientDOB,
            gender: patientSex,
            phone_number: patientPhone,
            created_at: new Date().toISOString()
          })
          .select('id')
          .single();

        if (patientError) {
          throw new Error(`Failed to create patient: ${patientError.message}`);
        }

        patientDbId = newPatient.id;
      }

      // Create study
      const { error: studyError } = await supabase
        .from('studies')
        .insert({
          patient_id: patientDbId,
          accession_number: accessionNumber,
          study_description: studyDescription,
          ordering_physician: orderingPhysician,
          status: 'SCHEDULED',
          created_at: new Date().toISOString()
        });

      if (studyError) {
        throw new Error(`Failed to create study: ${studyError.message}`);
      }

      console.log(`Successfully processed new order for accession: ${accessionNumber}`);

    } catch (error) {
      console.error('Error handling new order:', error);
      throw error;
    }
  }

  private async handlePatientUpdate(message: HL7Message): Promise<void> {
    try {
      const pidSegment = this.getSegment(message, 'PID');

      if (!pidSegment) {
        throw new Error('Missing PID segment in ADT message');
      }

      const patientId = pidSegment.fields[3]?.split('^')[0]; // PID-3 Patient ID
      const patientName = pidSegment.fields[5]; // PID-5 Patient Name
      const patientPhone = pidSegment.fields[13]; // PID-13 Phone Number

      // Parse patient name
      const nameParts = patientName?.split('^') || [];
      const lastName = nameParts[0] || '';
      const firstName = nameParts[1] || '';

      // Update patient
      const { error: updateError } = await supabase
        .from('patients')
        .update({
          first_name: firstName,
          last_name: lastName,
          phone_number: patientPhone,
          updated_at: new Date().toISOString()
        })
        .eq('external_id', patientId);

      if (updateError) {
        throw new Error(`Failed to update patient: ${updateError.message}`);
      }

      console.log(`Successfully processed patient update for ID: ${patientId}`);

    } catch (error) {
      console.error('Error handling patient update:', error);
      throw error;
    }
  }

  private async sendSMSNotification(patientId: string, accessionNumber: string): Promise<void> {
    try {
      // Get patient phone number
      const { data: patient } = await supabase
        .from('patients')
        .select('phone_number, first_name, last_name')
        .eq('external_id', patientId)
        .single();

      if (!patient || !patient.phone_number) {
        console.log(`No phone number found for patient ${patientId}`);
        return;
      }

      const message = `Hello ${patient.first_name}, your radiology results are now available. ` +
                     `Login to the Axis Imaging portal to view them. Accession: ${accessionNumber}`;

      // Call SMS service (you'll need to implement this)
      console.log(`SMS would be sent to ${patient.phone_number}: ${message}`);
      
      // TODO: Integrate with ClickSend or Twilio SMS service

    } catch (error) {
      console.error('Error sending SMS notification:', error);
    }
  }

  private getSegment(message: HL7Message, segmentType: string): HL7Segment | null {
    return message.segments.find(segment => segment.type === segmentType) || null;
  }

  private getSegments(message: HL7Message, segmentType: string): HL7Segment[] {
    return message.segments.filter(segment => segment.type === segmentType);
  }

  private createACK(originalMessage: HL7Message): string {
    const timestamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\..+/, '');
    const controlId = originalMessage.header.fields[10]; // Original message control ID
    
    const ack = [
      `MSH|^~\\&|PORTAL|AXIS|VOYAGER|AXIS|${timestamp}||ACK|${controlId}|P|2.5`,
      `MSA|AA|${controlId}|Message accepted successfully`
    ].join('\r') + '\r';
    
    return ack;
  }

  private createNAK(errorMessage: string): string {
    const timestamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\..+/, '');
    const controlId = Date.now().toString();
    
    const nak = [
      `MSH|^~\\&|PORTAL|AXIS|VOYAGER|AXIS|${timestamp}||ACK|${controlId}|P|2.5`,
      `MSA|AE|${controlId}|${errorMessage}`
    ].join('\r') + '\r';
    
    return nak;
  }

  public start(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.isRunning) {
        reject(new Error('HL7 Listener is already running'));
        return;
      }

      this.server.listen(HL7_PORT, HL7_HOST, () => {
        this.isRunning = true;
        console.log(`HL7 Listener started on ${HL7_HOST}:${HL7_PORT}`);
        console.log('Ready to receive HL7 messages from Voyager RIS');
        resolve();
      });

      this.server.on('error', (error) => {
        reject(error);
      });
    });
  }

  public stop(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.isRunning) {
        resolve();
        return;
      }

      this.server.close(() => {
        this.isRunning = false;
        console.log('HL7 Listener stopped');
        resolve();
      });
    });
  }

  public getStatus(): object {
    return {
      isRunning: this.isRunning,
      host: HL7_HOST,
      port: HL7_PORT,
      connections: this.server.listening ? 'Active' : 'None'
    };
  }
}

// Export for use in main application
export default HL7Listener;

// CLI Usage
if (require.main === module) {
  const listener = new HL7Listener();
  
  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    console.log('Shutting down HL7 Listener...');
    await listener.stop();
    process.exit(0);
  });

  // Start the listener
  listener.start().catch((error) => {
    console.error('Failed to start HL7 Listener:', error);
    process.exit(1);
  });
}