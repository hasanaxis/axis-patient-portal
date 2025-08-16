/**
 * Voyager RIS Provider Implementation
 * Specialized implementation for Voyager RIS systems with HL7 support
 */

import { 
  BaseRISProvider, 
  RISConnectionConfig, 
  RISQuery, 
  RISOperationResult,
  Patient,
  Order,
  Report,
  Schedule,
  HL7Message 
} from '../interfaces/IRISProvider';
import { HL7Client } from '../hl7/HL7Client';
import { VoyagerAPIClient } from './VoyagerAPIClient';
import { HL7Parser } from '../hl7/HL7Parser';
import { Logger } from '../../utils/logger';

export interface VoyagerRISConfig extends RISConnectionConfig {
  voyagerConfig: {
    systemVersion: string;
    departmentCode: string;
    facilityCode: string;
    autoAcknowledge: boolean;
    messageEncoding: 'UTF-8' | 'ASCII' | 'ISO-8859-1';
    fieldSeparator: string;
    componentSeparator: string;
    repetitionSeparator: string;
    escapeCharacter: string;
    subComponentSeparator: string;
    customMappings?: Record<string, string>;
  };
  apiConfig?: {
    baseURL: string;
    version: 'v1' | 'v2' | 'v3';
    enableWebhooks: boolean;
    webhookSecret?: string;
  };
}

export interface VoyagerOrder extends Order {
  voyagerSpecific: {
    orderNumber: string;
    departmentCode: string;
    locationCode: string;
    roomNumber?: string;
    bedNumber?: string;
    transportRequired: boolean;
    contrastAllergy: boolean;
    isolationPrecautions?: string;
    specialInstructions?: string;
    technicianNotes?: string;
    billingCode: string;
    insuranceInfo?: {
      primaryInsurance: string;
      secondaryInsurance?: string;
      authorizationNumber?: string;
      copayAmount?: number;
    };
  };
}

export interface VoyagerReport extends Report {
  voyagerSpecific: {
    reportNumber: string;
    templateUsed?: string;
    macrosApplied: Record<string, string>;
    voiceRecognitionUsed: boolean;
    transcriptionistId?: string;
    billableCode: string;
    cptCodes: string[];
    icd10Codes: string[];
    criticalValueNotified: boolean;
    addendumCount: number;
  };
}

export class VoyagerRISProvider extends BaseRISProvider {
  readonly name = 'Voyager RIS';
  readonly version = '1.0.0';
  readonly vendor = 'Carestream Health';
  
  private hl7Client: HL7Client;
  private apiClient?: VoyagerAPIClient;
  private hl7Parser: HL7Parser;
  private logger: Logger;
  private voyagerConfig: VoyagerRISConfig;
  
  constructor() {
    super();
    this.logger = new Logger('VoyagerRISProvider');
    this.hl7Client = new HL7Client();
    this.hl7Parser = new HL7Parser();
  }
  
  async connect(config: RISConnectionConfig): Promise<RISOperationResult<boolean>> {
    const operationId = this.generateOperationId();
    this.logger.info(`Connecting to Voyager RIS: ${config.endpoint}`);
    
    try {
      this.voyagerConfig = config as VoyagerRISConfig;
      this.config = config;
      
      // Initialize HL7 connection
      const hl7Result = await this.hl7Client.connect({
        host: config.endpoint,
        port: config.port || 2575,
        sendingApplication: config.hl7Config?.sendingApplication || 'AXIS_IMAGING',
        sendingFacility: config.hl7Config?.sendingFacility || 'AXIS',
        receivingApplication: config.hl7Config?.receivingApplication || 'VOYAGER',
        receivingFacility: config.hl7Config?.receivingFacility || 'HOSPITAL',
        processingID: config.hl7Config?.processingID || 'P',
        enableTLS: config.enableTLS,
        timeout: config.timeout
      });
      
      if (!hl7Result.success) {
        throw new Error(`HL7 connection failed: ${hl7Result.error}`);
      }
      
      // Initialize API client if configured
      if (this.voyagerConfig.apiConfig) {
        this.apiClient = new VoyagerAPIClient();
        const apiResult = await this.apiClient.connect(this.voyagerConfig.apiConfig);
        
        if (!apiResult.success) {
          this.logger.warn(`Voyager API connection failed: ${apiResult.error}`);
          // Continue with HL7-only mode
        }
      }
      
      // Set up HL7 message handlers
      this.setupHL7Handlers();
      
      this.connected = true;
      this.logger.info('Successfully connected to Voyager RIS');
      
      return this.createSuccessResult(true, operationId);
      
    } catch (error) {
      this.logger.error('Failed to connect to Voyager RIS:', error);
      return this.createErrorResult(error.message, 'CONNECTION_FAILED', operationId);
    }
  }
  
  async disconnect(): Promise<RISOperationResult<boolean>> {
    const operationId = this.generateOperationId();
    
    try {
      await this.hl7Client.disconnect();
      
      if (this.apiClient) {
        await this.apiClient.disconnect();
      }
      
      this.connected = false;
      this.logger.info('Disconnected from Voyager RIS');
      
      return this.createSuccessResult(true, operationId);
      
    } catch (error) {
      this.logger.error('Error during Voyager RIS disconnect:', error);
      return this.createErrorResult(error.message, 'DISCONNECT_ERROR', operationId);
    }
  }
  
  async testConnection(): Promise<RISOperationResult<boolean>> {
    const operationId = this.generateOperationId();
    
    try {
      // Test HL7 connection with QRY^A19 message (patient query)
      const testMessage = await this.hl7Client.sendQuery({
        messageType: 'QRY^A19',
        queryTag: 'CONNECTION_TEST',
        queryDefinition: '@PID.3^TEST_PATIENT'
      });
      
      if (!testMessage.success) {
        throw new Error(`HL7 test failed: ${testMessage.error}`);
      }
      
      // Test API if available
      if (this.apiClient) {
        const apiTest = await this.apiClient.ping();
        if (!apiTest.success) {
          this.logger.warn(`Voyager API test failed: ${apiTest.error}`);
        }
      }
      
      return this.createSuccessResult(true, operationId);
      
    } catch (error) {
      return this.createErrorResult(error.message, 'CONNECTION_TEST_FAILED', operationId);
    }
  }
  
  async findPatients(query: RISQuery): Promise<RISOperationResult<Patient[]>> {
    const operationId = this.generateOperationId();
    
    try {
      // Use API if available for complex queries
      if (this.apiClient && this.shouldUseAPIForQuery(query)) {
        return await this.findPatientsViaAPI(query, operationId);
      }
      
      // Use HL7 QRY^A19 message for patient queries
      const hl7Query = this.buildPatientQuery(query);
      const result = await this.hl7Client.sendQuery(hl7Query);
      
      if (!result.success) {
        throw new Error(result.error);
      }
      
      const patients = await this.parsePatientResponse(result.data);
      return this.createSuccessResult(patients, operationId);
      
    } catch (error) {
      this.logger.error('Patient search failed:', error);
      return this.createErrorResult(error.message, 'PATIENT_SEARCH_FAILED', operationId);
    }
  }
  
