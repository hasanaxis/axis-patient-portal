/**
 * Mock PACS Provider for Testing
 * Simulates Sectra PACS responses for integration testing
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
import { Logger } from '../../utils/logger';

export interface MockPACSConfig {
  simulateLatency: boolean;
  latencyRange: { min: number; max: number };
  errorRate: number; // 0-1, percentage of operations that should fail
  simulateSlowConnection: boolean;
  mockDataSet: 'minimal' | 'comprehensive' | 'large';
  enableProgressEvents: boolean;
  simulateConnectionIssues: boolean;
}

export class MockPACSProvider extends BasePACSProvider {
  readonly name = 'Mock PACS Provider';
  readonly version = '1.0.0';
  readonly vendor = 'Axis Imaging Test';
  
  private logger: Logger;
  private mockConfig: MockPACSConfig;
  private mockStudies: StudyMetadata[] = [];
  private mockSeries: Map<string, SeriesMetadata[]> = new Map();
  private mockImages: Map<string, ImageMetadata[]> = new Map();
  private connectionStartTime?: Date;
  
  constructor(mockConfig: MockPACSConfig = {
    simulateLatency: true,
    latencyRange: { min: 100, max: 2000 },
    errorRate: 0.05,
    simulateSlowConnection: false,
    mockDataSet: 'comprehensive',
    enableProgressEvents: true,
    simulateConnectionIssues: false
  }) {
    super();
    this.logger = new Logger('MockPACSProvider');
    this.mockConfig = mockConfig;
    this.initializeMockData();
  }
  
  async connect(config: PACSConnectionConfig): Promise<PACSOperationResult<boolean>> {
    const operationId = this.generateOperationId();
    this.logger.info(`Mock PACS connecting to: ${config.host}:${config.port}`);
    
    try {
      // Simulate connection latency
      await this.simulateLatency();
      
      // Simulate connection issues
      if (this.mockConfig.simulateConnectionIssues && Math.random() < 0.1) {
        throw new Error('Simulated connection timeout');
      }
      
      // Simulate authentication
      if (config.credentials) {
        await this.simulateLatency(200);
        if (config.credentials.username === 'invalid') {
          throw new Error('Authentication failed');
        }
      }
      
      this.config = config;
      this.connected = true;
      this.connectionStartTime = new Date();
      
      this.logger.info('Mock PACS connected successfully');
      return this.createSuccessResult(true, operationId);
      
    } catch (error) {
      this.logger.error('Mock PACS connection failed:', error);
      return this.createErrorResult(error.message, 'CONNECTION_FAILED', operationId);
    }
  }
  
  async disconnect(): Promise<PACSOperationResult<boolean>> {
    const operationId = this.generateOperationId();
    
    try {
      await this.simulateLatency(100);
      
      this.connected = false;
      this.connectionStartTime = undefined;
      
      this.logger.info('Mock PACS disconnected');
      return this.createSuccessResult(true, operationId);
      
    } catch (error) {
      return this.createErrorResult(error.message, 'DISCONNECT_ERROR', operationId);
    }
  }
  
  async testConnection(): Promise<PACSOperationResult<boolean>> {
    const operationId = this.generateOperationId();
    
    try {
      if (!this.connected) {
        throw new Error('Not connected');
      }
      
      await this.simulateLatency(50);
      
      // Simulate occasional test failures
      if (this.shouldSimulateError()) {
        throw new Error('Echo test failed');
      }
      
      return this.createSuccessResult(true, operationId);
      
    } catch (error) {
      return this.createErrorResult(error.message, 'ECHO_FAILED', operationId);
    }
  }
  
  async findStudies(query: PACSQuery): Promise<PACSOperationResult<StudyMetadata[]>> {
    const operationId = this.generateOperationId();
    
    try {
      if (!this.connected) {
        throw new Error('Not connected to PACS');
      }
      
      await this.simulateLatency();
      
      if (this.shouldSimulateError()) {
        throw new Error('Study search failed - network timeout');
      }
      
      // Filter mock studies based on query
      let results = this.mockStudies.filter(study => {
        if (query.patientID && !study.patientID.includes(query.patientID)) {
          return false;
        }
        
        if (query.patientName && !study.patientName.toLowerCase().includes(query.patientName.toLowerCase())) {
          return false;
        }
        
        if (query.accessionNumber && study.accessionNumber !== query.accessionNumber) {
          return false;
        }
        
        if (query.studyInstanceUID && study.studyInstanceUID !== query.studyInstanceUID) {
          return false;
        }
        
        if (query.modality?.length && !query.modality.includes(study.modality)) {
          return false;
        }
        
        if (query.studyDate) {
          const studyDate = new Date(study.studyDate);
          const fromDate = new Date(query.studyDate.from);
          const toDate = new Date(query.studyDate.to);
          
          if (studyDate < fromDate || studyDate > toDate) {\n            return false;\n          }\n        }\n        \n        return true;\n      });\n      \n      // Apply pagination\n      if (query.offset) {\n        results = results.slice(query.offset);\n      }\n      \n      if (query.limit) {\n        results = results.slice(0, query.limit);\n      }\n      \n      this.logger.debug(`Mock PACS found ${results.length} studies`);\n      return this.createSuccessResult(results, operationId);\n      \n    } catch (error) {\n      this.logger.error('Mock study search failed:', error);\n      return this.createErrorResult(error.message, 'STUDY_SEARCH_FAILED', operationId);\n    }\n  }\n  \n  async findSeries(studyInstanceUID: string): Promise<PACSOperationResult<SeriesMetadata[]>> {\n    const operationId = this.generateOperationId();\n    \n    try {\n      if (!this.connected) {\n        throw new Error('Not connected to PACS');\n      }\n      \n      await this.simulateLatency();\n      \n      if (this.shouldSimulateError()) {\n        throw new Error('Series search failed');\n      }\n      \n      const series = this.mockSeries.get(studyInstanceUID) || [];\n      \n      this.logger.debug(`Mock PACS found ${series.length} series for study ${studyInstanceUID}`);\n      return this.createSuccessResult(series, operationId);\n      \n    } catch (error) {\n      this.logger.error('Mock series search failed:', error);\n      return this.createErrorResult(error.message, 'SERIES_SEARCH_FAILED', operationId);\n    }\n  }\n  \n  async findImages(seriesInstanceUID: string): Promise<PACSOperationResult<ImageMetadata[]>> {\n    const operationId = this.generateOperationId();\n    \n    try {\n      if (!this.connected) {\n        throw new Error('Not connected to PACS');\n      }\n      \n      await this.simulateLatency();\n      \n      if (this.shouldSimulateError()) {\n        throw new Error('Image search failed');\n      }\n      \n      const images = this.mockImages.get(seriesInstanceUID) || [];\n      \n      this.logger.debug(`Mock PACS found ${images.length} images for series ${seriesInstanceUID}`);\n      return this.createSuccessResult(images, operationId);\n      \n    } catch (error) {\n      this.logger.error('Mock image search failed:', error);\n      return this.createErrorResult(error.message, 'IMAGE_SEARCH_FAILED', operationId);\n    }\n  }\n  \n  async retrieveStudy(request: PACSRetrieveRequest): Promise<PACSOperationResult<string>> {\n    const operationId = this.generateOperationId();\n    \n    try {\n      if (!this.connected) {\n        throw new Error('Not connected to PACS');\n      }\n      \n      const moveId = `move_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;\n      \n      // Simulate retrieval process with progress events\n      if (this.mockConfig.enableProgressEvents && this.onRetrieveProgress) {\n        this.simulateRetrievalProgress(moveId, request.studyInstanceUID);\n      }\n      \n      await this.simulateLatency(1000, 5000); // Retrieval takes longer\n      \n      if (this.shouldSimulateError()) {\n        throw new Error('Study retrieval failed - destination unreachable');\n      }\n      \n      this.logger.info(`Mock study retrieval initiated: ${moveId}`);\n      return this.createSuccessResult(moveId, operationId);\n      \n    } catch (error) {\n      this.logger.error('Mock study retrieval failed:', error);\n      return this.createErrorResult(error.message, 'STUDY_RETRIEVAL_FAILED', operationId);\n    }\n  }\n  \n  async retrieveSeries(request: PACSRetrieveRequest): Promise<PACSOperationResult<string>> {\n    const operationId = this.generateOperationId();\n    \n    try {\n      if (!this.connected) {\n        throw new Error('Not connected to PACS');\n      }\n      \n      const moveId = `move_series_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;\n      \n      await this.simulateLatency(500, 2000);\n      \n      if (this.shouldSimulateError()) {\n        throw new Error('Series retrieval failed');\n      }\n      \n      return this.createSuccessResult(moveId, operationId);\n      \n    } catch (error) {\n      return this.createErrorResult(error.message, 'SERIES_RETRIEVAL_FAILED', operationId);\n    }\n  }\n  \n  async retrieveImage(request: PACSRetrieveRequest): Promise<PACSOperationResult<string>> {\n    const operationId = this.generateOperationId();\n    \n    try {\n      if (!this.connected) {\n        throw new Error('Not connected to PACS');\n      }\n      \n      const moveId = `move_image_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;\n      \n      await this.simulateLatency(200, 1000);\n      \n      if (this.shouldSimulateError()) {\n        throw new Error('Image retrieval failed');\n      }\n      \n      return this.createSuccessResult(moveId, operationId);\n      \n    } catch (error) {\n      return this.createErrorResult(error.message, 'IMAGE_RETRIEVAL_FAILED', operationId);\n    }\n  }\n  \n  async storeImage(dicomFile: Buffer, metadata: ImageMetadata): Promise<PACSOperationResult<string>> {\n    const operationId = this.generateOperationId();\n    \n    try {\n      if (!this.connected) {\n        throw new Error('Not connected to PACS');\n      }\n      \n      await this.simulateLatency(500, 1500);\n      \n      if (this.shouldSimulateError()) {\n        throw new Error('Image storage failed - insufficient space');\n      }\n      \n      const storeId = `store_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;\n      \n      // Add to mock data\n      const existingImages = this.mockImages.get(metadata.seriesInstanceUID) || [];\n      existingImages.push(metadata);\n      this.mockImages.set(metadata.seriesInstanceUID, existingImages);\n      \n      this.logger.info(`Mock image stored: ${storeId}`);\n      return this.createSuccessResult(storeId, operationId);\n      \n    } catch (error) {\n      return this.createErrorResult(error.message, 'IMAGE_STORAGE_FAILED', operationId);\n    }\n  }\n  \n  async getStatus(): Promise<PACSOperationResult<any>> {\n    const operationId = this.generateOperationId();\n    \n    try {\n      const status = {\n        connected: this.connected,\n        uptime: this.connectionStartTime ? Date.now() - this.connectionStartTime.getTime() : 0,\n        studyCount: this.mockStudies.length,\n        seriesCount: Array.from(this.mockSeries.values()).reduce((total, series) => total + series.length, 0),\n        imageCount: Array.from(this.mockImages.values()).reduce((total, images) => total + images.length, 0),\n        mockConfiguration: this.mockConfig,\n        capabilities: [\n          'C-ECHO', 'C-FIND', 'C-MOVE', 'C-STORE'\n        ],\n        lastActivity: new Date()\n      };\n      \n      return this.createSuccessResult(status, operationId);\n      \n    } catch (error) {\n      return this.createErrorResult(error.message, 'STATUS_ERROR', operationId);\n    }\n  }\n  \n  async getStatistics(): Promise<PACSOperationResult<any>> {\n    const operationId = this.generateOperationId();\n    \n    try {\n      const stats = {\n        totalQueries: this.getRandomNumber(100, 1000),\n        totalRetrievals: this.getRandomNumber(50, 500),\n        totalStores: this.getRandomNumber(10, 100),\n        averageQueryTime: this.getRandomNumber(200, 1000),\n        averageRetrievalTime: this.getRandomNumber(1000, 5000),\n        errorRate: this.mockConfig.errorRate,\n        connectionUptime: this.connectionStartTime ? Date.now() - this.connectionStartTime.getTime() : 0\n      };\n      \n      return this.createSuccessResult(stats, operationId);\n      \n    } catch (error) {\n      return this.createErrorResult(error.message, 'STATISTICS_ERROR', operationId);\n    }\n  }\n  \n  /**\n   * Mock-specific methods for testing\n   */\n  \n  updateMockConfig(config: Partial<MockPACSConfig>): void {\n    this.mockConfig = { ...this.mockConfig, ...config };\n    this.logger.info('Mock PACS configuration updated');\n  }\n  \n  addMockStudy(study: StudyMetadata, series?: SeriesMetadata[], images?: Map<string, ImageMetadata[]>): void {\n    this.mockStudies.push(study);\n    \n    if (series) {\n      this.mockSeries.set(study.studyInstanceUID, series);\n      \n      if (images) {\n        series.forEach(s => {\n          const seriesImages = images.get(s.seriesInstanceUID);\n          if (seriesImages) {\n            this.mockImages.set(s.seriesInstanceUID, seriesImages);\n          }\n        });\n      }\n    }\n    \n    this.logger.debug(`Added mock study: ${study.studyInstanceUID}`);\n  }\n  \n  clearMockData(): void {\n    this.mockStudies = [];\n    this.mockSeries.clear();\n    this.mockImages.clear();\n    this.logger.info('Mock data cleared');\n  }\n  \n  simulateConnectionLoss(): void {\n    this.connected = false;\n    if (this.onConnectionLost) {\n      this.onConnectionLost(new Error('Simulated connection loss'));\n    }\n  }\n  \n  simulateError(error: string): void {\n    if (this.onError) {\n      this.onError(new Error(error), 'SIMULATED_ERROR');\n    }\n  }\n  \n  /**\n   * Private helper methods\n   */\n  \n  private async simulateLatency(minMs?: number, maxMs?: number): Promise<void> {\n    if (!this.mockConfig.simulateLatency) {\n      return;\n    }\n    \n    const min = minMs || this.mockConfig.latencyRange.min;\n    const max = maxMs || this.mockConfig.latencyRange.max;\n    \n    const latency = this.getRandomNumber(min, max);\n    \n    if (this.mockConfig.simulateSlowConnection) {\n      // Add extra delay for slow connection simulation\n      await new Promise(resolve => setTimeout(resolve, latency * 2));\n    } else {\n      await new Promise(resolve => setTimeout(resolve, latency));\n    }\n  }\n  \n  private shouldSimulateError(): boolean {\n    return Math.random() < this.mockConfig.errorRate;\n  }\n  \n  private getRandomNumber(min: number, max: number): number {\n    return Math.floor(Math.random() * (max - min + 1)) + min;\n  }\n  \n  private async simulateRetrievalProgress(moveId: string, studyUID: string): Promise<void> {\n    if (!this.onRetrieveProgress) {\n      return;\n    }\n    \n    const total = this.getRandomNumber(50, 500); // Simulate number of images\n    let completed = 0;\n    \n    const progressInterval = setInterval(() => {\n      completed += this.getRandomNumber(1, 10);\n      \n      if (completed >= total) {\n        completed = total;\n        clearInterval(progressInterval);\n      }\n      \n      this.onRetrieveProgress!({\n        completed,\n        total,\n        studyUID\n      });\n    }, 500);\n  }\n  \n  private initializeMockData(): void {\n    switch (this.mockConfig.mockDataSet) {\n      case 'minimal':\n        this.createMinimalDataSet();\n        break;\n      case 'comprehensive':\n        this.createComprehensiveDataSet();\n        break;\n      case 'large':\n        this.createLargeDataSet();\n        break;\n    }\n  }\n  \n  private createMinimalDataSet(): void {\n    // Create 5 studies with basic data\n    for (let i = 1; i <= 5; i++) {\n      const study = this.createMockStudy(i);\n      const series = this.createMockSeries(study.studyInstanceUID, 2);\n      \n      this.mockStudies.push(study);\n      this.mockSeries.set(study.studyInstanceUID, series);\n      \n      series.forEach(s => {\n        const images = this.createMockImages(s.seriesInstanceUID, 10);\n        this.mockImages.set(s.seriesInstanceUID, images);\n      });\n    }\n  }\n  \n  private createComprehensiveDataSet(): void {\n    // Create 25 studies with varied data\n    const modalities = ['CT', 'MR', 'XR', 'US', 'CR', 'DX', 'MG'];\n    const statuses = ['PENDING', 'IN_PROGRESS', 'COMPLETED'] as const;\n    \n    for (let i = 1; i <= 25; i++) {\n      const study = this.createMockStudy(\n        i,\n        modalities[i % modalities.length],\n        statuses[i % statuses.length]\n      );\n      \n      const seriesCount = this.getRandomNumber(1, 5);\n      const series = this.createMockSeries(study.studyInstanceUID, seriesCount);\n      \n      this.mockStudies.push(study);\n      this.mockSeries.set(study.studyInstanceUID, series);\n      \n      series.forEach(s => {\n        const imageCount = this.getRandomNumber(5, 100);\n        const images = this.createMockImages(s.seriesInstanceUID, imageCount);\n        this.mockImages.set(s.seriesInstanceUID, images);\n      });\n    }\n  }\n  \n  private createLargeDataSet(): void {\n    // Create 100 studies for performance testing\n    const modalities = ['CT', 'MR', 'XR', 'US', 'CR', 'DX', 'MG', 'RF', 'NM', 'PT'];\n    const statuses = ['PENDING', 'IN_PROGRESS', 'COMPLETED'] as const;\n    \n    for (let i = 1; i <= 100; i++) {\n      const study = this.createMockStudy(\n        i,\n        modalities[i % modalities.length],\n        statuses[i % statuses.length]\n      );\n      \n      const seriesCount = this.getRandomNumber(2, 8);\n      const series = this.createMockSeries(study.studyInstanceUID, seriesCount);\n      \n      this.mockStudies.push(study);\n      this.mockSeries.set(study.studyInstanceUID, series);\n      \n      series.forEach(s => {\n        const imageCount = this.getRandomNumber(20, 500);\n        const images = this.createMockImages(s.seriesInstanceUID, imageCount);\n        this.mockImages.set(s.seriesInstanceUID, images);\n      });\n    }\n  }\n  \n  private createMockStudy(\n    index: number,\n    modality: string = 'CT',\n    status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' = 'COMPLETED'\n  ): StudyMetadata {\n    const date = new Date();\n    date.setDate(date.getDate() - this.getRandomNumber(0, 30));\n    \n    return {\n      studyInstanceUID: `1.2.3.4.5.6.7.8.9.${index}`,\n      patientID: `PAT${index.toString().padStart(3, '0')}`,\n      patientName: `Test^Patient^${index}`,\n      studyDate: date.toISOString().split('T')[0],\n      studyTime: `${this.getRandomNumber(8, 17).toString().padStart(2, '0')}${this.getRandomNumber(0, 59).toString().padStart(2, '0')}00`,\n      modality,\n      studyDescription: `Mock ${modality} Study ${index}`,\n      accessionNumber: `ACC${index.toString().padStart(6, '0')}`,\n      seriesCount: this.getRandomNumber(1, 5),\n      imageCount: this.getRandomNumber(10, 200),\n      studyStatus: status,\n      referringPhysician: `Dr. Referring^${index}`,\n      institution: 'Mock Hospital'\n    };\n  }\n  \n  private createMockSeries(studyUID: string, count: number): SeriesMetadata[] {\n    const series: SeriesMetadata[] = [];\n    \n    for (let i = 1; i <= count; i++) {\n      series.push({\n        seriesInstanceUID: `${studyUID}.${i}`,\n        studyInstanceUID: studyUID,\n        seriesNumber: i,\n        modality: 'CT',\n        seriesDescription: `Mock Series ${i}`,\n        imageCount: this.getRandomNumber(10, 100),\n        bodyPartExamined: ['CHEST', 'ABDOMEN', 'HEAD', 'PELVIS'][i % 4],\n        protocolName: `Protocol ${i}`,\n        seriesDate: new Date().toISOString().split('T')[0],\n        seriesTime: `${this.getRandomNumber(8, 17).toString().padStart(2, '0')}${this.getRandomNumber(0, 59).toString().padStart(2, '0')}00`\n      });\n    }\n    \n    return series;\n  }\n  \n  private createMockImages(seriesUID: string, count: number): ImageMetadata[] {\n    const images: ImageMetadata[] = [];\n    \n    for (let i = 1; i <= count; i++) {\n      images.push({\n        sopInstanceUID: `${seriesUID}.${i}`,\n        seriesInstanceUID: seriesUID,\n        instanceNumber: i,\n        imageType: 'DERIVED\\PRIMARY\\AXIAL',\n        transferSyntaxUID: '1.2.840.10008.1.2',\n        rows: 512,\n        columns: 512,\n        bitsAllocated: 16,\n        pixelSpacing: [0.5, 0.5],\n        windowCenter: 40,\n        windowWidth: 400\n      });\n    }\n    \n    return images;\n  }\n}"