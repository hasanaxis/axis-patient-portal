/**
 * Sectra PACS Provider Implementation
 * Specialized implementation for Sectra IDS7 and PACS systems
 */

import { 
  BasePACSProvider, 
  PACSConnectionConfig, 
  PACSQuery, 
  PACSRetrieveRequest,
  PACSOperationResult,
  StudyMetadata,
  SeriesMetadata,
  ImageMetadata 
} from '../interfaces/IPACSProvider';
import { DICOMClient } from '../dicom/DICOMClient';
import { SectraAPIClient } from './SectraAPIClient';
import { Logger } from '../../utils/logger';

export interface SectraPACSConfig extends PACSConnectionConfig {
  // Sectra-specific configuration
  secttraConfig: {
    apiEndpoint: string;
    apiVersion: 'v1' | 'v2';
    worklistEndpoint?: string;
    viewerEndpoint?: string;
    enableWebViewer: boolean;
    thumbnailSupport: boolean;
    compressionLevel: number;
    preferredTransferSyntax: string[];
    securityLevel: 'BASIC' | 'ENHANCED' | 'MAXIMUM';
    customHeaders?: Record<string, string>;
  };
  dicomConfig: {
    supportedSOPClasses: string[];
    maxPDUSize: number;
    enableCompression: boolean;
    asyncOperations: number;
    networkTimeout: number;
  };
}

export interface SectraStudyExtended extends StudyMetadata {
  secttraSpecific: {
    workflowStatus: string;
    priorityLevel: number;
    reportingRadiologist?: string;
    departmentCode: string;
    protocolTemplateId?: string;
    priorStudyReferences: string[];
    qualityMetrics?: {
      imageQualityScore: number;
      protocolCompliance: boolean;
      artifactCount: number;
    };
  };
}

export class SectraPACSProvider extends BasePACSProvider {
  readonly name = 'Sectra PACS';
  readonly version = '1.0.0';
  readonly vendor = 'Sectra AB';
  
  private dicomClient: DICOMClient;
  private apiClient: SectraAPIClient;
  private logger: Logger;
  private secttraConfig: SectraPACSConfig;
  
  constructor() {
    super();
    this.logger = new Logger('SectraPACSProvider');
    this.dicomClient = new DICOMClient();
    this.apiClient = new SectraAPIClient();
  }
  
  async connect(config: PACSConnectionConfig): Promise<PACSOperationResult<boolean>> {
    const operationId = this.generateOperationId();
    this.logger.info(`Connecting to Sectra PACS: ${config.host}:${config.port}`);
    
    try {
      this.secttraConfig = config as SectraPACSConfig;
      this.config = config;
      
      // Initialize DICOM connection
      const dicomResult = await this.dicomClient.connect({
        host: config.host,
        port: config.port,
        callingAET: config.callingAET,
        calledAET: config.calledAET,
        timeout: config.timeout,
        maxPDUSize: this.secttraConfig.dicomConfig?.maxPDUSize || 16384,
        enableTLS: config.enableTLS
      });
      
      if (!dicomResult.success) {
        throw new Error(`DICOM connection failed: ${dicomResult.error}`);
      }
      
      // Initialize Sectra API connection if configured
      if (this.secttraConfig.secttraConfig?.apiEndpoint) {
        const apiResult = await this.apiClient.connect({
          endpoint: this.secttraConfig.secttraConfig.apiEndpoint,
          version: this.secttraConfig.secttraConfig.apiVersion,
          credentials: config.credentials,
          customHeaders: this.secttraConfig.secttraConfig.customHeaders
        });
        
        if (!apiResult.success) {
          this.logger.warn(`Sectra API connection failed: ${apiResult.error}`);
          // Continue with DICOM-only mode
        }
      }
      
      // Negotiate supported SOP classes
      await this.negotiateSOPClasses();
      
      this.connected = true;
      this.logger.info('Successfully connected to Sectra PACS');
      
      return this.createSuccessResult(true, operationId);
      
    } catch (error) {
      this.logger.error('Failed to connect to Sectra PACS:', error);
      return this.createErrorResult(error.message, 'CONNECTION_FAILED', operationId);
    }
  }
  
  async disconnect(): Promise<PACSOperationResult<boolean>> {
    const operationId = this.generateOperationId();
    
    try {
      await this.dicomClient.disconnect();
      await this.apiClient.disconnect();
      
      this.connected = false;
      this.logger.info('Disconnected from Sectra PACS');
      
      return this.createSuccessResult(true, operationId);
      
    } catch (error) {
      this.logger.error('Error during Sectra PACS disconnect:', error);
      return this.createErrorResult(error.message, 'DISCONNECT_ERROR', operationId);
    }
  }
  
  async testConnection(): Promise<PACSOperationResult<boolean>> {
    const operationId = this.generateOperationId();
    
    try {
      // Test DICOM echo
      const echoResult = await this.dicomClient.echo();
      if (!echoResult.success) {
        throw new Error(`DICOM echo failed: ${echoResult.error}`);
      }
      
      // Test API if available
      if (this.apiClient.isConnected()) {
        const apiResult = await this.apiClient.ping();
        if (!apiResult.success) {
          this.logger.warn(`Sectra API ping failed: ${apiResult.error}`);
        }
      }
      
      return this.createSuccessResult(true, operationId);
      
    } catch (error) {
      return this.createErrorResult(error.message, 'CONNECTION_TEST_FAILED', operationId);
    }
  }
  