  async getPatient(patientID: string): Promise<RISOperationResult<Patient>> {
    const operationId = this.generateOperationId();
    
    try {
      if (this.apiClient) {
        const result = await this.apiClient.getPatient(patientID);
        if (result.success) {
          return this.createSuccessResult(result.data, operationId);
        }
      }
      
      // Fallback to HL7
      const hl7Query = this.buildPatientQuery({ patientID });
      const result = await this.hl7Client.sendQuery(hl7Query);
      
      if (!result.success) {
        throw new Error(result.error);
      }
      
      const patients = await this.parsePatientResponse(result.data);
      if (patients.length === 0) {
        throw new Error('Patient not found');
      }
      
      return this.createSuccessResult(patients[0], operationId);
      
    } catch (error) {
      this.logger.error('Get patient failed:', error);
      return this.createErrorResult(error.message, 'GET_PATIENT_FAILED', operationId);
    }
  }
  
  async updatePatient(patient: Patient): Promise<RISOperationResult<boolean>> {
    const operationId = this.generateOperationId();
    
    try {
      // Build ADT^A08 (Update Patient Information) message
      const updateMessage = await this.buildPatientUpdateMessage(patient);
      const result = await this.hl7Client.sendMessage(updateMessage);
      
      if (!result.success) {
        throw new Error(result.error);
      }
      
      return this.createSuccessResult(true, operationId, result.messageId);
      
    } catch (error) {
      this.logger.error('Patient update failed:', error);
      return this.createErrorResult(error.message, 'PATIENT_UPDATE_FAILED', operationId);
    }
  }
  
  async findOrders(query: RISQuery): Promise<RISOperationResult<Order[]>> {
    const operationId = this.generateOperationId();
    
    try {
      if (this.apiClient && this.shouldUseAPIForQuery(query)) {
        return await this.findOrdersViaAPI(query, operationId);
      }
      
      // Use HL7 QRY^O02 message for order queries
      const hl7Query = this.buildOrderQuery(query);
      const result = await this.hl7Client.sendQuery(hl7Query);
      
      if (!result.success) {
        throw new Error(result.error);
      }
      
      const orders = await this.parseOrderResponse(result.data);
      return this.createSuccessResult(orders, operationId);
      
    } catch (error) {
      this.logger.error('Order search failed:', error);
      return this.createErrorResult(error.message, 'ORDER_SEARCH_FAILED', operationId);
    }
  }
  
  async getOrder(orderID: string): Promise<RISOperationResult<Order>> {
    const operationId = this.generateOperationId();
    
    try {
      const orders = await this.findOrders({ orderID });
      
      if (!orders.success || !orders.data || orders.data.length === 0) {
        throw new Error('Order not found');
      }
      
      return this.createSuccessResult(orders.data[0], operationId);
      
    } catch (error) {
      this.logger.error('Get order failed:', error);
      return this.createErrorResult(error.message, 'GET_ORDER_FAILED', operationId);
    }
  }
  
  async updateOrderStatus(orderID: string, status: string, notes?: string): Promise<RISOperationResult<boolean>> {
    const operationId = this.generateOperationId();
    
    try {
      // Build ORM^O01 (Order Message) with status update
      const statusMessage = await this.buildOrderStatusMessage(orderID, status, notes);
      const result = await this.hl7Client.sendMessage(statusMessage);
      
      if (!result.success) {
        throw new Error(result.error);
      }
      
      return this.createSuccessResult(true, operationId, result.messageId);
      
    } catch (error) {
      this.logger.error('Order status update failed:', error);
      return this.createErrorResult(error.message, 'ORDER_STATUS_UPDATE_FAILED', operationId);
    }
  }
  
  async findReports(query: RISQuery): Promise<RISOperationResult<Report[]>> {
    const operationId = this.generateOperationId();
    
    try {
      if (this.apiClient) {
        const result = await this.apiClient.findReports(query);
        if (result.success) {
          return this.createSuccessResult(result.data, operationId);
        }
      }
      
      // Use HL7 QRY^R02 message for report queries
      const hl7Query = this.buildReportQuery(query);
      const result = await this.hl7Client.sendQuery(hl7Query);
      
      if (!result.success) {
        throw new Error(result.error);
      }
      
      const reports = await this.parseReportResponse(result.data);
      return this.createSuccessResult(reports, operationId);
      
    } catch (error) {
      this.logger.error('Report search failed:', error);
      return this.createErrorResult(error.message, 'REPORT_SEARCH_FAILED', operationId);
    }
  }
  
  async getReport(reportID: string): Promise<RISOperationResult<Report>> {
    const operationId = this.generateOperationId();
    
    try {
      const reports = await this.findReports({ accessionNumber: reportID });
      
      if (!reports.success || !reports.data || reports.data.length === 0) {
        throw new Error('Report not found');
      }
      
      return this.createSuccessResult(reports.data[0], operationId);
      
    } catch (error) {
      this.logger.error('Get report failed:', error);
      return this.createErrorResult(error.message, 'GET_REPORT_FAILED', operationId);
    }
  }
  
  async createReport(report: Partial<Report>): Promise<RISOperationResult<string>> {
    const operationId = this.generateOperationId();
    
    try {
      // Build ORU^R01 (Unsolicited Observation Result) message
      const reportMessage = await this.buildReportMessage(report);
      const result = await this.hl7Client.sendMessage(reportMessage);
      
      if (!result.success) {
        throw new Error(result.error);
      }
      
      return this.createSuccessResult(report.reportID || result.messageId, operationId, result.messageId);
      
    } catch (error) {
      this.logger.error('Report creation failed:', error);
      return this.createErrorResult(error.message, 'REPORT_CREATE_FAILED', operationId);
    }
  }
  
  async updateReport(reportID: string, report: Partial<Report>): Promise<RISOperationResult<boolean>> {
    const operationId = this.generateOperationId();
    
    try {
      // Build ORU^R01 message with updated report
      const updatedReport = { ...report, reportID };
      const reportMessage = await this.buildReportMessage(updatedReport);
      const result = await this.hl7Client.sendMessage(reportMessage);
      
      if (!result.success) {
        throw new Error(result.error);
      }
      
      return this.createSuccessResult(true, operationId, result.messageId);
      
    } catch (error) {
      this.logger.error('Report update failed:', error);
      return this.createErrorResult(error.message, 'REPORT_UPDATE_FAILED', operationId);
    }
  }
  
  async signReport(reportID: string, signature: string): Promise<RISOperationResult<boolean>> {
    const operationId = this.generateOperationId();
    
    try {
      // Build MDM^T02 (Medical Document Management) message for signature
      const signatureMessage = await this.buildSignatureMessage(reportID, signature);
      const result = await this.hl7Client.sendMessage(signatureMessage);
      
      if (!result.success) {
        throw new Error(result.error);
      }
      
      return this.createSuccessResult(true, operationId, result.messageId);
      
    } catch (error) {
      this.logger.error('Report signing failed:', error);
      return this.createErrorResult(error.message, 'REPORT_SIGN_FAILED', operationId);
    }
  }
  
