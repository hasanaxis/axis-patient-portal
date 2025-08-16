/**
 * Voyager API Client Implementation
 * Handles REST API communication with Voyager RIS systems
 */

import axios, { AxiosInstance } from 'axios';
import { Logger } from '../../utils/logger';
import { RISQuery, RISOperationResult, Patient, Order, Report, Schedule } from '../interfaces/IRISProvider';

export interface VoyagerAPIConfig {
  baseURL: string;
  version: 'v1' | 'v2' | 'v3';
  enableWebhooks: boolean;
  webhookSecret?: string;
  timeout?: number;
  retries?: number;
  authentication?: {
    type: 'API_KEY' | 'OAUTH2' | 'BASIC';
    credentials: Record<string, string>;
  };
}

export interface VoyagerPatientExtended extends Patient {
  voyagerSpecific: {
    mrn: string;
    facilityCode: string;
    departmentCode: string;
    insuranceInfo: {
      primaryInsurance: string;
      secondaryInsurance?: string;
      groupNumber?: string;
      memberID?: string;
      eligibilityStatus: 'VERIFIED' | 'PENDING' | 'DENIED';
    };
    allergies: Array<{
      allergen: string;
      severity: 'MILD' | 'MODERATE' | 'SEVERE';
      reaction: string;
    }>;
    flags: string[];
    lastVisit?: string;
    preferredLanguage?: string;
    interpreterRequired: boolean;
  };
}

export class VoyagerAPIClient {
  private logger: Logger;
  private httpClient?: AxiosInstance;
  private config?: VoyagerAPIConfig;
  private connected: boolean = false;
  private authToken?: string;
  
  constructor() {
    this.logger = new Logger('VoyagerAPIClient');
  }
  