  async findStudies(query: PACSQuery): Promise<PACSOperationResult<StudyMetadata[]>> {
    const operationId = this.generateOperationId();
    
    try {
      // Use API if available for enhanced queries
      if (this.apiClient.isConnected() && this.shouldUseAPIForQuery(query)) {
        return await this.findStudiesViaAPI(query, operationId);
      }
      
      // Fallback to DICOM C-FIND
      return await this.findStudiesViaDICOM(query, operationId);
      
    } catch (error) {
      this.logger.error('Study search failed:', error);
      return this.createErrorResult(error.message, 'STUDY_SEARCH_FAILED', operationId);
    }
  }
  
  async findSeries(studyInstanceUID: string): Promise<PACSOperationResult<SeriesMetadata[]>> {
    const operationId = this.generateOperationId();
    
    try {
      const seriesData = await this.dicomClient.findSeries({
        studyInstanceUID,
        queryLevel: 'SERIES'
      });
      
      if (!seriesData.success) {
        throw new Error(seriesData.error);
      }
      
      return this.createSuccessResult(seriesData.data, operationId);
      
    } catch (error) {
      this.logger.error('Series search failed:', error);
      return this.createErrorResult(error.message, 'SERIES_SEARCH_FAILED', operationId);
    }
  }
  
  async findImages(seriesInstanceUID: string): Promise<PACSOperationResult<ImageMetadata[]>> {
    const operationId = this.generateOperationId();
    
    try {
      const imageData = await this.dicomClient.findImages({
        seriesInstanceUID,
        queryLevel: 'IMAGE'
      });
      
      if (!imageData.success) {
        throw new Error(imageData.error);
      }
      
      return this.createSuccessResult(imageData.data, operationId);
      
    } catch (error) {
      this.logger.error('Image search failed:', error);
      return this.createErrorResult(error.message, 'IMAGE_SEARCH_FAILED', operationId);
    }
  }
  
  async retrieveStudy(request: PACSRetrieveRequest): Promise<PACSOperationResult<string>> {
    const operationId = this.generateOperationId();
    
    try {
      // Use Sectra's optimized retrieval if available
      if (this.apiClient.isConnected()) {
        const result = await this.apiClient.retrieveStudy(request);
        if (result.success) {
          return this.createSuccessResult(result.data, operationId);
        }
      }
      
      // Fallback to DICOM C-MOVE
      const moveResult = await this.dicomClient.moveStudy(request);
      
      if (!moveResult.success) {
        throw new Error(moveResult.error);
      }
      
      return this.createSuccessResult(moveResult.data, operationId);
      
    } catch (error) {
      this.logger.error('Study retrieval failed:', error);
      return this.createErrorResult(error.message, 'STUDY_RETRIEVAL_FAILED', operationId);
    }
  }
  
  async retrieveSeries(request: PACSRetrieveRequest): Promise<PACSOperationResult<string>> {
    const operationId = this.generateOperationId();
    
    try {
      const moveResult = await this.dicomClient.moveSeries(request);
      
      if (!moveResult.success) {
        throw new Error(moveResult.error);
      }
      
      return this.createSuccessResult(moveResult.data, operationId);
      
    } catch (error) {
      this.logger.error('Series retrieval failed:', error);
      return this.createErrorResult(error.message, 'SERIES_RETRIEVAL_FAILED', operationId);
    }
  }
  
  async retrieveImage(request: PACSRetrieveRequest): Promise<PACSOperationResult<string>> {
    const operationId = this.generateOperationId();
    
    try {
      const moveResult = await this.dicomClient.moveImage(request);
      
      if (!moveResult.success) {
        throw new Error(moveResult.error);
      }
      
      return this.createSuccessResult(moveResult.data, operationId);
      
    } catch (error) {
      this.logger.error('Image retrieval failed:', error);
      return this.createErrorResult(error.message, 'IMAGE_RETRIEVAL_FAILED', operationId);
    }
  }
  
  async storeImage(dicomFile: Buffer, metadata: ImageMetadata): Promise<PACSOperationResult<string>> {
    const operationId = this.generateOperationId();
    
    try {
      const storeResult = await this.dicomClient.storeImage(dicomFile, metadata);
      
      if (!storeResult.success) {
        throw new Error(storeResult.error);
      }
      
      return this.createSuccessResult(storeResult.data, operationId);
      
    } catch (error) {
      this.logger.error('Image storage failed:', error);
      return this.createErrorResult(error.message, 'IMAGE_STORAGE_FAILED', operationId);
    }
  }
  