  async getSchedule(date: string, modality?: string): Promise<RISOperationResult<Schedule[]>> {
    const operationId = this.generateOperationId();
    
    try {
      if (this.apiClient) {
        const result = await this.apiClient.getSchedule(date, modality);
        if (result.success) {
          return this.createSuccessResult(result.data, operationId);
        }
      }
      
      // Use HL7 SIU^S12 query for schedule information
      const scheduleQuery = this.buildScheduleQuery(date, modality);
      const result = await this.hl7Client.sendQuery(scheduleQuery);
      
      if (!result.success) {
        throw new Error(result.error);
      }
      
      const schedule = await this.parseScheduleResponse(result.data);
      return this.createSuccessResult(schedule, operationId);
      
    } catch (error) {
      this.logger.error('Schedule retrieval failed:', error);
      return this.createErrorResult(error.message, 'SCHEDULE_GET_FAILED', operationId);
    }
  }
  
  async createAppointment(schedule: Omit<Schedule, 'scheduleID'>): Promise<RISOperationResult<string>> {
    const operationId = this.generateOperationId();
    
    try {
      // Build SIU^S12 (New Appointment Booking) message
      const appointmentMessage = await this.buildAppointmentMessage(schedule);
      const result = await this.hl7Client.sendMessage(appointmentMessage);
      
      if (!result.success) {
        throw new Error(result.error);
      }
      
      const scheduleID = `SCH_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
      return this.createSuccessResult(scheduleID, operationId, result.messageId);
      
    } catch (error) {
      this.logger.error('Appointment creation failed:', error);
      return this.createErrorResult(error.message, 'APPOINTMENT_CREATE_FAILED', operationId);
    }
  }
  
  async updateAppointment(scheduleID: string, updates: Partial<Schedule>): Promise<RISOperationResult<boolean>> {
    const operationId = this.generateOperationId();
    
    try {
      // Build SIU^S13 (Reschedule Appointment) message
      const updateMessage = await this.buildAppointmentUpdateMessage(scheduleID, updates);
      const result = await this.hl7Client.sendMessage(updateMessage);
      
      if (!result.success) {
        throw new Error(result.error);
      }
      
      return this.createSuccessResult(true, operationId, result.messageId);
      
    } catch (error) {
      this.logger.error('Appointment update failed:', error);
      return this.createErrorResult(error.message, 'APPOINTMENT_UPDATE_FAILED', operationId);
    }
  }
  
  async cancelAppointment(scheduleID: string, reason: string): Promise<RISOperationResult<boolean>> {
    const operationId = this.generateOperationId();
    
    try {
      // Build SIU^S15 (Cancel Appointment) message
      const cancelMessage = await this.buildAppointmentCancelMessage(scheduleID, reason);
      const result = await this.hl7Client.sendMessage(cancelMessage);
      
      if (!result.success) {
        throw new Error(result.error);
      }
      
      return this.createSuccessResult(true, operationId, result.messageId);
      
    } catch (error) {
      this.logger.error('Appointment cancellation failed:', error);
      return this.createErrorResult(error.message, 'APPOINTMENT_CANCEL_FAILED', operationId);
    }
  }
  
  async sendHL7Message(message: HL7Message): Promise<RISOperationResult<HL7Message>> {
    const operationId = this.generateOperationId();
    
    try {
      const result = await this.hl7Client.sendMessage(message);
      
      if (!result.success) {
        throw new Error(result.error);
      }
      
      return this.createSuccessResult(result.data, operationId, result.messageId);
      
    } catch (error) {
      this.logger.error('HL7 message send failed:', error);
      return this.createErrorResult(error.message, 'HL7_SEND_FAILED', operationId);
    }
  }
  
  async parseHL7Message(rawMessage: string): Promise<RISOperationResult<HL7Message>> {
    const operationId = this.generateOperationId();
    
    try {
      const parsedMessage = await this.hl7Parser.parse(rawMessage);
      return this.createSuccessResult(parsedMessage, operationId);
      
    } catch (error) {
      this.logger.error('HL7 message parsing failed:', error);
      return this.createErrorResult(error.message, 'HL7_PARSE_FAILED', operationId);
    }
  }
  
  async getStatus(): Promise<RISOperationResult<any>> {
    const operationId = this.generateOperationId();
    
    try {
      const status = {
        connected: this.connected,
        hl7Connected: this.hl7Client.isConnected(),
        apiConnected: this.apiClient?.isConnected() || false,
        lastActivity: new Date(),
        capabilities: {
          hl7MessageTypes: ['ADT', 'ORM', 'ORU', 'QRY', 'SIU', 'MDM'],
          apiEndpoints: this.apiClient?.getCapabilities() || [],
          voyagerVersion: this.voyagerConfig?.voyagerConfig?.systemVersion || 'Unknown'
        }
      };
      
      return this.createSuccessResult(status, operationId);
      
    } catch (error) {
      return this.createErrorResult(error.message, 'STATUS_ERROR', operationId);
    }
  }
  
  async getStatistics(): Promise<RISOperationResult<any>> {
    const operationId = this.generateOperationId();
    
    try {
      const stats = {
        hl7Statistics: await this.hl7Client.getStatistics(),
        apiStatistics: this.apiClient ? await this.apiClient.getStatistics() : null,
        voyagerSpecific: {
          ordersProcessed: 0,     // To be implemented
          reportsGenerated: 0,    // To be implemented
          appointmentsScheduled: 0 // To be implemented
        }
      };
      
      return this.createSuccessResult(stats, operationId);
      
    } catch (error) {
      return this.createErrorResult(error.message, 'STATISTICS_ERROR', operationId);
    }
  }
  
  /**
   * Private helper methods
   */
  
  private setupHL7Handlers(): void {
    this.hl7Client.on('messageReceived', (message: HL7Message) => {
      this.handleIncomingHL7Message(message);
    });
    
    this.hl7Client.on('connectionLost', (error: Error) => {
      if (this.onConnectionLost) {
        this.onConnectionLost(error);
      }
    });
  }
  
  private async handleIncomingHL7Message(message: HL7Message): Promise<void> {
    try {
      const messageType = message.messageType.split('^')[0];
      const triggerEvent = message.messageType.split('^')[1];
      
      this.logger.info(`Processing HL7 message: ${message.messageType} (${message.messageControlId})`);
      
      switch (messageType) {
        case 'ADT':
          // Patient Registration/Update
          await this.handleADTMessage(message, triggerEvent);
          break;
          
        case 'ORM':
          // New/Updated Order
          const order = await this.parseHL7Order(message);
          if (this.onNewOrder) {
            this.onNewOrder(order);
          }
          break;
          
        case 'ORU':
          // New/Updated Report
          const report = await this.parseHL7Report(message);
          if (this.onNewReport) {
            this.onNewReport(report);
          }
          break;
          
        case 'SIU':
          // Schedule Information
          await this.handleSIUMessage(message, triggerEvent);
          break;
          
        default:
          this.logger.debug(`Unhandled HL7 message type: ${messageType}`);
      }
      
    } catch (error) {
      this.logger.error('Error handling incoming HL7 message:', error);
    }
  }
  
  /**
   * Handle ADT (Admission, Discharge, Transfer) Messages
   */
  private async handleADTMessage(message: HL7Message, triggerEvent: string): Promise<void> {
    try {
      const pidSegment = message.segments.find(seg => seg.segmentType === 'PID');
      if (!pidSegment) {
        this.logger.warn('ADT message missing PID segment');
        return;
      }
      
      const patient = this.extractPatientFromPID(pidSegment);
      if (!patient) {
        this.logger.warn('Failed to extract patient from ADT message');
        return;
      }
      
      switch (triggerEvent) {
        case 'A01': // Admit Patient
        case 'A04': // Register Patient
        case 'A05': // Pre-admit Patient
          await this.createPatientAccount(patient);
          break;
          
        case 'A08': // Update Patient Information
        case 'A31': // Update Person Information
          await this.updatePatientAccount(patient);
          break;
          
        default:
          this.logger.debug(`Unhandled ADT trigger event: ${triggerEvent}`);
      }
      
    } catch (error) {
      this.logger.error('Error handling ADT message:', error);
    }
  }
  
  /**
   * Handle SIU (Schedule Information Unsolicited) Messages
   */
  private async handleSIUMessage(message: HL7Message, triggerEvent: string): Promise<void> {
    try {
      this.logger.debug(`Processing SIU message with trigger event: ${triggerEvent}`);
      
      // Extract schedule information for appointment notifications
      const schSegment = message.segments.find(seg => seg.segmentType === 'SCH');
      const pidSegment = message.segments.find(seg => seg.segmentType === 'PID');
      
      if (schSegment && pidSegment) {
        // Handle appointment-related notifications
        const patient = this.extractPatientFromPID(pidSegment);
        if (patient) {
          await this.handleAppointmentNotification(triggerEvent, patient, schSegment);
        }
      }
      
    } catch (error) {
      this.logger.error('Error handling SIU message:', error);
    }
  }
  
  /**
   * Patient Account Management
   */
  private async createPatientAccount(patient: Patient): Promise<void> {
    try {
      // Check if patient already exists
      const existingPatient = await this.getPatientById(patient.patientID);
      if (existingPatient) {
        this.logger.info(`Patient ${patient.patientID} already exists, updating instead`);
        await this.updatePatientAccount(patient);
        return;
      }
      
      // Generate unique SMS code for new patient
      const smsCode = this.generateSMSCode();
      
      // Store patient in database with SMS code
      await this.storeNewPatient(patient, smsCode);
      
      this.logger.info(`Created new patient account: ${patient.patientID} (${patient.firstName} ${patient.lastName})`);
      
      // Send welcome SMS if phone number available
      if (patient.phoneNumber) {
        await this.sendWelcomeSMS(patient, smsCode);
      }
      
    } catch (error) {
      this.logger.error('Error creating patient account:', error);
    }
  }
  
  private async updatePatientAccount(patient: Patient): Promise<void> {
    try {
      await this.updateExistingPatient(patient);
      this.logger.info(`Updated patient account: ${patient.patientID}`);
      
    } catch (error) {
      this.logger.error('Error updating patient account:', error);
    }
  }
  
  private async handleAppointmentNotification(triggerEvent: string, patient: Patient, schSegment: HL7Segment): Promise<void> {
    try {
      const appointmentDateTime = this.extractField(schSegment.fields[10]); // Scheduled Start Date/Time
      const procedureDescription = this.extractField(schSegment.fields[6]); // Appointment Reason
      
      if (!patient.phoneNumber) {
        this.logger.warn(`No phone number for patient ${patient.patientID} - cannot send appointment notification`);
        return;
      }
      
      let smsMessage = '';
      
      switch (triggerEvent) {
        case 'S12': // New Appointment Booking
        case 'S13': // Appointment Rescheduling
          const formattedDateTime = this.formatAppointmentDateTime(appointmentDateTime);
          smsMessage = `Appointment confirmed at Axis Imaging: ${procedureDescription} on ${formattedDateTime}. Please arrive 15 minutes early.`;
          break;
          
        case 'S14': // Appointment Modification
          smsMessage = `Your appointment at Axis Imaging has been updated. Please check your appointment details.`;
          break;
          
        case 'S15': // Appointment Cancellation
          smsMessage = `Your appointment at Axis Imaging has been cancelled. Please contact us to reschedule.`;
          break;
      }
      
      if (smsMessage) {
        await this.sendSMS(patient.phoneNumber, smsMessage);
        this.logger.info(`Appointment notification sent to patient ${patient.patientID}`);
      }
      
    } catch (error) {
      this.logger.error('Error handling appointment notification:', error);
    }
  }
  
  /**
   * Database Integration Functions (to be implemented)
   */
  private async storeNewPatient(patient: Patient, smsCode: string): Promise<void> {
    // Store new patient in database with SMS code
    // This would integrate with your existing patient database/Prisma schema
    this.logger.debug(`Storing new patient ${patient.patientID} with SMS code ${smsCode}`);
    
    // Example implementation:
    // await prisma.patient.create({
    //   data: {
    //     patientID: patient.patientID,
    //     firstName: patient.firstName,
    //     lastName: patient.lastName,
    //     // ... other patient fields
    //     smsVerificationCode: smsCode,
    //     smsCodeExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
    //   }
    // });
  }
  
  private async updateExistingPatient(patient: Patient): Promise<void> {
    // Update existing patient in database
    this.logger.debug(`Updating existing patient ${patient.patientID}`);
    
    // Example implementation:
    // await prisma.patient.update({
    //   where: { patientID: patient.patientID },
    //   data: {
    //     firstName: patient.firstName,
    //     lastName: patient.lastName,
    //     // ... other updated fields
    //   }
    // });
  }
  
  private async sendWelcomeSMS(patient: Patient, smsCode: string): Promise<void> {
    try {
      const smsMessage = `Welcome to Axis Imaging! Your scan results will be available through our patient portal. You'll receive a notification with access link when ready.`;
      
      await this.sendSMS(patient.phoneNumber!, smsMessage);
      this.logger.info(`Welcome SMS sent to new patient ${patient.patientID}`);
      
    } catch (error) {
      this.logger.error('Error sending welcome SMS:', error);
    }
  }
  
