/**
 * Sectra API Client Implementation
 * Handles REST API communication with Sectra IDS7 systems
 */

import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { Logger } from '../../utils/logger';
import { PACSQuery, PACSOperationResult, StudyMetadata } from '../interfaces/IPACSProvider';

export interface SectraAPIConfig {
  endpoint: string;
  version: 'v1' | 'v2';
  credentials?: {
    username: string;
    password: string;
  };
  customHeaders?: Record<string, string>;
  timeout?: number;
  retries?: number;
}

export interface SectraWorkflowStatus {
  studyInstanceUID: string;
  workflowState: 'SCHEDULED' | 'IN_PROGRESS' | 'PENDING_REVIEW' | 'REVIEWED' | 'REPORTED' | 'VERIFIED' | 'COMPLETED';
  assignedRadiologist?: string;
  priority: 'STAT' | 'URGENT' | 'ROUTINE';
  estimatedCompletionTime?: string;
  lastModified: string;
  workflowSteps: Array<{
    step: string;
    status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'SKIPPED';
    timestamp?: string;
    user?: string;
  }>;
}

export interface SectraReportTemplate {
  templateId: string;
  name: string;
  category: string;
  modality: string;
  bodyPart: string;
  template: string;
  macros: Record<string, string>;
}

export class SectraAPIClient {
  private logger: Logger;
  private httpClient?: AxiosInstance;
  private config?: SectraAPIConfig;
  private connected: boolean = false;
  private authToken?: string;
  private capabilities: string[] = [];
  
  constructor() {
    this.logger = new Logger('SectraAPIClient');
  }
  
