/**
 * HL7 Client Implementation
 * Handles HL7 v2.x message communication for RIS integration
 */

import { EventEmitter } from 'events';
import { Socket } from 'net';
import { Logger } from '../../utils/logger';
import { HL7Message, HL7Segment } from '../interfaces/IRISProvider';

export interface HL7ConnectionConfig {
  host: string;
  port: number;
  sendingApplication: string;
  sendingFacility: string;
  receivingApplication: string;
  receivingFacility: string;
  processingID: 'P' | 'T' | 'D'; // Production, Test, Debug
  enableTLS?: boolean;
  timeout: number;
  keepAlive?: boolean;
  encoding?: 'UTF-8' | 'ASCII' | 'ISO-8859-1';
}

export interface HL7QueryRequest {
  messageType: string;
  queryTag: string;
  queryDefinition: string;
  responseFormat?: string;
}

export interface HL7OperationResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  messageId?: string;
  timestamp: Date;
}

export interface HL7MessageBuilder {
  messageType: string;
  segments: HL7SegmentBuilder[];
}

export interface HL7SegmentBuilder {
  type: string;
  fields: (string | string[])[];
}

export class HL7Client extends EventEmitter {
  private logger: Logger;
  private config?: HL7ConnectionConfig;
  private socket?: Socket;
  private connected: boolean = false;
  private messageSequence: number = 1;
  private pendingRequests: Map<string, {
    resolve: (value: any) => void;
    reject: (error: Error) => void;
    timeout: NodeJS.Timeout;
  }> = new Map();
  
  // HL7 delimiters
  private readonly FIELD_SEPARATOR = '|';
  private readonly COMPONENT_SEPARATOR = '^';
  private readonly REPETITION_SEPARATOR = '~';
  private readonly ESCAPE_CHARACTER = '\\';
  private readonly SUB_COMPONENT_SEPARATOR = '&';
  private readonly SEGMENT_TERMINATOR = '\r';
  private readonly MESSAGE_START = '\x0b'; // VT (Vertical Tab)
  private readonly MESSAGE_END = '\x1c\r'; // FS (File Separator) + CR
  
  private statistics = {
    messagesSent: 0,
    messagesReceived: 0,
    errors: 0,
    connectionUptime: 0,
    lastActivity: new Date()
  };
  
  constructor() {
    super();
    this.logger = new Logger('HL7Client');
  }
  
  /**
   * Connect to HL7 server
   */
  async connect(config: HL7ConnectionConfig): Promise<HL7OperationResult<boolean>> {
    try {
      this.config = config;
      
      this.socket = new Socket();
      
      // Set up socket event handlers
      this.setupSocketHandlers();
      
      // Connect to HL7 server
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Connection timeout'));
        }, config.timeout);
        
        this.socket!.connect(config.port, config.host, () => {
          clearTimeout(timeout);
          resolve();
        });
        