  private formatAppointmentDateTime(hl7DateTime: string): string {
    try {
      const parsed = this.parseHL7DateTime(hl7DateTime);
      if (!parsed) return hl7DateTime;
      
      const date = new Date(parsed);
      return date.toLocaleDateString('en-AU', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return hl7DateTime;
    }
  }
  
  private shouldUseAPIForQuery(query: RISQuery): boolean {
    // Use API for complex queries that benefit from REST interface
    return !!(
      query.dateRange ||
      query.limit ||
      query.offset ||
      (query.status && query.status.length > 1)
    );
  }
  
  private buildPatientQuery(query: RISQuery): any {
    return {
      messageType: 'QRY^A19',
      queryTag: `PAT_${Date.now()}`,
      queryDefinition: this.buildQueryDefinition('PATIENT', query)
    };
  }
  
  private buildOrderQuery(query: RISQuery): any {
    return {
      messageType: 'QRY^O02',
      queryTag: `ORD_${Date.now()}`,
      queryDefinition: this.buildQueryDefinition('ORDER', query)
    };
  }
  
  private buildReportQuery(query: RISQuery): any {
    return {
      messageType: 'QRY^R02',
      queryTag: `RPT_${Date.now()}`,
      queryDefinition: this.buildQueryDefinition('REPORT', query)
    };
  }
  
  private buildScheduleQuery(date: string, modality?: string): any {
    return {
      messageType: 'QRY^S26',
      queryTag: `SCH_${Date.now()}`,
      queryDefinition: `@SCH.11.4^${date}${modality ? `~@AIS.3^${modality}` : ''}`
    };
  }
  
  private buildQueryDefinition(type: string, query: RISQuery): string {
    const conditions: string[] = [];
    
    if (query.patientID) {
      conditions.push(`@PID.3^${query.patientID}`);
    }
    
    if (query.accessionNumber) {
      conditions.push(`@OBR.18^${query.accessionNumber}`);
    }
    
    if (query.orderID) {
      conditions.push(`@ORC.2^${query.orderID}`);
    }
    
    if (query.dateRange) {
      conditions.push(`@OBR.7^${query.dateRange.from}-${query.dateRange.to}`);
    }
    
    return conditions.join('~');
  }
  
  private async parsePatientResponse(response: HL7Message): Promise<Patient[]> {
    const patients: Patient[] = [];
    
    try {
      // Find all PID segments in the response
      const pidSegments = response.segments.filter(seg => seg.segmentType === 'PID');
      
      for (const pidSegment of pidSegments) {
        const patient = this.extractPatientFromPID(pidSegment);
        if (patient) {
          patients.push(patient);
        }
      }
      
      this.logger.debug(`Parsed ${patients.length} patients from HL7 response`);
      return patients;
      
    } catch (error) {
      this.logger.error('Error parsing patient response:', error);
      throw error;
    }
  }
  
  private async parseOrderResponse(response: HL7Message): Promise<Order[]> {
    const orders: Order[] = [];
    
    try {
      // Find all ORC segments (Order Control) in the response
      const orcSegments = response.segments.filter(seg => seg.segmentType === 'ORC');
      
      for (const orcSegment of orcSegments) {
        // Find corresponding OBR segment (Order Detail)
        const segmentIndex = response.segments.indexOf(orcSegment);
        const obrSegment = response.segments.find((seg, index) => 
          seg.segmentType === 'OBR' && index > segmentIndex && index < segmentIndex + 5
        );
        
        if (obrSegment) {
          const order = this.extractOrderFromORC_OBR(orcSegment, obrSegment);
          if (order) {
            orders.push(order);
          }
        }
      }
      
      this.logger.debug(`Parsed ${orders.length} orders from HL7 response`);
      return orders;
      
    } catch (error) {
      this.logger.error('Error parsing order response:', error);
      throw error;
    }
  }
  
  private async parseReportResponse(response: HL7Message): Promise<Report[]> {
    const reports: Report[] = [];
    
    try {
      // Find all OBX segments (Observation/Result) in the response
      const obxSegments = response.segments.filter(seg => seg.segmentType === 'OBX');
      
      // Group OBX segments by report (using OBR segments as delimiters)
      const obrSegments = response.segments.filter(seg => seg.segmentType === 'OBR');
      
      for (const obrSegment of obrSegments) {
        const report = this.extractReportFromOBR_OBX(obrSegment, obxSegments);
        if (report) {
          reports.push(report);
        }
      }
      
      this.logger.debug(`Parsed ${reports.length} reports from HL7 response`);
      return reports;
      
    } catch (error) {
      this.logger.error('Error parsing report response:', error);
      throw error;
    }
  }
  
  private async parseScheduleResponse(response: any): Promise<Schedule[]> {
    // Parse HL7 response and extract schedule information
    return [];
  }
  
  private async parseHL7Order(message: HL7Message): Promise<Order> {
    try {
      // Find ORC and OBR segments
      const orcSegment = message.segments.find(seg => seg.segmentType === 'ORC');
      const obrSegment = message.segments.find(seg => seg.segmentType === 'OBR');
      const pidSegment = message.segments.find(seg => seg.segmentType === 'PID');
      
      if (!orcSegment || !obrSegment) {
        throw new Error('Missing required ORC or OBR segments in order message');
      }
      
      const order = this.extractOrderFromORC_OBR(orcSegment, obrSegment, pidSegment);
      
      // Trigger SMS notification for new image availability
      if (order && this.shouldTriggerImageNotification(order)) {
        await this.sendImageAvailableNotification(order);
      }
      
      return order;
      
    } catch (error) {
      this.logger.error('Error parsing HL7 order message:', error);
      throw error;
    }
  }
  
  private async parseHL7Report(message: HL7Message): Promise<Report> {
    try {
      // Find OBR and OBX segments
      const obrSegment = message.segments.find(seg => seg.segmentType === 'OBR');
      const obxSegments = message.segments.filter(seg => seg.segmentType === 'OBX');
      const pidSegment = message.segments.find(seg => seg.segmentType === 'PID');
      
      if (!obrSegment || obxSegments.length === 0) {
        throw new Error('Missing required OBR or OBX segments in report message');
      }
      
      const report = this.extractReportFromOBR_OBX(obrSegment, obxSegments, pidSegment);
      
      // Trigger SMS notification for completed report
      if (report && this.shouldTriggerReportNotification(report)) {
        await this.sendReportReadyNotification(report);
      }
      
      return report;
      
    } catch (error) {
      this.logger.error('Error parsing HL7 report message:', error);
      throw error;
    }
  }
  
  private async buildPatientUpdateMessage(patient: Patient): Promise<HL7Message> {
    // Build ADT^A08 message for patient update
    return {
      messageType: 'ADT^A08',
      messageControlId: this.generateMessageControlId(),
      timestamp: new Date().toISOString(),
      sendingApplication: this.voyagerConfig.hl7Config?.sendingApplication || 'AXIS_IMAGING',
      receivingApplication: this.voyagerConfig.hl7Config?.receivingApplication || 'VOYAGER',
      segments: []
    };
  }
  
  private async buildOrderStatusMessage(orderID: string, status: string, notes?: string): Promise<HL7Message> {
    // Build ORM^O01 message for order status update
    return {
      messageType: 'ORM^O01',
      messageControlId: this.generateMessageControlId(),
      timestamp: new Date().toISOString(),
      sendingApplication: this.voyagerConfig.hl7Config?.sendingApplication || 'AXIS_IMAGING',
      receivingApplication: this.voyagerConfig.hl7Config?.receivingApplication || 'VOYAGER',
      segments: []
    };
  }
  
  private async buildReportMessage(report: Partial<Report>): Promise<HL7Message> {
    // Build ORU^R01 message for report
    return {
      messageType: 'ORU^R01',
      messageControlId: this.generateMessageControlId(),
      timestamp: new Date().toISOString(),
      sendingApplication: this.voyagerConfig.hl7Config?.sendingApplication || 'AXIS_IMAGING',
      receivingApplication: this.voyagerConfig.hl7Config?.receivingApplication || 'VOYAGER',
      segments: []
    };
  }
  
  private async buildSignatureMessage(reportID: string, signature: string): Promise<HL7Message> {
    // Build MDM^T02 message for report signature
    return {
      messageType: 'MDM^T02',
      messageControlId: this.generateMessageControlId(),
      timestamp: new Date().toISOString(),
      sendingApplication: this.voyagerConfig.hl7Config?.sendingApplication || 'AXIS_IMAGING',
      receivingApplication: this.voyagerConfig.hl7Config?.receivingApplication || 'VOYAGER',
      segments: []
    };
  }
  
  private async buildAppointmentMessage(schedule: Omit<Schedule, 'scheduleID'>): Promise<HL7Message> {
    // Build SIU^S12 message for new appointment
    return {
      messageType: 'SIU^S12',
      messageControlId: this.generateMessageControlId(),
      timestamp: new Date().toISOString(),
      sendingApplication: this.voyagerConfig.hl7Config?.sendingApplication || 'AXIS_IMAGING',
      receivingApplication: this.voyagerConfig.hl7Config?.receivingApplication || 'VOYAGER',
      segments: []
    };
  }
  
  private async buildAppointmentUpdateMessage(scheduleID: string, updates: Partial<Schedule>): Promise<HL7Message> {
    // Build SIU^S13 message for appointment update
    return {
      messageType: 'SIU^S13',
      messageControlId: this.generateMessageControlId(),
      timestamp: new Date().toISOString(),
      sendingApplication: this.voyagerConfig.hl7Config?.sendingApplication || 'AXIS_IMAGING',
      receivingApplication: this.voyagerConfig.hl7Config?.receivingApplication || 'VOYAGER',
      segments: []
    };
  }
  
  private async buildAppointmentCancelMessage(scheduleID: string, reason: string): Promise<HL7Message> {
    // Build SIU^S15 message for appointment cancellation
    return {
      messageType: 'SIU^S15',
      messageControlId: this.generateMessageControlId(),
      timestamp: new Date().toISOString(),
      sendingApplication: this.voyagerConfig.hl7Config?.sendingApplication || 'AXIS_IMAGING',
      receivingApplication: this.voyagerConfig.hl7Config?.receivingApplication || 'VOYAGER',
      segments: []
    };
  }
  
  private async findPatientsViaAPI(query: RISQuery, operationId: string): Promise<RISOperationResult<Patient[]>> {
    if (!this.apiClient) {
      throw new Error('API client not available');
    }
    
    const result = await this.apiClient.findPatients(query);
    return this.createSuccessResult(result.data, operationId);
  }
  
  private async findOrdersViaAPI(query: RISQuery, operationId: string): Promise<RISOperationResult<Order[]>> {
    if (!this.apiClient) {
      throw new Error('API client not available');
    }
    
    const result = await this.apiClient.findOrders(query);
    return this.createSuccessResult(result.data, operationId);
  }
  
  private generateMessageControlId(): string {
    return `AXIS_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  }

  /**
   * HL7 Field Extraction Functions
   */
  
  /**
   * Extract RTF content from Voyager OBX segment
   * Format: VoyagerPACS^^.rtf^Base64^[BASE64_CONTENT]
   */
  private extractVoyagerRTFContent(obxFields: string[]): string | null {
    try {
      const observationValue = obxFields[4];
      if (!observationValue) return null;

      // Check if this is a VoyagerPACS RTF report
      if (observationValue.startsWith('VoyagerPACS^^.rtf^Base64^')) {
        const base64Content = observationValue.split('^')[4];
        if (base64Content) {
          // Decode Base64 RTF content
          const rtfBuffer = Buffer.from(base64Content, 'base64');
          return rtfBuffer.toString('utf-8');
        }
      }
      
      return null;
    } catch (error) {
      this.logger.error('Error extracting RTF content:', error);
      return null;
    }
  }

  /**
   * Parse RTF report content to extract findings and impression
   */
  private parseRTFReport(rtfContent: string): {
    findings: string;
    impression: string;
    radiologist: string;
    fullText: string;
  } {
    try {
      // Convert RTF to plain text (simplified parser)
      let plainText = rtfContent
        .replace(/\\[a-z]+\d*\s?/g, '') // Remove RTF control words
        .replace(/[{}]/g, '') // Remove braces
        .replace(/\\\\/g, '\\') // Unescape backslashes
        .replace(/\\'/g, "'") // Unescape quotes
        .replace(/\s+/g, ' ') // Normalize whitespace
        .trim();

      // Extract structured sections
      let findings = '';
      let impression = '';
      let radiologist = '';

      // Look for "Findings:" section
      const findingsMatch = plainText.match(/Findings:\s*([^]*?)(?=Conclusion:|Impression:|$)/i);
      if (findingsMatch) {
        findings = findingsMatch[1].trim();
      }

      // Look for "Conclusion:" or "Impression:" section
      const conclusionMatch = plainText.match(/(?:Conclusion|Impression):\s*([^]*?)(?=Dr\s|Thank you|$)/i);
      if (conclusionMatch) {
        impression = conclusionMatch[1].trim();
      }

      // Extract radiologist name (usually appears as "Dr [name]" at the end)
      const radiologistMatch = plainText.match(/Dr\s+([a-zA-Z\s]+)$/i);
      if (radiologistMatch) {
        radiologist = radiologistMatch[1].trim();
      }

      return {
        findings: findings || plainText,
        impression: impression,
        radiologist: radiologist,
        fullText: plainText
      };

    } catch (error) {
      this.logger.error('Error parsing RTF report:', error);
      return {
        findings: 'Error parsing report content',
        impression: '',
        radiologist: '',
        fullText: rtfContent
      };
    }
  }
  
  private extractPatientFromPID(pidSegment: HL7Segment): Patient | null {
    try {
      const fields = pidSegment.fields;
      
      // PID field mapping based on HL7 v2.5 standard
      const patientID = this.extractField(fields[2]) || this.extractField(fields[3]); // Internal ID or External ID
      const nameComponents = this.parsePersonName(fields[4]);
      const dateOfBirth = this.parseHL7Date(fields[6]);
      const gender = this.extractField(fields[7]) as 'M' | 'F' | 'O' | 'U';
      const address = this.parseAddress(fields[10]);
      const phoneNumber = this.extractField(fields[13]); // Voyager uses field 14 (0-indexed as 13)
      
      if (!patientID || !nameComponents.firstName || !nameComponents.lastName) {
        this.logger.warn('Incomplete patient data in PID segment');
        return null;
      }
      
      const patient: Patient = {
        patientID,
        mrn: this.extractField(fields[2]), // Medical Record Number
        firstName: nameComponents.firstName,
        lastName: nameComponents.lastName,
        middleName: nameComponents.middleName,
        dateOfBirth,
        gender: gender || 'U',
        address,
        phoneNumber
      };
      
      return patient;
      
    } catch (error) {
      this.logger.error('Error extracting patient from PID segment:', error);
      return null;
    }
  }
  
  private extractOrderFromORC_OBR(orcSegment: HL7Segment, obrSegment: HL7Segment, pidSegment?: HL7Segment): Order | null {
    try {
      const orcFields = orcSegment.fields;
      const obrFields = obrSegment.fields;
      
      // Extract order information
      const orderID = this.extractField(orcFields[1]) || this.extractField(orcFields[2]); // Placer Order Number or Filler Order Number
      const accessionNumber = this.extractField(obrFields[17]); // Filler Order Number (Accession)
      const patientID = pidSegment ? this.extractField(pidSegment.fields[2]) : '';
      const orderDate = this.parseHL7DateTime(orcFields[8]) || this.parseHL7DateTime(obrFields[5]);
      const priority = this.mapHL7Priority(orcFields[6]);
      const status = this.mapHL7OrderStatus(orcFields[4]);
      
      // Extract ordering physician
      const orderingPhysician = this.parsePersonName(orcFields[11] || obrFields[15]);
      
      // Extract procedure information
      const procedureCode = this.extractField(obrFields[3]);
      const procedureDescription = this.extractField(obrFields[3], 1); // Second component
      const modality = this.extractModalityFromProcedure(procedureCode || procedureDescription);
      
      if (!orderID && !accessionNumber) {
        this.logger.warn('Missing order identifier in ORC/OBR segments');
        return null;
      }
      
      const order: Order = {
        orderID: orderID || accessionNumber || '',
        accessionNumber: accessionNumber || orderID || '',
        patientID,
        orderDate,
        priority,
        status,
        orderingPhysician: {
          id: orderingPhysician.id || '',
          name: `${orderingPhysician.firstName} ${orderingPhysician.lastName}`.trim(),
          department: orderingPhysician.department || 'Radiology'
        },
        procedures: [{
          procedureCode: procedureCode || '',
          description: procedureDescription || '',
          modality,
          bodyPart: this.extractBodyPartFromProcedure(procedureDescription),
          status: status
        }],
        clinicalInfo: this.extractField(obrFields[12]), // Reason for Study
        reason: this.extractField(obrFields[30]) // Reason for Study (Alternative)
      };
      
      return order;
      
    } catch (error) {
      this.logger.error('Error extracting order from ORC/OBR segments:', error);
      return null;
    }
  }
  
  private extractReportFromOBR_OBX(obrSegment: HL7Segment, obxSegments: HL7Segment[], pidSegment?: HL7Segment): Report | null {
    try {
      const obrFields = obrSegment.fields;
      
      // Extract basic report information
      const accessionNumber = this.extractField(obrFields[17]);
      const patientID = pidSegment ? this.extractField(pidSegment.fields[2]) : '';
      const studyInstanceUID = this.extractField(obrFields[19]); // Study Instance UID
      
      // Extract radiologist information
      const radiologist = this.parsePersonName(obrFields[31] || obrFields[32]);
      
      // Extract report content from OBX segments
      let findings = '';
      let impression = '';
      let recommendations = '';
      
      for (const obxSegment of obxSegments) {
        const observationType = this.extractField(obxSegment.fields[2]); // Observation Identifier
        const observationValue = this.extractField(obxSegment.fields[4]); // Observation Value
        
        if (observationType && observationValue) {
          if (observationType.toLowerCase().includes('finding') || observationType.toLowerCase().includes('result')) {
            findings += observationValue + '\\n';
          } else if (observationType.toLowerCase().includes('impression') || observationType.toLowerCase().includes('conclusion')) {
            impression += observationValue + '\\n';
          } else if (observationType.toLowerCase().includes('recommendation') || observationType.toLowerCase().includes('suggest')) {
            recommendations += observationValue + '\\n';
          } else {
            findings += observationValue + '\\n'; // Default to findings
          }
        }
      }
      
      if (!accessionNumber) {
        this.logger.warn('Missing accession number in report OBR segment');
        return null;
      }
      
      const report: Report = {
        reportID: accessionNumber,
        accessionNumber,
        studyInstanceUID,
        patientID,
        reportType: 'FINAL',
        status: 'SIGNED',
        radiologist: {
          id: radiologist.id || '',
          name: `${radiologist.firstName} ${radiologist.lastName}`.trim(),
          credentials: radiologist.credentials || '',
          department: 'Radiology'
        },
        signedDate: this.parseHL7DateTime(obrFields[21]) || new Date().toISOString(),
        findings: findings.trim(),
        impression: impression.trim(),
        recommendations: recommendations.trim() || undefined
      };
      
      return report;
      
    } catch (error) {
      this.logger.error('Error extracting report from OBR/OBX segments:', error);
      return null;
    }
  }
  
  /**
   * SMS Notification Functions
   */
  
  private shouldTriggerImageNotification(order: Order): boolean {
    // Trigger notification when images are available (order status indicates completion)
    return order.status === 'COMPLETED' && order.procedures.some(proc => proc.status === 'COMPLETED');
  }
  
  private shouldTriggerReportNotification(report: Report): boolean {
    // Trigger notification when report is finalized and signed
    return report.status === 'SIGNED' && report.reportType === 'FINAL';
  }
  
  private async sendImageAvailableNotification(order: Order): Promise<void> {
    try {
      // Get patient phone number from database or HL7 message
      const patient = await this.getPatientByOrderId(order.orderID);
      if (!patient || !patient.phoneNumber) {
        this.logger.warn(`No phone number found for patient ${order.patientID}`);
        return;
      }
      
      // Generate unique SMS code for patient login
      const smsCode = this.generateSMSCode();
      await this.storeSMSCode(patient.patientID, smsCode);
      
      // Create SMS message
      const procedureNames = order.procedures.map(p => p.description).join(', ');
      const smsMessage = `Your ${procedureNames} scan at Axis Imaging is ready! View images: https://portal.axisimaging.com.au/login?code=${smsCode}`;
      
      // Send SMS using existing SMS service
      await this.sendSMS(patient.phoneNumber, smsMessage);
      
      this.logger.info(`Image available SMS sent to patient ${patient.patientID} for order ${order.orderID}`);
      
    } catch (error) {
      this.logger.error('Failed to send image available notification:', error);
    }
  }
  