  /**
   * Connect to Sectra API
   */
  async connect(config: SectraAPIConfig): Promise<PACSOperationResult<boolean>> {
    try {
      this.config = config;
      
      // Create axios instance
      this.httpClient = axios.create({
        baseURL: `${config.endpoint}/api/${config.version}`,
        timeout: config.timeout || 30000,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...config.customHeaders
        }
      });
      
      // Set up request interceptor for authentication
      this.setupRequestInterceptor();
      
      // Set up response interceptor for error handling
      this.setupResponseInterceptor();
      
      // Authenticate if credentials provided
      if (config.credentials) {
        await this.authenticate(config.credentials);
      }
      
      // Get API capabilities
      await this.getCapabilities();
      
      this.connected = true;
      this.logger.info('Connected to Sectra API');
      
      return {
        success: true,
        data: true,
        timestamp: new Date(),
        operationId: this.generateOperationId()
      };
      
    } catch (error) {
      this.logger.error('Failed to connect to Sectra API:', error);
      return {
        success: false,
        error: error.message,
        timestamp: new Date(),
        operationId: this.generateOperationId()
      };
    }
  }
  
  /**
   * Disconnect from Sectra API
   */
  async disconnect(): Promise<PACSOperationResult<boolean>> {
    try {
      if (this.authToken) {
        // Revoke authentication token
        await this.revokeToken();
      }
      
      this.connected = false;
      this.httpClient = undefined;
      this.authToken = undefined;
      
      this.logger.info('Disconnected from Sectra API');
      
      return {
        success: true,
        data: true,
        timestamp: new Date(),
        operationId: this.generateOperationId()
      };
      
    } catch (error) {
      this.logger.error('Error during Sectra API disconnect:', error);
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
  async ping(): Promise<PACSOperationResult<boolean>> {
    try {
      if (!this.httpClient) {
        throw new Error('Not connected to Sectra API');
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
   * Search studies using Sectra API
   */
  async searchStudies(query: PACSQuery): Promise<PACSOperationResult<StudyMetadata[]>> {
    try {
      if (!this.httpClient) {
        throw new Error('Not connected to Sectra API');
      }
      
      const params = this.buildQueryParams(query);
      const response = await this.httpClient.get('/studies', { params });
      
      const studies = response.data.studies.map(this.mapSectraStudyToStandard);
      
      return {
        success: true,
        data: studies,
        timestamp: new Date(),
        operationId: this.generateOperationId()
      };
      
    } catch (error) {
      this.logger.error('Study search failed:', error);
      return {
        success: false,
        error: error.message,
        timestamp: new Date(),
        operationId: this.generateOperationId()
      };
    }
  }
  
  /**
   * Get workflow status for a study
   */
  async getWorkflowStatus(studyInstanceUID: string): Promise<PACSOperationResult<SectraWorkflowStatus>> {
    try {
      if (!this.httpClient) {
        throw new Error('Not connected to Sectra API');
      }
      
      const response = await this.httpClient.get(`/studies/${studyInstanceUID}/workflow`);
      
      return {
        success: true,
        data: response.data,
        timestamp: new Date(),
        operationId: this.generateOperationId()
      };
      
    } catch (error) {
      this.logger.error('Failed to get workflow status:', error);
      return {
        success: false,
        error: error.message,
        timestamp: new Date(),
        operationId: this.generateOperationId()
      };
    }
  }
  
  /**
   * Update workflow status
   */
  async updateWorkflowStatus(
    studyInstanceUID: string, 
    status: string, 
    assignedUser?: string
  ): Promise<PACSOperationResult<boolean>> {
    try {
      if (!this.httpClient) {
        throw new Error('Not connected to Sectra API');
      }
      
      const payload = {
        workflowState: status,
        assignedRadiologist: assignedUser,
        timestamp: new Date().toISOString()
      };
      
      await this.httpClient.put(`/studies/${studyInstanceUID}/workflow`, payload);
      
      return {
        success: true,
        data: true,
        timestamp: new Date(),
        operationId: this.generateOperationId()
      };
      
    } catch (error) {
      this.logger.error('Failed to update workflow status:', error);
      return {
        success: false,
        error: error.message,
        timestamp: new Date(),
        operationId: this.generateOperationId()
      };
    }
  }
  
  /**
   * Retrieve study using Sectra's optimized method
   */
  async retrieveStudy(request: any): Promise<PACSOperationResult<string>> {
    try {
      if (!this.httpClient) {
        throw new Error('Not connected to Sectra API');
      }
      
      const payload = {
        studyInstanceUID: request.studyInstanceUID,
        destinationAET: request.destinationAET,
        priority: request.priority,
        compressionLevel: 'MEDIUM',
        includePresentation: true
      };
      
      const response = await this.httpClient.post('/retrieve/study', payload);
      
      return {
        success: true,
        data: response.data.retrieveId,
        timestamp: new Date(),
        operationId: this.generateOperationId()
      };
      
    } catch (error) {
      this.logger.error('Study retrieval failed:', error);
      return {
        success: false,
        error: error.message,
        timestamp: new Date(),
        operationId: this.generateOperationId()
      };
    }
  }
  
  /**
   * Get thumbnail for series
   */
  async getThumbnail(seriesInstanceUID: string, size: 'small' | 'medium' | 'large'): Promise<PACSOperationResult<Buffer>> {
    try {
      if (!this.httpClient) {
        throw new Error('Not connected to Sectra API');
      }
      
      const response = await this.httpClient.get(`/series/${seriesInstanceUID}/thumbnail`, {
        params: { size },
        responseType: 'arraybuffer'
      });
      
      return {
        success: true,
        data: Buffer.from(response.data),
        timestamp: new Date(),
        operationId: this.generateOperationId()
      };
      
    } catch (error) {
      this.logger.error('Thumbnail retrieval failed:', error);
      return {
        success: false,
        error: error.message,
        timestamp: new Date(),
        operationId: this.generateOperationId()
      };
    }
  }
  
  /**
   * Get report templates
   */
  async getReportTemplates(modality?: string, bodyPart?: string): Promise<PACSOperationResult<SectraReportTemplate[]>> {
    try {
      if (!this.httpClient) {
        throw new Error('Not connected to Sectra API');
      }
      
      const params: any = {};
      if (modality) params.modality = modality;
      if (bodyPart) params.bodyPart = bodyPart;
      
      const response = await this.httpClient.get('/templates/reports', { params });
      
      return {
        success: true,
        data: response.data.templates,
        timestamp: new Date(),
        operationId: this.generateOperationId()
      };
      
    } catch (error) {
      this.logger.error('Failed to get report templates:', error);
      return {
        success: false,
        error: error.message,
        timestamp: new Date(),
        operationId: this.generateOperationId()
      };
    }
  }
  
  /**
   * Get viewer URL for study
   */
  async getViewerURL(studyInstanceUID: string, options?: {
    layout?: string;
    tools?: string[];
    annotations?: boolean;
  }): Promise<PACSOperationResult<string>> {
    try {
      if (!this.httpClient) {
        throw new Error('Not connected to Sectra API');
      }
      
      const response = await this.httpClient.post(`/viewer/url`, {
        studyInstanceUID,
        options: options || {}
      });
      
      return {
        success: true,
        data: response.data.viewerURL,
        timestamp: new Date(),
        operationId: this.generateOperationId()
      };
      
    } catch (error) {
      this.logger.error('Failed to get viewer URL:', error);
      return {
        success: false,
        error: error.message,
        timestamp: new Date(),
        operationId: this.generateOperationId()
      };
    }
  }
  
  /**
   * Get statistics
   */
  async getStatistics(): Promise<any> {
    try {
      if (!this.httpClient) {
        return { connected: false };
      }
      
      const response = await this.httpClient.get('/statistics');
      return response.data;
      
    } catch (error) {
      this.logger.error('Failed to get statistics:', error);
      return { error: error.message };
    }
  }
  
  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.connected;
  }
  
  /**
   * Get API capabilities
   */
  getCapabilities(): string[] {
    return this.capabilities;
  }
  
  /**
   * Private helper methods
   */
  
  private async authenticate(credentials: { username: string; password: string }): Promise<void> {
    if (!this.httpClient) {
      throw new Error('HTTP client not initialized');
    }
    
    const response = await this.httpClient.post('/auth/login', {
      username: credentials.username,
      password: credentials.password
    });
    
    this.authToken = response.data.token;
    this.logger.info('Authenticated with Sectra API');
  }
  
  private async revokeToken(): Promise<void> {
    if (!this.httpClient || !this.authToken) {
      return;
    }
    
    try {
      await this.httpClient.post('/auth/logout');
      this.logger.info('Authentication token revoked');
    } catch (error) {
      this.logger.warn('Failed to revoke token:', error);
    }
  }
  
  private setupRequestInterceptor(): void {
    if (!this.httpClient) return;
    
    this.httpClient.interceptors.request.use(
      (config) => {
        if (this.authToken) {
          config.headers['Authorization'] = `Bearer ${this.authToken}`;
        }
        
        this.logger.debug(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        this.logger.error('Request interceptor error:', error);
        return Promise.reject(error);
      }
    );
  }
  
  private setupResponseInterceptor(): void {
    if (!this.httpClient) return;
    
    this.httpClient.interceptors.response.use(
      (response) => {
        this.logger.debug(`API Response: ${response.status} ${response.config.url}`);
        return response;
      },
      async (error) => {
        if (error.response?.status === 401 && this.authToken) {
          // Token expired, try to re-authenticate
          this.logger.warn('Authentication token expired, attempting re-authentication');
          
          if (this.config?.credentials) {
            try {
              await this.authenticate(this.config.credentials);
              // Retry the original request
              error.config.headers['Authorization'] = `Bearer ${this.authToken}`;
              return this.httpClient?.request(error.config);
            } catch (authError) {
              this.logger.error('Re-authentication failed:', authError);
            }
          }
        }
        
        this.logger.error(`API Error: ${error.response?.status} ${error.config?.url}`, error.message);
        return Promise.reject(error);
      }
    );
  }
  
  private buildQueryParams(query: PACSQuery): Record<string, any> {
    const params: Record<string, any> = {};
    
    if (query.patientID) params.patientId = query.patientID;
    if (query.patientName) params.patientName = query.patientName;
    if (query.accessionNumber) params.accessionNumber = query.accessionNumber;
    if (query.studyInstanceUID) params.studyInstanceUID = query.studyInstanceUID;
    
    if (query.studyDate) {
      params.studyDateFrom = query.studyDate.from;
      params.studyDateTo = query.studyDate.to;
    }
    
    if (query.modality?.length) {
      params.modality = query.modality.join(',');
    }
    
    if (query.limit) params.limit = query.limit;
    if (query.offset) params.offset = query.offset;
    
    return params;
  }
  
  private mapSectraStudyToStandard(secttraStudy: any): StudyMetadata {
    return {
      studyInstanceUID: secttraStudy.studyInstanceUID,
      patientID: secttraStudy.patientId,
      patientName: secttraStudy.patientName,
      studyDate: secttraStudy.studyDate,
      studyTime: secttraStudy.studyTime,
      modality: secttraStudy.modality,
      studyDescription: secttraStudy.studyDescription,
      accessionNumber: secttraStudy.accessionNumber,
      seriesCount: secttraStudy.seriesCount || 0,
      imageCount: secttraStudy.imageCount || 0,
      studyStatus: this.mapWorkflowStatus(secttraStudy.workflowStatus),
      referringPhysician: secttraStudy.referringPhysician,
      institution: secttraStudy.institution
    };
  }
  
  private mapWorkflowStatus(secttraStatus: string): 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' {
    const statusMap: Record<string, 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'> = {
      'SCHEDULED': 'PENDING',
      'IN_PROGRESS': 'IN_PROGRESS',
      'PENDING_REVIEW': 'IN_PROGRESS',
      'REVIEWED': 'IN_PROGRESS',
      'REPORTED': 'IN_PROGRESS',
      'VERIFIED': 'COMPLETED',
      'COMPLETED': 'COMPLETED',
      'CANCELLED': 'CANCELLED'
    };
    
    return statusMap[secttraStatus] || 'PENDING';
  }
  
  private generateOperationId(): string {
    return `sectra_api_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}