        this.socket!.on('error', (error) => {
          clearTimeout(timeout);
          reject(error);
        });
      });
      
      this.connected = true;
      this.statistics.connectionUptime = Date.now();
      
      this.logger.info(`Connected to HL7 server: ${config.host}:${config.port}`);
      this.emit('connected');
      
      return {
        success: true,
        data: true,
        timestamp: new Date()
      };
      
    } catch (error) {
      this.logger.error('HL7 connection failed:', error);
      return {
        success: false,
        error: error.message,
        timestamp: new Date()
      };
    }
  }
  
  /**
   * Disconnect from HL7 server
   */
  async disconnect(): Promise<HL7OperationResult<boolean>> {
    try {
      if (this.socket) {
        // Clear all pending requests
        this.pendingRequests.forEach(({ reject, timeout }) => {
          clearTimeout(timeout);
          reject(new Error('Connection closed'));
        });
        this.pendingRequests.clear();
        
        this.socket.destroy();
        this.socket = undefined;
      }
      
      this.connected = false;
      this.logger.info('Disconnected from HL7 server');
      this.emit('disconnected');
      
      return {
        success: true,
        data: true,
        timestamp: new Date()
      };
      
    } catch (error) {
      this.logger.error('HL7 disconnect error:', error);
      return {
        success: false,
        error: error.message,
        timestamp: new Date()
      };
    }
  }
  
  /**
   * Send HL7 message
   */
  async sendMessage(message: HL7Message): Promise<HL7OperationResult<HL7Message>> {
    try {
      if (!this.connected || !this.socket) {
        throw new Error('Not connected to HL7 server');
      }
      
      const messageString = this.buildMessageString(message);
      const wrappedMessage = this.wrapMessage(messageString);
      
      // Send message
      await this.writeToSocket(wrappedMessage);
      
      // Wait for acknowledgment
      const ackMessage = await this.waitForAcknowledgment(message.messageControlId);
      
      this.statistics.messagesSent++;
      this.statistics.lastActivity = new Date();
      
      this.logger.debug(`HL7 message sent: ${message.messageType} (${message.messageControlId})`);
      
      return {
        success: true,
        data: ackMessage,
        messageId: message.messageControlId,
        timestamp: new Date()
      };
      
    } catch (error) {
      this.statistics.errors++;
      this.logger.error('HL7 message send failed:', error);
      return {
        success: false,
        error: error.message,
        messageId: message.messageControlId,
        timestamp: new Date()
      };
    }
  }
  
  /**
   * Send HL7 query and wait for response
   */
  async sendQuery(query: HL7QueryRequest): Promise<HL7OperationResult<any>> {
    try {
      if (!this.connected || !this.socket) {
        throw new Error('Not connected to HL7 server');
      }
      
      // Build query message
      const queryMessage = this.buildQueryMessage(query);
      const messageString = this.buildMessageString(queryMessage);
      const wrappedMessage = this.wrapMessage(messageString);
      
      // Send query
      await this.writeToSocket(wrappedMessage);
      
      // Wait for response
      const responseMessage = await this.waitForResponse(queryMessage.messageControlId);
      
      this.statistics.messagesSent++;
      this.statistics.lastActivity = new Date();
      
      this.logger.debug(`HL7 query sent: ${query.messageType} (${queryMessage.messageControlId})`);
      
      return {
        success: true,
        data: responseMessage,
        messageId: queryMessage.messageControlId,
        timestamp: new Date()
      };
      
    } catch (error) {
      this.statistics.errors++;
      this.logger.error('HL7 query failed:', error);
      return {
        success: false,
        error: error.message,
        timestamp: new Date()
      };
    }
  }
  
  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.connected && this.socket?.readyState === 'open';
  }
  
  /**
   * Get statistics
   */
  async getStatistics(): Promise<any> {
    return {
      ...this.statistics,
      uptime: this.connected ? Date.now() - this.statistics.connectionUptime : 0,
      pendingRequests: this.pendingRequests.size
    };
  }
  
  /**
   * Private helper methods
   */
  
  private setupSocketHandlers(): void {
    if (!this.socket) return;
    
    this.socket.on('data', (data: Buffer) => {
      this.handleIncomingData(data);
    });
    
    this.socket.on('error', (error: Error) => {
      this.logger.error('HL7 socket error:', error);
      this.statistics.errors++;
      this.emit('error', error);
    });
    
    this.socket.on('close', () => {
      this.connected = false;
      this.logger.warn('HL7 connection closed');
      this.emit('connectionLost', new Error('Connection closed'));
    });
    
    this.socket.on('timeout', () => {
      this.logger.warn('HL7 socket timeout');
      this.emit('timeout');
    });
  }
  
  private handleIncomingData(data: Buffer): void {
    try {
      const messageString = data.toString();
      
      // Remove message wrapper
      const unwrappedMessage = this.unwrapMessage(messageString);
      
      // Parse HL7 message
      const message = this.parseMessage(unwrappedMessage);
      
      this.statistics.messagesReceived++;
      this.statistics.lastActivity = new Date();
      
      // Handle different message types
      const messageType = message.messageType.split('^')[0];
      
      if (messageType === 'ACK') {
        // Handle acknowledgment
        this.handleAcknowledgment(message);
      } else if (messageType === 'QRY' || messageType === 'DSR') {
        // Handle query response
        this.handleQueryResponse(message);
      } else {
        // Handle unsolicited message
        this.emit('messageReceived', message);
      }
      
    } catch (error) {
      this.logger.error('Error handling incoming HL7 data:', error);
      this.statistics.errors++;
    }
  }
  
  private buildMessageString(message: HL7Message): string {
    // Build MSH segment
    const mshSegment = this.buildMSHSegment(message);
    
    // Build other segments
    const segmentStrings = [mshSegment];
    
    message.segments.forEach(segment => {
      const segmentString = this.buildSegmentString(segment);
      segmentStrings.push(segmentString);
    });
    
    return segmentStrings.join(this.SEGMENT_TERMINATOR) + this.SEGMENT_TERMINATOR;
  }
  
  private buildMSHSegment(message: HL7Message): string {
    const encodingChars = this.COMPONENT_SEPARATOR + \n      this.REPETITION_SEPARATOR + \n      this.ESCAPE_CHARACTER + \n      this.SUB_COMPONENT_SEPARATOR;\n    \n    const fields = [\n      'MSH',\n      this.FIELD_SEPARATOR,\n      encodingChars,\n      this.config?.sendingApplication || '',\n      this.config?.sendingFacility || '',\n      this.config?.receivingApplication || '',\n      this.config?.receivingFacility || '',\n      this.formatTimestamp(new Date()),\n      '',\n      message.messageType,\n      message.messageControlId,\n      this.config?.processingID || 'P',\n      '2.5' // HL7 version\n    ];\n    \n    return fields.join(this.FIELD_SEPARATOR);\n  }\n  \n  private buildSegmentString(segment: HL7Segment): string {\n    const fields = [segment.segmentType, ...segment.fields];\n    return fields.join(this.FIELD_SEPARATOR);\n  }\n  \n  private buildQueryMessage(query: HL7QueryRequest): HL7Message {\n    const messageControlId = this.generateMessageControlId();\n    \n    // Build QRD segment (Query Definition)\n    const qrdSegment: HL7Segment = {\n      segmentType: 'QRD',\n      fields: [\n        this.formatTimestamp(new Date()), // Query Date/Time\n        'R',                              // Query Format Code\n        'I',                              // Query Priority\n        query.queryTag,                   // Query ID\n        '',                               // Deferred Response Type\n        '',                               // Deferred Response Date/Time\n        '1^RD',                          // Quantity Limited Request\n        '',                               // Who Subject Filter\n        query.queryDefinition,            // What Subject Filter\n        '',                               // What Department Data Code\n        '',                               // What Data Code Value Qualifier\n        query.responseFormat || 'T'       // Query Results Level\n      ]\n    };\n    \n    return {\n      messageType: query.messageType,\n      messageControlId,\n      timestamp: new Date().toISOString(),\n      sendingApplication: this.config?.sendingApplication || '',\n      receivingApplication: this.config?.receivingApplication || '',\n      segments: [qrdSegment]\n    };\n  }\n  \n  private parseMessage(messageString: string): HL7Message {\n    const lines = messageString.split(this.SEGMENT_TERMINATOR).filter(line => line.trim());\n    \n    if (lines.length === 0) {\n      throw new Error('Empty HL7 message');\n    }\n    \n    // Parse MSH segment\n    const mshFields = lines[0].split(this.FIELD_SEPARATOR);\n    \n    if (mshFields[0] !== 'MSH') {\n      throw new Error('Invalid HL7 message: MSH segment not found');\n    }\n    \n    const messageType = mshFields[9] || '';\n    const messageControlId = mshFields[10] || '';\n    const timestamp = mshFields[7] || '';\n    const sendingApplication = mshFields[3] || '';\n    const receivingApplication = mshFields[5] || '';\n    \n    // Parse other segments\n    const segments: HL7Segment[] = [];\n    \n    for (let i = 1; i < lines.length; i++) {\n      const fields = lines[i].split(this.FIELD_SEPARATOR);\n      const segmentType = fields[0];\n      const segmentFields = fields.slice(1);\n      \n      segments.push({\n        segmentType,\n        fields: segmentFields\n      });\n    }\n    \n    return {\n      messageType,\n      messageControlId,\n      timestamp,\n      sendingApplication,\n      receivingApplication,\n      segments\n    };\n  }\n  \n  private wrapMessage(message: string): string {\n    return this.MESSAGE_START + message + this.MESSAGE_END;\n  }\n  \n  private unwrapMessage(wrappedMessage: string): string {\n    let message = wrappedMessage;\n    \n    // Remove start character\n    if (message.startsWith(this.MESSAGE_START)) {\n      message = message.substring(1);\n    }\n    \n    // Remove end characters\n    if (message.endsWith(this.MESSAGE_END)) {\n      message = message.substring(0, message.length - this.MESSAGE_END.length);\n    }\n    \n    return message;\n  }\n  \n  private async writeToSocket(data: string): Promise<void> {\n    return new Promise((resolve, reject) => {\n      if (!this.socket) {\n        reject(new Error('Socket not available'));\n        return;\n      }\n      \n      this.socket.write(data, 'utf8', (error) => {\n        if (error) {\n          reject(error);\n        } else {\n          resolve();\n        }\n      });\n    });\n  }\n  \n  private async waitForAcknowledgment(messageControlId: string): Promise<HL7Message> {\n    return new Promise((resolve, reject) => {\n      const timeout = setTimeout(() => {\n        this.pendingRequests.delete(messageControlId);\n        reject(new Error('Acknowledgment timeout'));\n      }, this.config?.timeout || 30000);\n      \n      this.pendingRequests.set(messageControlId, {\n        resolve,\n        reject,\n        timeout\n      });\n    });\n  }\n  \n  private async waitForResponse(messageControlId: string): Promise<HL7Message> {\n    return new Promise((resolve, reject) => {\n      const timeout = setTimeout(() => {\n        this.pendingRequests.delete(messageControlId);\n        reject(new Error('Response timeout'));\n      }, this.config?.timeout || 30000);\n      \n      this.pendingRequests.set(messageControlId, {\n        resolve,\n        reject,\n        timeout\n      });\n    });\n  }\n  \n  private handleAcknowledgment(message: HL7Message): void {\n    // Find MSA segment\n    const msaSegment = message.segments.find(seg => seg.segmentType === 'MSA');\n    \n    if (!msaSegment) {\n      this.logger.warn('ACK message missing MSA segment');\n      return;\n    }\n    \n    const ackCode = msaSegment.fields[0];\n    const originalMessageControlId = msaSegment.fields[1];\n    \n    const pendingRequest = this.pendingRequests.get(originalMessageControlId);\n    \n    if (pendingRequest) {\n      clearTimeout(pendingRequest.timeout);\n      this.pendingRequests.delete(originalMessageControlId);\n      \n      if (ackCode === 'AA' || ackCode === 'CA') {\n        // Application Accept or Commit Accept\n        pendingRequest.resolve(message);\n      } else {\n        // Application Error or Application Reject\n        const errorText = msaSegment.fields[2] || 'Unknown error';\n        pendingRequest.reject(new Error(`HL7 ACK error: ${errorText}`));\n      }\n    }\n  }\n  \n  private handleQueryResponse(message: HL7Message): void {\n    // Find QAK segment to get original query tag\n    const qakSegment = message.segments.find(seg => seg.segmentType === 'QAK');\n    \n    if (!qakSegment) {\n      this.logger.warn('Query response missing QAK segment');\n      return;\n    }\n    \n    const queryTag = qakSegment.fields[0];\n    const queryStatus = qakSegment.fields[1];\n    \n    // Find pending request by query tag (stored as message control ID)\n    let pendingRequest;\n    for (const [key, request] of this.pendingRequests.entries()) {\n      if (key.includes(queryTag)) {\n        pendingRequest = request;\n        this.pendingRequests.delete(key);\n        break;\n      }\n    }\n    \n    if (pendingRequest) {\n      clearTimeout(pendingRequest.timeout);\n      \n      if (queryStatus === 'OK') {\n        pendingRequest.resolve(message);\n      } else {\n        const errorText = qakSegment.fields[2] || 'Query failed';\n        pendingRequest.reject(new Error(`HL7 Query error: ${errorText}`));\n      }\n    }\n  }\n  \n  private formatTimestamp(date: Date): string {\n    const year = date.getFullYear();\n    const month = (date.getMonth() + 1).toString().padStart(2, '0');\n    const day = date.getDate().toString().padStart(2, '0');\n    const hour = date.getHours().toString().padStart(2, '0');\n    const minute = date.getMinutes().toString().padStart(2, '0');\n    const second = date.getSeconds().toString().padStart(2, '0');\n    \n    return `${year}${month}${day}${hour}${minute}${second}`;\n  }\n  \n  private generateMessageControlId(): string {\n    const sequence = this.messageSequence.toString().padStart(6, '0');\n    this.messageSequence++;\n    \n    return `AXIS${Date.now().toString().slice(-6)}${sequence}`;\n  }\n}"