  private async sendReportReadyNotification(report: Report): Promise<void> {
    try {
      // Get patient phone number
      const patient = await this.getPatientById(report.patientID);
      if (!patient || !patient.phoneNumber) {
        this.logger.warn(`No phone number found for patient ${report.patientID}`);
        return;
      }
      
      // Generate or retrieve existing SMS code
      const smsCode = await this.getOrCreateSMSCode(patient.patientID);
      
      // Create SMS message
      const smsMessage = `Your scan report is now available! View report: https://portal.axisimaging.com.au/login?code=${smsCode}`;
      
      // Send SMS
      await this.sendSMS(patient.phoneNumber, smsMessage);
      
      this.logger.info(`Report ready SMS sent to patient ${patient.patientID} for report ${report.reportID}`);
      
    } catch (error) {
      this.logger.error('Failed to send report ready notification:', error);
    }
  }
  
  /**
   * Helper Functions
   */
  
  private extractField(field: string, component?: number): string {
    if (!field) return '';
    
    if (component !== undefined) {
      const components = field.split(this.voyagerConfig?.voyagerConfig?.componentSeparator || '^');
      return components[component] || '';
    }
    
    return field.split(this.voyagerConfig?.voyagerConfig?.componentSeparator || '^')[0] || '';
  }
  
