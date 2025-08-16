/**
 * Generic RIS Provider Interface
 * Provides abstraction for different RIS systems (Voyager, Epic, Cerner, etc.)
 */

export interface Patient {
  patientID: string;
  mrn?: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  dateOfBirth: string;
  gender: 'M' | 'F' | 'O' | 'U';
  address?: {
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  phoneNumber?: string;
  email?: string;
  emergencyContact?: {
    name: string;
    relationship: string;
    phoneNumber: string;
  };
}

export interface Order {
  orderID: string;
  accessionNumber: string;
  patientID: string;
  orderDate: string;
  scheduledDate?: string;
  priority: 'STAT' | 'URGENT' | 'ROUTINE';
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'DISCONTINUED';
  orderingPhysician: {
    id: string;
    name: string;
    department: string;
    contactInfo?: string;
  };
  referringPhysician?: {
    id: string;
    name: string;
    department: string;
    contactInfo?: string;
  };
  procedures: Procedure[];
  clinicalInfo?: string;
  reason?: string;
  urgency?: string;
}

export interface Procedure {
  procedureCode: string;
  description: string;
  modality: string;
  bodyPart: string;
  contrast?: boolean;
  preparation?: string;
  estimatedDuration?: number;
  scheduledTime?: string;
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
}

export interface Report {
  reportID: string;
  accessionNumber: string;
  studyInstanceUID?: string;
  patientID: string;
  reportType: 'PRELIMINARY' | 'FINAL' | 'ADDENDUM' | 'CORRECTED';
  status: 'DRAFT' | 'PENDING' | 'VERIFIED' | 'SIGNED';
  radiologist: {
    id: string;
    name: string;
    credentials: string;
    department: string;
  };
  dictationDate?: string;
  verificationDate?: string;
  signedDate?: string;
  findings: string;
  impression: string;
  recommendations?: string;
  template?: string;
  priorStudyComparison?: string;
  criticalResults?: boolean;
  communicationLog?: Array<{
    timestamp: string;
    recipient: string;
    method: 'PHONE' | 'EMAIL' | 'FAX' | 'SECURE_MESSAGE';
    message: string;
  }>;
}

export interface Schedule {
  scheduleID: string;
  patientID: string;
  orderID: string;
  scheduledDate: string;
  scheduledTime: string;
  estimatedDuration: number;
  room: string;
  modality: string;
  technologist?: string;
  status: 'SCHEDULED' | 'CHECKED_IN' | 'IN_PROGRESS' | 'COMPLETED' | 'NO_SHOW' | 'CANCELLED';
  notes?: string;
}

export interface RISQuery {
  patientID?: string;
  accessionNumber?: string;
  orderID?: string;
  dateRange?: {
    from: string;
    to: string;
  };
  status?: string[];
  modality?: string[];
  orderingPhysician?: string;
  limit?: number;
  offset?: number;
}

export interface RISConnectionConfig {
  endpoint: string;
  protocol: 'HL7' | 'REST' | 'SOAP' | 'FHIR';
  port?: number;
  authentication: {
    type: 'BASIC' | 'OAUTH2' | 'API_KEY' | 'CERTIFICATE';
    credentials: Record<string, string>;
  };
  timeout: number;
  retryAttempts: number;
  enableTLS: boolean;
  hl7Config?: {
    sendingApplication: string;
    sendingFacility: string;
    receivingApplication: string;
    receivingFacility: string;
    messageType: string;
    processingID: 'P' | 'T' | 'D'; // Production, Test, Debug
  };
}

export interface RISOperationResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  errorCode?: string;
  timestamp: Date;
  operationId: string;
  messageId?: string; // For HL7 tracking
}

export interface HL7Message {
  messageType: string;
  messageControlId: string;
  timestamp: string;
  sendingApplication: string;
  receivingApplication: string;
  segments: HL7Segment[];
}

export interface HL7Segment {
  segmentType: string;
  fields: string[];
}

export interface IRISProvider {
  /**
   * Provider identification
   */
  readonly name: string;
  readonly version: string;
  readonly vendor: string;
  
  /**
   * Connection management
   */
  connect(config: RISConnectionConfig): Promise<RISOperationResult<boolean>>;
  disconnect(): Promise<RISOperationResult<boolean>>;
  isConnected(): boolean;
  testConnection(): Promise<RISOperationResult<boolean>>;
  
  /**
   * Patient operations
   */
  findPatients(query: RISQuery): Promise<RISOperationResult<Patient[]>>;
  getPatient(patientID: string): Promise<RISOperationResult<Patient>>;
  updatePatient(patient: Patient): Promise<RISOperationResult<boolean>>;
  
  /**
   * Order operations
   */
  findOrders(query: RISQuery): Promise<RISOperationResult<Order[]>>;
  getOrder(orderID: string): Promise<RISOperationResult<Order>>;
  updateOrderStatus(orderID: string, status: string, notes?: string): Promise<RISOperationResult<boolean>>;
  
