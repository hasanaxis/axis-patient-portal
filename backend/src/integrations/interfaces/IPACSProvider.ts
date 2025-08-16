/**
 * Generic PACS Provider Interface
 * Provides abstraction for different PACS systems (Sectra, GE, Philips, etc.)
 */

export interface StudyMetadata {
  studyInstanceUID: string;
  patientID: string;
  patientName: string;
  studyDate: string;
  studyTime?: string;
  modality: string;
  studyDescription?: string;
  accessionNumber?: string;
  seriesCount: number;
  imageCount: number;
  studyStatus: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  referringPhysician?: string;
  institution?: string;
}

export interface SeriesMetadata {
  seriesInstanceUID: string;
  studyInstanceUID: string;
  seriesNumber: number;
  modality: string;
  seriesDescription?: string;
  imageCount: number;
  bodyPartExamined?: string;
  protocolName?: string;
  seriesDate?: string;
  seriesTime?: string;
}

export interface ImageMetadata {
  sopInstanceUID: string;
  seriesInstanceUID: string;
  instanceNumber: number;
  imageType: string;
  transferSyntaxUID: string;
  rows: number;
  columns: number;
  bitsAllocated: number;
  pixelSpacing?: [number, number];
  windowCenter?: number;
  windowWidth?: number;
}

export interface PACSQuery {
  patientID?: string;
  patientName?: string;
  studyDate?: {
    from: string;
    to: string;
  };
  modality?: string[];
  accessionNumber?: string;
  studyInstanceUID?: string;
  limit?: number;
  offset?: number;
}

export interface PACSConnectionConfig {
  host: string;
  port: number;
  callingAET: string;
  calledAET: string;
  timeout: number;
  maxConnections: number;
  enableTLS: boolean;
  credentials?: {
    username: string;
    password: string;
  };
}

export interface PACSRetrieveRequest {
  studyInstanceUID: string;
  seriesInstanceUID?: string;
  sopInstanceUID?: string;
  destinationAET: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface PACSOperationResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  errorCode?: string;
  timestamp: Date;
  operationId: string;
}

export interface IPACSProvider {
  /**
   * Provider identification
   */
  readonly name: string;
  readonly version: string;
  readonly vendor: string;
  
  /**
   * Connection management
   */
  connect(config: PACSConnectionConfig): Promise<PACSOperationResult<boolean>>;
  disconnect(): Promise<PACSOperationResult<boolean>>;
  isConnected(): boolean;
  testConnection(): Promise<PACSOperationResult<boolean>>;
  
  /**
   * Query operations (C-FIND)
   */
  findStudies(query: PACSQuery): Promise<PACSOperationResult<StudyMetadata[]>>;
  findSeries(studyInstanceUID: string): Promise<PACSOperationResult<SeriesMetadata[]>>;
  findImages(seriesInstanceUID: string): Promise<PACSOperationResult<ImageMetadata[]>>;
  
  /**
   * Retrieve operations (C-MOVE/C-GET)
   */
  retrieveStudy(request: PACSRetrieveRequest): Promise<PACSOperationResult<string>>;
  retrieveSeries(request: PACSRetrieveRequest): Promise<PACSOperationResult<string>>;
  retrieveImage(request: PACSRetrieveRequest): Promise<PACSOperationResult<string>>;
  
  /**
   * Store operations (C-STORE)
   */
  storeImage(dicomFile: Buffer, metadata: ImageMetadata): Promise<PACSOperationResult<string>>;
  
  /**
   * Status and monitoring
   */
  getStatus(): Promise<PACSOperationResult<any>>;
  getStatistics(): Promise<PACSOperationResult<any>>;
  
  /**
   * Event handlers
   */
  onConnectionLost?: (error: Error) => void;
  onRetrieveProgress?: (progress: { completed: number; total: number; studyUID: string }) => void;
  onError?: (error: Error, operation: string) => void;
}

export abstract class BasePACSProvider implements IPACSProvider {
  abstract readonly name: string;
  abstract readonly version: string;
  abstract readonly vendor: string;
  
  protected connected: boolean = false;
  protected config?: PACSConnectionConfig;
  
  abstract connect(config: PACSConnectionConfig): Promise<PACSOperationResult<boolean>>;
  abstract disconnect(): Promise<PACSOperationResult<boolean>>;
  abstract testConnection(): Promise<PACSOperationResult<boolean>>;
  abstract findStudies(query: PACSQuery): Promise<PACSOperationResult<StudyMetadata[]>>;
  abstract findSeries(studyInstanceUID: string): Promise<PACSOperationResult<SeriesMetadata[]>>;
  abstract findImages(seriesInstanceUID: string): Promise<PACSOperationResult<ImageMetadata[]>>;
  abstract retrieveStudy(request: PACSRetrieveRequest): Promise<PACSOperationResult<string>>;
  abstract retrieveSeries(request: PACSRetrieveRequest): Promise<PACSOperationResult<string>>;
  abstract retrieveImage(request: PACSRetrieveRequest): Promise<PACSOperationResult<string>>;
  abstract storeImage(dicomFile: Buffer, metadata: ImageMetadata): Promise<PACSOperationResult<string>>;
  abstract getStatus(): Promise<PACSOperationResult<any>>;
  abstract getStatistics(): Promise<PACSOperationResult<any>>;
  
  isConnected(): boolean {
    return this.connected;
  }
  
  protected generateOperationId(): string {
    return `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  protected createSuccessResult<T>(data: T, operationId?: string): PACSOperationResult<T> {
    return {
      success: true,
      data,
      timestamp: new Date(),
      operationId: operationId || this.generateOperationId()
    };
  }
  
  protected createErrorResult(error: string, errorCode?: string, operationId?: string): PACSOperationResult {
    return {
      success: false,
      error,
      errorCode,
      timestamp: new Date(),
      operationId: operationId || this.generateOperationId()
    };
  }
  
  onConnectionLost?: (error: Error) => void;
  onRetrieveProgress?: (progress: { completed: number; total: number; studyUID: string }) => void;
  onError?: (error: Error, operation: string) => void;
}