  private parsePersonName(nameField: string): {
    firstName: string;
    lastName: string;
    middleName?: string;
    id?: string;
    department?: string;
    credentials?: string;
  } {
    if (!nameField) {
      return { firstName: '', lastName: '' };
    }
    
    const components = nameField.split('^');
    return {
      lastName: components[0] || '',
      firstName: components[1] || '',
      middleName: components[2] || undefined,
      credentials: components[4] || undefined,
      id: components[5] || undefined,
      department: components[6] || undefined
    };
  }
  
  private parseAddress(addressField: string): Patient['address'] | undefined {
    if (!addressField) return undefined;
    
    const components = addressField.split('^');
    return {
      street: components[0] || '',
      city: components[2] || '',
      state: components[3] || '',
      postalCode: components[4] || '',
      country: components[5] || 'AU'
    };
  }
  
  private parseHL7Date(dateField: string): string {
    if (!dateField) return '';
    
    // HL7 date format: YYYYMMDD
    if (dateField.length >= 8) {
      const year = dateField.substring(0, 4);
      const month = dateField.substring(4, 6);
      const day = dateField.substring(6, 8);
      return `${year}-${month}-${day}`;
    }
    
    return dateField;
  }
  
  private parseHL7DateTime(dateTimeField: string): string {
    if (!dateTimeField) return '';
    
    // HL7 datetime format: YYYYMMDDHHMMSS
    if (dateTimeField.length >= 14) {
      const year = dateTimeField.substring(0, 4);
      const month = dateTimeField.substring(4, 6);
      const day = dateTimeField.substring(6, 8);
      const hour = dateTimeField.substring(8, 10);
      const minute = dateTimeField.substring(10, 12);
      const second = dateTimeField.substring(12, 14);
      return `${year}-${month}-${day}T${hour}:${minute}:${second}`;
    }
    
    return this.parseHL7Date(dateTimeField);
  }
  
