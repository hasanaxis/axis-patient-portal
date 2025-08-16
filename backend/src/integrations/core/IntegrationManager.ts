/**
 * Integration Manager - Plugin Architecture for Healthcare Systems
 * Manages PACS and RIS provider plugins with configuration and monitoring
 */

import { IPACSProvider, PACSConnectionConfig } from '../interfaces/IPACSProvider';
import { IRISProvider, RISConnectionConfig } from '../interfaces/IRISProvider';
import { EventEmitter } from 'events';
import { Logger } from '../../utils/logger';

export interface IntegrationConfig {
  id: string;
  name: string;
  type: 'PACS' | 'RIS';
  vendor: string;
  enabled: boolean;
  config: PACSConnectionConfig | RISConnectionConfig;
  retryPolicy: {
    maxAttempts: number;
    backoffMultiplier: number;
    maxDelay: number;
  };
  healthCheck: {
    interval: number;
    timeout: number;
    failureThreshold: number;
  };
  monitoring: {
    enableMetrics: boolean;
    enableLogging: boolean;
    logLevel: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
  };
}

export interface IntegrationStatus {
  id: string;
  name: string;
  type: 'PACS' | 'RIS';
  status: 'CONNECTED' | 'DISCONNECTED' | 'ERROR' | 'RECONNECTING';
  lastConnected?: Date;
  lastError?: string;
  connectionAttempts: number;
  uptime: number;
  statistics: {
    totalOperations: number;
    successfulOperations: number;
    failedOperations: number;
    averageResponseTime: number;
  };
}

export interface IntegrationPlugin {
  id: string;
  name: string;
  vendor: string;
  version: string;
  type: 'PACS' | 'RIS';
  provider: IPACSProvider | IRISProvider;
  config: IntegrationConfig;
  status: IntegrationStatus;
  healthCheckTimer?: NodeJS.Timeout;
  reconnectTimer?: NodeJS.Timeout;
}

export class IntegrationManager extends EventEmitter {
  private plugins: Map<string, IntegrationPlugin> = new Map();
  private logger: Logger;
  
  constructor() {
    super();
    this.logger = new Logger('IntegrationManager');
  }
  
  /**
   * Register a new integration plugin
   */
  async registerPlugin(
    id: string,
    provider: IPACSProvider | IRISProvider,
    config: IntegrationConfig
  ): Promise<boolean> {
    try {
      if (this.plugins.has(id)) {
        throw new Error(`Plugin with id '${id}' already registered`);
      }
      
      const plugin: IntegrationPlugin = {
        id,
        name: config.name,
        vendor: config.vendor,
        version: provider.version,
        type: config.type,
        provider,
        config,
        status: {
          id,
          name: config.name,
          type: config.type,
          status: 'DISCONNECTED',
          connectionAttempts: 0,
          uptime: 0,
          statistics: {
            totalOperations: 0,
            successfulOperations: 0,
            failedOperations: 0,
            averageResponseTime: 0
          }
        }
      };
      
      // Set up event handlers
      this.setupProviderEventHandlers(plugin);
      
      this.plugins.set(id, plugin);
      this.logger.info(`Plugin registered: ${id} (${config.name})`);
      
      // Auto-connect if enabled
      if (config.enabled) {
        await this.connectPlugin(id);
      }
      
      this.emit('pluginRegistered', plugin);
      return true;
      
    } catch (error) {
      this.logger.error(`Failed to register plugin ${id}:`, error);
      return false;
    }
  }
  
  /**
   * Unregister an integration plugin
   */
  async unregisterPlugin(id: string): Promise<boolean> {
    try {
      const plugin = this.plugins.get(id);
      if (!plugin) {
        throw new Error(`Plugin '${id}' not found`);
      }
      
      // Disconnect if connected
      if (plugin.status.status === 'CONNECTED') {
        await this.disconnectPlugin(id);
      }
      
      // Clear timers
      if (plugin.healthCheckTimer) {
        clearInterval(plugin.healthCheckTimer);
      }
      if (plugin.reconnectTimer) {
        clearTimeout(plugin.reconnectTimer);
      }
      
      this.plugins.delete(id);
      this.logger.info(`Plugin unregistered: ${id}`);
      
      this.emit('pluginUnregistered', { id, name: plugin.name });
      return true;
      
    } catch (error) {
      this.logger.error(`Failed to unregister plugin ${id}:`, error);
      return false;
    }
  }
  