  async getStatus(): Promise<PACSOperationResult<any>> {
    const operationId = this.generateOperationId();
    
    try {
      const status = {
        connected: this.connected,
        dicomConnected: this.dicomClient.isConnected(),
        apiConnected: this.apiClient.isConnected(),
        lastActivity: new Date(),
        capabilities: {
          dicomServices: ['C-ECHO', 'C-FIND', 'C-MOVE', 'C-STORE'],
          apiServices: this.apiClient.getCapabilities(),
          supportedSOPClasses: this.secttraConfig?.dicomConfig?.supportedSOPClasses || []
        },
        performance: await this.getPerformanceMetrics()
      };
      
      return this.createSuccessResult(status, operationId);
      
    } catch (error) {
      return this.createErrorResult(error.message, 'STATUS_ERROR', operationId);
    }
  }
  
  async getStatistics(): Promise<PACSOperationResult<any>> {
    const operationId = this.generateOperationId();
    
    try {
      const stats = {
        dicomStatistics: await this.dicomClient.getStatistics(),
        apiStatistics: await this.apiClient.getStatistics(),
        secttraSpecific: {
          workflowEngagements: 0, // To be implemented
          viewerSessions: 0,      // To be implemented
          reportingActivity: 0    // To be implemented
        }
      };
      
      return this.createSuccessResult(stats, operationId);
      
    } catch (error) {
      return this.createErrorResult(error.message, 'STATISTICS_ERROR', operationId);
    }
  }
  
  /**
   * Sectra-specific methods
   */
  
  async getWorkflowStatus(studyInstanceUID: string): Promise<PACSOperationResult<any>> {
    if (!this.apiClient.isConnected()) {
      return this.createErrorResult('API not available', 'API_NOT_CONNECTED');
    }
    
    try {
      return await this.apiClient.getWorkflowStatus(studyInstanceUID);
    } catch (error) {
      return this.createErrorResult(error.message, 'WORKFLOW_STATUS_ERROR');
    }
  }
  
  async getViewerURL(studyInstanceUID: string): Promise<PACSOperationResult<string>> {
    if (!this.secttraConfig.secttraConfig?.viewerEndpoint) {
      return this.createErrorResult('Viewer endpoint not configured', 'VIEWER_NOT_CONFIGURED');
    }
    
    try {
      const url = `${this.secttraConfig.secttraConfig.viewerEndpoint}/study/${studyInstanceUID}`;
      return this.createSuccessResult(url);
    } catch (error) {
      return this.createErrorResult(error.message, 'VIEWER_URL_ERROR');
    }
  }
  
  async getThumbnail(seriesInstanceUID: string, size: 'small' | 'medium' | 'large' = 'medium'): Promise<PACSOperationResult<Buffer>> {
    if (!this.secttraConfig.secttraConfig?.thumbnailSupport) {
      return this.createErrorResult('Thumbnail support not enabled', 'THUMBNAIL_NOT_SUPPORTED');
    }
    
    try {
      return await this.apiClient.getThumbnail(seriesInstanceUID, size);
    } catch (error) {
      return this.createErrorResult(error.message, 'THUMBNAIL_ERROR');
    }
  }
  
  /**
   * Private helper methods
   */
  
  private async negotiateSOPClasses(): Promise<void> {
    // Negotiate supported SOP classes with Sectra PACS
    const supportedClasses = this.secttraConfig.dicomConfig?.supportedSOPClasses || [
      '1.2.840.10008.5.1.4.1.1.2',    // CT Image Storage
      '1.2.840.10008.5.1.4.1.1.4',    // MR Image Storage
      '1.2.840.10008.5.1.4.1.1.12.1', // X-Ray Angiographic Image Storage
      '1.2.840.10008.5.1.4.1.1.7',    // Secondary Capture Image Storage
      '1.2.840.10008.5.1.4.1.1.88.11' // Basic Text SR Storage
    ];
    
    await this.dicomClient.negotiateSOPClasses(supportedClasses);
  }
  
  private shouldUseAPIForQuery(query: PACSQuery): boolean {
    // Use API for complex queries that benefit from Sectra's enhanced search
    return !!(
      query.studyDate ||
      query.modality?.length ||
      query.limit ||
      query.offset
    );
  }
  
  private async findStudiesViaAPI(query: PACSQuery, operationId: string): Promise<PACSOperationResult<StudyMetadata[]>> {
    try {
      const result = await this.apiClient.searchStudies(query);
      
      if (!result.success) {
        throw new Error(result.error);
      }
      
      return this.createSuccessResult(result.data, operationId);
      
    } catch (error) {
      // Fallback to DICOM if API fails
      this.logger.warn('API search failed, falling back to DICOM:', error);
      return await this.findStudiesViaDICOM(query, operationId);
    }
  }
  
  private async findStudiesViaDICOM(query: PACSQuery, operationId: string): Promise<PACSOperationResult<StudyMetadata[]>> {
    const studyData = await this.dicomClient.findStudies(query);
    
    if (!studyData.success) {
      throw new Error(studyData.error);
    }
    
    return this.createSuccessResult(studyData.data, operationId);
  }
  
  private async getPerformanceMetrics(): Promise<any> {
    return {
      averageQueryTime: 0,    // To be implemented
      averageRetrievalTime: 0, // To be implemented
      connectionUptime: 0,     // To be implemented
      throughput: 0           // To be implemented
    };
  }
}