  private mapHL7Priority(priorityField: string): 'STAT' | 'URGENT' | 'ROUTINE' {
    if (!priorityField) return 'ROUTINE';
    
    const priority = priorityField.toLowerCase();
    if (priority.includes('stat') || priority.includes('emergency')) return 'STAT';
    if (priority.includes('urgent') || priority.includes('asap')) return 'URGENT';
    return 'ROUTINE';
  }
  
  private mapHL7OrderStatus(statusField: string): Order['status'] {
    if (!statusField) return 'SCHEDULED';
    
    const status = statusField.toLowerCase();
    if (status.includes('progress') || status.includes('active')) return 'IN_PROGRESS';
    if (status.includes('complete') || status.includes('final')) return 'COMPLETED';
    if (status.includes('cancel')) return 'CANCELLED';
    if (status.includes('discontinue')) return 'DISCONTINUED';
    return 'SCHEDULED';
  }
  
  private extractModalityFromProcedure(procedure: string): string {
    if (!procedure) return '';
    
    const procedureLower = procedure.toLowerCase();
    if (procedureLower.includes('ct') || procedureLower.includes('computed tomography')) return 'CT';
    if (procedureLower.includes('mri') || procedureLower.includes('magnetic resonance')) return 'MR';
    if (procedureLower.includes('ultrasound') || procedureLower.includes('us ') || procedureLower.includes('echo')) return 'US';
    if (procedureLower.includes('x-ray') || procedureLower.includes('xray') || procedureLower.includes('radiograph')) return 'DX';
    if (procedureLower.includes('mammography') || procedureLower.includes('mammo')) return 'MG';
    if (procedureLower.includes('nuclear') || procedureLower.includes('scan')) return 'NM';
    
    return 'DX'; // Default to Digital Radiography
  }
  