  /**
   * Connect a plugin
   */
  async connectPlugin(id: string): Promise<boolean> {
    const plugin = this.plugins.get(id);
    if (!plugin) {
      this.logger.error(`Plugin '${id}' not found`);
      return false;
    }
    
    try {
      plugin.status.status = 'RECONNECTING';
      plugin.status.connectionAttempts++;
      
      const result = await plugin.provider.connect(plugin.config.config as any);
      
      if (result.success) {
        plugin.status.status = 'CONNECTED';
        plugin.status.lastConnected = new Date();
        plugin.status.lastError = undefined;
        
        // Start health checks
        this.startHealthCheck(plugin);
        
        this.logger.info(`Plugin connected: ${id}`);
        this.emit('pluginConnected', plugin);
        return true;
      } else {
        throw new Error(result.error || 'Connection failed');
      }
      
    } catch (error) {
      plugin.status.status = 'ERROR';
      plugin.status.lastError = error.message;
      
      this.logger.error(`Failed to connect plugin ${id}:`, error);
      this.emit('pluginConnectionFailed', { plugin, error });
      
      // Schedule reconnection if configured
      this.scheduleReconnection(plugin);
      return false;
    }
  }
  
  /**
   * Disconnect a plugin
   */
  async disconnectPlugin(id: string): Promise<boolean> {
    const plugin = this.plugins.get(id);
    if (!plugin) {
      this.logger.error(`Plugin '${id}' not found`);
      return false;
    }
    
    try {
      // Stop health checks
      if (plugin.healthCheckTimer) {
        clearInterval(plugin.healthCheckTimer);
        plugin.healthCheckTimer = undefined;
      }
      
      // Stop reconnection timer
      if (plugin.reconnectTimer) {
        clearTimeout(plugin.reconnectTimer);
        plugin.reconnectTimer = undefined;
      }
      
      await plugin.provider.disconnect();
      plugin.status.status = 'DISCONNECTED';
      
      this.logger.info(`Plugin disconnected: ${id}`);
      this.emit('pluginDisconnected', plugin);
      return true;
      
    } catch (error) {
      this.logger.error(`Failed to disconnect plugin ${id}:`, error);
      return false;
    }
  }
  
  /**
   * Get plugin by ID
   */
  getPlugin(id: string): IntegrationPlugin | undefined {
    return this.plugins.get(id);
  }
  
  /**
   * Get all plugins
   */
  getAllPlugins(): IntegrationPlugin[] {
    return Array.from(this.plugins.values());
  }
  
  /**
   * Get plugins by type
   */
  getPluginsByType(type: 'PACS' | 'RIS'): IntegrationPlugin[] {
    return Array.from(this.plugins.values()).filter(plugin => plugin.type === type);
  }
  
  /**
   * Get connected plugins
   */
  getConnectedPlugins(): IntegrationPlugin[] {
    return Array.from(this.plugins.values()).filter(
      plugin => plugin.status.status === 'CONNECTED'
    );
  }
  
  /**
   * Update plugin configuration
   */
  async updatePluginConfig(id: string, config: Partial<IntegrationConfig>): Promise<boolean> {
    const plugin = this.plugins.get(id);
    if (!plugin) {
      this.logger.error(`Plugin '${id}' not found`);
      return false;
    }
    
    try {
      const wasConnected = plugin.status.status === 'CONNECTED';
      
      // Disconnect if connected
      if (wasConnected) {
        await this.disconnectPlugin(id);
      }
      
      // Update configuration
      plugin.config = { ...plugin.config, ...config };
      
      // Reconnect if it was connected
      if (wasConnected && plugin.config.enabled) {
        await this.connectPlugin(id);
      }
      
      this.emit('pluginConfigUpdated', plugin);
      return true;
      
    } catch (error) {
      this.logger.error(`Failed to update plugin config ${id}:`, error);
      return false;
    }
  }
  
  /**
   * Get system status
   */
  getSystemStatus(): {
    totalPlugins: number;
    connectedPlugins: number;
    pacsPlugins: number;
    risPlugins: number;
    healthStatus: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY';
  } {
    const plugins = Array.from(this.plugins.values());
    const connected = plugins.filter(p => p.status.status === 'CONNECTED');
    const pacs = plugins.filter(p => p.type === 'PACS');
    const ris = plugins.filter(p => p.type === 'RIS');
    
    let healthStatus: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY' = 'HEALTHY';
    
    if (connected.length === 0 && plugins.length > 0) {
      healthStatus = 'UNHEALTHY';
    } else if (connected.length < plugins.length) {
      healthStatus = 'DEGRADED';
    }
    
    return {
      totalPlugins: plugins.length,
      connectedPlugins: connected.length,
      pacsPlugins: pacs.length,
      risPlugins: ris.length,
      healthStatus
    };
  }
  