  /**
   * Report operations
   */
  findReports(query: RISQuery): Promise<RISOperationResult<Report[]>>;
  getReport(reportID: string): Promise<RISOperationResult<Report>>;
  createReport(report: Partial<Report>): Promise<RISOperationResult<string>>;
  updateReport(reportID: string, report: Partial<Report>): Promise<RISOperationResult<boolean>>;
  signReport(reportID: string, signature: string): Promise<RISOperationResult<boolean>>;
  
  /**
   * Schedule operations
   */
  getSchedule(date: string, modality?: string): Promise<RISOperationResult<Schedule[]>>;
  createAppointment(schedule: Omit<Schedule, 'scheduleID'>): Promise<RISOperationResult<string>>;
  updateAppointment(scheduleID: string, updates: Partial<Schedule>): Promise<RISOperationResult<boolean>>;
  cancelAppointment(scheduleID: string, reason: string): Promise<RISOperationResult<boolean>>;
  
  /**
   * HL7 message handling
   */
  sendHL7Message(message: HL7Message): Promise<RISOperationResult<HL7Message>>;
  parseHL7Message(rawMessage: string): Promise<RISOperationResult<HL7Message>>;
  
  /**
   * Status and monitoring
   */
  getStatus(): Promise<RISOperationResult<any>>;
  getStatistics(): Promise<RISOperationResult<any>>;
  
  /**
   * Event handlers
   */
  onNewOrder?: (order: Order) => void;
  onOrderUpdate?: (orderID: string, status: string) => void;
  onNewReport?: (report: Report) => void;
  onReportUpdate?: (reportID: string, status: string) => void;
  onConnectionLost?: (error: Error) => void;
  onError?: (error: Error, operation: string) => void;
}

export abstract class BaseRISProvider implements IRISProvider {
  abstract readonly name: string;
  abstract readonly version: string;
  abstract readonly vendor: string;
  
  protected connected: boolean = false;
  protected config?: RISConnectionConfig;
  
  abstract connect(config: RISConnectionConfig): Promise<RISOperationResult<boolean>>;
  abstract disconnect(): Promise<RISOperationResult<boolean>>;
  abstract testConnection(): Promise<RISOperationResult<boolean>>;
  abstract findPatients(query: RISQuery): Promise<RISOperationResult<Patient[]>>;
  abstract getPatient(patientID: string): Promise<RISOperationResult<Patient>>;
  abstract updatePatient(patient: Patient): Promise<RISOperationResult<boolean>>;
  abstract findOrders(query: RISQuery): Promise<RISOperationResult<Order[]>>;
  abstract getOrder(orderID: string): Promise<RISOperationResult<Order>>;
  abstract updateOrderStatus(orderID: string, status: string, notes?: string): Promise<RISOperationResult<boolean>>;
  abstract findReports(query: RISQuery): Promise<RISOperationResult<Report[]>>;
  abstract getReport(reportID: string): Promise<RISOperationResult<Report>>;
  abstract createReport(report: Partial<Report>): Promise<RISOperationResult<string>>;
  abstract updateReport(reportID: string, report: Partial<Report>): Promise<RISOperationResult<boolean>>;
  abstract signReport(reportID: string, signature: string): Promise<RISOperationResult<boolean>>;
  abstract getSchedule(date: string, modality?: string): Promise<RISOperationResult<Schedule[]>>;
  abstract createAppointment(schedule: Omit<Schedule, 'scheduleID'>): Promise<RISOperationResult<string>>;
  abstract updateAppointment(scheduleID: string, updates: Partial<Schedule>): Promise<RISOperationResult<boolean>>;
  abstract cancelAppointment(scheduleID: string, reason: string): Promise<RISOperationResult<boolean>>;
  abstract sendHL7Message(message: HL7Message): Promise<RISOperationResult<HL7Message>>;
  abstract parseHL7Message(rawMessage: string): Promise<RISOperationResult<HL7Message>>;
  abstract getStatus(): Promise<RISOperationResult<any>>;
  abstract getStatistics(): Promise<RISOperationResult<any>>;
  
  isConnected(): boolean {
    return this.connected;
  }
  
  protected generateOperationId(): string {
    return `ris_op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  protected createSuccessResult<T>(data: T, operationId?: string, messageId?: string): RISOperationResult<T> {
    return {
      success: true,
      data,
      timestamp: new Date(),
      operationId: operationId || this.generateOperationId(),
      messageId
    };
  }
  
  protected createErrorResult(error: string, errorCode?: string, operationId?: string): RISOperationResult {
    return {
      success: false,
      error,
      errorCode,
      timestamp: new Date(),
      operationId: operationId || this.generateOperationId()
    };
  }
  
  onNewOrder?: (order: Order) => void;
  onOrderUpdate?: (orderID: string, status: string) => void;
  onNewReport?: (report: Report) => void;
  onReportUpdate?: (reportID: string, status: string) => void;
  onConnectionLost?: (error: Error) => void;
  onError?: (error: Error, operation: string) => void;
}