  /**
   * Connect to Voyager API
   */
  async connect(config: VoyagerAPIConfig): Promise<RISOperationResult<boolean>> {
    try {
      this.config = config;
      
      // Create axios instance
      this.httpClient = axios.create({
        baseURL: `${config.baseURL}/api/${config.version}`,
        timeout: config.timeout || 30000,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'Axis-Imaging-Integration/1.0'
        }
      });
      
      // Set up interceptors
      this.setupRequestInterceptor();
      this.setupResponseInterceptor();
      
      // Authenticate if required
      if (config.authentication) {
        await this.authenticate(config.authentication);
      }
      
      // Test connection
      await this.ping();
      
      this.connected = true;
      this.logger.info('Connected to Voyager API');
      
      return {
        success: true,
        data: true,
        timestamp: new Date(),
        operationId: this.generateOperationId()
      };
      
    } catch (error) {
      this.logger.error('Failed to connect to Voyager API:', error);
      return {
        success: false,
        error: error.message,
        timestamp: new Date(),
        operationId: this.generateOperationId()
      };
    }
  }
  
  /**
   * Disconnect from Voyager API
   */
  async disconnect(): Promise<RISOperationResult<boolean>> {
    try {
      if (this.authToken) {
        await this.revokeToken();
      }
      
      this.connected = false;
      this.httpClient = undefined;
      this.authToken = undefined;
      
      this.logger.info('Disconnected from Voyager API');
      
      return {
        success: true,
        data: true,
        timestamp: new Date(),
        operationId: this.generateOperationId()
      };
      
    } catch (error) {
      this.logger.error('Error during Voyager API disconnect:', error);
      return {
        success: false,
        error: error.message,
        timestamp: new Date(),
        operationId: this.generateOperationId()
      };
    }
  }
  
  /**
   * Test API connection
   */
  async ping(): Promise<RISOperationResult<boolean>> {
    try {
      if (!this.httpClient) {
        throw new Error('Not connected to Voyager API');
      }
      
      const response = await this.httpClient.get('/health');
      
      return {
        success: true,
        data: response.status === 200,
        timestamp: new Date(),
        operationId: this.generateOperationId()
      };
      
    } catch (error) {
      return {
        success: false,
        error: error.message,
        timestamp: new Date(),
        operationId: this.generateOperationId()
      };
    }
  }
  
  /**
   * Find patients
   */
  async findPatients(query: RISQuery): Promise<RISOperationResult<Patient[]>> {
    try {
      if (!this.httpClient) {
        throw new Error('Not connected to Voyager API');
      }
      
      const params = this.buildQueryParams(query);\n      const response = await this.httpClient.get('/patients', { params });\n      \n      const patients = response.data.patients.map(this.mapVoyagerPatientToStandard);\n      \n      return {\n        success: true,\n        data: patients,\n        timestamp: new Date(),\n        operationId: this.generateOperationId()\n      };\n      \n    } catch (error) {\n      this.logger.error('Patient search failed:', error);\n      return {\n        success: false,\n        error: error.message,\n        timestamp: new Date(),\n        operationId: this.generateOperationId()\n      };\n    }\n  }\n  \n  /**\n   * Get patient by ID\n   */\n  async getPatient(patientID: string): Promise<RISOperationResult<Patient>> {\n    try {\n      if (!this.httpClient) {\n        throw new Error('Not connected to Voyager API');\n      }\n      \n      const response = await this.httpClient.get(`/patients/${patientID}`);\n      const patient = this.mapVoyagerPatientToStandard(response.data);\n      \n      return {\n        success: true,\n        data: patient,\n        timestamp: new Date(),\n        operationId: this.generateOperationId()\n      };\n      \n    } catch (error) {\n      this.logger.error('Get patient failed:', error);\n      return {\n        success: false,\n        error: error.message,\n        timestamp: new Date(),\n        operationId: this.generateOperationId()\n      };\n    }\n  }\n  \n  /**\n   * Find orders\n   */\n  async findOrders(query: RISQuery): Promise<RISOperationResult<Order[]>> {\n    try {\n      if (!this.httpClient) {\n        throw new Error('Not connected to Voyager API');\n      }\n      \n      const params = this.buildQueryParams(query);\n      const response = await this.httpClient.get('/orders', { params });\n      \n      const orders = response.data.orders.map(this.mapVoyagerOrderToStandard);\n      \n      return {\n        success: true,\n        data: orders,\n        timestamp: new Date(),\n        operationId: this.generateOperationId()\n      };\n      \n    } catch (error) {\n      this.logger.error('Order search failed:', error);\n      return {\n        success: false,\n        error: error.message,\n        timestamp: new Date(),\n        operationId: this.generateOperationId()\n      };\n    }\n  }\n  \n  /**\n   * Find reports\n   */\n  async findReports(query: RISQuery): Promise<RISOperationResult<Report[]>> {\n    try {\n      if (!this.httpClient) {\n        throw new Error('Not connected to Voyager API');\n      }\n      \n      const params = this.buildQueryParams(query);\n      const response = await this.httpClient.get('/reports', { params });\n      \n      const reports = response.data.reports.map(this.mapVoyagerReportToStandard);\n      \n      return {\n        success: true,\n        data: reports,\n        timestamp: new Date(),\n        operationId: this.generateOperationId()\n      };\n      \n    } catch (error) {\n      this.logger.error('Report search failed:', error);\n      return {\n        success: false,\n        error: error.message,\n        timestamp: new Date(),\n        operationId: this.generateOperationId()\n      };\n    }\n  }\n  \n  /**\n   * Get schedule\n   */\n  async getSchedule(date: string, modality?: string): Promise<RISOperationResult<Schedule[]>> {\n    try {\n      if (!this.httpClient) {\n        throw new Error('Not connected to Voyager API');\n      }\n      \n      const params: any = { date };\n      if (modality) params.modality = modality;\n      \n      const response = await this.httpClient.get('/schedule', { params });\n      \n      const schedule = response.data.appointments.map(this.mapVoyagerScheduleToStandard);\n      \n      return {\n        success: true,\n        data: schedule,\n        timestamp: new Date(),\n        operationId: this.generateOperationId()\n      };\n      \n    } catch (error) {\n      this.logger.error('Schedule retrieval failed:', error);\n      return {\n        success: false,\n        error: error.message,\n        timestamp: new Date(),\n        operationId: this.generateOperationId()\n      };\n    }\n  }\n  \n  /**\n   * Get worklist for specific modality\n   */\n  async getWorklist(modality: string, date?: string): Promise<RISOperationResult<Order[]>> {\n    try {\n      if (!this.httpClient) {\n        throw new Error('Not connected to Voyager API');\n      }\n      \n      const params: any = { modality };\n      if (date) params.date = date;\n      \n      const response = await this.httpClient.get('/worklist', { params });\n      \n      const worklist = response.data.orders.map(this.mapVoyagerOrderToStandard);\n      \n      return {\n        success: true,\n        data: worklist,\n        timestamp: new Date(),\n        operationId: this.generateOperationId()\n      };\n      \n    } catch (error) {\n      this.logger.error('Worklist retrieval failed:', error);\n      return {\n        success: false,\n        error: error.message,\n        timestamp: new Date(),\n        operationId: this.generateOperationId()\n      };\n    }\n  }\n  \n  /**\n   * Update order status\n   */\n  async updateOrderStatus(orderID: string, status: string, notes?: string): Promise<RISOperationResult<boolean>> {\n    try {\n      if (!this.httpClient) {\n        throw new Error('Not connected to Voyager API');\n      }\n      \n      const payload = {\n        status,\n        notes,\n        timestamp: new Date().toISOString(),\n        updatedBy: 'AXIS_IMAGING'\n      };\n      \n      await this.httpClient.put(`/orders/${orderID}/status`, payload);\n      \n      return {\n        success: true,\n        data: true,\n        timestamp: new Date(),\n        operationId: this.generateOperationId()\n      };\n      \n    } catch (error) {\n      this.logger.error('Order status update failed:', error);\n      return {\n        success: false,\n        error: error.message,\n        timestamp: new Date(),\n        operationId: this.generateOperationId()\n      };\n    }\n  }\n  \n  /**\n   * Submit preliminary report\n   */\n  async submitPreliminaryReport(accessionNumber: string, report: Partial<Report>): Promise<RISOperationResult<string>> {\n    try {\n      if (!this.httpClient) {\n        throw new Error('Not connected to Voyager API');\n      }\n      \n      const payload = {\n        accessionNumber,\n        reportType: 'PRELIMINARY',\n        findings: report.findings,\n        impression: report.impression,\n        recommendations: report.recommendations,\n        radiologist: report.radiologist,\n        timestamp: new Date().toISOString()\n      };\n      \n      const response = await this.httpClient.post('/reports/preliminary', payload);\n      \n      return {\n        success: true,\n        data: response.data.reportId,\n        timestamp: new Date(),\n        operationId: this.generateOperationId()\n      };\n      \n    } catch (error) {\n      this.logger.error('Preliminary report submission failed:', error);\n      return {\n        success: false,\n        error: error.message,\n        timestamp: new Date(),\n        operationId: this.generateOperationId()\n      };\n    }\n  }\n  \n  /**\n   * Get report templates\n   */\n  async getReportTemplates(modality?: string, bodyPart?: string): Promise<RISOperationResult<any[]>> {\n    try {\n      if (!this.httpClient) {\n        throw new Error('Not connected to Voyager API');\n      }\n      \n      const params: any = {};\n      if (modality) params.modality = modality;\n      if (bodyPart) params.bodyPart = bodyPart;\n      \n      const response = await this.httpClient.get('/templates', { params });\n      \n      return {\n        success: true,\n        data: response.data.templates,\n        timestamp: new Date(),\n        operationId: this.generateOperationId()\n      };\n      \n    } catch (error) {\n      this.logger.error('Template retrieval failed:', error);\n      return {\n        success: false,\n        error: error.message,\n        timestamp: new Date(),\n        operationId: this.generateOperationId()\n      };\n    }\n  }\n  \n  /**\n   * Get statistics\n   */\n  async getStatistics(): Promise<any> {\n    try {\n      if (!this.httpClient) {\n        return { connected: false };\n      }\n      \n      const response = await this.httpClient.get('/statistics');\n      return response.data;\n      \n    } catch (error) {\n      this.logger.error('Failed to get statistics:', error);\n      return { error: error.message };\n    }\n  }\n  \n  /**\n   * Check if connected\n   */\n  isConnected(): boolean {\n    return this.connected;\n  }\n  \n  /**\n   * Get API capabilities\n   */\n  getCapabilities(): string[] {\n    return [\n      'patient-search',\n      'order-management',\n      'report-submission',\n      'schedule-access',\n      'worklist-access',\n      'template-access'\n    ];\n  }\n  \n  /**\n   * Private helper methods\n   */\n  \n  private async authenticate(authConfig: any): Promise<void> {\n    if (!this.httpClient) {\n      throw new Error('HTTP client not initialized');\n    }\n    \n    switch (authConfig.type) {\n      case 'API_KEY':\n        this.httpClient.defaults.headers['X-API-Key'] = authConfig.credentials.apiKey;\n        break;\n        \n      case 'OAUTH2':\n        const tokenResponse = await this.httpClient.post('/auth/token', {\n          grant_type: 'client_credentials',\n          client_id: authConfig.credentials.clientId,\n          client_secret: authConfig.credentials.clientSecret\n        });\n        \n        this.authToken = tokenResponse.data.access_token;\n        this.httpClient.defaults.headers['Authorization'] = `Bearer ${this.authToken}`;\n        break;\n        \n      case 'BASIC':\n        const basicAuth = Buffer.from(\n          `${authConfig.credentials.username}:${authConfig.credentials.password}`\n        ).toString('base64');\n        \n        this.httpClient.defaults.headers['Authorization'] = `Basic ${basicAuth}`;\n        break;\n        \n      default:\n        throw new Error(`Unsupported authentication type: ${authConfig.type}`);\n    }\n    \n    this.logger.info('Authenticated with Voyager API');\n  }\n  \n  private async revokeToken(): Promise<void> {\n    if (!this.httpClient || !this.authToken) {\n      return;\n    }\n    \n    try {\n      await this.httpClient.post('/auth/revoke', { token: this.authToken });\n      this.logger.info('Authentication token revoked');\n    } catch (error) {\n      this.logger.warn('Failed to revoke token:', error);\n    }\n  }\n  \n  private setupRequestInterceptor(): void {\n    if (!this.httpClient) return;\n    \n    this.httpClient.interceptors.request.use(\n      (config) => {\n        this.logger.debug(`Voyager API Request: ${config.method?.toUpperCase()} ${config.url}`);\n        return config;\n      },\n      (error) => {\n        this.logger.error('Request interceptor error:', error);\n        return Promise.reject(error);\n      }\n    );\n  }\n  \n  private setupResponseInterceptor(): void {\n    if (!this.httpClient) return;\n    \n    this.httpClient.interceptors.response.use(\n      (response) => {\n        this.logger.debug(`Voyager API Response: ${response.status} ${response.config.url}`);\n        return response;\n      },\n      (error) => {\n        this.logger.error(`Voyager API Error: ${error.response?.status} ${error.config?.url}`, error.message);\n        return Promise.reject(error);\n      }\n    );\n  }\n  \n  private buildQueryParams(query: RISQuery): Record<string, any> {\n    const params: Record<string, any> = {};\n    \n    if (query.patientID) params.patientId = query.patientID;\n    if (query.accessionNumber) params.accessionNumber = query.accessionNumber;\n    if (query.orderID) params.orderId = query.orderID;\n    \n    if (query.dateRange) {\n      params.dateFrom = query.dateRange.from;\n      params.dateTo = query.dateRange.to;\n    }\n    \n    if (query.status?.length) {\n      params.status = query.status.join(',');\n    }\n    \n    if (query.modality?.length) {\n      params.modality = query.modality.join(',');\n    }\n    \n    if (query.orderingPhysician) {\n      params.orderingPhysician = query.orderingPhysician;\n    }\n    \n    if (query.limit) params.limit = query.limit;\n    if (query.offset) params.offset = query.offset;\n    \n    return params;\n  }\n  \n  private mapVoyagerPatientToStandard(voyagerPatient: any): Patient {\n    return {\n      patientID: voyagerPatient.patientId,\n      mrn: voyagerPatient.mrn,\n      firstName: voyagerPatient.firstName,\n      lastName: voyagerPatient.lastName,\n      middleName: voyagerPatient.middleName,\n      dateOfBirth: voyagerPatient.dateOfBirth,\n      gender: voyagerPatient.gender,\n      address: voyagerPatient.address ? {\n        street: voyagerPatient.address.street,\n        city: voyagerPatient.address.city,\n        state: voyagerPatient.address.state,\n        postalCode: voyagerPatient.address.postalCode,\n        country: voyagerPatient.address.country\n      } : undefined,\n      phoneNumber: voyagerPatient.phoneNumber,\n      email: voyagerPatient.email,\n      emergencyContact: voyagerPatient.emergencyContact\n    };\n  }\n  \n  private mapVoyagerOrderToStandard(voyagerOrder: any): Order {\n    return {\n      orderID: voyagerOrder.orderId,\n      accessionNumber: voyagerOrder.accessionNumber,\n      patientID: voyagerOrder.patientId,\n      orderDate: voyagerOrder.orderDate,\n      scheduledDate: voyagerOrder.scheduledDate,\n      priority: voyagerOrder.priority,\n      status: voyagerOrder.status,\n      orderingPhysician: {\n        id: voyagerOrder.orderingPhysician.id,\n        name: voyagerOrder.orderingPhysician.name,\n        department: voyagerOrder.orderingPhysician.department,\n        contactInfo: voyagerOrder.orderingPhysician.contactInfo\n      },\n      referringPhysician: voyagerOrder.referringPhysician,\n      procedures: voyagerOrder.procedures || [],\n      clinicalInfo: voyagerOrder.clinicalInfo,\n      reason: voyagerOrder.reason,\n      urgency: voyagerOrder.urgency\n    };\n  }\n  \n  private mapVoyagerReportToStandard(voyagerReport: any): Report {\n    return {\n      reportID: voyagerReport.reportId,\n      accessionNumber: voyagerReport.accessionNumber,\n      studyInstanceUID: voyagerReport.studyInstanceUID,\n      patientID: voyagerReport.patientId,\n      reportType: voyagerReport.reportType,\n      status: voyagerReport.status,\n      radiologist: {\n        id: voyagerReport.radiologist.id,\n        name: voyagerReport.radiologist.name,\n        credentials: voyagerReport.radiologist.credentials,\n        department: voyagerReport.radiologist.department\n      },\n      dictationDate: voyagerReport.dictationDate,\n      verificationDate: voyagerReport.verificationDate,\n      signedDate: voyagerReport.signedDate,\n      findings: voyagerReport.findings,\n      impression: voyagerReport.impression,\n      recommendations: voyagerReport.recommendations,\n      template: voyagerReport.template,\n      priorStudyComparison: voyagerReport.priorStudyComparison,\n      criticalResults: voyagerReport.criticalResults,\n      communicationLog: voyagerReport.communicationLog\n    };\n  }\n  \n  private mapVoyagerScheduleToStandard(voyagerAppointment: any): Schedule {\n    return {\n      scheduleID: voyagerAppointment.appointmentId,\n      patientID: voyagerAppointment.patientId,\n      orderID: voyagerAppointment.orderId,\n      scheduledDate: voyagerAppointment.scheduledDate,\n      scheduledTime: voyagerAppointment.scheduledTime,\n      estimatedDuration: voyagerAppointment.estimatedDuration,\n      room: voyagerAppointment.room,\n      modality: voyagerAppointment.modality,\n      technologist: voyagerAppointment.technologist,\n      status: voyagerAppointment.status,\n      notes: voyagerAppointment.notes\n    };\n  }\n  \n  private generateOperationId(): string {\n    return `voyager_api_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;\n  }\n}"