  /**
   * Setup event handlers for a provider
   */
  private setupProviderEventHandlers(plugin: IntegrationPlugin): void {
    const provider = plugin.provider;
    
    // Connection lost handler
    if (provider.onConnectionLost) {
      provider.onConnectionLost = (error: Error) => {
        plugin.status.status = 'ERROR';
        plugin.status.lastError = error.message;
        this.logger.error(`Connection lost for plugin ${plugin.id}:`, error);
        this.emit('pluginConnectionLost', { plugin, error });
        this.scheduleReconnection(plugin);
      };
    }
    
    // Error handler
    if (provider.onError) {
      provider.onError = (error: Error, operation: string) => {
        plugin.status.statistics.failedOperations++;
        this.logger.error(`Operation failed for plugin ${plugin.id} (${operation}):`, error);
        this.emit('pluginOperationFailed', { plugin, error, operation });
      };
    }
    
    // RIS-specific handlers
    if (plugin.type === 'RIS') {
      const risProvider = provider as IRISProvider;
      
      if (risProvider.onNewOrder) {
        risProvider.onNewOrder = (order) => {
          this.emit('newOrder', { plugin, order });
        };
      }
      
      if (risProvider.onOrderUpdate) {
        risProvider.onOrderUpdate = (orderID, status) => {
          this.emit('orderUpdate', { plugin, orderID, status });
        };
      }
      
      if (risProvider.onNewReport) {
        risProvider.onNewReport = (report) => {
          this.emit('newReport', { plugin, report });
        };
      }
      
      if (risProvider.onReportUpdate) {
        risProvider.onReportUpdate = (reportID, status) => {
          this.emit('reportUpdate', { plugin, reportID, status });
        };
      }
    }
    
    // PACS-specific handlers
    if (plugin.type === 'PACS') {
      const pacsProvider = provider as IPACSProvider;
      
      if (pacsProvider.onRetrieveProgress) {
        pacsProvider.onRetrieveProgress = (progress) => {
          this.emit('retrieveProgress', { plugin, progress });
        };
      }
    }
  }
  
  /**
   * Start health check for a plugin
   */
  private startHealthCheck(plugin: IntegrationPlugin): void {
    if (plugin.healthCheckTimer) {
      clearInterval(plugin.healthCheckTimer);
    }
    
    const interval = plugin.config.healthCheck.interval;
    
    plugin.healthCheckTimer = setInterval(async () => {
      try {
        const result = await plugin.provider.testConnection();
        if (!result.success) {
          throw new Error(result.error || 'Health check failed');
        }
      } catch (error) {
        this.logger.warn(`Health check failed for plugin ${plugin.id}:`, error);
        
        if (plugin.status.status === 'CONNECTED') {
          plugin.status.status = 'ERROR';
          plugin.status.lastError = error.message;
          this.emit('pluginHealthCheckFailed', { plugin, error });
          this.scheduleReconnection(plugin);
        }
      }
    }, interval);
  }
  
  /**
   * Schedule reconnection for a plugin
   */
  private scheduleReconnection(plugin: IntegrationPlugin): void {
    if (plugin.reconnectTimer) {
      clearTimeout(plugin.reconnectTimer);
    }
    
    const retryPolicy = plugin.config.retryPolicy;
    const delay = Math.min(
      retryPolicy.backoffMultiplier * plugin.status.connectionAttempts * 1000,
      retryPolicy.maxDelay
    );
    
    if (plugin.status.connectionAttempts < retryPolicy.maxAttempts) {
      plugin.reconnectTimer = setTimeout(async () => {
        this.logger.info(`Attempting reconnection for plugin ${plugin.id} (attempt ${plugin.status.connectionAttempts + 1})`);
        await this.connectPlugin(plugin.id);
      }, delay);
    } else {
      this.logger.error(`Max reconnection attempts reached for plugin ${plugin.id}`);
      this.emit('pluginReconnectionFailed', plugin);
    }
  }
  
  /**
   * Shutdown all plugins
   */
  async shutdown(): Promise<void> {
    this.logger.info('Shutting down Integration Manager');
    
    const disconnectPromises = Array.from(this.plugins.keys()).map(id => 
      this.disconnectPlugin(id)
    );
    
    await Promise.all(disconnectPromises);
    this.plugins.clear();
    
    this.emit('shutdown');
  }
}