  private extractBodyPartFromProcedure(procedure: string): string {
    if (!procedure) return '';
    
    const procedureLower = procedure.toLowerCase();
    if (procedureLower.includes('chest') || procedureLower.includes('thorax')) return 'CHEST';
    if (procedureLower.includes('abdomen') || procedureLower.includes('abdominal')) return 'ABDOMEN';
    if (procedureLower.includes('pelvis') || procedureLower.includes('pelvic')) return 'PELVIS';
    if (procedureLower.includes('head') || procedureLower.includes('brain') || procedureLower.includes('skull')) return 'HEAD';
    if (procedureLower.includes('spine') || procedureLower.includes('lumbar') || procedureLower.includes('cervical')) return 'SPINE';
    if (procedureLower.includes('extremity') || procedureLower.includes('arm') || procedureLower.includes('leg')) return 'EXTREMITY';
    
    return 'UNKNOWN';
  }
  
  private generateSMSCode(): string {
    // Generate 6-digit alphanumeric code
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  }
  
  // These functions would connect to your database and SMS service
  private async storeSMSCode(patientID: string, code: string): Promise<void> {
    // Store SMS code in database with expiration time
    // Implementation depends on your database setup
    this.logger.debug(`Storing SMS code ${code} for patient ${patientID}`);
  }
  
  private async getOrCreateSMSCode(patientID: string): Promise<string> {
    // Get existing valid SMS code or create new one
    // Implementation depends on your database setup
    const existingCode = await this.getValidSMSCode(patientID);
    if (existingCode) {
      return existingCode;
    }
    
    const newCode = this.generateSMSCode();
    await this.storeSMSCode(patientID, newCode);
    return newCode;
  }
  
  private async getValidSMSCode(patientID: string): Promise<string | null> {
    // Check if patient has valid (non-expired) SMS code
    // Implementation depends on your database setup
    return null;
  }
  
  private async getPatientByOrderId(orderID: string): Promise<Patient | null> {
    // Retrieve patient information using order ID
    // Implementation depends on your database setup
    return null;
  }
  
  private async getPatientById(patientID: string): Promise<Patient | null> {
    // Retrieve patient information by patient ID
    // Implementation depends on your database setup
    return null;
  }
  
  private async sendSMS(phoneNumber: string, message: string): Promise<void> {
    // Send SMS using your SMS service (Twilio)
    // Implementation depends on your SMS service setup
    this.logger.info(`SMS sent to ${phoneNumber}: ${message}`);
  }
}